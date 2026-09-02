require('dotenv').config();

const express = require('express');
const net = require('net');
const fs = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const app = express();
const PORT = process.env.GUI_PORT || 3800;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory log buffer & SSE client subscribers
const logs = [];
const sseClients = [];
let isSyncing = false;
let autoSyncTimer = null;
let autoSyncActive = false;
let autoSyncIntervalMinutes = 30;

function addLog(type, message) {
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    time: new Date().toISOString(),
    type: type || 'info', // info, success, warning, error
    message
  };

  logs.push(entry);
  if (logs.length > 300) logs.shift();

  // Broadcast to SSE clients
  const sseData = `data: ${JSON.stringify(entry)}\n\n`;
  sseClients.forEach(client => client.res.write(sseData));
}

// Redirect console logs to GUI stream
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(...args);
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  let type = 'info';
  if (msg.includes('Done.') || msg.includes('Connected') || msg.includes('synced')) type = 'success';
  if (msg.includes('warning') || msg.includes('not reachable')) type = 'warning';
  addLog(type, msg);
};

console.error = (...args) => {
  originalError(...args);
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  addLog('error', msg);
};

/** TCP probe helper */
function isDeviceReachable(ip, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (reachable, latencyMs = 0) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ reachable, latencyMs });
      }
    };

    const startTime = Date.now();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true, Date.now() - startTime));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
    socket.connect(port, ip);
  });
}

/** State file handler */
const STATE_FILE = path.join(__dirname, '.sync-state.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('Could not persist sync state:', err.message);
  }
}

/** Core sync procedure */
async function runSync(fullSync = false) {
  if (isSyncing) {
    throw new Error('A sync process is already running.');
  }

  const API_URL     = (process.env.HRIS_API_URL || '').replace(/\/$/, '');
  const TOKEN       = process.env.SYNC_AGENT_TOKEN;
  const DEVICE_IP   = process.env.ZKTECO_IP;
  const DEVICE_PORT = Number(process.env.ZKTECO_PORT) || 4370;
  const TIMEOUT     = Number(process.env.ZKTECO_TIMEOUT_MS) || 10000;
  const LOOKBACK_DAYS      = Number(process.env.LOOKBACK_DAYS) || 3;
  const FULL_LOOKBACK_DAYS = Number(process.env.FULL_LOOKBACK_DAYS) || 60;
  const BATCH_SIZE         = Number(process.env.BATCH_SIZE) || 2000;

  if (!API_URL)   throw new Error('HRIS_API_URL is not set.');
  if (!TOKEN)     throw new Error('SYNC_AGENT_TOKEN is not set.');
  if (!DEVICE_IP) throw new Error('ZKTECO_IP is not set.');

  isSyncing = true;
  try {
    console.log(`Probing biometric device at ${DEVICE_IP}:${DEVICE_PORT} ...`);
    const probe = await isDeviceReachable(DEVICE_IP, DEVICE_PORT, 4000);
    if (!probe.reachable) {
      console.log('Device not reachable — confirm the laptop is on the office network and IP is correct.');
      writeState({ ...readState(), lastRunAt: new Date().toISOString(), status: 'unreachable' });
      return { success: false, reason: 'Device unreachable' };
    }

    const state = readState();
    const lookbackDays = fullSync ? FULL_LOOKBACK_DAYS : LOOKBACK_DAYS;
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    console.log(`Reading punches since ${cutoff.toISOString()} (${lookbackDays}-day window${fullSync ? ', full sync' : ''})`);

    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, TIMEOUT, 0);
    let rawLogs = [];

    try {
      await zk.createSocket();
      console.log('Connected to device.');
      const result = await zk.getAttendances();
      rawLogs = result?.data || [];
      console.log(`Device returned ${rawLogs.length} total punch records.`);
    } catch (err) {
      try { await zk.disconnect(); } catch {}
      throw new Error(`Could not read from device: ${err.message}`);
    }

    try { await zk.disconnect(); } catch {}

    const punches = [];
    for (const entry of rawLogs) {
      const ts = new Date(entry.recordTime);
      if (isNaN(ts.getTime()) || ts < cutoff) continue;
      punches.push({
        deviceUserId: String(entry.deviceUserId).trim(),
        timestamp: ts.toISOString(),
      });
    }

    if (punches.length === 0) {
      console.log('No punches found in the lookback window. Nothing to send.');
      writeState({ ...state, lastRunAt: new Date().toISOString(), lastSent: 0, status: 'ok' });
      return { success: true, count: 0, synced: 0, skipped: 0 };
    }

    console.log(`Sending ${punches.length} punches to ${API_URL} ...`);

    let totalSynced = 0;
    let totalSkipped = 0;

    for (let i = 0; i < punches.length; i += BATCH_SIZE) {
      const batch = punches.slice(i, i + BATCH_SIZE);
      const batchNo = Math.floor(i / BATCH_SIZE) + 1;
      
      const res = await fetch(`${API_URL}/attendance/punches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': TOKEN,
        },
        body: JSON.stringify({ punches: batch }),
      });

      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }

      if (!res.ok) {
        throw new Error(`Server responded ${res.status}: ${body.error || text.slice(0, 200)}`);
      }

      totalSynced += body.synced || 0;
      totalSkipped += body.skipped || 0;
      console.log(`Batch ${batchNo}: sent ${batch.length}, synced ${body.synced}, skipped ${body.skipped}`);
    }

    const newState = {
      lastRunAt: new Date().toISOString(),
      lastSent: punches.length,
      lastSynced: totalSynced,
      lastSkipped: totalSkipped,
      status: 'ok'
    };
    writeState(newState);

    console.log(`Done. Records written: ${totalSynced}, skipped (unknown device users): ${totalSkipped}`);
    return { success: true, count: punches.length, synced: totalSynced, skipped: totalSkipped };

  } finally {
    isSyncing = false;
  }
}

// REST Endpoints

/** Stream logs via Server-Sent Events */
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  sseClients.push({ id: clientId, res });

  // Send historical logs first
  res.write(`data: ${JSON.stringify({ type: 'init', history: logs })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

/** Get current state & device/api status */
app.get('/api/status', async (req, res) => {
  const state = readState();
  res.json({
    isSyncing,
    autoSyncActive,
    autoSyncIntervalMinutes,
    lastState: state,
    env: {
      DEVICE_IP: process.env.ZKTECO_IP || '',
      DEVICE_PORT: process.env.ZKTECO_PORT || 4370,
      HRIS_API_URL: process.env.HRIS_API_URL || '',
      LOOKBACK_DAYS: process.env.LOOKBACK_DAYS || 3,
    }
  });
});

/** Quick probe device endpoint */
app.post('/api/test-device', async (req, res) => {
  const body = req.body || {};
  const ip = body.ip || process.env.ZKTECO_IP;
  const port = Number(body.port || process.env.ZKTECO_PORT || 4370);
  try {
    const result = await isDeviceReachable(ip, port, 4000);
    res.json(result);
  } catch (err) {
    res.json({ reachable: false, error: err.message });
  }
});

/** Quick probe HRIS server token test */
app.post('/api/test-api', async (req, res) => {
  const body = req.body || {};
  const apiUrl = (body.apiUrl || process.env.HRIS_API_URL || '').replace(/\/$/, '');
  const token  = body.token || process.env.SYNC_AGENT_TOKEN;
  try {
    const response = await fetch(`${apiUrl}/attendance/punches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': token
      },
      body: JSON.stringify({ punches: [] })
    });
    const text = await response.text();
    if (response.status === 200 || response.status === 400) {
      res.json({ ok: true, status: response.status, message: 'HRIS API accepted secret token!' });
    } else {
      res.json({ ok: false, status: response.status, message: text || `HTTP ${response.status}` });
    }
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

/** Read env config */
app.get('/api/config', (req, res) => {
  res.json({
    HRIS_API_URL: process.env.HRIS_API_URL || '',
    SYNC_AGENT_TOKEN: process.env.SYNC_AGENT_TOKEN || '',
    ZKTECO_IP: process.env.ZKTECO_IP || '',
    ZKTECO_PORT: process.env.ZKTECO_PORT || '4370',
    ZKTECO_TIMEOUT_MS: process.env.ZKTECO_TIMEOUT_MS || '10000',
    LOOKBACK_DAYS: process.env.LOOKBACK_DAYS || '3',
    FULL_LOOKBACK_DAYS: process.env.FULL_LOOKBACK_DAYS || '60',
    BATCH_SIZE: process.env.BATCH_SIZE || '2000'
  });
});

/** Update env config */
app.post('/api/config', (req, res) => {
  try {
    const envVars = {
      HRIS_API_URL: req.body.HRIS_API_URL?.trim() || '',
      SYNC_AGENT_TOKEN: req.body.SYNC_AGENT_TOKEN?.trim() || '',
      ZKTECO_IP: req.body.ZKTECO_IP?.trim() || '',
      ZKTECO_PORT: req.body.ZKTECO_PORT?.trim() || '4370',
      ZKTECO_TIMEOUT_MS: req.body.ZKTECO_TIMEOUT_MS?.trim() || '10000',
      LOOKBACK_DAYS: req.body.LOOKBACK_DAYS?.trim() || '3',
      FULL_LOOKBACK_DAYS: req.body.FULL_LOOKBACK_DAYS?.trim() || '60',
      BATCH_SIZE: req.body.BATCH_SIZE?.trim() || '2000',
    };

    let content = `# Brandigade HRIS - sync-agent configuration\n`;
    for (const [key, val] of Object.entries(envVars)) {
      content += `${key}=${val}\n`;
      process.env[key] = val;
    }

    const envPath = path.join(__dirname, '.env');
    const txtPath = path.join(__dirname, '..', 'sync-agent-config.txt');

    fs.writeFileSync(envPath, content);
    try { fs.writeFileSync(txtPath, content); } catch {}

    console.log('Configuration updated successfully.');
    res.json({ success: true, message: 'Configuration saved!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Trigger manual sync */
app.post('/api/sync', async (req, res) => {
  const fullSync = Boolean(req.body.full);
  try {
    const result = await runSync(fullSync);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Configure Auto Sync Timer */
app.post('/api/auto-sync', (req, res) => {
  const { active, intervalMinutes } = req.body;
  
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  autoSyncActive = Boolean(active);
  if (intervalMinutes) autoSyncIntervalMinutes = Number(intervalMinutes);

  if (autoSyncActive) {
    const ms = autoSyncIntervalMinutes * 60 * 1000;
    console.log(`Auto-sync enabled: running every ${autoSyncIntervalMinutes} minutes.`);
    autoSyncTimer = setInterval(() => {
      console.log('[Auto-Sync] Scheduled interval triggered...');
      runSync(false).catch(err => console.error('[Auto-Sync] Error:', err.message));
    }, ms);
  } else {
    console.log('Auto-sync disabled.');
  }

  res.json({ autoSyncActive, autoSyncIntervalMinutes });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Brandigade Biometric Sync Agent GUI `);
  console.log(` Running locally on: http://localhost:${PORT}`);
  console.log(`===================================================`);
});

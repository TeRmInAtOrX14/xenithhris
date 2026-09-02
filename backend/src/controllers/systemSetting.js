const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Default settings fallback values
const DEFAULT_SETTINGS = {
  usdToPkrRate: '280',
  showDesignerPayments: 'false'
};

/**
 * GET /api/system/settings
 * Public/Authenticated endpoint to fetch current global settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settingsList = await prisma.systemSetting.findMany();
    const settingsMap = { ...DEFAULT_SETTINGS };

    settingsList.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    res.json({
      usdToPkrRate: parseFloat(settingsMap.usdToPkrRate) || 280,
      showDesignerPayments: settingsMap.showDesignerPayments === 'true',
      rawSettings: settingsMap
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/system/settings
 * CEO / Admin only endpoint to update exchange rate and designer payment visibility
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(req.user.role);
    if (!isCEOOrAdmin) {
      return res.status(403).json({ error: 'Only the CEO / Admin can update global currency and system settings.' });
    }

    const { usdToPkrRate, showDesignerPayments } = req.body;

    const updates = [];

    if (usdToPkrRate !== undefined && usdToPkrRate !== null) {
      const numRate = parseFloat(usdToPkrRate);
      if (isNaN(numRate) || numRate <= 0) {
        return res.status(400).json({ error: 'Exchange rate must be a valid positive number.' });
      }
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'usdToPkrRate' },
          update: { value: numRate.toString() },
          create: { key: 'usdToPkrRate', value: numRate.toString(), description: 'Global USD to PKR Exchange Rate' }
        })
      );
    }

    if (showDesignerPayments !== undefined && showDesignerPayments !== null) {
      const boolVal = Boolean(showDesignerPayments).toString();
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'showDesignerPayments' },
          update: { value: boolVal },
          create: { key: 'showDesignerPayments', value: boolVal, description: 'CEO toggle to display designer payment info to Designers' }
        })
      );
    }

    await prisma.$transaction(updates);

    // Create Audit Log
    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_SYSTEM_SETTINGS',
          entityType: 'SystemSetting',
          details: { usdToPkrRate, showDesignerPayments }
        }
      }).catch(() => {});
    }

    // Fetch updated settings to return
    const settingsList = await prisma.systemSetting.findMany();
    const settingsMap = { ...DEFAULT_SETTINGS };
    settingsList.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    res.json({
      message: 'System settings updated successfully',
      usdToPkrRate: parseFloat(settingsMap.usdToPkrRate) || 280,
      showDesignerPayments: settingsMap.showDesignerPayments === 'true'
    });
  } catch (err) {
    next(err);
  }
};

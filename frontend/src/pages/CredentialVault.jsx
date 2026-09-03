import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Plus, X, Eye, EyeOff, Copy, ExternalLink,
  Shield, AlertCircle, Trash2, Pencil, User, Globe,
  CheckCircle2, Loader2, Search, Filter
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PLATFORMS = ['LinkedIn', 'Apollo.io', 'Instantly', 'Lemlist', 'HubSpot', 'Gmail', 'Outlook', 'Salesforce', 'Pipedrive', 'Hunter.io', 'Other'];
const ACCOUNT_TYPES = ['primary', 'backup', 'shared'];

const typeColors = {
  primary: 'bg-brand-blue/20 text-brand-cyan border-brand-blue/30',
  backup: 'bg-brand-amber/15 text-brand-amber border-brand-amber/30',
  shared: 'bg-brand-violet/15 text-brand-violet border-brand-violet/30'
};

const platformIcons = {
  LinkedIn: '🔗',
  'Apollo.io': '🚀',
  Instantly: '⚡',
  Lemlist: '📧',
  HubSpot: '🟠',
  Gmail: '📬',
  Outlook: '📮',
  Salesforce: '☁️',
  Pipedrive: '📊',
  'Hunter.io': '🎯',
  Other: '🔐'
};

export default function CredentialVault() {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [saving, setSaving] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);

  const emptyForm = {
    platform: 'LinkedIn',
    label: '',
    username: '',
    passwordHint: '',
    url: '',
    accountType: 'primary',
    notes: '',
    employeeId: ''
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterEmployee) params.append('employeeId', filterEmployee);
      if (filterType) params.append('accountType', filterType);
      const res = await api.get(`/vault?${params}`);
      setEntries(res.data || []);
      if (isCEOOrAdmin) {
        const empRes = await api.get('/employees');
        setEmployees(empRes.data || []);
      }
    } catch (e) {
      toast.error('Failed to load credential vault');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterEmployee, filterType]);

  const openAdd = () => {
    setEditEntry(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      platform: entry.platform,
      label: entry.label,
      username: entry.username || '',
      passwordHint: entry.passwordHint || '',
      url: entry.url || '',
      accountType: entry.accountType || 'primary',
      notes: entry.notes || '',
      employeeId: entry.employeeId || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.platform || !form.label) {
      toast.error('Platform and Label are required');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form };
      if (!isCEOOrAdmin) delete payload.employeeId;

      if (editEntry) {
        await api.put(`/vault/${editEntry.id}`, payload);
        toast.success('Credential entry updated');
      } else {
        await api.post('/vault', payload);
        toast.success('Credential entry added');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/vault/${id}`);
      toast.success('Entry deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const toggleReveal = (id) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  const filtered = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.platform?.toLowerCase().includes(q) ||
      e.label?.toLowerCase().includes(q) ||
      e.username?.toLowerCase().includes(q) ||
      e.url?.toLowerCase().includes(q) ||
      e.employee?.fullName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-cyan" />
            Credential Vault
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">
            Secure outreach platform accounts, backup credentials, and access logs.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg hover:scale-[1.02] transition-all font-bold font-display text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/20"
        >
          <Plus className="w-4 h-4" />
          Add Credential
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border border-brand-border bg-brand-bg-soft/40">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-brand-text-mute absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by platform, label, username..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg/60 border border-brand-border text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-brand-cyan"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg/60 text-xs text-white focus:outline-none cursor-pointer"
        >
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        {isCEOOrAdmin && (
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg/60 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">All Staff</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: entries.length, color: 'text-brand-cyan' },
          { label: 'Primary', value: entries.filter(e => e.accountType === 'primary').length, color: 'text-brand-blue' },
          { label: 'Backup', value: entries.filter(e => e.accountType === 'backup').length, color: 'text-brand-amber' },
          { label: 'Active', value: entries.filter(e => e.isActive).length, color: 'text-brand-green' }
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl glass-panel border border-brand-border/40">
            <p className="text-[9px] font-bold text-brand-text-mute uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-extrabold ${stat.color} font-display mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Entries Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-brand-border/40">
          <Shield className="w-10 h-10 text-brand-text-mute mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No credentials found</p>
          <p className="text-xs text-brand-text-soft mt-1">Add your first platform account to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl glass-panel border ${entry.isActive ? 'border-brand-border/40' : 'border-brand-border/20 opacity-60'} hover:border-brand-border-strong transition-all`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-bg-elevated flex items-center justify-center text-lg border border-brand-border/60">
                    {platformIcons[entry.platform] || '🔐'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-display">{entry.platform}</h3>
                    <p className="text-[10px] text-brand-text-soft">{entry.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${typeColors[entry.accountType] || typeColors.primary}`}>
                    {entry.accountType}
                  </span>
                </div>
              </div>

              {/* Employee badge (CEO view) */}
              {isCEOOrAdmin && entry.employee && (
                <div className="flex items-center gap-1.5 mb-3 p-2 rounded-lg bg-brand-bg-elevated/40">
                  <User className="w-3 h-3 text-brand-cyan" />
                  <span className="text-[10px] text-brand-text-soft font-mono">{entry.employee.fullName}</span>
                  <span className="text-[9px] text-brand-text-mute ml-auto">{entry.employee.designation}</span>
                </div>
              )}

              {/* Credentials */}
              <div className="space-y-2">
                {entry.username && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-brand-bg-elevated/30 border border-brand-border/30">
                    <div>
                      <p className="text-[9px] text-brand-text-mute uppercase font-bold">Username</p>
                      <p className="text-xs text-white font-mono">{entry.username}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(entry.username, 'Username')}
                      className="p-1.5 rounded-lg hover:bg-brand-bg-elevated text-brand-text-mute hover:text-brand-cyan transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {entry.passwordHint && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-brand-bg-elevated/30 border border-brand-border/30">
                    <div>
                      <p className="text-[9px] text-brand-text-mute uppercase font-bold">Password Hint</p>
                      <p className="text-xs font-mono text-white">
                        {revealedIds.has(entry.id) ? entry.passwordHint : '••••••••'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleReveal(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-brand-bg-elevated text-brand-text-mute hover:text-brand-cyan transition-colors"
                    >
                      {revealedIds.has(entry.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {entry.url && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-brand-bg-elevated/30 border border-brand-border/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3 h-3 text-brand-blue shrink-0" />
                      <p className="text-[10px] text-brand-cyan font-mono truncate">{entry.url}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => copyToClipboard(entry.url, 'URL')}
                        className="p-1.5 rounded-lg hover:bg-brand-bg-elevated text-brand-text-mute hover:text-brand-cyan transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-brand-bg-elevated text-brand-text-mute hover:text-brand-cyan transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <p className="text-[10px] text-brand-text-mute italic p-2">📝 {entry.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-brand-border/40">
                <button
                  onClick={() => openEdit(entry)}
                  className="flex-1 py-1.5 rounded-xl border border-brand-border text-[10px] font-bold text-brand-text-soft hover:text-white hover:border-brand-blue/50 transition-all flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(entry)}
                  className="py-1.5 px-3 rounded-xl border border-brand-border text-[10px] font-bold text-brand-text-mute hover:text-brand-red hover:border-brand-red/40 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display">
                    {editEntry ? 'Edit Credential' : 'Add New Credential'}
                  </h3>
                  <p className="text-[10px] text-brand-text-mute mt-0.5">
                    {editEntry ? 'Update platform account details' : 'Log a new outreach platform account'}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Platform */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Platform</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm({ ...form, platform: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{platformIcons[p] || '🔐'} {p}</option>)}
                  </select>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Account Label</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Primary Account, Backup #1"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Account Type</label>
                  <select
                    value={form.accountType}
                    onChange={e => setForm({ ...form, accountType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>

                {/* CEO: assign to employee */}
                {isCEOOrAdmin && !editEntry && (
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Assign To Employee</label>
                    <select
                      value={form.employeeId}
                      onChange={e => setForm({ ...form, employeeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">Own Vault (Admin's)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.designation})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Username */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Username / Email</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. john.doe@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Password Hint */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Password Hint</label>
                  <input
                    type="text"
                    value={form.passwordHint}
                    onChange={e => setForm({ ...form, passwordHint: e.target.value })}
                    placeholder="e.g. Same as main + !2024 (DO NOT store full passwords)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                  <p className="text-[9px] text-brand-amber mt-1">⚠️ Store hints only — never plain text passwords</p>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Platform URL</label>
                  <input
                    type="text"
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    placeholder="e.g. linkedin.com/in/username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional context, restrictions, or instructions..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-brand-bg font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editEntry ? 'Update Entry' : 'Add Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-red/40 rounded-2xl p-6 max-w-sm w-full text-center shadow-glow"
            >
              <Trash2 className="w-8 h-8 text-brand-red mx-auto mb-3" />
              <h3 className="text-sm font-extrabold text-white">Delete Credential?</h3>
              <p className="text-xs text-brand-text-soft mt-2">
                Are you sure you want to delete <strong className="text-white">{deleteConfirm.platform} — {deleteConfirm.label}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="flex-1 py-2 rounded-xl bg-brand-red/80 hover:bg-brand-red text-white font-bold text-xs"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

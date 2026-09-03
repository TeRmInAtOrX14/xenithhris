import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Search,
  DollarSign,
  FileCode,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Upload,
  BadgeDollarSign,
  X,
  UserPlus,
  KeyRound,
  Eye,
  ShieldCheck,
  Trash2,
  Pencil,
  Copy
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STAGES = ['Initial Sketch', 'Line Art', 'Base Color', 'Final Artwork'];

export default function ArtistAssignments() {
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [showDesignerPayments, setShowDesignerPayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Stage Update Modal
  const [selectedProject, setSelectedProject] = useState(null);
  const [newStage, setNewStage] = useState('Initial Sketch');
  const [stageNotes, setStageNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Payout Request Modal (Designer only)
  const [payoutProject, setPayoutProject] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState([]);

  // CEO Artist Credentials Management States
  const [artistModalOpen, setArtistModalOpen] = useState(false);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [artistsList, setArtistsList] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  const [artistForm, setArtistForm] = useState({
    fullName: '',
    email: '',
    password: 'xenith@123',
    designation: 'Graphic Designer',
    baseSalary: '100000',
    phone: '',
    employeeCode: ''
  });

  const [credForm, setCredForm] = useState({
    password: '',
    email: '',
    isActive: true
  });

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isDesigner = currentUser.role === 'Designer';
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);

  const fetchDesignerData = async () => {
    try {
      setLoading(true);
      if (isDesigner) {
        // Fetch dedicated Designer Portal workspace data
        const res = await api.get(`/employees/designer/projects${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
        setProjects(res.data.projects || []);
        setMetrics(res.data.metrics || null);
        setShowDesignerPayments(res.data.showDesignerPayments || false);
        // Fetch payout requests for this designer
        try {
          const prRes = await api.get('/payout-requests');
          setPayoutRequests(prRes.data || []);
        } catch (_) { /* silent */ }
      } else {
        // Fetch all sales/projects for CEO/Team Lead
        const res = await api.get(`/sales${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
        setProjects(res.data || []);
        
        // CEO/Admin setting check
        const sysRes = await api.get('/system/settings');
        setShowDesignerPayments(sysRes.data.showDesignerPayments);

        // Fetch Artists list for CEO Credentials management
        if (isCEOOrAdmin) {
          try {
            const empRes = await api.get('/employees');
            const artists = (empRes.data || []).filter(e =>
              e.user?.role === 'Designer' ||
              e.isArtist ||
              (e.designation || '').toLowerCase().includes('designer') ||
              (e.designation || '').toLowerCase().includes('artist')
            );
            setArtistsList(artists);
          } catch (_) { /* silent */ }
        }
      }
    } catch (e) {
      toast.error('Failed to load designer project assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignerData();
  }, [searchQuery]);

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      setUpdating(true);
      await api.patch(`/sales/${selectedProject.id}/stage`, {
        newStage,
        notes: stageNotes
      });
      toast.success(`Project stage updated to "${newStage}"`);
      setSelectedProject(null);
      setStageNotes('');
      fetchDesignerData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update project stage');
    } finally {
      setUpdating(false);
    }
  };

  const calculateDaysInStage = (updatedAt) => {
    const diff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  };

  const getStageIndex = (stageName) => {
    const idx = STAGES.indexOf(stageName);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-cyan" />
            Artist Portal & Project Stage Workspace
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">
            Track assigned artwork projects (#PRJ-1024), 4-stage progression, briefs, and client requirements.
          </p>
        </div>

        {/* Search Bar & CEO Artist Management Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar for #PRJ-1024 or Project/Client Name */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-brand-text-mute absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by #PRJ-1024 or Name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-brand-bg-soft/40 border border-brand-border text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-brand-blue"
            />
          </div>

          {isCEOOrAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCredentialsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-brand-border hover:border-brand-violet/50 bg-brand-bg-soft/40 text-xs font-bold text-brand-violet hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Artist Credentials
              </button>

              <button
                onClick={() => {
                  setArtistForm({
                    fullName: '',
                    email: '',
                    password: 'xenith@123',
                    designation: 'Graphic Designer',
                    baseSalary: '100000',
                    phone: '',
                    employeeCode: `ART-${101 + artistsList.length}`
                  });
                  setArtistModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-blue text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-brand-violet/20"
              >
                <UserPlus className="w-4 h-4" /> Add Artist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Header for Designer */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl glass-panel border border-brand-border/40">
            <p className="text-[9px] font-bold text-brand-text-mute uppercase tracking-widest">Total Assigned</p>
            <p className="text-2xl font-extrabold text-white font-display mt-1">{metrics.totalAssigned}</p>
          </div>
          <div className="p-4 rounded-2xl glass-panel border border-brand-amber/30">
            <p className="text-[9px] font-bold text-brand-amber uppercase tracking-widest">In Progress</p>
            <p className="text-2xl font-extrabold text-brand-amber font-display mt-1">{metrics.inProgress}</p>
          </div>
          <div className="p-4 rounded-2xl glass-panel border border-brand-green/30">
            <p className="text-[9px] font-bold text-brand-green uppercase tracking-widest">Completed</p>
            <p className="text-2xl font-extrabold text-brand-green font-display mt-1">{metrics.completed}</p>
          </div>
        </div>
      )}

      {/* Work Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const daysInStage = calculateDaysInStage(project.stageUpdatedAt);
          const isStagnant = daysInStage > 5 && project.projectStage !== 'Final Artwork';
          const currentStageIdx = getStageIndex(project.projectStage);

          return (
            <motion.div
              key={project.id}
              className={`p-5 rounded-2xl glass-panel border transition-all flex flex-col justify-between space-y-4 ${
                isStagnant ? 'border-brand-amber/50 hover-glow-amber' : 'border-brand-border/40 hover:border-brand-border-strong'
              }`}
            >
              <div className="space-y-3">
                {/* Project Header */}
                <div className="flex items-center justify-between border-b border-brand-border/40 pb-2.5">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-brand-blue/20 text-brand-cyan text-[10px] font-mono font-bold uppercase tracking-wider">
                      {project.projectNumber || '#PRJ-1000'}
                    </span>
                    <h3 className="text-sm font-extrabold text-white mt-1 font-display">{project.projectName}</h3>
                    <p className="text-[11px] text-brand-text-soft">Client: {project.clientName}</p>
                  </div>
                  {isStagnant && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/30 text-[9px] font-extrabold uppercase animate-pulse flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      &gt;5 Days Stagnant
                    </span>
                  )}
                </div>

                {/* Assigned Designer & Sales Exec */}
                <div className="flex items-center justify-between text-[10px] text-brand-text-mute">
                  <span className="flex items-center gap-1 font-mono">
                    <User className="w-3 h-3 text-brand-cyan" />
                    Designer: <strong className="text-white">{project.designer?.fullName || 'Assigned to You'}</strong>
                  </span>
                  <span>Sales Exec: {project.employee?.fullName}</span>
                </div>

                {/* 4-Stage Visual Progress Bar */}
                <div className="space-y-1.5 bg-brand-bg-soft/40 p-3 rounded-xl border border-brand-border/30">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1">
                    <span>Stage: <span className="text-brand-cyan">{project.projectStage}</span></span>
                    <span className="text-brand-text-mute font-mono">{daysInStage} days in stage</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {STAGES.map((stg, i) => {
                      const isDone = i < currentStageIdx;
                      const isCurrent = i === currentStageIdx;
                      return (
                        <div key={stg} className="flex flex-col items-center">
                          <div
                            className={`w-full h-2 rounded-full transition-all ${
                              isDone
                                ? 'bg-brand-green'
                                : isCurrent
                                ? 'bg-brand-cyan animate-pulse'
                                : 'bg-brand-border/60'
                            }`}
                          />
                          <span className={`text-[8px] font-mono mt-1 ${isCurrent ? 'text-brand-cyan font-bold' : isDone ? 'text-brand-green' : 'text-brand-text-mute'}`}>
                            {stg.split(' ')[0]} {isDone ? '✓' : isCurrent ? '→' : '○'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Financial Section (Conditional based on CEO setting or Admin) */}
                <div className="p-3 rounded-xl bg-brand-bg-soft/30 border border-brand-border/30">
                  {showDesignerPayments || isCEOOrAdmin ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="block text-[8px] uppercase text-brand-text-mute">Designer Fee</span>
                        <strong className="text-xs text-white font-mono">${project.designerFee || 0}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-brand-text-mute">Paid</span>
                        <strong className="text-xs text-brand-green font-mono">${project.amountPaidToDesigner || 0}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-brand-text-mute">Remaining</span>
                        <strong className="text-xs text-brand-amber font-mono">
                          ${Math.max(0, (project.designerFee || 0) - (project.amountPaidToDesigner || 0))}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-brand-text-mute italic">
                      <Lock className="w-3.5 h-3.5 text-brand-text-mute" />
                      Designer Payment Info: Hidden by Management
                    </div>
                  )}
                </div>

                {/* Stage Logs & Briefs Quick Links */}
                {project.briefs && project.briefs.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-brand-cyan">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Brief Version v{project.briefs[0].version} ({project.briefs[0].fileName})</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setNewStage(project.projectStage);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-cyan hover:text-white border border-brand-blue/30 text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Update Project Stage
                </button>

                {/* Request Expedited Payout — Designers only */}
                {isDesigner && (project.designerFee || 0) > (project.amountPaidToDesigner || 0) && (() => {
                  const existingReq = payoutRequests.find(r => r.saleId === project.id);
                  const isPending = existingReq?.status === 'pending';
                  const isPaid = existingReq?.status === 'paid' || existingReq?.status === 'approved';
                  return (
                    <button
                      onClick={() => {
                        if (isPending || isPaid) return;
                        setPayoutProject(project);
                        setPayoutAmount(String(Math.max(0, (project.designerFee || 0) - (project.amountPaidToDesigner || 0))));
                        setPayoutReason('');
                      }}
                      disabled={isPending || isPaid}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isPaid
                          ? 'bg-brand-green/10 text-brand-green border-brand-green/30 cursor-default'
                          : isPending
                          ? 'bg-brand-amber/10 text-brand-amber border-brand-amber/30 cursor-default animate-pulse'
                          : 'bg-brand-violet/15 hover:bg-brand-violet/25 text-brand-violet hover:text-white border-brand-violet/30'
                      }`}
                    >
                      <BadgeDollarSign className="w-3.5 h-3.5" />
                      {isPaid ? 'Payout Processed' : isPending ? 'Payout Request Pending...' : 'Request Expedited Payout'}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          );
        })}
      </div>

      {projects.length === 0 && !loading && (
        <div className="p-12 text-center glass-panel rounded-2xl border border-brand-border/40">
          <Palette className="w-10 h-10 text-brand-text-mute mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No assigned projects found</p>
          <p className="text-xs text-brand-text-soft mt-1">Try searching by a different Project Number or Client Name.</p>
        </div>
      )}

      {/* Stage Update Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-bold text-brand-cyan uppercase font-mono">{selectedProject.projectNumber}</span>
                  <h3 className="text-sm font-extrabold text-white font-display">Update Stage: {selectedProject.projectName}</h3>
                </div>
                <button onClick={() => setSelectedProject(null)} className="text-brand-text-mute hover:text-white">✕</button>
              </div>

              <form onSubmit={handleUpdateStage} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Select New Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {STAGES.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Work Notes / Deliverable Updates</label>
                  <textarea
                    rows={3}
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    placeholder="e.g. Completed initial sketch outline, awaiting feedback..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="px-4 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-brand-bg font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Save Stage Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Request Modal */}
      <AnimatePresence>
        {payoutProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-violet/40 rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-bold text-brand-violet uppercase font-mono">{payoutProject.projectNumber}</span>
                  <h3 className="text-sm font-extrabold text-white font-display">Request Expedited Payout</h3>
                  <p className="text-[10px] text-brand-text-mute mt-0.5">This request will be sent to CEO for approval</p>
                </div>
                <button onClick={() => setPayoutProject(null)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-brand-bg-soft/40 border border-brand-border/30 text-center">
                <div>
                  <p className="text-[9px] text-brand-text-mute uppercase font-bold">Total Fee</p>
                  <p className="text-xs font-bold text-white">${payoutProject.designerFee || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] text-brand-text-mute uppercase font-bold">Paid So Far</p>
                  <p className="text-xs font-bold text-brand-green">${payoutProject.amountPaidToDesigner || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] text-brand-text-mute uppercase font-bold">Remaining</p>
                  <p className="text-xs font-bold text-brand-amber">
                    ${Math.max(0, (payoutProject.designerFee || 0) - (payoutProject.amountPaidToDesigner || 0))}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Amount to Request ($)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  max={Math.max(0, (payoutProject.designerFee || 0) - (payoutProject.amountPaidToDesigner || 0))}
                  min={1}
                  step={0.01}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Reason / Context</label>
                <textarea
                  rows={3}
                  value={payoutReason}
                  onChange={e => setPayoutReason(e.target.value)}
                  placeholder="e.g. Final artwork delivered, urgent financial need..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setPayoutProject(null)}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setSubmittingPayout(true);
                        await api.post('/payout-requests', {
                          saleId: payoutProject.id,
                          requestedAmountUsd: parseFloat(payoutAmount),
                          reason: payoutReason
                        });
                        toast.success('Payout request submitted to CEO');
                        setPayoutProject(null);
                        fetchDesignerData();
                      } catch (err) {
                        toast.error(err.response?.data?.error || 'Failed to submit payout request');
                      } finally {
                        setSubmittingPayout(false);
                      }
                    }}
                    disabled={submittingPayout || !payoutAmount}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-blue text-white font-bold text-xs uppercase hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingPayout ? 'Submitting...' : 'Submit Payout Request'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CEO Add Artist Modal */}
        <AnimatePresence>
          {artistModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-bg-elevated border border-brand-violet/40 rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow"
              >
                <div className="flex items-center justify-between border-b border-brand-border pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-display flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-brand-violet" /> Create Artist Account
                    </h3>
                    <p className="text-[10px] text-brand-text-mute">Set up portal login credentials for an Artist / Designer</p>
                  </div>
                  <button onClick={() => setArtistModalOpen(false)} className="text-brand-text-mute hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api.post('/employees', {
                        ...artistForm,
                        role: 'Designer',
                        isArtist: true,
                        attendanceExempt: true
                      });
                      toast.success(`Artist account created for ${artistForm.fullName}!`);
                      setArtistModalOpen(false);
                      fetchDesignerData();
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to create artist account');
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={artistForm.fullName}
                        onChange={e => setArtistForm({ ...artistForm, fullName: e.target.value })}
                        required
                        placeholder="e.g. Zainab Malik"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Employee Code *</label>
                      <input
                        type="text"
                        value={artistForm.employeeCode}
                        onChange={e => setArtistForm({ ...artistForm, employeeCode: e.target.value })}
                        required
                        placeholder="e.g. ART-101"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Login Email *</label>
                      <input
                        type="email"
                        value={artistForm.email}
                        onChange={e => setArtistForm({ ...artistForm, email: e.target.value })}
                        required
                        placeholder="artist@artxenith.com"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Portal Password *</label>
                      <input
                        type="text"
                        value={artistForm.password}
                        onChange={e => setArtistForm({ ...artistForm, password: e.target.value })}
                        required
                        placeholder="xenith@123"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Designation</label>
                      <input
                        type="text"
                        value={artistForm.designation}
                        onChange={e => setArtistForm({ ...artistForm, designation: e.target.value })}
                        placeholder="Graphic Designer / 3D Artist"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Monthly Salary (PKR)</label>
                      <input
                        type="number"
                        value={artistForm.baseSalary}
                        onChange={e => setArtistForm({ ...artistForm, baseSalary: e.target.value })}
                        placeholder="100000"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setArtistModalOpen(false)}
                      className="flex-1 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-brand-violet text-white font-bold text-xs uppercase"
                    >
                      Create Artist Account
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CEO Manage Artist Credentials Directory Modal */}
        <AnimatePresence>
          {credentialsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-bg-elevated border border-brand-violet/40 rounded-2xl p-6 max-w-2xl w-full text-left space-y-4 shadow-glow max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-brand-border pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-display flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-brand-violet" /> Artist Credentials & Portal Access Directory
                    </h3>
                    <p className="text-[10px] text-brand-text-mute">Manage login emails, reset passwords, or revoke portal access for Artists</p>
                  </div>
                  <button onClick={() => setCredentialsModalOpen(false)} className="text-brand-text-mute hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Artists Directory List */}
                <div className="border border-brand-border/40 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-bg/80 text-[9px] uppercase font-bold text-brand-text-mute border-b border-brand-border/40">
                      <tr>
                        <th className="p-2.5">Artist Code & Name</th>
                        <th className="p-2.5">Login Email</th>
                        <th className="p-2.5">Designation</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 text-white">
                      {artistsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-brand-text-mute font-sans">
                            No artist accounts created yet. Click "Add Artist" to create one.
                          </td>
                        </tr>
                      ) : (
                        artistsList.map(art => (
                          <tr key={art.id} className="hover:bg-brand-bg-elevated/40">
                            <td className="p-2.5">
                              <div className="font-bold">{art.fullName}</div>
                              <div className="text-[9px] font-mono text-brand-cyan">{art.employeeCode}</div>
                            </td>
                            <td className="p-2.5 font-mono text-brand-text-soft text-[11px]">
                              {art.user?.email || 'No email'}
                            </td>
                            <td className="p-2.5 text-[11px] text-brand-text-soft">
                              {art.designation}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                art.user?.isActive !== false ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-red/15 text-brand-red'
                              }`}>
                                {art.user?.isActive !== false ? 'Active' : 'Revoked'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={async () => {
                                    const newPassword = prompt(`Enter new password for ${art.fullName}:`, 'xenith@123');
                                    if (!newPassword) return;
                                    try {
                                      await api.patch(`/employees/${art.id}/reset-password`, { password: newPassword });
                                      toast.success(`Password reset for ${art.fullName}!`);
                                      fetchDesignerData();
                                    } catch (err) {
                                      toast.error(err.response?.data?.error || 'Failed to reset password');
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-brand-violet/20 hover:bg-brand-violet/30 text-brand-violet text-[9px] font-bold uppercase flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-3 h-3" /> Password
                                </button>

                                <button
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to delete Artist account for ${art.fullName}?`)) return;
                                    try {
                                      await api.delete(`/employees/${art.id}`);
                                      toast.success(`Artist account for ${art.fullName} removed.`);
                                      fetchDesignerData();
                                    } catch (err) {
                                      toast.error(err.response?.data?.error || 'Failed to delete artist');
                                    }
                                  }}
                                  className="p-1 rounded text-brand-text-mute hover:text-brand-red"
                                  title="Remove Artist Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

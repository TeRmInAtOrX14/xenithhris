import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeDollarSign, CheckCircle2, XCircle, Clock, AlertTriangle,
  TrendingDown, DollarSign, User, Loader2, RefreshCw, ChevronDown,
  ArrowUpRight, AlertCircle, Sparkles, Lock, X
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-brand-amber/15 text-brand-amber border-brand-amber/30',
  approved: 'bg-brand-blue/15 text-brand-cyan border-brand-blue/30',
  rejected: 'bg-brand-red/15 text-brand-red border-brand-red/30',
  paid: 'bg-brand-green/15 text-brand-green border-brand-green/30'
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  paid: CheckCircle2
};

export default function PayoutRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [ceoNote, setCeoNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/payout-requests${params}`);
      setRequests(res.data || []);
    } catch (e) {
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const handleReview = async (action) => {
    if (!reviewModal) return;
    try {
      setSubmitting(true);
      await api.patch(`/payout-requests/${reviewModal.id}`, { action, ceoNote });
      toast.success(`Request ${action === 'approve' ? 'approved & paid' : 'rejected'} successfully`);
      setReviewModal(null);
      setCeoNote('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const totalPaidOut = requests.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalFloatExposure = requests
    .filter(r => r.status === 'paid' && r.floatContext?.floatImpact > 0)
    .reduce((s, r) => s + (r.floatContext?.floatImpact || 0), 0);

  if (!isCEOOrAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-10 h-10 text-brand-text-mute mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Access Restricted</p>
          <p className="text-xs text-brand-text-soft mt-1">This section is only accessible to CEO/Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5 text-brand-cyan" />
            Designer Payout Requests
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">
            Review and approve expedited artist payment requests. Monitor float exposure before approving.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-4 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel border border-brand-amber/30">
          <p className="text-[9px] font-bold text-brand-amber uppercase tracking-widest">Pending Approval</p>
          <p className="text-3xl font-extrabold text-brand-amber font-display mt-1">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-brand-border/40">
          <p className="text-[9px] font-bold text-brand-text-mute uppercase tracking-widest">Total Requests</p>
          <p className="text-3xl font-extrabold text-white font-display mt-1">{requests.length}</p>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-brand-green/30">
          <p className="text-[9px] font-bold text-brand-green uppercase tracking-widest">Total Disbursed</p>
          <p className="text-2xl font-extrabold text-brand-green font-display mt-1">${totalPaidOut.toFixed(0)}</p>
        </div>
        <div className={`p-4 rounded-2xl glass-panel border ${totalFloatExposure > 0 ? 'border-brand-red/40' : 'border-brand-border/40'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${totalFloatExposure > 0 ? 'text-brand-red' : 'text-brand-text-mute'}`}>Float Exposure</p>
          <p className={`text-2xl font-extrabold font-display mt-1 ${totalFloatExposure > 0 ? 'text-brand-red' : 'text-brand-text-mute'}`}>
            ${totalFloatExposure.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'paid', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all cursor-pointer ${
              statusFilter === s
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'border-brand-border text-brand-text-soft hover:text-white hover:border-brand-orange/50'
            }`}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-brand-border/40">
          <BadgeDollarSign className="w-10 h-10 text-brand-text-mute mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No payout requests found</p>
          <p className="text-xs text-brand-text-soft mt-1">Requests from designers will appear here for your review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock;
            const floatImpact = req.floatContext?.floatImpact || 0;
            const isFloatNegative = floatImpact > 0;

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-2xl glass-panel border transition-all ${
                  req.status === 'pending' ? 'border-brand-amber/40 hover:border-brand-amber/60' : 'border-brand-border/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Request info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-bg-elevated flex items-center justify-center border border-brand-border">
                        <User className="w-4 h-4 text-brand-cyan" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-white">{req.designer?.fullName}</p>
                        <p className="text-[10px] text-brand-text-mute font-mono">{req.designer?.employeeCode}</p>
                      </div>
                      <span className={`ml-auto sm:ml-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center gap-1 ${STATUS_COLORS[req.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {req.status}
                      </span>
                    </div>

                    {/* Project info */}
                    <div className="p-3 rounded-xl bg-brand-bg-elevated/40 border border-brand-border/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-brand-cyan font-mono bg-brand-blue/20 px-2 py-0.5 rounded">
                          {req.sale?.projectNumber}
                        </span>
                        <span className="text-xs font-bold text-white">{req.sale?.projectName}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-[8px] text-brand-text-mute uppercase font-bold">Designer Fee</p>
                          <p className="text-xs font-bold text-white font-mono">${req.sale?.designerFee || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-brand-text-mute uppercase font-bold">Already Paid</p>
                          <p className="text-xs font-bold text-brand-green font-mono">${req.sale?.amountPaidToDesigner || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-brand-text-mute uppercase font-bold">Client Received</p>
                          <p className="text-xs font-bold text-brand-cyan font-mono">${req.sale?.amountReceived || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Request details */}
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] text-brand-text-mute uppercase font-bold">Requested Amount</p>
                        <p className="text-lg font-extrabold text-white font-display">${req.amount}</p>
                      </div>
                      {req.reason && (
                        <div className="flex-1">
                          <p className="text-[9px] text-brand-text-mute uppercase font-bold">Reason</p>
                          <p className="text-xs text-brand-text-soft italic">{req.reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Float impact warning */}
                    {isFloatNegative && req.status === 'pending' && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-red/8 border border-brand-red/30">
                        <AlertTriangle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-brand-red">Float Exposure Warning</p>
                          <p className="text-[10px] text-brand-text-soft">
                            Approving this will result in a <strong className="text-brand-red">${floatImpact.toFixed(2)} float gap</strong> — 
                            you'll have paid the designer more than received from the client.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CEO Note if reviewed */}
                    {req.ceoNote && (
                      <p className="text-[10px] text-brand-text-mute italic">CEO Note: "{req.ceoNote}"</p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {req.status === 'pending' && (
                    <div className="flex sm:flex-col gap-2 sm:min-w-[120px]">
                      <button
                        onClick={() => { setReviewModal(req); setCeoNote(''); }}
                        className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-brand-green/15 hover:bg-brand-green/25 border border-brand-green/30 text-brand-green text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Review
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display">Review Payout Request</h3>
                  <p className="text-[10px] text-brand-text-mute mt-0.5">
                    {reviewModal.designer?.fullName} — ${reviewModal.amount} for #{reviewModal.sale?.projectNumber}
                  </p>
                </div>
                <button onClick={() => setReviewModal(null)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Float summary */}
              <div className="p-4 rounded-xl bg-brand-bg-soft/40 border border-brand-border/40 space-y-2">
                <p className="text-[9px] font-bold text-brand-text-mute uppercase tracking-widest">Financial Impact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-brand-text-mute">Client Paid</p>
                    <p className="text-sm font-bold text-brand-cyan font-mono">${reviewModal.sale?.amountReceived || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-text-mute">After Approval, Paid to Designer</p>
                    <p className="text-sm font-bold text-white font-mono">
                      ${((reviewModal.sale?.amountPaidToDesigner || 0) + reviewModal.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-brand-text-mute">Net Float After Approval</p>
                    <p className={`text-sm font-extrabold font-mono ${(reviewModal.floatContext?.floatImpact || 0) > 0 ? 'text-brand-red' : 'text-brand-green'}`}>
                      {(reviewModal.floatContext?.floatImpact || 0) > 0 ? '-' : '+'}$
                      {Math.abs(reviewModal.floatContext?.floatImpact || 0).toFixed(2)}
                      {(reviewModal.floatContext?.floatImpact || 0) > 0 ? ' (Float Exposure)' : ' (Surplus)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CEO Note */}
              <div>
                <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">
                  CEO Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={ceoNote}
                  onChange={e => setCeoNote(e.target.value)}
                  placeholder="Add a note for the designer..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-brand-border">
                <button
                  onClick={() => handleReview('reject')}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/30 text-brand-red font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => handleReview('approve')}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-green/15 hover:bg-brand-green/25 border border-brand-green/30 text-brand-green font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {submitting ? 'Processing...' : 'Approve & Pay'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

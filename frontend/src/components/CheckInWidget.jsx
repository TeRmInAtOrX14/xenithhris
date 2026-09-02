import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function CheckInWidget({ onStatusChange }) {
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState({ checkedIn: false, checkedOut: false, record: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/today-status');
      setStatus(res.data);
      if (onStatusChange) onStatusChange(res.data);
    } catch (e) {
      console.error('Failed to load check-in status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/attendance/check-in');
      const timeStr = new Date(res.data.record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      toast.success(`Check-In recorded at ${timeStr}`);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-In failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/attendance/check-out');
      const timeStr = new Date(res.data.record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      toast.success(`Check-Out recorded at ${timeStr}`);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-Out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeStr = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formattedCurrentTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedCurrentDate = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 rounded-2xl glass-panel border border-brand-border/60 relative overflow-hidden text-left shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        
        {/* Clock & Date Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-cyan text-xs font-bold font-display uppercase tracking-widest">
            <Clock className="w-4 h-4 animate-pulse text-brand-cyan" />
            HRIS Attendance Portal
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-extrabold text-white font-mono tracking-tight">{formattedCurrentTime}</h3>
            <span className="text-xs text-brand-text-soft font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-text-mute" />
              {formattedCurrentDate}
            </span>
          </div>
        </div>

        {/* Action Controls & Real-time Status */}
        <div className="flex flex-wrap items-center gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-brand-text-soft px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
              Fetching status...
            </div>
          ) : (
            <>
              {/* Status Badge */}
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-bold text-brand-text-mute uppercase tracking-widest">Status Today</span>
                {status.checkedOut ? (
                  <span className="text-xs font-extrabold text-brand-blue uppercase font-mono mt-0.5 flex items-center gap-1.5 justify-end">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue" />
                    Completed Shift
                  </span>
                ) : status.checkedIn ? (
                  <span className="text-xs font-extrabold text-brand-green uppercase font-mono mt-0.5 flex items-center gap-1.5 justify-end">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                    Checked In ({formatTimeStr(status.record?.checkIn)})
                  </span>
                ) : (
                  <span className="text-xs font-extrabold text-brand-amber uppercase font-mono mt-0.5 flex items-center gap-1.5 justify-end">
                    <AlertCircle className="w-3.5 h-3.5 text-brand-amber" />
                    Not Checked In
                  </span>
                )}
              </div>

              {/* Primary Check-In / Check-Out Action Button */}
              {!status.checkedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-green via-emerald-400 to-teal-500 text-brand-bg font-extrabold text-xs uppercase tracking-wider font-display shadow-lg shadow-brand-green/20 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>Mark Check-In</span>
                </button>
              ) : !status.checkedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg font-extrabold text-xs uppercase tracking-wider font-display shadow-lg shadow-brand-blue/20 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>Mark Check-Out</span>
                </button>
              ) : (
                <div className="px-5 py-2.5 rounded-full border border-brand-blue/30 bg-brand-blue/10 text-xs font-mono font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                  In: {formatTimeStr(status.record?.checkIn)} | Out: {formatTimeStr(status.record?.checkOut)}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 via-transparent to-brand-cyan/5 pointer-events-none" />
    </div>
  );
}

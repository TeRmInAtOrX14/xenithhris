import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import SlideToConfirm from './SlideToConfirm';
import VisualStatusIndicator from './VisualStatusIndicator';

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
      const timeStr = new Date(res.data.record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      toast.success(`Check-In recorded at ${timeStr}`, {
        icon: '✅',
        style: { borderRadius: '14px', background: '#111', color: '#D7F000', border: '1px solid #D7F000' }
      });
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
      const timeStr = new Date(res.data.record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      toast.success(`Check-Out recorded at ${timeStr}`, {
        icon: '🏁',
        style: { borderRadius: '14px', background: '#111', color: '#22D3EE', border: '1px solid #22D3EE' }
      });
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-Out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeStr = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formattedCurrentTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedCurrentDate = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 rounded-2xl glass-panel border border-brand-border relative overflow-hidden text-left shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        
        {/* Clock & Date Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#D7F000] text-xs font-bold font-display uppercase tracking-widest">
            <Clock className="w-4 h-4 animate-pulse text-[#D7F000]" />
            Shift Attendance Portal
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-extrabold text-brand-text font-mono tracking-tight">{formattedCurrentTime}</h3>
            <span className="text-xs text-brand-text-soft font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-text-mute" />
              {formattedCurrentDate}
            </span>
          </div>
        </div>

        {/* Action Controls & Real-time Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-brand-text-soft px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#D7F000]" />
              Fetching status...
            </div>
          ) : (
            <>
              {/* Visual Status Indicator Ring */}
              <VisualStatusIndicator
                value={status.checkedOut ? 100 : status.checkedIn ? 65 : 0}
                status={status.checkedOut ? "cyan" : status.checkedIn ? "lime" : "amber"}
                label={status.checkedOut ? "Completed" : status.checkedIn ? "Checked In" : "Not Checked In"}
                sublabel={
                  status.checkedIn
                    ? `In: ${formatTimeStr(status.record?.checkIn)}`
                    : "Slide handle to mark shift"
                }
              />

              {/* Slide To Confirm Gesture Control */}
              <div className="w-64 shrink-0">
                {!status.checkedIn ? (
                  <SlideToConfirm
                    onConfirm={handleCheckIn}
                    label="SLIDE TO CHECK IN →"
                    successLabel="CHECKED IN!"
                    disabled={actionLoading}
                    color="lime"
                  />
                ) : !status.checkedOut ? (
                  <SlideToConfirm
                    onConfirm={handleCheckOut}
                    label="SLIDE TO CHECK OUT →"
                    successLabel="CHECKED OUT!"
                    disabled={actionLoading}
                    color="emerald"
                  />
                ) : (
                  <div className="px-4 py-3 rounded-2xl border border-[#D7F000]/30 bg-[#D7F000]/10 text-xs font-mono font-bold text-brand-text flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D7F000]" />
                    Shift Logged ({formatTimeStr(status.record?.checkIn)} - {formatTimeStr(status.record?.checkOut)})
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#D7F000]/5 via-transparent to-cyan-500/5 pointer-events-none" />
    </div>
  );
}


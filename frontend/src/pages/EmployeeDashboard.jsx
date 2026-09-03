import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Sparkles,
  DollarSign,
  User,
  Zap,
  Award,
  Loader2,
  Table,
  CircleDollarSign,
  ArrowUpRight
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '../utils/themeContext';
import CheckInWidget from '../components/CheckInWidget';

export default function EmployeeDashboard() {
  const { isDark } = useTheme();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/sales-executive/earnings');
      setEarnings(res.data);
    } catch (e) {
      console.warn('Could not load specific sales executive earnings metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  return (
    <motion.div
      className="space-y-6 text-left"
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      animate="show"
    >
      {/* Real-time Clock-In Attendance Widget */}
      <CheckInWidget />
      {/* Welcome Header */}
      <div className="p-6 rounded-2xl glass-panel border border-brand-border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange text-[10px] font-mono font-bold uppercase tracking-wider">
            Personal Workspace
          </span>
          <h2 className="text-2xl font-extrabold text-white font-display tracking-tight mt-1">
            Welcome back, {currentUser.email?.split('@')[0]}
          </h2>
          <p className="text-xs text-brand-text-soft mt-0.5">
            Your attendance, sales earnings, and personal metrics overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-brand-bg border border-brand-border text-xs font-mono font-bold text-white">
            USD → PKR: <strong className="text-brand-orange">{earnings?.usdToPkrRate || 280}</strong>
          </span>
        </div>
      </div>

      {/* Sales Executive Hybrid Currency Earnings Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Basic Salary (PKR Only) */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Basic Salary (PKR)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/30">
              <CircleDollarSign className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-display">
              PKR {Math.round(earnings?.baseSalaryPkr || 100000).toLocaleString()}
            </p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">Fixed Base Salary</p>
          </div>
        </div>

        {/* Total Sales (USD $) */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Total Sales ($ USD)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-400 font-display font-mono">
              ${(earnings?.totalSalesUsd || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">
              Commission Rate: <strong className="text-white">{earnings?.commissionPercentage || 10}%</strong>
            </p>
          </div>
        </div>

        {/* Commission Converted (PKR) */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Commission (PKR)</span>
            <div className="w-8 h-8 rounded-xl bg-brand-orange/15 flex items-center justify-center border border-brand-orange/30">
              <TrendingUp className="w-4 h-4 text-brand-orange" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-brand-orange font-display">
              PKR {Math.round(earnings?.commissionPkr || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">
              ${earnings?.totalCommissionEarnedUsd || 0} @ {earnings?.usdToPkrRate || 280}
            </p>
          </div>
        </div>

        {/* Total Estimated Earnings (PKR) */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Estimated Earnings (PKR)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center border border-purple-500/30">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-display">
              PKR {Math.round(earnings?.totalEstimatedEarningsPkr || 100000).toLocaleString()}
            </p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">Base Salary + Commission</p>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-2">
          <h4 className="text-xs font-extrabold text-white uppercase font-display">My Attendance Ledger</h4>
          <p className="text-[11px] text-brand-text-soft">View check-in/out timestamps and monthly present count.</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-2">
          <h4 className="text-xs font-extrabold text-white uppercase font-display">Sales & Projects</h4>
          <p className="text-[11px] text-brand-text-soft">Manage client deals, briefs, and 4-stage project progress.</p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-2">
          <h4 className="text-xs font-extrabold text-white uppercase font-display">Payslips & Loans</h4>
          <p className="text-[11px] text-brand-text-soft">Download monthly PDF payslips with locked historical rates.</p>
        </div>
      </div>
    </motion.div>
  );
}

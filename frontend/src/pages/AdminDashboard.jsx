import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import CheckInWidget from '../components/CheckInWidget';

const ATTENDANCE_CHART_DATA = [
  { name: 'Mon', Present: 22, Late: 1, Absent: 0 },
  { name: 'Tue', Present: 23, Late: 0, Absent: 0 },
  { name: 'Wed', Present: 21, Late: 2, Absent: 0 },
  { name: 'Thu', Present: 22, Late: 1, Absent: 0 },
  { name: 'Fri', Present: 23, Late: 0, Absent: 0 },
];

const WORKFORCE_DATA = [
  { name: 'Operations', value: 8, color: '#D7F000' },
  { name: 'Sales Execs', value: 6, color: '#E8F52A' },
  { name: 'Artists', value: 5, color: '#F0FF3D' },
  { name: 'Management', value: 4, color: '#FFFFFF' }
];

export default function AdminDashboard({ stats, campaigns = [] }) {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState('Today');

  const tooltipBg = isDark ? '#111111' : '#ffffff';
  const tooltipBorder = isDark ? '#262626' : '#d6d6d0';
  const textColor = isDark ? '#ffffff' : '#000000';

  return (
    <motion.div
      className="space-y-6 text-left"
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      animate="show"
    >
      {/* Real-time Clock-In Attendance Widget */}
      <CheckInWidget />
      {/* Executive Welcome Banner — Xenith Controlled Maximalism */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#111111] p-6 rounded-2xl border border-[#262626] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D7F000]/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-[#D7F000] text-black text-[10px] font-mono font-extrabold uppercase tracking-wider">
            Executive Control Center
          </span>
          <h2 className="text-2xl font-extrabold text-white font-display tracking-tight mt-2">
            Good morning, Executive
          </h2>
          <p className="text-xs text-brand-text-gray mt-0.5">
            Your workforce is moving. Here is today's real-time executive operations summary.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 relative z-10">
          <Filter className="w-3.5 h-3.5 text-brand-text-mute" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-black border border-[#262626] text-xs text-white cursor-pointer focus:outline-none focus:border-[#D7F000]"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </select>
        </div>
      </div>

      {/* Kinetic HR KPI Cards (4 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Employees */}
        <div className="p-5 rounded-2xl glass-panel hover-glow-orange border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Total Employees</span>
            <div className="w-8 h-8 rounded-xl bg-brand-orange/15 flex items-center justify-center border border-brand-orange/30">
              <Users className="w-4 h-4 text-brand-orange" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-white font-display">{stats?.totalEmployees || 23}</p>
              <span className="text-xs font-bold text-brand-success flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +2.4%
              </span>
            </div>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">vs last month</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-emerald-400 font-display">{stats?.presentToday || 22}</p>
              <span className="text-xs font-bold text-brand-text-soft font-mono">/ {stats?.totalEmployees || 23}</span>
            </div>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">95.6% attendance rate</p>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400 font-display">3</p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">Requires your review</p>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="p-5 rounded-2xl glass-panel border border-brand-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Late Arrivals</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white font-display">{stats?.lateToday || 1}</p>
            <p className="text-[10px] text-brand-text-mute mt-1 font-mono">Beyond 09:45 AM shift cutoff</p>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Overview Line/Bar Chart (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-brand-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <div>
              <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-tight">
                Attendance Trends Overview
              </h3>
              <p className="text-xs text-brand-text-soft">Daily present vs. late tracking for this week</p>
            </div>
            <span className="text-[10px] font-mono text-brand-orange uppercase font-bold">This Week</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ATTENDANCE_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#707070" fontSize={11} tickLine={false} />
                <YAxis stroke="#707070" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', fontSize: '12px', color: textColor }}
                />
                <Bar dataKey="Present" fill="#3a8f5b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill="#c98a2e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workforce Distribution Donut Chart (1 Column) */}
        <div className="p-6 rounded-2xl glass-panel border border-brand-border space-y-4">
          <div className="pb-3 border-b border-brand-border">
            <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-tight">
              Department Distribution
            </h3>
            <p className="text-xs text-brand-text-soft">Employee ratio across teams</p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={WORKFORCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {WORKFORCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2">
            {WORKFORCE_DATA.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-brand-text-soft">{d.name}</span>
                </div>
                <strong className="text-white font-mono">{d.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Required Panel ("Requires Your Attention") */}
        <div className="p-6 rounded-2xl glass-panel border border-brand-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-orange" />
              Requires Your Attention
            </h3>
            <span className="px-2 py-0.5 rounded bg-brand-orange/15 text-brand-orange text-[10px] font-mono font-bold">3 Pending</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-brand-bg-soft/50 border border-brand-border flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-amber-400 uppercase font-mono">Leave Request</span>
                <p className="text-xs font-bold text-white mt-0.5">Ahmed Khan — Annual Leave (2 Days)</p>
                <p className="text-[10px] text-brand-text-mute mt-0.5 font-mono">Submitted 35 mins ago</p>
              </div>
              <Link to="/dashboard/requests" className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-[10px] font-bold uppercase hover:bg-brand-copper transition-colors">
                Review
              </Link>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-bg-soft/50 border border-brand-border flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase font-mono">Payroll Run</span>
                <p className="text-xs font-bold text-white mt-0.5">Current Month Payroll Draft</p>
                <p className="text-[10px] text-brand-text-mute mt-0.5 font-mono">Ready for final execution</p>
              </div>
              <Link to="/dashboard/payroll" className="px-3 py-1.5 rounded-lg bg-brand-bg-elevated border border-brand-border text-white text-[10px] font-bold uppercase hover:border-brand-orange transition-colors">
                View
              </Link>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-bg-soft/50 border border-brand-border flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-cyan-400 uppercase font-mono">Loan Request</span>
                <p className="text-xs font-bold text-white mt-0.5">Salary Advance — PKR 50,000</p>
                <p className="text-[10px] text-brand-text-mute mt-0.5 font-mono">Pending approval</p>
              </div>
              <Link to="/dashboard/loans" className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-[10px] font-bold uppercase hover:bg-brand-copper transition-colors">
                Review
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="p-6 rounded-2xl glass-panel border border-brand-border space-y-4">
          <div className="pb-3 border-b border-brand-border">
            <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-tight">
              Recent Activity Timeline
            </h3>
            <p className="text-xs text-brand-text-soft">Live system audit events</p>
          </div>

          <div className="space-y-4 pl-2 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-brand-border">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-4 h-4 rounded-full bg-brand-orange flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Raameen Ali marked check-in</p>
                <p className="text-[10px] text-brand-text-mute font-mono">10 minutes ago at 09:28 AM</p>
              </div>
            </div>

            <div className="flex items-start gap-3 relative z-10">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Project #PRJ-1024 updated to Base Color</p>
                <p className="text-[10px] text-brand-text-mute font-mono">45 minutes ago by Designer</p>
              </div>
            </div>

            <div className="flex items-start gap-3 relative z-10">
              <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">USD → PKR Exchange Rate set to 280</p>
                <p className="text-[10px] text-brand-text-mute font-mono">2 hours ago by Executive</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

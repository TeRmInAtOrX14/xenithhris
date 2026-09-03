import React from 'react';
import { Wallet, Clock, Palette, Users, TrendingUp, CalendarCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import CountUpNumber from './CountUpNumber';
import { useNavigate } from 'react-router-dom';

export default function QuickActionTiles({ activeRole = "Sales Executive", liveStats = {} }) {
  const navigate = useNavigate();

  const tileConfigs = {
    'Sales Executive': [
      {
        id: 'sales',
        label: 'Sales Sheet',
        count: liveStats.salesCount || 0,
        subtext: 'Deals logged this cycle',
        icon: Wallet,
        gradient: 'tile-gradient-emerald',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        path: '/dashboard/sales',
        prefix: '',
        suffix: ' deals'
      },
      {
        id: 'hours',
        label: 'Time Clocked',
        count: liveStats.hoursClocked || 0,
        subtext: 'Hours worked today',
        icon: Clock,
        gradient: 'tile-gradient-cyan',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        path: '/dashboard/attendance',
        prefix: '',
        suffix: ' hrs',
        decimals: 1
      },
      {
        id: 'commission',
        label: 'Commission (PKR)',
        count: liveStats.commissionPkr || 0,
        subtext: 'Estimated total payout',
        icon: TrendingUp,
        gradient: 'tile-gradient-lime',
        iconBg: 'bg-[#D7F000]/20 text-[#D7F000]',
        path: '/dashboard/payroll',
        prefix: 'PKR ',
        suffix: ''
      },
      {
        id: 'briefs',
        label: 'Active Briefs',
        count: liveStats.activeBriefsCount || 0,
        subtext: 'Client art projects',
        icon: Palette,
        gradient: 'tile-gradient-violet',
        iconBg: 'bg-purple-500/20 text-purple-400',
        path: '/dashboard/briefs',
        prefix: '',
        suffix: ' active'
      }
    ],
    'Team Lead': [
      {
        id: 'team',
        label: 'Team Members',
        count: liveStats.totalEmployees || 0,
        subtext: 'Active team staff assigned',
        icon: Users,
        gradient: 'tile-gradient-cyan',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        path: '/dashboard/employees',
        prefix: '',
        suffix: ' Staff'
      },
      {
        id: 'attendance',
        label: 'Present Today',
        count: liveStats.presentToday || 0,
        subtext: liveStats.totalEmployees ? `${Math.round((liveStats.presentToday / liveStats.totalEmployees) * 100)}% attendance rate` : '0% attendance rate',
        icon: CalendarCheck,
        gradient: 'tile-gradient-lime',
        iconBg: 'bg-[#D7F000]/20 text-[#D7F000]',
        path: '/dashboard/attendance',
        prefix: '',
        suffix: ' present'
      },
      {
        id: 'projects',
        label: 'Art Campaigns',
        count: liveStats.activeBriefsCount || 0,
        subtext: 'Active digital art pipelines',
        icon: Palette,
        gradient: 'tile-gradient-emerald',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        path: '/dashboard/briefs',
        prefix: '',
        suffix: ' active'
      },
      {
        id: 'requests',
        label: 'Pending Requests',
        count: liveStats.pendingRequestsCount || 0,
        subtext: 'Leaves & WFH requiring review',
        icon: Clock,
        gradient: 'tile-gradient-amber',
        iconBg: 'bg-amber-500/20 text-amber-400',
        path: '/dashboard/requests',
        prefix: '',
        suffix: ' pending'
      }
    ],
    'Designer': [
      {
        id: 'artworks',
        label: 'Assigned Briefs',
        count: liveStats.activeBriefsCount || 0,
        subtext: 'Artworks in progress',
        icon: Palette,
        gradient: 'tile-gradient-violet',
        iconBg: 'bg-purple-500/20 text-purple-400',
        path: '/dashboard/artist-assignments',
        prefix: '',
        suffix: ' briefs'
      },
      {
        id: 'completed',
        label: 'Completed Art',
        count: liveStats.completedArtCount || 0,
        subtext: 'Approved this month',
        icon: CheckCircle2,
        gradient: 'tile-gradient-lime',
        iconBg: 'bg-[#D7F000]/20 text-[#D7F000]',
        path: '/dashboard/artist-assignments',
        prefix: '',
        suffix: ' approved'
      },
      {
        id: 'shift',
        label: 'Shift Hours',
        count: liveStats.hoursClocked || 0,
        subtext: 'Today shift logged',
        icon: Clock,
        gradient: 'tile-gradient-cyan',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        path: '/dashboard/attendance',
        prefix: '',
        suffix: ' hrs',
        decimals: 1
      },
      {
        id: 'payout',
        label: 'Artwork Earnings',
        count: liveStats.commissionPkr || 0,
        subtext: 'PKR total calculation',
        icon: Wallet,
        gradient: 'tile-gradient-emerald',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        path: '/dashboard/payroll',
        prefix: 'PKR ',
        suffix: ''
      }
    ],
    'CEO': [
      {
        id: 'revenue',
        label: 'Monthly Revenue',
        count: liveStats.totalRevenueUsd || 0,
        subtext: 'Gross revenue ($ USD)',
        icon: Wallet,
        gradient: 'tile-gradient-lime',
        iconBg: 'bg-[#D7F000]/20 text-[#D7F000]',
        path: '/dashboard/finance',
        prefix: '$',
        suffix: ''
      },
      {
        id: 'staff',
        label: 'Total Workforce',
        count: liveStats.totalEmployees || 0,
        subtext: 'Employees active across studio',
        icon: Users,
        gradient: 'tile-gradient-cyan',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        path: '/dashboard/employees',
        prefix: '',
        suffix: ' staff'
      },
      {
        id: 'active_projects',
        label: 'Active Artworks',
        count: liveStats.activeBriefsCount || 0,
        subtext: 'Live client projects',
        icon: Palette,
        gradient: 'tile-gradient-violet',
        iconBg: 'bg-purple-500/20 text-purple-400',
        path: '/dashboard/briefs',
        prefix: '',
        suffix: ' active'
      },
      {
        id: 'payroll_run',
        label: 'Payroll Total',
        count: liveStats.payrollTotalPkr || 0,
        subtext: 'Monthly salary disbursements',
        icon: TrendingUp,
        gradient: 'tile-gradient-emerald',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        path: '/dashboard/payroll',
        prefix: 'PKR ',
        suffix: ''
      }
    ]
  }[activeRole] || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
      {tileConfigs.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.id}
            onClick={() => navigate(tile.path)}
            className={`p-5 rounded-2xl ${tile.gradient} flex flex-col justify-between space-y-3 cursor-pointer tactile-btn group relative overflow-hidden`}
          >
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-bold text-white/80 tile-card-title uppercase tracking-widest font-mono">
                {tile.label}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile.iconBg} border border-white/10 shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="z-10">
              <p className="text-3xl font-extrabold text-white tile-card-num font-display font-mono tracking-tight">
                <CountUpNumber
                  end={tile.count}
                  prefix={tile.prefix}
                  suffix={tile.suffix}
                  decimals={tile.decimals || 0}
                />
              </p>
              <p className="text-[10px] text-white/70 tile-card-sub mt-1 font-mono flex items-center justify-between">
                <span>{tile.subtext}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

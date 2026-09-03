import React from 'react';
import { User, Mail, MapPin, Calendar, Clock, DollarSign, Edit3, Shield, Sparkles, ChevronDown } from 'lucide-react';
import VisualStatusIndicator from './VisualStatusIndicator';

export default function ProfileStrip({ currentUser, activeRole, onRoleSwitch, onActionClick }) {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Role info lookup
  const roleMeta = {
    'Sales Executive': {
      title: 'Sales Executive',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      keyStatLabel: 'Cycle Sales',
      keyStatVal: '$4,250',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    'Team Lead': {
      title: 'Team Lead',
      badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      keyStatLabel: 'Team Present',
      keyStatVal: '92%',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    },
    'Designer': {
      title: 'Senior Artist / Designer',
      badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      keyStatLabel: 'Briefs Completed',
      keyStatVal: '14 Artworks',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    'CEO': {
      title: 'CEO / Chief Executive',
      badgeBg: 'bg-[#D7F000]/20 text-[#D7F000] border-[#D7F000]/40',
      keyStatLabel: 'Monthly Revenue',
      keyStatVal: '$48,200',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
    }
  }[activeRole] || {
    title: currentUser?.role || 'Employee',
    badgeBg: 'bg-[#D7F000]/20 text-[#D7F000] border-[#D7F000]/40',
    keyStatLabel: 'Shift Today',
    keyStatVal: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  };

  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Mary W. Jackson';

  return (
    <div className="p-6 rounded-2xl glass-panel border border-brand-border relative overflow-hidden text-left shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        
        {/* Left Column: Avatar + Name + Role */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={roleMeta.avatarUrl}
              alt={userName}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#D7F000] shadow-md"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
          </div>

          <div className="space-y-1">
            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase font-mono tracking-wider ${roleMeta.badgeBg}`}>
              {roleMeta.title}
            </span>
            <h2 className="text-2xl font-extrabold text-brand-text font-display tracking-tight">
              {userName}
            </h2>
            <p className="text-xs text-brand-text-mute font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-text-mute" />
              {currentUser?.email || 'mary@bizhaven.com'}
            </p>
          </div>
        </div>

        {/* Center Column: Key Metrics & Info */}
        <div className="hidden sm:flex items-center gap-8 px-6 border-y sm:border-y-0 sm:border-x border-brand-border py-4 sm:py-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Location</span>
            <p className="text-xs font-extrabold text-brand-text flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#D7F000]" />
              Lahore HQ Studio
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Member Since</span>
            <p className="text-xs font-extrabold text-brand-text flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#D7F000]" />
              Oct 13, 2020
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">{roleMeta.keyStatLabel}</span>
            <p className="text-sm font-extrabold text-[#D7F000] font-mono">
              {roleMeta.keyStatVal}
            </p>
          </div>
        </div>

        {/* Right Column: Demo Role Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Quick Role Switcher Pill */}
          <div className="flex items-center gap-1 bg-brand-bg-surface p-1 rounded-xl border border-brand-border">
            <span className="text-[9px] font-bold text-brand-text-mute uppercase px-2 font-mono">Role View:</span>
            {['Sales Executive', 'Team Lead', 'Designer', 'CEO'].map((r) => (
              <button
                key={r}
                onClick={() => onRoleSwitch && onRoleSwitch(r)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeRole === r
                    ? 'bg-[#D7F000] text-black shadow'
                    : 'text-brand-text-soft hover:text-brand-text'
                }`}
              >
                {r.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={onActionClick}
            className="px-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs font-extrabold uppercase tracking-wider text-brand-text hover:border-[#D7F000] hover:text-[#D7F000] transition-all cursor-pointer flex items-center gap-1.5 tactile-btn"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Info</span>
          </button>
        </div>

      </div>

      {/* Decorative Brand Accent Streak */}
      <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-[#D7F000]/10 to-transparent pointer-events-none" />
    </div>
  );
}

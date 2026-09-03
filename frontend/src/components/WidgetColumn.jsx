import React, { useState } from 'react';
import { Bell, Calendar, Plus, X, Sparkles, ChevronLeft, ChevronRight, Info, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function WidgetColumn() {
  const [selectedDate, setSelectedDate] = useState(16);
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      tag: 'NEW',
      title: 'Xenith Digital Art Expo 2026',
      date: 'Mar 25, 2026',
      desc: 'Mark your calendar! The Xenith 3D render showcase is coming up.',
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
    },
    {
      id: 2,
      tag: 'HIRING',
      title: 'We are HIRING Concept Artists',
      date: 'Mar 20, 2026',
      desc: 'We are looking to bring on 2 senior digital illustrators. Refer your friends!',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    },
    {
      id: 3,
      tag: 'PAYROLL',
      title: 'Monthly Payslips Released',
      date: 'Mar 01, 2026',
      desc: 'March cycle payslips are now available in your employee portal.',
      color: 'bg-[#D7F000]/20 text-[#D7F000] border-[#D7F000]/40'
    }
  ]);

  const dismissAnnouncement = (id) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  // Calendar days grid generator for March 2026
  const daysInMonth = 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Department workforce distribution chart data
  const chartData = [
    { name: 'Sales', value: 8, color: '#D7F000' },
    { name: 'Artists', value: 6, color: '#22D3EE' },
    { name: 'Management', value: 4, color: '#A78BFA' },
    { name: 'Operations', value: 5, color: '#34D399' }
  ];

  return (
    <div className="space-y-6 text-left">
      
      {/* ---------------- 1. Company Announcements / Alerts ---------------- */}
      <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D7F000] animate-pulse" />
            <h3 className="text-xs font-extrabold text-brand-text uppercase font-display tracking-wider">
              Company Announcements
            </h3>
          </div>
          <button className="px-2.5 py-1 rounded-lg bg-brand-bg-surface border border-brand-border text-[9px] font-mono font-bold uppercase text-brand-text hover:border-[#D7F000] hover:text-[#D7F000] transition-colors cursor-pointer tactile-btn">
            + Create
          </button>
        </div>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-xs text-brand-text-mute italic text-center py-4">No active announcements</p>
          ) : (
            announcements.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border ${item.color} relative text-left space-y-1.5 transition-all tactile-btn`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-black/40 uppercase">
                    {item.tag}
                  </span>
                  <button
                    onClick={() => dismissAnnouncement(item.id)}
                    className="text-brand-text-mute hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-extrabold text-white">{item.title}</h4>
                <p className="text-[10px] opacity-80 leading-normal line-clamp-2">{item.desc}</p>
                <p className="text-[9px] font-mono opacity-60 text-right">{item.date}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------------- 2. Mini Calendar Widget ---------------- */}
      <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D7F000]" />
            <h3 className="text-xs font-extrabold text-brand-text uppercase font-display tracking-wider">
              Company Events
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-brand-text-mute">March 2026</span>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-mono font-bold text-brand-text-mute uppercase mb-1">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Days matrix */}
        <div className="grid grid-cols-7 text-center gap-1 text-xs font-mono font-semibold">
          {/* Empty prefix cells for March start offset */}
          <span className="py-1 text-transparent">0</span>
          <span className="py-1 text-transparent">0</span>

          {days.map((d) => {
            const isSelected = d === selectedDate;
            const isToday = d === 16;
            const hasShift = [2, 5, 9, 12, 16, 19, 23, 26].includes(d);

            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`py-1.5 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#D7F000] text-black font-extrabold shadow-[0_0_12px_rgba(215,240,0,0.4)]'
                    : isToday
                    ? 'border border-[#D7F000] text-[#D7F000] font-extrabold'
                    : 'text-brand-text-soft hover:bg-brand-bg-surface hover:text-white'
                }`}
              >
                {d}
                {hasShift && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#D7F000]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-brand-border flex items-center justify-between text-[10px] font-mono text-brand-text-mute">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#D7F000]" />
            Shift Logged
          </span>
          <button className="px-2.5 py-1 rounded-lg bg-brand-bg-surface border border-brand-border text-[9px] font-mono font-bold uppercase text-brand-text hover:border-[#D7F000] hover:text-[#D7F000] transition-colors cursor-pointer tactile-btn">
            + Event
          </button>
        </div>
      </div>

      {/* ---------------- 3. Workforce Distribution Donut Chart ---------------- */}
      <div className="p-5 rounded-2xl glass-panel border border-brand-border space-y-3 shadow-md">
        <div className="border-b border-brand-border pb-2.5">
          <h3 className="text-xs font-extrabold text-brand-text uppercase font-display tracking-wider">
            Team Allocation
          </h3>
          <p className="text-[10px] text-brand-text-mute">Staff count across departments</p>
        </div>

        <div className="h-40 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--brand-bg-elevated)',
                  borderColor: 'var(--brand-border)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: 'var(--brand-text)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-brand-text-soft">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}:</span>
              <strong className="text-brand-text">{d.value}</strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

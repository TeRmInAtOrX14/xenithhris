import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, CheckCircle2, Clock, Sparkles, FileText, ArrowRight, Eye } from 'lucide-react';
import CheckInWidget from '../components/CheckInWidget';
import VisualStatusIndicator from '../components/VisualStatusIndicator';
import toast from 'react-hot-toast';

export default function DesignerDashboard() {
  const [projects, setProjects] = useState([
    {
      id: 'PRJ-108',
      title: 'Neon Cyberpunk Character 3D Asset',
      client: 'Vortex Studios',
      stage: 'Base Color',
      progress: 65,
      status: 'lime',
      deadline: 'Tomorrow, 5 PM',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'PRJ-109',
      title: 'Fantasy Dragon Environment Art',
      client: 'Mythic Games',
      stage: 'Final Render',
      progress: 85,
      status: 'green',
      deadline: 'Mar 20, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'PRJ-110',
      title: 'Anime Character Concept Sheet',
      client: 'Kitsune Media',
      stage: 'Brief Review',
      progress: 25,
      status: 'amber',
      deadline: 'Mar 22, 2026',
      thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80'
    }
  ]);

  const advanceStage = (id) => {
    setProjects(projects.map(p => {
      if (p.id === id) {
        toast.success(`Updated ${p.title} stage progress!`, {
          icon: '🎨',
          style: { background: '#111', color: '#D7F000', border: '1px solid #D7F000', borderRadius: '14px' }
        });
        return { ...p, progress: Math.min(100, p.progress + 25) };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Real-time Clock In Attendance */}
      <CheckInWidget />

      {/* Active Art Assignments Section */}
      <div className="p-6 rounded-2xl glass-panel border border-brand-border space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text font-display uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#D7F000]" />
              Active Art Briefs & Canvas Work
            </h3>
            <p className="text-xs text-brand-text-mute">Your assigned 4-stage digital artwork pipeline</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#D7F000]/20 text-[#D7F000] text-[10px] font-mono font-extrabold border border-[#D7F000]/40 uppercase">
            3 Active Briefs
          </span>
        </div>

        {/* Visual Artwork Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-2xl bg-brand-bg-surface border border-brand-border flex flex-col justify-between space-y-4 hover:border-[#D7F000]/60 transition-all tactile-btn group"
            >
              <div className="relative h-36 rounded-xl overflow-hidden bg-black border border-brand-border">
                <img src={proj.thumbnail} alt={proj.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[#D7F000] text-[9px] font-mono font-extrabold border border-brand-border">
                  {proj.id}
                </span>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[9px] font-mono">
                  {proj.stage}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-brand-text line-clamp-1">{proj.title}</h4>
                <p className="text-[10px] text-brand-text-mute font-mono">Client: {proj.client}</p>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-brand-text-soft">
                  <span>Stage Completion</span>
                  <strong className="text-[#D7F000]">{proj.progress}%</strong>
                </div>
                <div className="w-full bg-black h-2.5 rounded-full overflow-hidden border border-brand-border">
                  <div
                    className="h-full bg-gradient-to-r from-[#D7F000] to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => advanceStage(proj.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#D7F000] text-black text-[10px] font-extrabold uppercase font-display hover:bg-[#E8F52A] transition-colors tactile-btn"
                >
                  Advance Stage →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

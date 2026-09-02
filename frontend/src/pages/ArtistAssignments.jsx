import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, AlertCircle, Clock, CheckCircle2, User, ChevronRight, Sparkles } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STAGES = ['Initial Sketch', 'Line Art', 'Base Color', 'Final Artwork'];

export default function ArtistAssignments() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (e) {
      toast.error('Failed to load artist assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

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
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand-cyan" />
          Artist Work Assignment & Stage Tracking
        </h2>
        <p className="text-xs text-brand-text-soft mt-1">
          Monitor assigned artists, current project stages, days spent per stage, and automated &gt;5 days stagnant alerts.
        </p>
      </div>

      {/* Grid of Work Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sales.map(sale => {
          const daysInStage = calculateDaysInStage(sale.stageUpdatedAt);
          const isStagnant = daysInStage > 5 && sale.projectStage !== 'Final Artwork';
          const stageIdx = getStageIndex(sale.projectStage);
          const progressPercent = ((stageIdx + 1) / STAGES.length) * 100;

          return (
            <motion.div
              key={sale.id}
              className={`p-5 rounded-2xl glass-panel border transition-all flex flex-col justify-between space-y-4 ${
                isStagnant ? 'border-brand-amber/50 hover-glow-amber' : 'border-brand-border/40 hover:border-brand-border-strong'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest flex items-center gap-1 font-mono">
                    <User className="w-3.5 h-3.5 text-brand-cyan" />
                    {sale.employee?.fullName || 'Unassigned Artist'}
                  </span>
                  {isStagnant && (
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber border border-brand-amber/30 text-[9px] font-extrabold uppercase animate-pulse flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      &gt;5 Days Alert
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-white mt-3 font-display">{sale.projectName}</h3>
                <p className="text-xs text-brand-cyan font-semibold mt-0.5">{sale.clientName}</p>

                {/* Progress bar across 4 stages */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-brand-text-soft font-mono uppercase">
                    <span>Current: <strong className="text-white">{sale.projectStage}</strong></span>
                    <span>{daysInStage} days spent</span>
                  </div>
                  <div className="w-full bg-brand-bg-soft rounded-full h-2.5 border border-brand-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sale.projectStage === 'Final Artwork' ? 'bg-brand-green' : isStagnant ? 'bg-brand-amber' : 'bg-brand-cyan'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-brand-text-mute">
                    <span>Sketch</span>
                    <span>Line Art</span>
                    <span>Color</span>
                    <span>Final</span>
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="pt-3 border-t border-brand-border/40 flex justify-between items-center text-[10px] font-mono text-brand-text-mute">
                <span>Sale Date: {new Date(sale.saleDate).toLocaleDateString()}</span>
                <span className="px-2 py-0.5 rounded bg-brand-bg-elevated text-white font-bold">
                  PKR {sale.saleAmount.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}

        {sales.length === 0 && (
          <div className="col-span-full py-16 text-center text-brand-text-mute italic border border-dashed border-brand-border rounded-2xl">
            No active artist assignments found
          </div>
        )}
      </div>
    </div>
  );
}

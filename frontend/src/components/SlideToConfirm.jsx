import React, { useState, useRef } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SlideToConfirm({
  onConfirm,
  label = "SLIDE TO CONFIRM",
  successLabel = "CONFIRMED!",
  disabled = false,
  color = "lime" // "lime" | "emerald" | "amber"
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef(null);

  const getWidth = () => {
    if (containerRef.current) {
      return containerRef.current.clientWidth - 56; // 56px handle width
    }
    return 200;
  };

  const handleDragEnd = (event, info) => {
    const maxDrag = getWidth();
    if (info.offset.x >= maxDrag * 0.7) {
      setConfirmed(true);
      setDragX(maxDrag);
      if (onConfirm) onConfirm();
      setTimeout(() => {
        setConfirmed(false);
        setDragX(0);
      }, 2500);
    } else {
      setDragX(0);
    }
  };

  const colorStyles = {
    lime: {
      bg: "bg-[#182600] border-[#D7F000]/40 text-[#D7F000]",
      handle: "bg-[#D7F000] text-black shadow-[0_0_15px_rgba(215,240,0,0.5)]",
      fill: "bg-[#D7F000]/20"
    },
    emerald: {
      bg: "bg-[#022E1F] border-emerald-500/40 text-emerald-400",
      handle: "bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.5)]",
      fill: "bg-emerald-500/20"
    },
    amber: {
      bg: "bg-[#381E04] border-amber-500/40 text-amber-400",
      handle: "bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]",
      fill: "bg-amber-500/20"
    }
  }[color] || {
    bg: "bg-[#182600] border-[#D7F000]/40 text-[#D7F000]",
    handle: "bg-[#D7F000] text-black",
    fill: "bg-[#D7F000]/20"
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-14 w-full rounded-2xl border p-1 select-none overflow-hidden flex items-center justify-center font-display ${colorStyles.bg} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Visual Fill Track */}
      <div
        className={`absolute left-0 top-0 bottom-0 ${colorStyles.fill} transition-all duration-75 rounded-2xl`}
        style={{ width: confirmed ? '100%' : `${dragX + 28}px` }}
      />

      {/* Label Text */}
      <span className="relative z-10 text-xs font-extrabold uppercase tracking-widest pointer-events-none flex items-center gap-2">
        {confirmed ? (
          <>
            <Check className="w-4 h-4 stroke-[3]" />
            {successLabel}
          </>
        ) : (
          label
        )}
      </span>

      {/* Slide Handle Button */}
      {!confirmed && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: getWidth() }}
          dragElastic={0.1}
          dragMomentum={false}
          onDrag={(e, info) => setDragX(Math.max(0, info.offset.x))}
          onDragEnd={handleDragEnd}
          animate={{ x: dragX }}
          className={`absolute left-1 top-1 bottom-1 w-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-20 tactile-btn ${colorStyles.handle}`}
        >
          <ChevronRight className="w-6 h-6 stroke-[3] animate-pulse" />
        </motion.div>
      )}
    </div>
  );
}

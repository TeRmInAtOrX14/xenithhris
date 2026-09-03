import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashAnimation({ onComplete }) {
  const [visible, setVisible] = useState(() => {
    // Check if user already saw splash during this browser session
    return !sessionStorage.getItem('xenith_splash_seen');
  });

  useEffect(() => {
    if (!visible) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setTimeout(() => {
      handleFinish();
    }, 1400); // Strict under 1.5s requirement

    return () => clearTimeout(timer);
  }, [visible]);

  const handleFinish = () => {
    sessionStorage.setItem('xenith_splash_seen', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center text-white"
      >
        {/* Skip button for immediate pass */}
        <button
          onClick={handleFinish}
          className="absolute top-6 right-6 px-3 py-1.5 rounded-full border border-[#262626] bg-[#111111] text-[10px] font-mono font-bold text-brand-text-mute hover:text-[#D7F000] hover:border-[#D7F000] transition-colors cursor-pointer"
        >
          Skip Intro →
        </button>

        <div className="relative flex flex-col items-center gap-4">
          {/* Logo assembly animation */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
            className="w-20 h-20 rounded-2xl bg-[#000000] border-2 border-[#D7F000] flex items-center justify-center shadow-[0_0_40px_rgba(215,240,0,0.35)] relative overflow-hidden"
          >
            <img src="/favicon.png" alt="Xenith Logo Mark" className="w-12 h-12 object-contain" />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D7F000]/40 to-transparent skew-x-12"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-2xl font-extrabold font-display tracking-wider text-white">
              ART<span className="text-[#D7F000]">XENITH</span>
            </h1>
            <p className="text-[10px] font-mono font-bold text-brand-text-mute uppercase tracking-widest mt-1">
              Internal HRIS & Digital Art Suite
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

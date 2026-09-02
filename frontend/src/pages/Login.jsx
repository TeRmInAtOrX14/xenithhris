import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ArrowRight, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useTheme } from '../utils/themeContext';

export default function Login() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { email: '', password: '' }
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const saveSession = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    toast.success('Welcome to ArtXenith HRIS!');
    navigate('/dashboard');
  };

  // Traditional email + password login
  const onSubmit = async (data) => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    try {
      setLoading(true);
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password
      });
      saveSession(res.data);
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      toast.error(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 relative overflow-hidden">
      {/* Theme Toggle in top corner */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-brand-border text-brand-text-soft hover:text-white hover:border-brand-border-strong transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 bg-brand-bg-elevated/40 backdrop-blur-md"
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-brand-amber animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-brand-blue" />
          )}
        </button>
      </div>

      {/* Background atmosphere glows */}
      <div className="glow-field">
        <span className="g1" />
        <span className="g2" />
        <span className="g3" />
      </div>

      {/* Noise Grid overlay */}
      <div className="noise-grid absolute inset-0 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-glow relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.png" alt="ArtXenith logo" className="h-24 w-auto object-contain" />
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-brand-blue text-white rounded">
              HRIS
            </span>
          </div>
          <p className="text-xs text-brand-text-soft font-display uppercase tracking-wider font-bold">
            Enterprise Intelligence Portal
          </p>
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-soft mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-mute" />
              <input
                type="email"
                placeholder="subuahad1@gmail.com"
                {...register('email', { required: 'Email is required' })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border bg-brand-bg-soft text-sm text-brand-text placeholder-brand-text-mute focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            {errors.email && (
              <span className="text-xs text-brand-amber mt-1 block">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-text-soft mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-mute" />
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border bg-brand-bg-soft text-sm text-brand-text placeholder-brand-text-mute focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            {errors.password && (
              <span className="text-xs text-brand-amber mt-1 block">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full font-bold font-display text-sm bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group shadow-lg shadow-brand-blue/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In to Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

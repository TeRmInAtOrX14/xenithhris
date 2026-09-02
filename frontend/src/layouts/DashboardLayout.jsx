import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Briefcase,
  PiggyBank,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  ShieldAlert,
  Loader2,
  FileText,
  ChevronRight,
  Cpu,
  Sun,
  Moon,
  Table,
  FileCode,
  Palette,
  CircleDollarSign,
  Search,
  Settings,
  HelpCircle,
  Sliders,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useTheme } from '../utils/themeContext';

export default function DashboardLayout() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const userString = localStorage.getItem('user');
  const currentUser = userString ? JSON.parse(userString) : { email: 'User', role: 'Employee' };

  // Global Ctrl + K / Cmd + K keyboard shortcut to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await api.get('/system/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications');
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/system/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('Marked all notifications as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { userId: currentUser.id });
    } catch (e) {
      console.warn('Backend logout call skipped');
    }
    localStorage.clear();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Grouped Navigation Items (Kinetic HR Information Architecture)
  const navGroups = [
    {
      group: 'Workspace',
      links: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Designer', 'Employee'] },
        { label: 'Sales Sheet', path: '/dashboard/sales', icon: Table, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive'] },
        { label: 'Project Briefs', path: '/dashboard/briefs', icon: FileCode, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Designer'] },
        { label: 'Designer Portal', path: '/dashboard/artist-assignments', icon: Palette, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Designer'] },
        { label: 'Employees', path: '/dashboard/employees', icon: Users, roles: ['Admin', 'CEO', 'COO', 'Team Lead'] },
        { label: 'Attendance', path: '/dashboard/attendance', icon: CalendarCheck, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Designer', 'Employee'] },
        { label: 'Requests', path: '/dashboard/requests', icon: FileSpreadsheet, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Designer', 'Employee'] },
        { label: 'Loans & Advances', path: '/dashboard/loans', icon: PiggyBank, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Employee'] },
        { label: 'Payroll & Payslips', path: '/dashboard/payroll', icon: FileText, roles: ['Admin', 'CEO', 'COO', 'Team Lead', 'Sales Executive', 'Designer', 'Employee'] }
      ]
    },
    {
      group: 'Management',
      links: [
        { label: 'Executive Finance & P&L', path: '/dashboard/finance', icon: CircleDollarSign, roles: ['Admin', 'CEO', 'COO'] },
        { label: 'Digital Twin', path: '/dashboard/digital-twin', icon: Cpu, roles: ['Admin', 'CEO', 'COO'] }
      ]
    },
    {
      group: 'System',
      links: [
        { label: 'Audit Trail', path: '/dashboard/audit', icon: ShieldAlert, roles: ['Admin', 'CEO', 'COO'] }
      ]
    }
  ];

  // Map route path to human-readable page name for top breadcrumb
  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.includes('/sales')) return 'Sales Sheet';
    if (pathname.includes('/briefs')) return 'Project Briefs';
    if (pathname.includes('/artist-assignments')) return 'Designer Portal';
    if (pathname.includes('/employees')) return 'Employees Directory';
    if (pathname.includes('/attendance')) return 'Attendance Ledger';
    if (pathname.includes('/requests')) return 'Leave & WFH Requests';
    if (pathname.includes('/finance')) return 'Executive Finance & Profit/Loss';
    if (pathname.includes('/payroll')) return 'Payroll & Payslips';
    if (pathname.includes('/loans')) return 'Loans & Advances';
    if (pathname.includes('/audit')) return 'System Audit Trail';
    if (pathname.includes('/digital-twin')) return 'Digital Twin Simulation';
    return 'HRIS Workspace';
  };

  return (
    <div className="min-h-screen bg-brand-bg flex relative overflow-hidden font-sans text-brand-text">
      {/* ---------------- Desktop Sidebar (#111111 Obsidian / Dark Charcoal) ---------------- */}
      <aside
        className={`hidden lg:flex flex-col bg-brand-sidebar-bg border-r border-brand-sidebar-border shrink-0 z-20 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header with Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-brand-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="ArtXenith Logo" className="h-8 w-auto object-contain" />
              <span className="px-1.5 py-0.5 text-[8px] font-extrabold uppercase bg-brand-orange text-white rounded font-mono">
                HRIS
              </span>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <img src="/favicon.png" alt="ArtXenith Favicon" className="h-7 w-7 object-contain" />
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-lg border border-brand-sidebar-border text-brand-text-mute hover:text-white transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {collapsed && (
            <div className="flex justify-center mb-2">
              <button
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-full border border-brand-sidebar-border text-brand-text-mute hover:text-white transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {navGroups.map((group) => {
            const visibleInGroup = group.links.filter(l => l.roles.includes(currentUser.role));
            if (visibleInGroup.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[9px] font-bold text-brand-text-mute uppercase tracking-widest font-mono mb-2">
                    {group.group}
                  </p>
                )}

                {visibleInGroup.map((link) => {
                  const Icon = link.icon;
                  const active = location.pathname === link.path;

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`relative flex items-center gap-3.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'
                      } ${
                        active
                          ? 'bg-brand-bg-elevated text-white font-bold border-l-2 border-brand-orange shadow-sm'
                          : 'text-brand-text-soft hover:text-white hover:bg-brand-bg-elevated/50'
                      }`}
                      title={collapsed ? link.label : ''}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-orange' : 'text-brand-text-mute'}`} />
                      {!collapsed && <span>{link.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card & Logout */}
        <div className="p-3 border-t border-brand-sidebar-border bg-brand-bg-soft/40">
          <div className={`flex items-center gap-3 mb-2 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center border border-brand-orange/30 shrink-0">
              <User className="w-4 h-4 text-brand-orange" />
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate font-display">{currentUser.email?.split('@')[0]}</p>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-brand-border text-brand-text-soft">
                  {currentUser.role}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-brand-border/60 text-[10px] font-extrabold uppercase tracking-wider text-brand-text-soft hover:text-white hover:border-brand-orange/50 hover:bg-brand-orange/10 transition-all cursor-pointer ${
              collapsed ? 'p-2' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 text-brand-text-mute" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile Sidebar Drawer ---------------- */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-brand-sidebar-bg border-r border-brand-sidebar-border z-50 lg:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-5 border-b border-brand-sidebar-border">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="ArtXenith Logo" className="h-8 w-auto object-contain" />
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase bg-brand-orange text-white rounded">HRIS</span>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-brand-text-soft" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                {navGroups.map((group) => {
                  const visibleInGroup = group.links.filter(l => l.roles.includes(currentUser.role));
                  if (visibleInGroup.length === 0) return null;

                  return (
                    <div key={group.group} className="space-y-1">
                      <p className="px-3 text-[9px] font-bold text-brand-text-mute uppercase tracking-widest font-mono mb-2">
                        {group.group}
                      </p>
                      {visibleInGroup.map((link) => {
                        const Icon = link.icon;
                        const active = location.pathname === link.path;
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                              active
                                ? 'bg-brand-bg-elevated text-white border-l-2 border-brand-orange'
                                : 'text-brand-text-soft hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-orange' : 'text-brand-text-mute'}`} />
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-brand-sidebar-border bg-brand-bg-soft/40">
                <div className="flex items-center gap-3 px-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center border border-brand-orange/30">
                    <User className="w-4 h-4 text-brand-orange" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-white truncate font-display">{currentUser.email}</p>
                    <p className="text-[9px] text-brand-text-mute font-mono uppercase">{currentUser.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-brand-border/60 text-[10px] uppercase font-bold text-brand-text-soft hover:text-white hover:border-brand-orange/50 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-brand-text-mute" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---------------- Main Content Workspace ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen z-10">
        {/* Kinetic HR Top Navigation Header */}
        <header className="h-16 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md flex items-center justify-between px-6 z-30 sticky top-0">
          {/* Left: Breadcrumbs & Current Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-brand-border text-brand-text-soft hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="hidden lg:block p-1.5 rounded-lg border border-brand-border text-brand-text-mute hover:text-white transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-brand-text-mute uppercase tracking-wider">
                <span>ArtXenith</span>
                <span>/</span>
                <span className="text-brand-orange">{currentUser.role}</span>
              </div>
              <h1 className="text-sm font-extrabold text-white font-display tracking-tight">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
          </div>

          {/* Right Top Header Actions */}
          <div className="flex items-center gap-3">
            {/* Global Search Bar with Ctrl + K Indicator */}
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 text-brand-text-mute absolute left-3 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees, projects..."
                className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-brand-bg-elevated/60 border border-brand-border text-xs text-brand-text placeholder-brand-text-mute focus:outline-none focus:border-brand-orange"
              />
              <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-brand-border/60 text-brand-text-mute rounded border border-brand-border">
                Ctrl K
              </kbd>
            </div>

            {/* Real Theme System Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-brand-border text-brand-text-soft hover:text-white hover:border-brand-orange/40 transition-all cursor-pointer flex items-center justify-center bg-brand-bg-elevated/50"
              aria-label="Toggle Theme"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-brand-orange" />
              ) : (
                <Moon className="w-4 h-4 text-brand-orange" />
              )}
            </button>

            {/* Notification Bell Center */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-xl border border-brand-border text-brand-text-soft hover:text-white hover:border-brand-orange/40 transition-colors cursor-pointer relative bg-brand-bg-elevated/50"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-brand-bg-elevated border border-brand-border rounded-2xl p-4 shadow-2xl z-50 text-left"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-brand-border pb-2.5">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">Notifications</h4>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-brand-orange hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {notifLoading && notifications.length === 0 ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-text-mute" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <p className="text-xs text-brand-text-mute text-center py-4">No notifications yet</p>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl border text-left transition-colors ${
                                n.isRead ? 'border-brand-border/60 bg-brand-bg-soft/40' : 'border-brand-orange/30 bg-brand-orange/5'
                              }`}
                            >
                              <p className="text-xs font-bold text-white">{n.title}</p>
                              <p className="text-[11px] text-brand-text-soft mt-1 leading-normal">{n.message}</p>
                              <p className="text-[9px] text-brand-text-mute mt-1 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Header User Avatar Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-brand-border">
              <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center border border-brand-orange/30">
                <User className="w-4 h-4 text-brand-orange" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">{currentUser.email?.split('@')[0]}</span>
                <span className="text-[9px] text-brand-text-mute font-mono uppercase">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-brand-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

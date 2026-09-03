import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  AlertTriangle,
  FileCode,
  DollarSign,
  Clock,
  ChevronRight,
  CheckCircle,
  X,
  Upload,
  User,
  CreditCard,
  Layers,
  Edit3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STAGES = ['Initial Sketch', 'Line Art', 'Base Color', 'Final Artwork'];
const PLATFORMS = ['Direct / Website', 'Upwork', 'Fiverr', 'LinkedIn', 'Instagram', 'Cold Email', 'Referral', 'Other'];
const PAYMENT_METHODS = ['Online/Bank Transfer', 'Wise', 'Stripe', 'PayPal', 'Payoneer', 'Cash', 'Crypto'];

export default function SalesSheet() {
  const [sales, setSales] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showCeoView, setShowCeoView] = useState(false);

  // Modals & Drawers
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [installmentDrawerOpen, setInstallmentDrawerOpen] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // Active Selected Sale for Drawer/Modal
  const [activeSale, setActiveSale] = useState(null);
  const [activeInstallments, setActiveInstallments] = useState([]);
  const [installmentSummary, setInstallmentSummary] = useState(null);

  // Form states
  const emptySaleForm = {
    clientName: '',
    clientEmail: '',
    projectName: '',
    saleAmount: '',
    upfrontAmount: '',
    tipAmount: '',
    saleDate: new Date().toISOString().split('T')[0],
    employeeId: '',
    designerId: '',
    designerFee: '',
    installmentsCount: 1,
    platform: 'Direct / Website',
    paymentMethod: 'Online/Bank Transfer',
    completionDate: '',
    fallInMonth: '',
    workDetails: '',
    extraInfo: '',
    notes: ''
  };
  const [saleForm, setSaleForm] = useState(emptySaleForm);

  // New Installment Drawer Form State
  const [newInstallmentData, setNewInstallmentData] = useState({
    grossAmount: '',
    feeDeducted: '0',
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: 'Online/Bank Transfer',
    exchangeRate: '278.5',
    pkrAmount: '',
    fallInMonth: '',
    notes: ''
  });

  // Brief Form State
  const [briefData, setBriefData] = useState({
    fileName: '',
    fileUrl: '',
    notes: ''
  });

  // Override Form State
  const [overrideData, setOverrideData] = useState({
    verifiedSaleAmount: '',
    verifiedUpfront: '',
    verifiedNetReceivedUsd: '',
    totalFeesDeductedUsd: '',
    verifiedPkrReceived: '',
    overrideNotes: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user')) || { role: 'Employee' };
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);
  const isTL = currentUser.role === 'Team Lead';
  const isDesigner = currentUser.role === 'Designer';

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales?month=${month}&year=${year}&search=${encodeURIComponent(search)}&stage=${selectedStage}&employeeId=${selectedEmployee}`);
      setSales(res.data || []);
    } catch (e) {
      toast.error('Failed to load sales sheet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/sales/alerts');
      setAlerts(res.data || []);
    } catch (e) {
      console.error('Failed to load sales alerts');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data || []);
    } catch (e) {
      console.error('Failed to load employees');
    }
  };

  useEffect(() => {
    fetchSales();
  }, [month, year, search, selectedStage, selectedEmployee]);

  useEffect(() => {
    fetchAlerts();
    fetchEmployees();
  }, []);

  // Fetch Installment Drawer Data
  const openInstallmentDrawer = async (sale) => {
    setActiveSale(sale);
    setInstallmentDrawerOpen(true);
    try {
      const res = await api.get(`/sales/${sale.id}/installments`);
      setActiveInstallments(res.data.installments || []);
      setInstallmentSummary(res.data.summary || null);
    } catch (err) {
      toast.error('Failed to load installment sub-sheet');
    }
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sales', saleForm);
      toast.success('Sale entry added to spreadsheet');
      setNewSaleModalOpen(false);
      setSaleForm(emptySaleForm);
      fetchSales();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create sale');
    }
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      await api.put(`/sales/${activeSale.id}`, saleForm);
      toast.success('Sale entry updated');
      setEditSaleModalOpen(false);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update sale');
    }
  };

  const openEditModal = (sale) => {
    setActiveSale(sale);
    setSaleForm({
      clientName: sale.clientName || '',
      clientEmail: sale.clientEmail || '',
      projectName: sale.projectName || '',
      saleAmount: sale.saleAmount || '',
      upfrontAmount: sale.upfrontAmount || '',
      tipAmount: sale.tipAmount || '',
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : '',
      employeeId: sale.employeeId || '',
      designerId: sale.designerId || '',
      designerFee: sale.designerFee || '',
      installmentsCount: sale.installmentsCount || 1,
      platform: sale.platform || 'Direct / Website',
      paymentMethod: sale.paymentMethod || 'Online/Bank Transfer',
      completionDate: sale.completionDate ? new Date(sale.completionDate).toISOString().split('T')[0] : '',
      fallInMonth: sale.fallInMonth || '',
      workDetails: sale.workDetails || '',
      extraInfo: sale.extraInfo || '',
      notes: sale.notes || ''
    });
    setEditSaleModalOpen(true);
  };

  const handleLogInstallment = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      const gross = parseFloat(newInstallmentData.grossAmount);
      if (isNaN(gross) || gross <= 0) {
        return toast.error('Enter a valid gross amount');
      }
      await api.post(`/sales/${activeSale.id}/payments`, newInstallmentData);
      toast.success('Installment logged & parent sale updated');
      setNewInstallmentData({
        grossAmount: '',
        feeDeducted: '0',
        paymentDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        paymentMethod: 'Online/Bank Transfer',
        exchangeRate: '278.5',
        pkrAmount: '',
        fallInMonth: '',
        notes: ''
      });
      openInstallmentDrawer(activeSale);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log installment');
    }
  };

  const handleDeleteInstallment = async (paymentId) => {
    if (!activeSale) return;
    try {
      await api.delete(`/sales/${activeSale.id}/installments/${paymentId}`);
      toast.success('Installment entry deleted');
      openInstallmentDrawer(activeSale);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete installment');
    }
  };

  const handleStageChange = async (saleId, newStage) => {
    try {
      await api.patch(`/sales/${saleId}/stage`, { newStage, notes: 'Updated stage from spreadsheet grid' });
      toast.success(`Stage updated to ${newStage}`);
      fetchSales();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stage');
    }
  };

  const handleUploadBrief = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      await api.post(`/sales/${activeSale.id}/briefs`, briefData);
      toast.success('Brief uploaded successfully');
      setBriefModalOpen(false);
      setBriefData({ fileName: '', fileUrl: '', notes: '' });
      fetchSales();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload brief');
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      await api.post(`/sales/${activeSale.id}/override`, overrideData);
      toast.success('Official CEO/TL financial reconciliation saved');
      setOverrideModalOpen(false);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save override');
    }
  };

  const exportCSV = () => {
    if (sales.length === 0) return toast.error('No sales data to export');
    const headers = [
      'Sale Number,Date,Project Name,Upfront ($),Remaining ($),Tip ($),Total Sale ($),Installments,Work Stage,Payment Status,Platform,Client Name,Client Email,Sales Exec,Payment Method,Completion Date,Fall In Month,Extra Info'
    ];
    const rows = sales.map(s => [
      `"${s.projectNumber}"`,
      `"${new Date(s.saleDate).toLocaleDateString()}"`,
      `"${s.projectName}"`,
      s.upfrontAmount || 0,
      s.remainingAmount || 0,
      s.tipAmount || 0,
      (s.saleAmount || 0) + (s.tipAmount || 0),
      `"${s.installmentsReceived}/${s.installmentsCount}"`,
      `"${s.projectStage}"`,
      `"${s.paymentStatus}"`,
      `"${s.platform || 'Direct'}"`,
      `"${s.clientName}"`,
      `"${s.clientEmail || ''}"`,
      `"${s.employee?.fullName || ''}"`,
      `"${s.paymentMethod || 'Online/Bank Transfer'}"`,
      s.completionDate ? `"${new Date(s.completionDate).toLocaleDateString()}"` : '""',
      `"${s.fallInMonth || ''}"`,
      `"${s.extraInfo || s.notes || ''}"`
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ArtXenith_Sales_Sheet_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateDaysInStage = (updatedAt) => {
    const diff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <Table className="w-5 h-5 text-brand-cyan" />
            Excel Sales Sheet & Installment Engine
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">
            Complete 18-column sales grid with sub-sheet installment tracking & CEO tax reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {(isCEOOrAdmin || isTL) && (
            <button
              onClick={() => setShowCeoView(!showCeoView)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold font-display uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                showCeoView
                  ? 'bg-brand-violet/20 border-brand-violet text-brand-violet shadow-glow'
                  : 'bg-brand-bg-soft/40 border-brand-border text-brand-text-soft hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-violet" />
              {showCeoView ? 'CEO Reconciled Layer Active' : 'Show CEO Tax Layer'}
            </button>
          )}

          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl border border-brand-border hover:border-brand-border-strong bg-brand-bg-soft/40 text-xs font-bold uppercase tracking-wider font-display text-brand-text-soft hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-cyan" />
            Export Excel (CSV)
          </button>

          {!isDesigner && (
            <button
              onClick={() => { setSaleForm(emptySaleForm); setNewSaleModalOpen(true); }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg hover:scale-[1.02] transition-all font-bold font-display text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/20"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          )}
        </div>
      </div>

      {/* Automatic SLA Alert Banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                alert.type === 'stagnant_project'
                  ? 'border-brand-amber/30 bg-brand-amber/10 text-brand-amber'
                  : alert.type === 'payment_overdue'
                  ? 'border-brand-red/40 bg-brand-red/10 text-brand-red'
                  : 'border-brand-blue/30 bg-brand-blue/10 text-brand-cyan'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                <div>
                  <strong className="font-bold uppercase tracking-wider">{alert.title}: </strong>
                  <span>{alert.message}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-brand-border bg-brand-bg-soft/40 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Month & Year */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-text-mute" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white cursor-pointer focus:outline-none"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2026, i).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white cursor-pointer focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-brand-text-mute absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search #PRJ, Client, Project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white cursor-pointer focus:outline-none"
          >
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {isCEOOrAdmin && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-brand-bg text-xs text-white cursor-pointer focus:outline-none"
            >
              <option value="">All Sales Execs</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Complete 18-Column Interactive Excel Table */}
      <div className="border border-brand-border rounded-2xl bg-brand-bg-soft/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px] text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-elevated/80 text-[9px] uppercase font-extrabold tracking-wider text-brand-text-soft">
                <th className="p-3 border-r border-brand-border/40">Sale #</th>
                <th className="p-3 border-r border-brand-border/40">Date</th>
                <th className="p-3 border-r border-brand-border/40">Name (Project)</th>
                <th className="p-3 border-r border-brand-border/40 text-right">Upfront ($)</th>
                <th className="p-3 border-r border-brand-border/40 text-right">Remaining ($)</th>
                <th className="p-3 border-r border-brand-border/40 text-right">Tip ($)</th>
                <th className="p-3 border-r border-brand-border/40 text-right">Total Sale ($)</th>
                <th className="p-3 border-r border-brand-border/40 text-center">Installment (Sub-Sheet)</th>
                <th className="p-3 border-r border-brand-border/40">Work (Stage)</th>
                <th className="p-3 border-r border-brand-border/40">Status</th>
                <th className="p-3 border-r border-brand-border/40">Platform</th>
                <th className="p-3 border-r border-brand-border/40">Client Name & Email</th>
                <th className="p-3 border-r border-brand-border/40">Agent / Sales Exec</th>
                <th className="p-3 border-r border-brand-border/40">Payment Method</th>
                <th className="p-3 border-r border-brand-border/40">Completion Date</th>
                <th className="p-3 border-r border-brand-border/40">Fall in Month</th>
                <th className="p-3 border-r border-brand-border/40">Extra Info</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-brand-text-soft">
              {loading ? (
                <tr>
                  <td colSpan={18} className="p-8 text-center text-brand-text-mute">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-cyan" />
                    Loading Excel Sales Sheet...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-8 text-center text-brand-text-mute">
                    No sales entries found for this filter. Click "New Entry" to add one.
                  </td>
                </tr>
              ) : (
                sales.map(sale => {
                  const daysInStage = calculateDaysInStage(sale.stageUpdatedAt);
                  const isStagnant = daysInStage > 5 && sale.projectStage !== 'Final Artwork';
                  const totalSaleVal = (sale.saleAmount || 0) + (sale.tipAmount || 0);

                  return (
                    <tr key={sale.id} className="hover:bg-brand-bg-elevated/40 transition-colors">
                      {/* 1. Sale Number */}
                      <td className="p-3 font-mono font-bold text-brand-cyan border-r border-brand-border/30">
                        {sale.projectNumber}
                      </td>

                      {/* 2. Date */}
                      <td className="p-3 font-mono text-white border-r border-brand-border/30 whitespace-nowrap">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </td>

                      {/* 3. Name (Project Name) */}
                      <td className="p-3 font-bold text-white border-r border-brand-border/30 max-w-[180px] truncate" title={sale.projectName}>
                        {sale.projectName}
                      </td>

                      {/* 4. Upfront */}
                      <td className="p-3 text-right font-mono font-bold text-brand-green border-r border-brand-border/30">
                        ${(sale.upfrontAmount || 0).toLocaleString()}
                      </td>

                      {/* 5. Remaining */}
                      <td className="p-3 text-right font-mono font-bold text-brand-amber border-r border-brand-border/30">
                        ${(sale.remainingAmount || 0).toLocaleString()}
                      </td>

                      {/* 6. Tip */}
                      <td className="p-3 text-right font-mono text-brand-violet border-r border-brand-border/30">
                        ${(sale.tipAmount || 0).toLocaleString()}
                      </td>

                      {/* 7. Total Sale */}
                      <td className="p-3 text-right font-mono font-extrabold text-white border-r border-brand-border/30">
                        ${totalSaleVal.toLocaleString()}
                      </td>

                      {/* 8. Installment (Sub-Sheet Drawer Button) */}
                      <td className="p-3 text-center border-r border-brand-border/30">
                        <button
                          onClick={() => openInstallmentDrawer(sale)}
                          className="px-2.5 py-1 rounded-xl bg-brand-blue/15 hover:bg-brand-blue/30 text-brand-cyan border border-brand-blue/30 text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          {sale.installmentsReceived} / {sale.installmentsCount} Paid 📑
                        </button>
                      </td>

                      {/* 9. Work (Stage) */}
                      <td className="p-3 border-r border-brand-border/30">
                        <select
                          value={sale.projectStage}
                          onChange={(e) => handleStageChange(sale.id, e.target.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-brand-bg cursor-pointer focus:outline-none ${
                            sale.projectStage === 'Final Artwork'
                              ? 'text-brand-green border-brand-green/30'
                              : isStagnant
                              ? 'text-brand-amber border-brand-amber/50 animate-pulse'
                              : 'text-brand-cyan border-brand-cyan/30'
                          }`}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* 10. Status */}
                      <td className="p-3 border-r border-brand-border/30">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                            : sale.paymentStatus === 'Partial'
                            ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
                            : 'bg-brand-red/10 text-brand-red border-brand-red/20'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </td>

                      {/* 11. Platform */}
                      <td className="p-3 font-mono text-[11px] text-white border-r border-brand-border/30">
                        {sale.platform || 'Direct'}
                      </td>

                      {/* 12. Client Name & Email */}
                      <td className="p-3 border-r border-brand-border/30 max-w-[160px]">
                        <div className="font-bold text-white truncate" title={sale.clientName}>{sale.clientName}</div>
                        {sale.clientEmail && <div className="text-[10px] text-brand-text-mute truncate" title={sale.clientEmail}>{sale.clientEmail}</div>}
                      </td>

                      {/* 13. Agent / Sales Exec */}
                      <td className="p-3 border-r border-brand-border/30">
                        <div className="font-bold text-white text-[11px]">{sale.employee?.fullName || 'Unassigned'}</div>
                        <div className="text-[9px] text-brand-text-mute font-mono">{sale.employee?.employeeCode}</div>
                      </td>

                      {/* 14. Payment Method */}
                      <td className="p-3 text-[11px] text-brand-text-soft border-r border-brand-border/30">
                        {sale.paymentMethod || 'Online/Bank Transfer'}
                      </td>

                      {/* 15. Completion Date */}
                      <td className="p-3 font-mono text-[11px] text-brand-text-soft border-r border-brand-border/30">
                        {sale.completionDate ? new Date(sale.completionDate).toLocaleDateString() : '—'}
                      </td>

                      {/* 16. Fall in Month */}
                      <td className="p-3 font-mono text-[11px] text-brand-cyan border-r border-brand-border/30">
                        {sale.fallInMonth || '—'}
                      </td>

                      {/* 17. Extra Info */}
                      <td className="p-3 max-w-[140px] truncate text-[10px] text-brand-text-mute border-r border-brand-border/30" title={sale.extraInfo || sale.notes || ''}>
                        {sale.extraInfo || sale.notes || '—'}
                      </td>

                      {/* 18. Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="p-1.5 rounded-lg border border-brand-border hover:border-brand-blue/50 text-brand-text-mute hover:text-white transition-colors"
                            title="Edit Entry Row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setActiveSale(sale); setBriefModalOpen(true); }}
                            className="p-1.5 rounded-lg border border-brand-border hover:border-brand-cyan/50 text-brand-text-mute hover:text-brand-cyan transition-colors"
                            title="Briefs & Files"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                          {(isCEOOrAdmin || isTL) && (
                            <button
                              onClick={() => { setActiveSale(sale); setOverrideModalOpen(true); }}
                              className="p-1.5 rounded-lg border border-brand-violet/30 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet/20 transition-colors"
                              title="CEO Financial Reconciliation Override"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-Sheet Installment Drawer / Modal */}
      <AnimatePresence>
        {installmentDrawerOpen && activeSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-blue/40 rounded-2xl p-6 max-w-3xl w-full text-left space-y-4 shadow-glow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-bold text-brand-cyan uppercase font-mono">{activeSale.projectNumber}</span>
                  <h3 className="text-sm font-extrabold text-white font-display">
                    Installment Sub-Ledger: {activeSale.projectName}
                  </h3>
                  <p className="text-[10px] text-brand-text-mute">
                    Manage diverse payment dates, months, gross amounts sent by client, and bank conversion fee deductions.
                  </p>
                </div>
                <button onClick={() => setInstallmentDrawerOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Installment Summary */}
              {installmentSummary && (
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-brand-bg-soft/40 border border-brand-border/40 text-center">
                  <div>
                    <p className="text-[9px] text-brand-text-mute uppercase font-bold">Total Client Gross</p>
                    <p className="text-sm font-extrabold text-white font-mono">${installmentSummary.totalGross}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-text-mute uppercase font-bold">Total Fees/Tax Deducted</p>
                    <p className="text-sm font-extrabold text-brand-red font-mono">${installmentSummary.totalFees}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-text-mute uppercase font-bold">Net Received in Bank</p>
                    <p className="text-sm font-extrabold text-brand-green font-mono">${installmentSummary.totalNet}</p>
                  </div>
                </div>
              )}

              {/* Installments Table */}
              <div className="border border-brand-border/40 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-bg/80 text-[9px] uppercase font-bold text-brand-text-mute border-b border-brand-border/40">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Fall Month</th>
                      <th className="p-2.5 text-right">Gross Client ($)</th>
                      <th className="p-2.5 text-right">Fee/Tax ($)</th>
                      <th className="p-2.5 text-right">Net Received ($)</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-white font-mono">
                    {activeInstallments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-brand-text-mute font-sans">
                          No installments logged yet. Log the first installment below.
                        </td>
                      </tr>
                    ) : (
                      activeInstallments.map((inst, i) => (
                        <tr key={inst.id} className="hover:bg-brand-bg-elevated/40">
                          <td className="p-2.5 font-bold">{inst.installmentNumber || (i + 1)}</td>
                          <td className="p-2.5">{new Date(inst.paymentDate).toLocaleDateString()}</td>
                          <td className="p-2.5 text-brand-cyan">{inst.fallInMonth || '—'}</td>
                          <td className="p-2.5 text-right font-bold">${inst.grossAmount}</td>
                          <td className="p-2.5 text-right text-brand-red">${inst.feeDeducted || 0}</td>
                          <td className="p-2.5 text-right text-brand-green font-bold">${inst.netAmount || inst.amount}</td>
                          <td className="p-2.5 text-[10px] font-sans">{inst.paymentMethod}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              inst.status === 'received' ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-amber/15 text-brand-amber'
                            }`}>
                              {inst.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteInstallment(inst.id)}
                              className="text-brand-text-mute hover:text-brand-red transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Log New Installment Form */}
              <form onSubmit={handleLogInstallment} className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border/40 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Log New Installment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Gross Client Sent ($)</label>
                    <input
                      type="number"
                      value={newInstallmentData.grossAmount}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, grossAmount: e.target.value })}
                      placeholder="e.g. 200"
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Tax / Fee Deducted ($)</label>
                    <input
                      type="number"
                      value={newInstallmentData.feeDeducted}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, feeDeducted: e.target.value })}
                      placeholder="e.g. 10 (Bank/conversion loss)"
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={newInstallmentData.paymentDate}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, paymentDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Payment Method</label>
                    <select
                      value={newInstallmentData.paymentMethod}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Accounting Fall-In Month</label>
                    <input
                      type="text"
                      value={newInstallmentData.fallInMonth}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, fallInMonth: e.target.value })}
                      placeholder="e.g. Sep 2026"
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-brand-text-mute uppercase mb-1">Notes</label>
                    <input
                      type="text"
                      value={newInstallmentData.notes}
                      onChange={e => setNewInstallmentData({ ...newInstallmentData, notes: e.target.value })}
                      placeholder="Installment notes..."
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-brand-bg font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                >
                  Log Installment & Update Main Sheet
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New / Edit Sale Modal */}
      <AnimatePresence>
        {(newSaleModalOpen || editSaleModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 max-w-2xl w-full text-left space-y-4 shadow-glow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <h3 className="text-sm font-extrabold text-white font-display">
                  {editSaleModalOpen ? `Edit Entry #${activeSale?.projectNumber}` : 'New Sales Sheet Entry'}
                </h3>
                <button onClick={() => { setNewSaleModalOpen(false); setEditSaleModalOpen(false); }} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={editSaleModalOpen ? handleUpdateSale : handleCreateSale} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={saleForm.projectName}
                      onChange={e => setSaleForm({ ...saleForm, projectName: e.target.value })}
                      required
                      placeholder="e.g. Mascot Logo & Branding"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Client Name *</label>
                    <input
                      type="text"
                      value={saleForm.clientName}
                      onChange={e => setSaleForm({ ...saleForm, clientName: e.target.value })}
                      required
                      placeholder="e.g. John Smith"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {(isCEOOrAdmin || isTL) && !editSaleModalOpen && (
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Sales Executive (Agent) *</label>
                    <select
                      value={saleForm.employeeId}
                      onChange={e => setSaleForm({ ...saleForm, employeeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Sales Executive (Default: Yourself)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.designation})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Gross Sale ($) *</label>
                    <input
                      type="number"
                      value={saleForm.saleAmount}
                      onChange={e => setSaleForm({ ...saleForm, saleAmount: e.target.value })}
                      required
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Upfront ($)</label>
                    <input
                      type="number"
                      value={saleForm.upfrontAmount}
                      onChange={e => setSaleForm({ ...saleForm, upfrontAmount: e.target.value })}
                      placeholder="e.g. 250"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Tip ($)</label>
                    <input
                      type="number"
                      value={saleForm.tipAmount}
                      onChange={e => setSaleForm({ ...saleForm, tipAmount: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Platform</label>
                    <select
                      value={saleForm.platform}
                      onChange={e => setSaleForm({ ...saleForm, platform: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Payment Method</label>
                    <select
                      value={saleForm.paymentMethod}
                      onChange={e => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Installments Count</label>
                    <input
                      type="number"
                      value={saleForm.installmentsCount}
                      onChange={e => setSaleForm({ ...saleForm, installmentsCount: e.target.value })}
                      min={1}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Client Email</label>
                    <input
                      type="email"
                      value={saleForm.clientEmail}
                      onChange={e => setSaleForm({ ...saleForm, clientEmail: e.target.value })}
                      placeholder="client@company.com"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Accounting Fall In Month</label>
                    <input
                      type="text"
                      value={saleForm.fallInMonth}
                      onChange={e => setSaleForm({ ...saleForm, fallInMonth: e.target.value })}
                      placeholder="e.g. Sep 2026"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Extra Info / Notes</label>
                  <textarea
                    rows={2}
                    value={saleForm.extraInfo}
                    onChange={e => setSaleForm({ ...saleForm, extraInfo: e.target.value })}
                    placeholder="Custom notes, instructions..."
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => { setNewSaleModalOpen(false); setEditSaleModalOpen(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-brand-bg font-bold text-xs uppercase tracking-wider hover:opacity-90"
                  >
                    {editSaleModalOpen ? 'Save Updates' : 'Add Entry to Sheet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CEO Financial Reconciliation Override Modal */}
      <AnimatePresence>
        {overrideModalOpen && activeSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-bg-elevated border border-brand-violet/40 rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-glow"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-bold text-brand-violet uppercase font-mono">{activeSale.projectNumber}</span>
                  <h3 className="text-sm font-extrabold text-white font-display">CEO/TL Official Reconciliation</h3>
                  <p className="text-[10px] text-brand-text-mute">
                    Log verified tax/conversion adjusted numbers for executive records.
                  </p>
                </div>
                <button onClick={() => setOverrideModalOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveOverride} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Verified Net Received ($)</label>
                  <input
                    type="number"
                    value={overrideData.verifiedNetReceivedUsd}
                    onChange={e => setOverrideData({ ...overrideData, verifiedNetReceivedUsd: e.target.value })}
                    placeholder="Net USD after platform tax/conversion"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Total Fees & Tax Deducted ($)</label>
                  <input
                    type="number"
                    value={overrideData.totalFeesDeductedUsd}
                    onChange={e => setOverrideData({ ...overrideData, totalFeesDeductedUsd: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-soft uppercase mb-1">Override Notes</label>
                  <textarea
                    rows={2}
                    value={overrideData.overrideNotes}
                    onChange={e => setOverrideData({ ...overrideData, overrideNotes: e.target.value })}
                    placeholder="Reason for reconciliation..."
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setOverrideModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-xs text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-brand-violet hover:bg-brand-violet/80 text-white font-bold text-xs uppercase"
                  >
                    Save Reconciliation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

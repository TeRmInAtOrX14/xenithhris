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
  CreditCard
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STAGES = ['Initial Sketch', 'Line Art', 'Base Color', 'Final Artwork'];

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

  // Modals
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeSale, setActiveSale] = useState(null);

  // Form states
  const [newSaleData, setNewSaleData] = useState({
    clientName: '',
    projectName: '',
    saleAmount: '',
    saleDate: new Date().toISOString().split('T')[0],
    employeeId: '',
    installmentsCount: 1,
    paymentMethod: 'Online/Bank Transfer',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Online/Bank Transfer',
    notes: ''
  });

  const [briefData, setBriefData] = useState({
    fileName: '',
    fileUrl: '',
    notes: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('user')) || { role: 'Employee' };
  const isAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales?month=${month}&year=${year}&search=${search}&stage=${selectedStage}&employeeId=${selectedEmployee}`);
      setSales(res.data);
    } catch (e) {
      toast.error('Failed to load sales sheet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/sales/alerts');
      setAlerts(res.data);
    } catch (e) {
      console.error('Failed to load sales alerts');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
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

  const handleCreateSale = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sales', newSaleData);
      toast.success('Sale created successfully');
      setNewSaleModalOpen(false);
      setNewSaleData({
        clientName: '',
        projectName: '',
        saleAmount: '',
        saleDate: new Date().toISOString().split('T')[0],
        employeeId: '',
        installmentsCount: 1,
        paymentMethod: 'Online/Bank Transfer',
        notes: ''
      });
      fetchSales();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create sale');
    }
  };

  const handleStageChange = async (saleId, newStage) => {
    try {
      await api.patch(`/sales/${saleId}/stage`, { newStage, notes: 'Updated stage from sales grid' });
      toast.success(`Stage updated to ${newStage}`);
      fetchSales();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stage');
    }
  };

  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      await api.post(`/sales/${activeSale.id}/payments`, paymentData);
      toast.success('Payment logged successfully');
      setPaymentModalOpen(false);
      setPaymentData({ amount: '', paymentMethod: 'Online/Bank Transfer', notes: '' });
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log payment');
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBriefData({
        ...briefData,
        fileName: file.name,
        fileUrl: evt.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  const exportCSV = () => {
    if (sales.length === 0) return toast.error('No sales data to export');
    const headers = ['Client Name,Project Name,Sale Date,Sales Person,Sale Amount,Received,Remaining,Installments,Stage,Brief Status,Payment Status'];
    const rows = sales.map(s => [
      `"${s.clientName}"`,
      `"${s.projectName}"`,
      new Date(s.saleDate).toLocaleDateString(),
      `"${s.employee?.fullName || ''}"`,
      s.saleAmount,
      s.amountReceived,
      s.remainingAmount,
      `"${s.installmentsReceived}/${s.installmentsCount}"`,
      `"${s.projectStage}"`,
      `"${s.briefStatus}"`,
      `"${s.paymentStatus}"`
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Sheet_${month}_${year}.csv`);
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
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <Table className="w-5 h-5 text-brand-cyan" />
            Excel Sales Sheet & Pipeline
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">Manage sales, client payments, 4-stage project progress, and versioned briefs.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-full border border-brand-border hover:border-brand-border-strong bg-brand-bg-soft/40 text-xs font-bold uppercase tracking-wider font-display text-brand-text-soft hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-cyan" />
            Export CSV
          </button>

          <button
            onClick={() => setNewSaleModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg hover:scale-[1.02] transition-all font-bold font-display text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/20"
          >
            <Plus className="w-4 h-4" />
            New Sale / Entry
          </button>
        </div>
      </div>

      {/* Automatic Alert Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                alert.type === 'stagnant_project'
                  ? 'border-brand-amber/30 bg-brand-amber/10 text-brand-amber'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                <div>
                  <strong className="font-bold uppercase tracking-wider">{alert.title}: </strong>
                  <span>{alert.message} ({alert.employeeName})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-brand-border bg-brand-bg-soft/40 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-text-mute" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white appearance-none cursor-pointer focus:outline-none"
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
              className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-brand-text-mute absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Client or Project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white appearance-none cursor-pointer focus:outline-none"
          >
            <option value="">All Project Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Employee Filter for Admin/TL */}
          {isAdmin && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-xs text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Excel Data Grid Table */}
      <div className="border border-brand-border rounded-2xl bg-brand-bg-soft/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-elevated/60 text-[9px] uppercase font-extrabold tracking-widest text-brand-text-soft">
                <th className="p-3.5">Client & Project</th>
                <th className="p-3.5">Date & Staff</th>
                <th className="p-3.5 text-right">Sale Amount</th>
                <th className="p-3.5 text-right">Received / Rem.</th>
                <th className="p-3.5">Installments</th>
                <th className="p-3.5">Project Stage (4-Step)</th>
                <th className="p-3.5">Brief Status</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-xs text-brand-text-soft">
              {sales.map(sale => {
                const daysInStage = calculateDaysInStage(sale.stageUpdatedAt);
                const isStagnant = daysInStage > 5 && sale.projectStage !== 'Final Artwork';

                return (
                  <tr key={sale.id} className="hover:bg-brand-bg-elevated/20 transition-colors">
                    {/* Client & Project */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm">{sale.projectName}</div>
                      <div className="text-[11px] text-brand-cyan mt-0.5">{sale.clientName}</div>
                    </td>

                    {/* Date & Staff */}
                    <td className="p-3.5 font-mono">
                      <div className="text-white font-bold">{new Date(sale.saleDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-brand-text-mute mt-0.5">{sale.employee?.fullName || 'Unassigned'}</div>
                    </td>

                    {/* Sale Amount */}
                    <td className="p-3.5 text-right font-mono font-extrabold text-white">
                      PKR {sale.saleAmount.toLocaleString()}
                    </td>

                    {/* Received / Remaining */}
                    <td className="p-3.5 text-right font-mono">
                      <div className="text-brand-green font-bold">PKR {sale.amountReceived.toLocaleString()}</div>
                      <div className="text-[10px] text-brand-amber mt-0.5">Rem: PKR {sale.remainingAmount.toLocaleString()}</div>
                    </td>

                    {/* Installments */}
                    <td className="p-3.5 font-mono text-center">
                      <span className="px-2 py-0.5 rounded-md bg-brand-bg-elevated border border-brand-border text-[10px] font-bold text-white">
                        {sale.installmentsReceived} / {sale.installmentsCount}
                      </span>
                    </td>

                    {/* Project Stage Dropdown */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <select
                          value={sale.projectStage}
                          onChange={(e) => handleStageChange(sale.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border bg-brand-bg cursor-pointer focus:outline-none ${
                            sale.projectStage === 'Final Artwork'
                              ? 'text-brand-green border-brand-green/30'
                              : isStagnant
                              ? 'text-brand-amber border-brand-amber/50 animate-pulse'
                              : 'text-brand-cyan border-brand-cyan/30'
                          }`}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className={`text-[9px] font-mono ${isStagnant ? 'text-brand-amber font-bold' : 'text-brand-text-mute'}`}>
                          {daysInStage} days in stage {isStagnant ? '(>5 Days Alert!)' : ''}
                        </span>
                      </div>
                    </td>

                    {/* Brief Status */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          sale.briefStatus === 'Uploaded'
                            ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                            : 'bg-brand-amber/10 text-brand-amber border-brand-amber/20'
                        }`}>
                          {sale.briefStatus} ({sale.briefs?.length || 0} v)
                        </span>
                        <button
                          onClick={() => { setActiveSale(sale); setBriefModalOpen(true); }}
                          className="p-1 rounded bg-brand-bg border border-brand-border text-brand-text hover:text-white"
                          title="Upload / View Briefs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        sale.paymentStatus === 'Paid'
                          ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                          : sale.paymentStatus === 'Partial'
                          ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => { setActiveSale(sale); setPaymentModalOpen(true); }}
                          className="px-2.5 py-1 rounded-lg bg-brand-blue/10 border border-brand-blue/30 text-brand-cyan text-[10px] font-bold uppercase hover:bg-brand-blue/20"
                          title="Log Payment Installment"
                        >
                          + Pay
                        </button>
                        <button
                          onClick={() => { setActiveSale(sale); setHistoryModalOpen(true); }}
                          className="p-1 rounded bg-brand-bg-elevated border border-brand-border text-brand-text-soft hover:text-white"
                          title="View Stage History Log"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sales.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-text-mute italic">
                    No sales recorded for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- New Sale Modal ---------------- */}
      <AnimatePresence>
        {newSaleModalOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setNewSaleModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-6">
                <h3 className="text-sm font-extrabold text-white font-display uppercase">Log New Client Sale</h3>
                <button onClick={() => setNewSaleModalOpen(false)} className="p-1 rounded text-brand-text-soft hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Client Name</label>
                    <input
                      type="text"
                      required
                      value={newSaleData.clientName}
                      onChange={(e) => setNewSaleData({ ...newSaleData, clientName: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={newSaleData.projectName}
                      onChange={(e) => setNewSaleData({ ...newSaleData, projectName: e.target.value })}
                      placeholder="e.g. Mascot Design"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Total Sale Amount (PKR)</label>
                    <input
                      type="number"
                      required
                      value={newSaleData.saleAmount}
                      onChange={(e) => setNewSaleData({ ...newSaleData, saleAmount: e.target.value })}
                      placeholder="e.g. 150000"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Sale Date</label>
                    <input
                      type="date"
                      required
                      value={newSaleData.saleDate}
                      onChange={(e) => setNewSaleData({ ...newSaleData, saleDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Installments Count</label>
                    <input
                      type="number"
                      min={1}
                      value={newSaleData.installmentsCount}
                      onChange={(e) => setNewSaleData({ ...newSaleData, installmentsCount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Assigned Salesperson</label>
                    <select
                      value={newSaleData.employeeId}
                      onChange={(e) => setNewSaleData({ ...newSaleData, employeeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                    >
                      <option value="">Myself ({currentUser.email})</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Notes / Special Instructions</label>
                  <textarea
                    rows={2}
                    value={newSaleData.notes}
                    onChange={(e) => setNewSaleData({ ...newSaleData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setNewSaleModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-brand-border text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg font-bold font-display"
                  >
                    Create Sale
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------------- Log Payment Modal ---------------- */}
      <AnimatePresence>
        {paymentModalOpen && activeSale && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setPaymentModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display uppercase">Log Payment Installment</h3>
                  <p className="text-[11px] text-brand-cyan mt-0.5">{activeSale.projectName} — {activeSale.clientName}</p>
                </div>
                <button onClick={() => setPaymentModalOpen(false)} className="p-1 rounded text-brand-text-soft hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-brand-bg/40 border border-brand-border mb-4 text-xs font-mono flex justify-between">
                <div>Total: <strong>PKR {activeSale.saleAmount.toLocaleString()}</strong></div>
                <div>Remaining: <strong className="text-brand-amber">PKR {activeSale.remainingAmount.toLocaleString()}</strong></div>
              </div>

              <form onSubmit={handleLogPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Installment Amount (PKR)</label>
                  <input
                    type="number"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  >
                    <option value="Online/Bank Transfer">Online / Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit / Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Notes</label>
                  <input
                    type="text"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="e.g. 2nd Installment via HBL"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-brand-border text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-green to-emerald-500 text-brand-bg font-bold font-display"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------------- Upload Brief Modal ---------------- */}
      <AnimatePresence>
        {briefModalOpen && activeSale && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setBriefModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display uppercase">Upload Project Brief</h3>
                  <p className="text-[11px] text-brand-cyan mt-0.5">{activeSale.projectName}</p>
                </div>
                <button onClick={() => setBriefModalOpen(false)} className="p-1 rounded text-brand-text-soft hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Existing Version Briefs */}
              {activeSale.briefs && activeSale.briefs.length > 0 && (
                <div className="mb-4 space-y-2 max-h-40 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest block">Uploaded Versions:</span>
                  {activeSale.briefs.map(b => (
                    <div key={b.id} className="p-2 rounded-lg bg-brand-bg/60 border border-brand-border flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">{b.fileName} (v{b.version})</p>
                        <p className="text-[9px] text-brand-text-mute">{new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                      <a href={b.fileUrl} download={b.fileName} className="text-[10px] font-bold text-brand-cyan hover:underline">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleUploadBrief} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Select Document (DOCX / PDF)</label>
                  <input
                    type="file"
                    required={!briefData.fileUrl}
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Brief Notes / Guidelines</label>
                  <textarea
                    rows={2}
                    value={briefData.notes}
                    onChange={(e) => setBriefData({ ...briefData, notes: e.target.value })}
                    placeholder="e.g. Client requested 3D mascot render"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-white focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setBriefModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-brand-border text-brand-text-soft hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-cyan text-brand-bg font-bold font-display"
                  >
                    Upload Version
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------------- Stage History Modal ---------------- */}
      <AnimatePresence>
        {historyModalOpen && activeSale && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setHistoryModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display uppercase">Project Stage History Log</h3>
                  <p className="text-[11px] text-brand-cyan mt-0.5">{activeSale.projectName}</p>
                </div>
                <button onClick={() => setHistoryModalOpen(false)} className="p-1 rounded text-brand-text-soft hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {activeSale.stageLogs && activeSale.stageLogs.length > 0 ? (
                  activeSale.stageLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl border border-brand-border bg-brand-bg/40 text-xs">
                      <div className="flex justify-between font-bold text-white">
                        <span>{log.previousStage} → {log.newStage}</span>
                        <span className="text-[10px] font-mono text-brand-text-mute">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      {log.notes && <p className="text-[11px] text-brand-text-soft mt-1 italic">"{log.notes}"</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-brand-text-mute italic">No stage history logged yet</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

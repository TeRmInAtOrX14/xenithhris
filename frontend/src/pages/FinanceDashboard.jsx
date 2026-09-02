import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Calendar,
  CreditCard,
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  'Office Expenses',
  'Office Rent',
  'Utilities',
  'Software/Subscriptions',
  'Equipment',
  'Miscellaneous'
];

export default function FinanceDashboard() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [pnl, setPnl] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [activeSalary, setActiveSalary] = useState(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    category: 'Office Expenses',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Online/Bank Transfer',
    notes: ''
  });

  const [salaryForm, setSalaryForm] = useState({
    basicSalary: '',
    commissionAmount: '',
    bonuses: '',
    deductions: '',
    amountPaid: '',
    paymentMethod: 'Online/Bank Transfer',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pnlRes, expRes, salRes] = await Promise.all([
        api.get(`/finance/profit-loss?month=${month}&year=${year}`),
        api.get(`/finance/expenses?month=${month}&year=${year}`),
        api.get(`/finance/salaries?month=${month}&year=${year}`)
      ]);
      setPnl(pnlRes.data);
      setExpenses(expRes.data);
      setSalaries(salRes.data);
    } catch (e) {
      toast.error('Failed to load finance & profit/loss data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', expenseForm);
      toast.success('Expense recorded successfully');
      setExpenseModalOpen(false);
      setExpenseForm({
        category: 'Office Expenses',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Online/Bank Transfer',
        notes: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record expense');
    }
  };

  const handleLogSalaryPayment = async (e) => {
    e.preventDefault();
    if (!activeSalary) return;
    try {
      await api.post('/finance/salaries', {
        id: activeSalary.salaryPaymentId,
        employeeId: activeSalary.employeeId,
        periodMonth: month,
        periodYear: year,
        ...salaryForm
      });
      toast.success('Salary payment updated');
      setSalaryModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log salary payment');
    }
  };

  const openSalaryModal = (s) => {
    setActiveSalary(s);
    setSalaryForm({
      basicSalary: s.basicSalary,
      commissionAmount: s.commissionAmount,
      bonuses: s.bonuses,
      deductions: s.deductions,
      amountPaid: s.amountPaid,
      paymentMethod: s.paymentMethod || 'Online/Bank Transfer',
      notes: ''
    });
    setSalaryModalOpen(true);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header & Month Filters */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-brand-cyan" />
            Executive Finance & Profit / Loss Portal
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">Boss/Admin dashboard for Company Receivings, Expenses, Salary Payouts, and Net Profit.</p>
        </div>

        {/* Month / Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-text-mute" />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg-soft/40 text-xs text-brand-text appearance-none cursor-pointer focus:outline-none"
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
            className="px-3 py-2 rounded-xl border border-brand-border bg-brand-bg-soft/40 text-xs text-brand-text appearance-none cursor-pointer focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* P&L Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit / Loss */}
        <div className={`p-5 rounded-2xl glass-panel border flex flex-col justify-between ${
          pnl?.isProfit ? 'border-brand-green/40 hover-glow-green' : 'border-red-500/40'
        }`}>
          <div className="flex items-center justify-between text-brand-text-soft mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider">Net Profit / Loss</span>
            {pnl?.isProfit ? <TrendingUp className="w-5 h-5 text-brand-green" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <p className={`text-3xl font-extrabold font-display ${pnl?.isProfit ? 'text-brand-green' : 'text-red-400'}`}>
              PKR {Math.round(pnl?.netProfitLoss || 0).toLocaleString()}
            </p>
            <p className="text-[9px] text-brand-text-mute mt-1.5 font-bold uppercase">
              Receivings − Expenses − Salaries
            </p>
          </div>
        </div>

        {/* Company Receivings */}
        <div className="p-5 rounded-2xl glass-panel hover-glow-cyan flex flex-col justify-between border border-brand-border/40">
          <div className="flex items-center justify-between text-brand-text-soft mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider">Total Receivings</span>
            <DollarSign className="w-5 h-5 text-brand-cyan" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-brand-text font-display">PKR {Math.round(pnl?.totalReceivings || 0).toLocaleString()}</p>
            <p className="text-[9px] text-brand-text-mute mt-1.5 font-bold uppercase">
              Client Payments Received
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl glass-panel hover-glow-amber flex flex-col justify-between border border-brand-border/40">
          <div className="flex items-center justify-between text-brand-text-soft mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider">Company Expenses</span>
            <CreditCard className="w-5 h-5 text-brand-amber" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-brand-amber font-display">PKR {Math.round(pnl?.totalExpenses || 0).toLocaleString()}</p>
            <p className="text-[9px] text-brand-text-mute mt-1.5 font-bold uppercase">Rent, Utilities, Software</p>
          </div>
        </div>

        {/* Salaries Paid */}
        <div className="p-5 rounded-2xl glass-panel hover-glow-violet flex flex-col justify-between border border-brand-border/40">
          <div className="flex items-center justify-between text-brand-text-soft mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider">Salaries Paid</span>
            <Users className="w-5 h-5 text-brand-violet" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-brand-text font-display">PKR {Math.round(pnl?.totalSalariesPaid || 0).toLocaleString()}</p>
            <p className="text-[9px] text-brand-text-mute mt-1.5 font-bold uppercase">
              Out of PKR {Math.round(pnl?.totalSalariesCost || 0).toLocaleString()} Total
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Company Expenses */}
      <div className="p-6 rounded-2xl glass-panel border border-brand-border/40 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-brand-border/40">
          <h3 className="text-sm font-extrabold text-brand-text uppercase font-display flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-amber" />
            Company Expenses Log
          </h3>
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-brand-amber via-yellow-500 to-amber-600 text-brand-bg font-bold font-display text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-amber/20"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-elevated/40 text-[9px] uppercase font-extrabold tracking-widest text-brand-text-soft">
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount (PKR)</th>
                <th className="p-3">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-brand-text-soft">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-brand-bg-elevated/20">
                  <td className="p-3 font-mono font-bold text-brand-text">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-brand-amber/10 text-brand-amber border border-brand-amber/20">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-brand-text">{exp.description}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-brand-text">PKR {exp.amount.toLocaleString()}</td>
                  <td className="p-3 font-mono text-[10px]">{exp.paymentMethod}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-brand-text-mute italic">No company expenses recorded for this month</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Employee Salary Payouts & Outstanding Balances */}
      <div className="p-6 rounded-2xl glass-panel border border-brand-border/40 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-brand-border/40">
          <h3 className="text-sm font-extrabold text-brand-text uppercase font-display flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-violet" />
            Employee Salary Payouts & Commission Management
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-elevated/40 text-[9px] uppercase font-extrabold tracking-widest text-brand-text-soft">
                <th className="p-3">Employee</th>
                <th className="p-3 text-right">Basic Salary</th>
                <th className="p-3 text-right">Commission ({'%'})</th>
                <th className="p-3 text-right">Bonuses</th>
                <th className="p-3 text-right">Deductions</th>
                <th className="p-3 text-right">Net Salary</th>
                <th className="p-3 text-right">Amount Paid</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-brand-text-soft">
              {salaries.map(sal => (
                <tr key={sal.employeeId} className="hover:bg-brand-bg-elevated/20">
                  <td className="p-3">
                    <div className="font-bold text-brand-text">{sal.fullName}</div>
                    <div className="text-[10px] text-brand-text-mute font-mono">{sal.employeeCode} • {sal.designation}</div>
                  </td>
                  <td className="p-3 text-right font-mono">PKR {sal.basicSalary.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-brand-cyan">
                    {sal.commissionPercentage}% (PKR {sal.commissionAmount.toLocaleString()})
                  </td>
                  <td className="p-3 text-right font-mono text-brand-green">PKR {sal.bonuses.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-red-400">PKR {sal.deductions.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-brand-text">PKR {sal.netSalary.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-brand-green font-bold">PKR {sal.amountPaid.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-brand-amber font-bold">PKR {sal.remainingAmount.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                      sal.status === 'Fully Paid'
                        ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                        : sal.status === 'Partial'
                        ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
                        : 'bg-brand-amber/10 text-brand-amber border-brand-amber/20'
                    }`}>
                      {sal.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openSalaryModal(sal)}
                      className="px-3 py-1 rounded-lg bg-brand-violet/15 border border-brand-violet/30 text-brand-violet text-[10px] font-bold uppercase hover:bg-brand-violet/30"
                    >
                      Update Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- Create Expense Modal ---------------- */}
      <AnimatePresence>
        {expenseModalOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setExpenseModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
                <h3 className="text-sm font-extrabold text-brand-text font-display uppercase">Record Company Expense</h3>
                <button onClick={() => setExpenseModalOpen(false)} className="p-1 text-brand-text-soft hover:text-brand-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Expense Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    placeholder="e.g. Monthly Office Internet Bill"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setExpenseModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-brand-border text-brand-text-soft hover:text-brand-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-amber to-amber-600 text-brand-bg font-bold font-display"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------------- Update Salary Payout Modal ---------------- */}
      <AnimatePresence>
        {salaryModalOpen && activeSalary && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setSalaryModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-brand-bg-elevated border border-brand-border rounded-2xl p-6 shadow-glow z-50 text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-brand-text font-display uppercase">Update Salary & Commission Payout</h3>
                  <p className="text-[11px] text-brand-cyan mt-0.5">{activeSalary.fullName} ({activeSalary.employeeCode})</p>
                </div>
                <button onClick={() => setSalaryModalOpen(false)} className="p-1 text-brand-text-soft hover:text-brand-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogSalaryPayment} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Basic Salary (PKR)</label>
                    <input
                      type="number"
                      required
                      value={salaryForm.basicSalary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Commission Amount (PKR)</label>
                    <input
                      type="number"
                      value={salaryForm.commissionAmount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, commissionAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Bonuses (PKR)</label>
                    <input
                      type="number"
                      value={salaryForm.bonuses}
                      onChange={(e) => setSalaryForm({ ...salaryForm, bonuses: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Deductions (PKR)</label>
                    <input
                      type="number"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Amount Paid (PKR)</label>
                    <input
                      type="number"
                      required
                      value={salaryForm.amountPaid}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amountPaid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none font-bold text-brand-green"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-text-soft mb-1">Payment Method</label>
                    <select
                      value={salaryForm.paymentMethod}
                      onChange={(e) => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-bg text-brand-text focus:outline-none"
                    >
                      <option value="Online/Bank Transfer">Online / Bank Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setSalaryModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-brand-border text-brand-text-soft hover:text-brand-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-violet to-purple-600 text-brand-text font-bold font-display"
                  >
                    Save Payout Record
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

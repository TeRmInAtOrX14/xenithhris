const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

// Expenses CRUD
exports.getExpenses = async (req, res, next) => {
  try {
    const { month, year, category } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }

    if (month && year) {
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));
      where.date = { gte: startOfMonth, lte: endOfMonth };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(expenses);
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { category, description, amount, date, paymentMethod, notes } = req.body;

    if (!category || !description || !amount) {
      return res.status(400).json({ error: 'Category, Description, and Amount are required.' });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        notes,
        createdById: req.user.id
      }
    });

    await logAudit(req.user.id, 'CREATE_EXPENSE', 'Expense', expense.id, { category, amount });
    res.json(expense);
  } catch (err) {
    next(err);
  }
};

// Salary Payments Tracking
exports.getSalaryPayments = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentMonth = parseInt(month || new Date().getMonth() + 1);
    const currentYear = parseInt(year || new Date().getFullYear());

    const employees = await prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, fullName: true, employeeCode: true, designation: true, baseSalary: true, commissionPercentage: true }
    });

    const salaryPayments = await prisma.salaryPayment.findMany({
      where: { periodMonth: currentMonth, periodYear: currentYear }
    });

    const results = employees.map(emp => {
      const existing = salaryPayments.find(sp => sp.employeeId === emp.id);
      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
        baseSalary: emp.baseSalary,
        commissionPercentage: emp.commissionPercentage,
        salaryPaymentId: existing?.id || null,
        periodMonth: currentMonth,
        periodYear: currentYear,
        basicSalary: existing?.basicSalary ?? emp.baseSalary,
        commissionAmount: existing?.commissionAmount ?? 0,
        bonuses: existing?.bonuses ?? 0,
        deductions: existing?.deductions ?? 0,
        netSalary: existing?.netSalary ?? emp.baseSalary,
        amountPaid: existing?.amountPaid ?? 0,
        remainingAmount: existing ? existing.remainingAmount : (existing?.netSalary ?? emp.baseSalary),
        status: existing?.status ?? 'Pending',
        paymentMethod: existing?.paymentMethod ?? 'Online/Bank Transfer',
        paymentDate: existing?.paymentDate ?? null
      };
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.logSalaryPayment = async (req, res, next) => {
  try {
    const { employeeId, periodMonth, periodYear, basicSalary, commissionAmount, bonuses, deductions, amountPaid, paymentMethod, notes } = req.body;

    if (!employeeId || !periodMonth || !periodYear) {
      return res.status(400).json({ error: 'employeeId, periodMonth, and periodYear are required.' });
    }

    const basic = parseFloat(basicSalary || 0);
    const comm = parseFloat(commissionAmount || 0);
    const bon = parseFloat(bonuses || 0);
    const ded = parseFloat(deductions || 0);
    const paid = parseFloat(amountPaid || 0);

    const netSalary = basic + comm + bon - ded;
    const remainingAmount = Math.max(0, netSalary - paid);
    const status = remainingAmount === 0 ? 'Fully Paid' : paid > 0 ? 'Partial' : 'Pending';

    const sp = await prisma.salaryPayment.upsert({
      where: {
        // Find existing payment for employee for this month
        id: req.body.id || 'non-existent-id'
      },
      create: {
        employeeId,
        periodMonth: parseInt(periodMonth),
        periodYear: parseInt(periodYear),
        basicSalary: basic,
        commissionAmount: comm,
        bonuses: bon,
        deductions: ded,
        netSalary,
        amountPaid: paid,
        remainingAmount,
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        status,
        notes
      },
      update: {
        basicSalary: basic,
        commissionAmount: comm,
        bonuses: bon,
        deductions: ded,
        netSalary,
        amountPaid: paid,
        remainingAmount,
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        status,
        notes
      }
    });

    await logAudit(req.user.id, 'LOG_SALARY_PAYMENT', 'SalaryPayment', sp.id, { netSalary, paid });
    res.json(sp);
  } catch (err) {
    next(err);
  }
};

// Profit & Loss Summary
exports.getProfitLoss = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentMonth = parseInt(month || new Date().getMonth() + 1);
    const currentYear = parseInt(year || new Date().getFullYear());

    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59));

    // 1. Total Sales Receivings
    const payments = await prisma.salePayment.findMany({
      where: { paymentDate: { gte: startOfMonth, lte: endOfMonth } }
    });
    const totalReceivings = payments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Total Sales Booked & Outstanding Client Payments
    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: startOfMonth, lte: endOfMonth } }
    });
    const totalSalesBooked = sales.reduce((sum, s) => sum + s.saleAmount, 0);
    const totalOutstandingReceivables = sales.reduce((sum, s) => sum + s.remainingAmount, 0);

    // 3. Company Expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } }
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 4. Employee Salaries
    const salaryPayments = await prisma.salaryPayment.findMany({
      where: { periodMonth: currentMonth, periodYear: currentYear }
    });
    const totalSalariesCost = salaryPayments.reduce((sum, s) => sum + s.netSalary, 0);
    const totalSalariesPaid = salaryPayments.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalSalariesRemaining = salaryPayments.reduce((sum, s) => sum + s.remainingAmount, 0);

    // 5. Net Profit / Loss Calculation
    const netProfitLoss = totalReceivings - totalExpenses - totalSalariesPaid;

    res.json({
      month: currentMonth,
      year: currentYear,
      totalSalesBooked,
      totalReceivings,
      totalOutstandingReceivables,
      totalExpenses,
      totalSalariesCost,
      totalSalariesPaid,
      totalSalariesRemaining,
      netProfitLoss,
      isProfit: netProfitLoss >= 0
    });
  } catch (err) {
    next(err);
  }
};

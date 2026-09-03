const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const CEO_ADMIN_ROLES = ['Admin', 'CEO', 'COO'];

/**
 * GET /api/float?saleId=:id
 * Float ledger entries for a specific project
 */
exports.getProjectFloat = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. CEO/Admin only.' });
    }

    const { saleId } = req.query;
    if (!saleId) return res.status(400).json({ error: 'saleId is required.' });

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        clientName: true,
        saleAmount: true,
        designerFee: true,
        amountPaidToDesigner: true,
        amountReceived: true,
        remainingAmount: true,
        paymentStatus: true,
        installmentsCount: true,
        installmentsReceived: true
      }
    });
    if (!sale) return res.status(404).json({ error: 'Project not found.' });

    const entries = await prisma.floatLedger.findMany({
      where: { saleId },
      orderBy: { createdAt: 'asc' }
    });

    const floatBalance = sale.amountReceived - sale.amountPaidToDesigner;

    res.json({
      sale,
      floatBalance,
      floatExposure: floatBalance < 0 ? Math.abs(floatBalance) : 0,
      isNegativeFloat: floatBalance < 0,
      entries
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/float/summary
 * Company-wide float summary across all active projects
 */
exports.getFloatSummary = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. CEO/Admin only.' });
    }

    const { month, year } = req.query;

    const whereClause = {};
    if (month && year) {
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));
      whereClause.saleDate = { gte: startOfMonth, lte: endOfMonth };
    }

    const sales = await prisma.sale.findMany({
      where: {
        ...whereClause,
        designerId: { not: null },
        designerFee: { gt: 0 }
      },
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        clientName: true,
        saleAmount: true,
        designerFee: true,
        amountPaidToDesigner: true,
        amountReceived: true,
        remainingAmount: true,
        paymentStatus: true,
        installmentsCount: true,
        installmentsReceived: true,
        designer: { select: { id: true, fullName: true } }
      },
      orderBy: { saleDate: 'desc' }
    });

    let totalFloatExposure = 0;
    let totalPaidToDesigners = 0;
    let totalReceivedFromClients = 0;

    const projectFloats = sales.map(sale => {
      const floatBalance = sale.amountReceived - sale.amountPaidToDesigner;
      const exposure = floatBalance < 0 ? Math.abs(floatBalance) : 0;
      totalFloatExposure += exposure;
      totalPaidToDesigners += sale.amountPaidToDesigner;
      totalReceivedFromClients += sale.amountReceived;

      return {
        ...sale,
        floatBalance,
        floatExposure: exposure,
        isNegativeFloat: floatBalance < 0,
        floatPercentage: sale.designerFee > 0
          ? Math.round((sale.amountPaidToDesigner / sale.designerFee) * 100)
          : 0
      };
    });

    res.json({
      summary: {
        totalProjects: sales.length,
        totalPaidToDesigners,
        totalReceivedFromClients,
        totalFloatExposure,
        netFloat: totalReceivedFromClients - totalPaidToDesigners,
        projectsWithNegativeFloat: projectFloats.filter(p => p.isNegativeFloat).length
      },
      projects: projectFloats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/float/entry
 * Manual float reconciliation entry (CEO/Admin)
 */
exports.createFloatEntry = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. CEO/Admin only.' });
    }

    const { saleId, type, amount, description } = req.body;

    if (!saleId || !type || amount === undefined) {
      return res.status(400).json({ error: 'saleId, type, and amount are required.' });
    }

    const validTypes = ['artist_payout_advance', 'client_installment_received', 'float_reconcile', 'manual_adjustment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return res.status(404).json({ error: 'Project not found.' });

    // Get last running float
    const lastEntry = await prisma.floatLedger.findFirst({
      where: { saleId },
      orderBy: { createdAt: 'desc' }
    });
    const prevFloat = lastEntry?.runningFloat ?? (sale.amountReceived - sale.amountPaidToDesigner);
    const entryAmount = parseFloat(amount);
    const runningFloat = prevFloat + entryAmount;

    const entry = await prisma.floatLedger.create({
      data: {
        saleId,
        type,
        amount: entryAmount,
        description: description || null,
        runningFloat,
        createdById: req.user.id
      }
    });

    await logAudit(req.user.id, 'CREATE_FLOAT_ENTRY', 'FloatLedger', entry.id, { saleId, type, amount: entryAmount });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

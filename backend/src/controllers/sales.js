const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

// Helper to determine RBAC filters for sales
async function getEmployeeIdScope(user) {
  if (['Admin', 'CEO', 'COO'].includes(user.role)) {
    return null; // All scope
  }
  if (user.role === 'Team Lead') {
    const ledCampaigns = await prisma.campaignMember.findMany({
      where: { employeeId: user.employee?.id, role: 'team_lead', status: 'active' },
      select: { campaignId: true }
    });
    const campaignIds = ledCampaigns.map(c => c.campaignId);
    const members = await prisma.campaignMember.findMany({
      where: { campaignId: { in: campaignIds }, status: 'active' },
      select: { employeeId: true }
    });
    const sdrIds = members.map(m => m.employeeId);
    if (user.employee?.id) sdrIds.push(user.employee.id);
    return sdrIds;
  }
  // Regular employee / SDR
  return user.employee?.id ? [user.employee.id] : [];
}

exports.getSales = async (req, res, next) => {
  try {
    const { month, year, employeeId, stage, search } = req.query;
    const scope = await getEmployeeIdScope(req.user);

    const where = {};

    if (scope !== null) {
      where.employeeId = { in: scope };
    }

    if (employeeId) {
      if (scope !== null && !scope.includes(employeeId)) {
        return res.status(403).json({ error: 'Access denied to this employee data.' });
      }
      where.employeeId = employeeId;
    }

    if (stage) {
      where.projectStage = stage;
    }

    if (month && year) {
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));
      where.saleDate = { gte: startOfMonth, lte: endOfMonth };
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, designation: true }
        },
        briefs: { orderBy: { version: 'desc' } },
        stageLogs: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { saleDate: 'desc' }
    });

    res.json(sales);
  } catch (err) {
    next(err);
  }
};

exports.createSale = async (req, res, next) => {
  try {
    const { clientName, projectName, saleAmount, saleDate, employeeId, installmentsCount, notes, paymentMethod } = req.body;

    if (!clientName || !projectName || !saleAmount) {
      return res.status(400).json({ error: 'Client Name, Project Name, and Sale Amount are required.' });
    }

    const targetEmpId = employeeId || req.user.employee?.id;
    if (!targetEmpId) {
      return res.status(400).json({ error: 'No employee linked to assign sale.' });
    }

    const totalAmount = parseFloat(saleAmount);
    const instCount = parseInt(installmentsCount || 1);

    const sale = await prisma.sale.create({
      data: {
        clientName,
        projectName,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        employeeId: targetEmpId,
        saleAmount: totalAmount,
        projectStage: 'Initial Sketch',
        stageUpdatedAt: new Date(),
        briefStatus: 'Pending',
        paymentStatus: 'Unpaid',
        amountReceived: 0,
        remainingAmount: totalAmount,
        installmentsCount: instCount,
        installmentsReceived: 0,
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        notes
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    // Create initial stage log
    await prisma.projectStageLog.create({
      data: {
        saleId: sale.id,
        updatedById: req.user.id,
        previousStage: 'New Created',
        newStage: 'Initial Sketch',
        notes: 'Project created'
      }
    });

    await logAudit(req.user.id, 'CREATE_SALE', 'Sale', sale.id, { clientName, saleAmount: totalAmount });
    res.json(sale);
  } catch (err) {
    next(err);
  }
};

exports.updateSaleStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newStage, notes } = req.body;

    const validStages = ['Initial Sketch', 'Line Art', 'Base Color', 'Final Artwork'];
    if (!validStages.includes(newStage)) {
      return res.status(400).json({ error: `Stage must be one of: ${validStages.join(', ')}` });
    }

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Sale record not found.' });
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        projectStage: newStage,
        stageUpdatedAt: new Date()
      }
    });

    await prisma.projectStageLog.create({
      data: {
        saleId: id,
        updatedById: req.user.id,
        previousStage: existing.projectStage,
        newStage,
        notes
      }
    });

    await logAudit(req.user.id, 'UPDATE_STAGE', 'Sale', id, { from: existing.projectStage, to: newStage });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.uploadBrief = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileName, fileUrl, fileType, notes } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'File Name and File Content URL are required.' });
    }

    const existingBriefs = await prisma.projectBrief.findMany({
      where: { saleId: id },
      orderBy: { version: 'desc' }
    });

    const nextVersion = existingBriefs.length > 0 ? existingBriefs[0].version + 1 : 1;

    const brief = await prisma.projectBrief.create({
      data: {
        saleId: id,
        uploadedById: req.user.id,
        fileName,
        fileUrl,
        fileType: fileType || 'docx',
        version: nextVersion,
        notes
      }
    });

    await prisma.sale.update({
      where: { id },
      data: { briefStatus: 'Uploaded' }
    });

    await logAudit(req.user.id, 'UPLOAD_BRIEF', 'ProjectBrief', brief.id, { fileName, version: nextVersion });
    res.json(brief);
  } catch (err) {
    next(err);
  }
};

exports.logPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      return res.status(404).json({ error: 'Sale record not found.' });
    }

    const newAmountReceived = sale.amountReceived + payAmount;
    const newRemainingAmount = Math.max(0, sale.saleAmount - newAmountReceived);
    const newInstReceived = sale.installmentsReceived + 1;
    const newPaymentStatus = newRemainingAmount === 0 ? 'Paid' : 'Partial';

    const payment = await prisma.salePayment.create({
      data: {
        saleId: id,
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        notes
      }
    });

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        amountReceived: newAmountReceived,
        remainingAmount: newRemainingAmount,
        installmentsReceived: newInstReceived,
        paymentStatus: newPaymentStatus
      }
    });

    await logAudit(req.user.id, 'LOG_SALE_PAYMENT', 'SalePayment', payment.id, { amount: payAmount });
    res.json({ payment, sale: updatedSale });
  } catch (err) {
    next(err);
  }
};

exports.getAlerts = async (req, res, next) => {
  try {
    const scope = await getEmployeeIdScope(req.user);
    const where = {};
    if (scope !== null) {
      where.employeeId = { in: scope };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    const now = new Date();
    const alerts = [];

    sales.forEach(sale => {
      // 1. Check >5 days stagnant stage alert
      if (sale.projectStage !== 'Final Artwork') {
        const daysInStage = (now - new Date(sale.stageUpdatedAt)) / (1000 * 60 * 60 * 24);
        if (daysInStage > 5) {
          alerts.push({
            id: `stagnant-${sale.id}`,
            type: 'stagnant_project',
            severity: 'warning',
            title: `Project Stagnant (>5 Days)`,
            message: `Project "${sale.projectName}" for client ${sale.clientName} has been in "${sale.projectStage}" stage for ${Math.floor(daysInStage)} days.`,
            saleId: sale.id,
            employeeName: sale.employee?.fullName,
            days: Math.floor(daysInStage)
          });
        }
      }

      // 2. Check missing brief >2 days alert
      if (sale.briefStatus === 'Pending') {
        const daysSinceSale = (now - new Date(sale.saleDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceSale > 2) {
          alerts.push({
            id: `brief-${sale.id}`,
            type: 'missing_brief',
            severity: 'alert',
            title: `Missing Project Brief (>2 Days)`,
            message: `Sale "${sale.projectName}" was created ${Math.floor(daysSinceSale)} days ago but project brief is still pending.`,
            saleId: sale.id,
            employeeName: sale.employee?.fullName,
            days: Math.floor(daysSinceSale)
          });
        }
      }
    });

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

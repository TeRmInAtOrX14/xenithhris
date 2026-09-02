const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

// Helper to generate next unique project number (PRJ-1001, PRJ-1002...)
async function generateProjectNumber() {
  const lastSale = await prisma.sale.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { projectNumber: true }
  });

  if (!lastSale || !lastSale.projectNumber) {
    return 'PRJ-1001';
  }

  const match = lastSale.projectNumber.match(/PRJ-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return `PRJ-${nextNum}`;
  }

  const count = await prisma.sale.count();
  return `PRJ-${1000 + count + 1}`;
}

// Helper to determine RBAC filters for sales
async function getSalesFilter(user) {
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(user.role);
  if (isCEOOrAdmin) {
    return {}; // All sales
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
    const teamMemberIds = members.map(m => m.employeeId);
    if (user.employee?.id) teamMemberIds.push(user.employee.id);
    return { employeeId: { in: teamMemberIds } };
  }

  if (user.role === 'Designer') {
    return { designerId: user.employee?.id || 'none' };
  }

  // Sales Executive / Employee
  return { employeeId: user.employee?.id || 'none' };
}

exports.getSales = async (req, res, next) => {
  try {
    const { month, year, employeeId, designerId, stage, search, projectNumber } = req.query;
    const roleFilter = await getSalesFilter(req.user);

    const where = { ...roleFilter };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (designerId) {
      where.designerId = designerId;
    }

    if (projectNumber) {
      where.projectNumber = { contains: projectNumber, mode: 'insensitive' };
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
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, designation: true, commissionPercentage: true }
        },
        designer: {
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
    const {
      clientName,
      projectName,
      saleAmount,
      saleDate,
      employeeId,
      designerId,
      designerFee,
      installmentsCount,
      notes,
      paymentMethod
    } = req.body;

    if (!clientName || !projectName || !saleAmount) {
      return res.status(400).json({ error: 'Client Name, Project Name, and Sale Amount ($) are required.' });
    }

    const targetEmpId = employeeId || req.user.employee?.id;
    if (!targetEmpId) {
      return res.status(400).json({ error: 'No employee linked to assign sale.' });
    }

    // Fetch employee commission percentage for auto-calculation
    const salesExec = await prisma.employee.findUnique({
      where: { id: targetEmpId },
      select: { commissionPercentage: true }
    });

    const totalAmount = parseFloat(saleAmount);
    const commPct = salesExec?.commissionPercentage || 0;
    const calculatedCommissionUsd = (totalAmount * commPct) / 100;
    const instCount = parseInt(installmentsCount || 1);
    const prjNum = await generateProjectNumber();

    const sale = await prisma.sale.create({
      data: {
        projectNumber: prjNum,
        clientName,
        projectName,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        employeeId: targetEmpId,
        designerId: designerId || null,
        saleAmount: totalAmount,
        designerFee: designerFee ? parseFloat(designerFee) : 0,
        amountPaidToDesigner: 0,
        salesCommissionUsd: calculatedCommissionUsd,
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
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        designer: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    // Create initial stage log
    await prisma.projectStageLog.create({
      data: {
        saleId: sale.id,
        updatedById: req.user.id,
        previousStage: 'New Created',
        newStage: 'Initial Sketch',
        notes: `Project #${prjNum} created`
      }
    });

    await logAudit(req.user.id, 'CREATE_SALE', 'Sale', sale.id, { projectNumber: prjNum, clientName, saleAmount: totalAmount });
    res.json(sale);
  } catch (err) {
    next(err);
  }
};

exports.updateSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      clientName,
      projectName,
      saleAmount,
      designerId,
      designerFee,
      amountPaidToDesigner,
      paymentMethod,
      notes
    } = req.body;

    const existing = await prisma.sale.findUnique({ where: { id }, include: { employee: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Sale record not found.' });
    }

    const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(req.user.role);
    const isOwner = existing.employeeId === req.user.employee?.id;

    if (!isCEOOrAdmin && !isOwner && req.user.role !== 'Team Lead') {
      return res.status(403).json({ error: 'Access denied to edit this sale.' });
    }

    const updates = {};
    if (clientName) updates.clientName = clientName;
    if (projectName) updates.projectName = projectName;
    if (designerId !== undefined) updates.designerId = designerId || null;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (notes !== undefined) updates.notes = notes;

    if (saleAmount !== undefined) {
      const newAmount = parseFloat(saleAmount);
      updates.saleAmount = newAmount;
      updates.remainingAmount = Math.max(0, newAmount - existing.amountReceived);
      
      const commPct = existing.employee?.commissionPercentage || 0;
      updates.salesCommissionUsd = (newAmount * commPct) / 100;
    }

    if (designerFee !== undefined) {
      updates.designerFee = parseFloat(designerFee) || 0;
    }

    if (amountPaidToDesigner !== undefined && isCEOOrAdmin) {
      updates.amountPaidToDesigner = parseFloat(amountPaidToDesigner) || 0;
    }

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updates,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        designer: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    await logAudit(req.user.id, 'UPDATE_SALE', 'Sale', id, updates);
    res.json(updatedSale);
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

    // Role check: Designer can only update stage for assigned projects
    if (req.user.role === 'Designer' && existing.designerId !== req.user.employee?.id) {
      return res.status(403).json({ error: 'Designers can only update stage for projects assigned to them.' });
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
    const roleFilter = await getSalesFilter(req.user);
    const sales = await prisma.sale.findMany({
      where: roleFilter,
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
            message: `Project #${sale.projectNumber} (${sale.projectName}) has been in "${sale.projectStage}" stage for ${Math.floor(daysInStage)} days.`,
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
            message: `Sale #${sale.projectNumber} (${sale.projectName}) was created ${Math.floor(daysSinceSale)} days ago but project brief is still pending.`,
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

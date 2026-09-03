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
    if (req.user.role === 'Designer') {
      return res.status(403).json({ error: 'Designers cannot add sales entries. Only Sales Executives, Team Leads, and Management can add sales.' });
    }

    const {
      clientName,
      clientEmail,
      projectName,
      saleAmount,
      upfrontAmount,
      tipAmount,
      saleDate,
      employeeId,
      designerId,
      designerFee,
      installmentsCount,
      platform,
      paymentMethod,
      completionDate,
      fallInMonth,
      workDetails,
      extraInfo,
      notes
    } = req.body;

    if (!clientName || !projectName || (saleAmount === undefined && upfrontAmount === undefined)) {
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

    const grossAmount = parseFloat(saleAmount || 0);
    const upfront = parseFloat(upfrontAmount || 0);
    const tip = parseFloat(tipAmount || 0);
    const totalSale = grossAmount + tip;
    const commPct = salesExec?.commissionPercentage || 0;
    const calculatedCommissionUsd = (grossAmount * commPct) / 100;
    const instCount = parseInt(installmentsCount || 1);
    const prjNum = await generateProjectNumber();

    const initialReceived = upfront;
    const remaining = Math.max(0, totalSale - initialReceived);
    const paymentStatus = remaining === 0 ? 'Paid' : (initialReceived > 0 ? 'Partial' : 'Unpaid');

    const sDate = saleDate ? new Date(saleDate) : new Date();
    const defaultFallMonth = fallInMonth || `${sDate.toLocaleString('default', { month: 'short' })} ${sDate.getFullYear()}`;

    const sale = await prisma.sale.create({
      data: {
        projectNumber: prjNum,
        clientName,
        clientEmail: clientEmail || null,
        projectName,
        saleDate: sDate,
        employeeId: targetEmpId,
        designerId: designerId || null,
        saleAmount: grossAmount,
        upfrontAmount: upfront,
        tipAmount: tip,
        designerFee: designerFee ? parseFloat(designerFee) : 0,
        amountPaidToDesigner: 0,
        salesCommissionUsd: calculatedCommissionUsd,
        projectStage: 'Initial Sketch',
        stageUpdatedAt: new Date(),
        briefStatus: 'Pending',
        paymentStatus,
        amountReceived: initialReceived,
        remainingAmount: remaining,
        installmentsCount: instCount,
        installmentsReceived: upfront > 0 ? 1 : 0,
        platform: platform || 'Direct / Website',
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        completionDate: completionDate ? new Date(completionDate) : null,
        fallInMonth: defaultFallMonth,
        workDetails: workDetails || null,
        extraInfo: extraInfo || null,
        notes: notes || null
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        designer: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    // If upfront payment was provided, create 1st installment entry automatically
    if (upfront > 0) {
      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          installmentNumber: 1,
          paymentDate: sDate,
          grossAmount: upfront,
          feeDeducted: 0,
          netAmount: upfront,
          amount: upfront,
          paymentMethod: paymentMethod || 'Online/Bank Transfer',
          status: 'received',
          fallInMonth: defaultFallMonth,
          notes: 'Upfront Payment'
        }
      });
    }

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

    await logAudit(req.user.id, 'CREATE_SALE', 'Sale', sale.id, { projectNumber: prjNum, clientName, saleAmount: grossAmount });
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
      clientEmail,
      projectName,
      saleAmount,
      upfrontAmount,
      tipAmount,
      designerId,
      designerFee,
      amountPaidToDesigner,
      installmentsCount,
      platform,
      paymentMethod,
      completionDate,
      fallInMonth,
      workDetails,
      extraInfo,
      notes,
      projectStage,
      briefStatus
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
    if (clientName !== undefined) updates.clientName = clientName;
    if (clientEmail !== undefined) updates.clientEmail = clientEmail || null;
    if (projectName !== undefined) updates.projectName = projectName;
    if (designerId !== undefined) updates.designerId = designerId || null;
    if (platform !== undefined) updates.platform = platform;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (completionDate !== undefined) updates.completionDate = completionDate ? new Date(completionDate) : null;
    if (fallInMonth !== undefined) updates.fallInMonth = fallInMonth;
    if (workDetails !== undefined) updates.workDetails = workDetails;
    if (extraInfo !== undefined) updates.extraInfo = extraInfo;
    if (notes !== undefined) updates.notes = notes;
    if (installmentsCount !== undefined) updates.installmentsCount = parseInt(installmentsCount) || 1;
    if (projectStage !== undefined) updates.projectStage = projectStage;
    if (briefStatus !== undefined) updates.briefStatus = briefStatus;

    if (saleAmount !== undefined || tipAmount !== undefined || upfrontAmount !== undefined) {
      const newGross = saleAmount !== undefined ? parseFloat(saleAmount) : existing.saleAmount;
      const newTip = tipAmount !== undefined ? parseFloat(tipAmount) : existing.tipAmount;
      const newUpfront = upfrontAmount !== undefined ? parseFloat(upfrontAmount) : existing.upfrontAmount;

      updates.saleAmount = newGross;
      updates.tipAmount = newTip;
      updates.upfrontAmount = newUpfront;

      const totalSale = newGross + newTip;
      const currentReceived = existing.amountReceived;
      const newRemaining = Math.max(0, totalSale - currentReceived);
      
      updates.remainingAmount = newRemaining;
      updates.paymentStatus = newRemaining === 0 ? 'Paid' : (currentReceived > 0 ? 'Partial' : 'Unpaid');
      
      const commPct = existing.employee?.commissionPercentage || 0;
      updates.salesCommissionUsd = (newGross * commPct) / 100;
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
        designer: { select: { id: true, fullName: true, employeeCode: true } },
        payments: true
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
    const { fileName, fileUrl, fileType, designerId, notes } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'File Name and File Content URL are required.' });
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    const validExts = ['png', 'jpeg', 'jpg', 'webp', 'pdf', 'docx'];
    const detectedType = fileType?.toLowerCase() || ext || 'png';

    if (!validExts.includes(detectedType)) {
      return res.status(400).json({ error: 'Accepted brief formats are: .png, .jpeg, .jpg, .webp, .pdf, .docx' });
    }

    const existingBriefs = await prisma.projectBrief.findMany({
      where: { saleId: id },
      orderBy: { version: 'desc' }
    });

    const nextVersion = existingBriefs.length > 0 ? existingBriefs[0].version + 1 : 1;

    // If designerId passed, update parent sale designer assignment
    let targetDesignerId = designerId;
    if (designerId) {
      await prisma.sale.update({
        where: { id },
        data: { designerId }
      });
    } else {
      const parentSale = await prisma.sale.findUnique({ where: { id }, select: { designerId: true } });
      targetDesignerId = parentSale?.designerId;
    }

    const brief = await prisma.projectBrief.create({
      data: {
        saleId: id,
        uploadedById: req.user.id,
        designerId: targetDesignerId || null,
        fileName,
        fileUrl,
        fileType: detectedType,
        version: nextVersion,
        notes: notes || null,
        status: 'Pending'
      }
    });

    await prisma.sale.update({
      where: { id },
      data: { briefStatus: 'Uploaded' }
    });

    // Notify assigned Artist if present
    if (targetDesignerId) {
      const artistUser = await prisma.employee.findUnique({
        where: { id: targetDesignerId },
        select: { userId: true, fullName: true }
      });
      if (artistUser?.userId) {
        await prisma.notification.create({
          data: {
            userId: artistUser.userId,
            title: `🎨 New Brief Uploaded & Assigned`,
            message: `A new ${detectedType.toUpperCase()} brief ("${fileName}") was assigned to you for project.`,
            type: 'brief_assignment',
            link: '/dashboard/artist-assignments',
            isRead: false
          }
        });
      }
    }

    await logAudit(req.user.id, 'UPLOAD_BRIEF', 'ProjectBrief', brief.id, { fileName, version: nextVersion, designerId: targetDesignerId });
    res.json(brief);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sales/:id/assign-artist
 * CEO / Admin / Team Lead assigns an Artist (Designer) to a project & its briefs
 */
exports.assignArtist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { designerId } = req.body;

    const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(req.user.role);
    const isTL = req.user.role === 'Team Lead';

    if (!isCEOOrAdmin && !isTL) {
      return res.status(403).json({ error: 'Only CEO/Admin and Team Leads can assign artists to projects.' });
    }

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) return res.status(404).json({ error: 'Project not found.' });

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: { designerId: designerId || null },
      include: {
        designer: { select: { id: true, fullName: true, employeeCode: true, userId: true } }
      }
    });

    // Update all briefs under this sale
    await prisma.projectBrief.updateMany({
      where: { saleId: id },
      data: { designerId: designerId || null }
    });

    // Send notification to artist if assigned
    if (updatedSale.designer?.userId) {
      await prisma.notification.create({
        data: {
          userId: updatedSale.designer.userId,
          title: `🎨 Assigned to Project #${sale.projectNumber}`,
          message: `You have been assigned as the Artist for "${sale.projectName}" (${sale.clientName}).`,
          type: 'project_assignment',
          link: '/dashboard/artist-assignments',
          isRead: false
        }
      });
    }

    await logAudit(req.user.id, 'ASSIGN_ARTIST', 'Sale', id, { designerId, designerName: updatedSale.designer?.fullName });
    res.json(updatedSale);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sales/briefs/:briefId/artist-update
 * Artist puts status update / progress notes on an assigned brief
 */
exports.updateBriefByArtist = async (req, res, next) => {
  try {
    const { briefId } = req.params;
    const { status, artistUpdate } = req.body;

    const brief = await prisma.projectBrief.findUnique({
      where: { id: briefId },
      include: { sale: { select: { id: true, projectNumber: true, projectName: true, clientName: true } } }
    });

    if (!brief) return res.status(404).json({ error: 'Brief record not found.' });

    const updated = await prisma.projectBrief.update({
      where: { id: briefId },
      data: {
        status: status || brief.status,
        artistUpdate: artistUpdate !== undefined ? artistUpdate : brief.artistUpdate
      }
    });

    // Notify CEO & Team Leads
    const senderName = req.user.employee?.fullName || 'Artist';
    const ceoAdmins = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'CEO', 'COO', 'Team Lead'] }, isActive: true },
      select: { id: true }
    });

    if (ceoAdmins.length > 0) {
      await prisma.notification.createMany({
        data: ceoAdmins.map(u => ({
          userId: u.id,
          title: `📝 Artist Update on Brief — #${brief.sale?.projectNumber}`,
          message: `${senderName} updated brief "${brief.fileName}" status to [${status || brief.status}]: "${artistUpdate || 'Progress update'}"`,
          type: 'brief_update',
          link: '/dashboard/briefs',
          isRead: false
        }))
      });
    }

    await logAudit(req.user.id, 'UPDATE_BRIEF_ARTIST', 'ProjectBrief', briefId, { status, artistUpdate });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};


exports.logPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, grossAmount, feeDeducted, paymentMethod, paymentDate, dueDate, status, exchangeRate, pkrAmount, fallInMonth, notes } = req.body;

    const gross = parseFloat(grossAmount || amount || 0);
    const fee = parseFloat(feeDeducted || 0);
    const net = Math.max(0, gross - fee);

    if (isNaN(gross) || gross <= 0) {
      return res.status(400).json({ error: 'Valid payment gross amount is required.' });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!sale) {
      return res.status(404).json({ error: 'Sale record not found.' });
    }

    const instNum = sale.payments.length + 1;
    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    const computedFallMonth = fallInMonth || `${pDate.toLocaleString('default', { month: 'short' })} ${pDate.getFullYear()}`;

    const payment = await prisma.salePayment.create({
      data: {
        saleId: id,
        installmentNumber: instNum,
        paymentDate: pDate,
        dueDate: dueDate ? new Date(dueDate) : null,
        grossAmount: gross,
        feeDeducted: fee,
        netAmount: net,
        amount: net,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
        pkrAmount: pkrAmount ? parseFloat(pkrAmount) : null,
        paymentMethod: paymentMethod || 'Online/Bank Transfer',
        status: status || 'received',
        fallInMonth: computedFallMonth,
        notes
      }
    });

    // Recalculate sale totals
    const allPayments = await prisma.salePayment.findMany({ where: { saleId: id } });
    const totalReceivedNet = allPayments.reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0);
    const totalSaleValue = (sale.saleAmount || 0) + (sale.tipAmount || 0);
    const newRemaining = Math.max(0, totalSaleValue - totalReceivedNet);
    const newPaymentStatus = newRemaining === 0 ? 'Paid' : (totalReceivedNet > 0 ? 'Partial' : 'Unpaid');

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        amountReceived: totalReceivedNet,
        remainingAmount: newRemaining,
        installmentsReceived: allPayments.filter(p => p.status === 'received').length,
        paymentStatus: newPaymentStatus,
        fallInMonth: computedFallMonth
      }
    });

    await logAudit(req.user.id, 'LOG_SALE_PAYMENT', 'SalePayment', payment.id, { gross, net, fee });
    res.json({ payment, sale: updatedSale });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sales/:id/installments
 * Fetch all sub-sheet installment ledger entries for a sale
 */
exports.getInstallments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const installments = await prisma.salePayment.findMany({
      where: { saleId: id },
      orderBy: [{ installmentNumber: 'asc' }, { paymentDate: 'asc' }]
    });

    const sale = await prisma.sale.findUnique({
      where: { id },
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        clientName: true,
        saleAmount: true,
        upfrontAmount: true,
        tipAmount: true,
        amountReceived: true,
        remainingAmount: true,
        installmentsCount: true,
        installmentsReceived: true,
        paymentStatus: true
      }
    });

    const totalGross = installments.reduce((s, i) => s + (i.grossAmount || 0), 0);
    const totalFees = installments.reduce((s, i) => s + (i.feeDeducted || 0), 0);
    const totalNet = installments.reduce((s, i) => s + (i.netAmount || i.amount || 0), 0);

    res.json({
      sale,
      summary: { totalGross, totalFees, totalNet },
      installments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/sales/:id/installments/:paymentId
 * Edit installment entry (reconcile gross vs net, date, month, status)
 */
exports.updateInstallment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const { grossAmount, feeDeducted, paymentDate, dueDate, paymentMethod, status, exchangeRate, pkrAmount, fallInMonth, notes, ceoNotes } = req.body;

    const existingInst = await prisma.salePayment.findUnique({ where: { id: paymentId } });
    if (!existingInst) return res.status(404).json({ error: 'Installment entry not found.' });

    const updates = {};
    if (grossAmount !== undefined || feeDeducted !== undefined) {
      const gross = grossAmount !== undefined ? parseFloat(grossAmount) : existingInst.grossAmount;
      const fee = feeDeducted !== undefined ? parseFloat(feeDeducted) : existingInst.feeDeducted;
      const net = Math.max(0, gross - fee);

      updates.grossAmount = gross;
      updates.feeDeducted = fee;
      updates.netAmount = net;
      updates.amount = net;
    }

    if (paymentDate !== undefined) updates.paymentDate = new Date(paymentDate);
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (status !== undefined) updates.status = status;
    if (exchangeRate !== undefined) updates.exchangeRate = exchangeRate ? parseFloat(exchangeRate) : null;
    if (pkrAmount !== undefined) updates.pkrAmount = pkrAmount ? parseFloat(pkrAmount) : null;
    if (fallInMonth !== undefined) updates.fallInMonth = fallInMonth;
    if (notes !== undefined) updates.notes = notes;
    if (ceoNotes !== undefined) updates.ceoNotes = ceoNotes;

    const updatedInst = await prisma.salePayment.update({
      where: { id: paymentId },
      data: updates
    });

    // Recalculate parent sale
    const allPayments = await prisma.salePayment.findMany({ where: { saleId: id } });
    const sale = await prisma.sale.findUnique({ where: { id } });
    const totalReceivedNet = allPayments.reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0);
    const totalSaleValue = (sale.saleAmount || 0) + (sale.tipAmount || 0);
    const newRemaining = Math.max(0, totalSaleValue - totalReceivedNet);
    const newPaymentStatus = newRemaining === 0 ? 'Paid' : (totalReceivedNet > 0 ? 'Partial' : 'Unpaid');

    await prisma.sale.update({
      where: { id },
      data: {
        amountReceived: totalReceivedNet,
        remainingAmount: newRemaining,
        installmentsReceived: allPayments.filter(p => p.status === 'received').length,
        paymentStatus: newPaymentStatus
      }
    });

    await logAudit(req.user.id, 'UPDATE_INSTALLMENT', 'SalePayment', paymentId, updates);
    res.json(updatedInst);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/sales/:id/installments/:paymentId
 * Remove installment entry & update parent sale
 */
exports.deleteInstallment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    await prisma.salePayment.delete({ where: { id: paymentId } });

    // Recalculate parent sale
    const allPayments = await prisma.salePayment.findMany({ where: { saleId: id } });
    const sale = await prisma.sale.findUnique({ where: { id } });
    const totalReceivedNet = allPayments.reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0);
    const totalSaleValue = (sale?.saleAmount || 0) + (sale?.tipAmount || 0);
    const newRemaining = Math.max(0, totalSaleValue - totalReceivedNet);
    const newPaymentStatus = newRemaining === 0 ? 'Paid' : (totalReceivedNet > 0 ? 'Partial' : 'Unpaid');

    await prisma.sale.update({
      where: { id },
      data: {
        amountReceived: totalReceivedNet,
        remainingAmount: newRemaining,
        installmentsReceived: allPayments.filter(p => p.status === 'received').length,
        paymentStatus: newPaymentStatus
      }
    });

    await logAudit(req.user.id, 'DELETE_INSTALLMENT', 'SalePayment', paymentId, { saleId: id });
    res.json({ message: 'Installment deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/sales/:id/override
 * CEO & Team Lead official reconciled layer
 */
exports.saveSaleOverride = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(req.user.role);
    const isTL = req.user.role === 'Team Lead';

    if (!isCEOOrAdmin && !isTL) {
      return res.status(403).json({ error: 'Only CEO/Admin and Team Leads can save financial reconciliation overrides.' });
    }

    const { verifiedSaleAmount, verifiedUpfront, verifiedRemaining, verifiedNetReceivedUsd, totalFeesDeductedUsd, verifiedPkrReceived, overrideNotes } = req.body;

    const override = await prisma.saleOverride.upsert({
      where: { id: (await prisma.saleOverride.findFirst({ where: { saleId: id } }))?.id || 'new-override-id' },
      create: {
        saleId: id,
        verifiedSaleAmount: verifiedSaleAmount ? parseFloat(verifiedSaleAmount) : null,
        verifiedUpfront: verifiedUpfront ? parseFloat(verifiedUpfront) : null,
        verifiedRemaining: verifiedRemaining ? parseFloat(verifiedRemaining) : null,
        verifiedNetReceivedUsd: verifiedNetReceivedUsd ? parseFloat(verifiedNetReceivedUsd) : null,
        totalFeesDeductedUsd: totalFeesDeductedUsd ? parseFloat(totalFeesDeductedUsd) : null,
        verifiedPkrReceived: verifiedPkrReceived ? parseFloat(verifiedPkrReceived) : null,
        overrideNotes: overrideNotes || null,
        updatedById: req.user.id
      },
      update: {
        verifiedSaleAmount: verifiedSaleAmount !== undefined ? (verifiedSaleAmount ? parseFloat(verifiedSaleAmount) : null) : undefined,
        verifiedUpfront: verifiedUpfront !== undefined ? (verifiedUpfront ? parseFloat(verifiedUpfront) : null) : undefined,
        verifiedRemaining: verifiedRemaining !== undefined ? (verifiedRemaining ? parseFloat(verifiedRemaining) : null) : undefined,
        verifiedNetReceivedUsd: verifiedNetReceivedUsd !== undefined ? (verifiedNetReceivedUsd ? parseFloat(verifiedNetReceivedUsd) : null) : undefined,
        totalFeesDeductedUsd: totalFeesDeductedUsd !== undefined ? (totalFeesDeductedUsd ? parseFloat(totalFeesDeductedUsd) : null) : undefined,
        verifiedPkrReceived: verifiedPkrReceived !== undefined ? (verifiedPkrReceived ? parseFloat(verifiedPkrReceived) : null) : undefined,
        overrideNotes: overrideNotes !== undefined ? overrideNotes : undefined,
        updatedById: req.user.id
      }
    });

    await logAudit(req.user.id, 'SAVE_SALE_OVERRIDE', 'SaleOverride', override.id, { saleId: id });
    res.json(override);
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

    // Helper: push a notification to CEO/TL users (fire and forget)
    async function pushNotification(title, message, type, link) {
      try {
        const targetUsers = await prisma.user.findMany({
          where: { role: { in: ['Admin', 'CEO', 'COO', 'Team Lead'] }, isActive: true },
          select: { id: true }
        });
        // Only create notification if not already sent in last 24h (deduplicate by title+message)
        for (const u of targetUsers) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: u.id,
              title,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          });
          if (!existing) {
            await prisma.notification.create({
              data: { userId: u.id, title, message, type, link, isRead: false }
            });
          }
        }
      } catch (e) {
        console.warn('[pushNotification] Failed:', e.message);
      }
    }

    for (const sale of sales) {
      // 1. Check >5 days stagnant stage alert
      if (sale.projectStage !== 'Final Artwork') {
        const daysInStage = (now - new Date(sale.stageUpdatedAt)) / (1000 * 60 * 60 * 24);
        if (daysInStage > 5) {
          const alert = {
            id: `stagnant-${sale.id}`,
            type: 'stagnant_project',
            severity: 'warning',
            title: `Project Stagnant (>5 Days)`,
            message: `Project #${sale.projectNumber} (${sale.projectName}) has been in "${sale.projectStage}" stage for ${Math.floor(daysInStage)} days.`,
            saleId: sale.id,
            employeeName: sale.employee?.fullName,
            days: Math.floor(daysInStage)
          };
          alerts.push(alert);
          await pushNotification(alert.title, alert.message, 'sla_alert', `/dashboard/artist-assignments`);
        }
      }

      // 2. Check missing brief >2 days alert
      if (sale.briefStatus === 'Pending') {
        const daysSinceSale = (now - new Date(sale.saleDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceSale > 2) {
          const alert = {
            id: `brief-${sale.id}`,
            type: 'missing_brief',
            severity: 'alert',
            title: `Missing Project Brief (>2 Days)`,
            message: `Sale #${sale.projectNumber} (${sale.projectName}) was created ${Math.floor(daysSinceSale)} days ago but project brief is still pending.`,
            saleId: sale.id,
            employeeName: sale.employee?.fullName,
            days: Math.floor(daysSinceSale)
          };
          alerts.push(alert);
          await pushNotification(alert.title, alert.message, 'sla_alert', `/dashboard/sales`);
        }
      }

      // 3. Check payment overdue (nextPaymentDate has passed and not fully paid)
      if (sale.nextPaymentDate && sale.paymentStatus !== 'Paid') {
        const daysOverdue = (now - new Date(sale.nextPaymentDate)) / (1000 * 60 * 60 * 24);
        if (daysOverdue > 0) {
          const alert = {
            id: `overdue-${sale.id}`,
            type: 'payment_overdue',
            severity: 'critical',
            title: `Client Payment Overdue`,
            message: `Project #${sale.projectNumber} (${sale.clientName}) — installment was due ${Math.floor(daysOverdue)} days ago. Remaining: $${sale.remainingAmount.toFixed(2)}.`,
            saleId: sale.id,
            employeeName: sale.employee?.fullName,
            days: Math.floor(daysOverdue)
          };
          alerts.push(alert);
          await pushNotification(alert.title, alert.message, 'sla_alert', `/dashboard/sales`);
        }
      }

      // 4. Float exposure alert: amountPaidToDesigner > amountReceived from client
      if (sale.amountPaidToDesigner > sale.amountReceived) {
        const floatGap = sale.amountPaidToDesigner - sale.amountReceived;
        const alert = {
          id: `float-${sale.id}`,
          type: 'float_exposure',
          severity: 'warning',
          title: `Float Exposure Alert`,
          message: `Project #${sale.projectNumber}: Designer has been paid $${sale.amountPaidToDesigner} but only $${sale.amountReceived} received from client. Float gap: $${floatGap.toFixed(2)}.`,
          saleId: sale.id,
          employeeName: sale.employee?.fullName,
          floatGap
        };
        alerts.push(alert);
        await pushNotification(alert.title, alert.message, 'float_alert', `/dashboard/finance`);
      }
    }

    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

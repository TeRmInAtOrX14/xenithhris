const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const CEO_ADMIN_ROLES = ['Admin', 'CEO', 'COO'];

/**
 * Push a Notification record to all CEO/Admin users
 */
async function notifyCEO(title, message, type, link = null) {
  try {
    const ceoUsers = await prisma.user.findMany({
      where: { role: { in: CEO_ADMIN_ROLES }, isActive: true },
      select: { id: true }
    });
    if (ceoUsers.length > 0) {
      await prisma.notification.createMany({
        data: ceoUsers.map(u => ({
          userId: u.id,
          title,
          message,
          type,
          link,
          isRead: false
        }))
      });
    }
  } catch (err) {
    console.error('[notifyCEO] Failed to push notification:', err.message);
  }
}

/**
 * GET /api/payout-requests
 * - CEO/Admin: all requests
 * - Designer: own requests only
 */
exports.getPayoutRequests = async (req, res, next) => {
  try {
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);
    const isDesigner = req.user.role === 'Designer';

    if (!isCEOOrAdmin && !isDesigner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const where = {};
    if (isDesigner) {
      where.designerId = req.user.employee?.id;
      if (!where.designerId) {
        return res.status(400).json({ error: 'No designer profile linked.' });
      }
    }

    const { status, saleId } = req.query;
    if (status) where.status = status;
    if (saleId && isCEOOrAdmin) where.saleId = saleId;

    const requests = await prisma.designerPayoutRequest.findMany({
      where,
      include: {
        sale: {
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
            paymentStatus: true
          }
        },
        designer: {
          select: { id: true, fullName: true, employeeCode: true, designation: true }
        },
        reviewedBy: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Attach float context for CEO
    const enriched = isCEOOrAdmin
      ? requests.map(r => ({
          ...r,
          floatContext: {
            clientReceived: r.sale?.amountReceived || 0,
            alreadyPaidToDesigner: r.sale?.amountPaidToDesigner || 0,
            requestedAmount: r.amount,
            floatImpact: (r.sale?.amountPaidToDesigner || 0) + r.amount - (r.sale?.amountReceived || 0),
          }
        }))
      : requests;

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payout-requests
 * Designer submits an expedited payout request
 */
exports.createPayoutRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'Designer') {
      return res.status(403).json({ error: 'Only Designers can submit payout requests.' });
    }

    const designerId = req.user.employee?.id;
    if (!designerId) {
      return res.status(400).json({ error: 'No designer profile linked to your account.' });
    }

    const { saleId, amount, reason } = req.body;
    if (!saleId || !amount) {
      return res.status(400).json({ error: 'Project ID and amount are required.' });
    }

    // Verify this project is actually assigned to this designer
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return res.status(404).json({ error: 'Project not found.' });
    if (sale.designerId !== designerId) {
      return res.status(403).json({ error: 'You can only request payouts for projects assigned to you.' });
    }

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const remaining = sale.designerFee - sale.amountPaidToDesigner;
    if (requestedAmount > remaining) {
      return res.status(400).json({
        error: `Requested amount ($${requestedAmount}) exceeds remaining designer fee ($${remaining}).`
      });
    }

    // Check for existing pending request on same project
    const existingPending = await prisma.designerPayoutRequest.findFirst({
      where: { saleId, designerId, status: 'pending' }
    });
    if (existingPending) {
      return res.status(400).json({ error: 'You already have a pending payout request for this project.' });
    }

    const request = await prisma.designerPayoutRequest.create({
      data: {
        saleId,
        designerId,
        amount: requestedAmount,
        reason: reason || null,
        status: 'pending'
      },
      include: {
        sale: { select: { projectNumber: true, projectName: true } },
        designer: { select: { fullName: true } }
      }
    });

    // Notify CEO
    await notifyCEO(
      '💸 Expedited Payout Request',
      `${request.designer.fullName} has requested an early payout of $${requestedAmount} for project #${request.sale.projectNumber} (${request.sale.projectName}).`,
      'payout_request',
      '/dashboard/payout-requests'
    );

    await logAudit(req.user.id, 'CREATE_PAYOUT_REQUEST', 'DesignerPayoutRequest', request.id, {
      saleId, amount: requestedAmount
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/payout-requests/:id
 * CEO approves or rejects a payout request
 */
exports.reviewPayoutRequest = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEO/Admin can review payout requests.' });
    }

    const { id } = req.params;
    const { action, ceoNote } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
    }

    const request = await prisma.designerPayoutRequest.findUnique({
      where: { id },
      include: {
        sale: true,
        designer: { select: { fullName: true, user: { select: { id: true } } } }
      }
    });

    if (!request) return res.status(404).json({ error: 'Payout request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}.` });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update request status
    const updated = await prisma.designerPayoutRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        ceoNote: ceoNote || null
      }
    });

    if (action === 'approve') {
      // Update amountPaidToDesigner on the Sale
      const newPaid = request.sale.amountPaidToDesigner + request.amount;
      await prisma.sale.update({
        where: { id: request.saleId },
        data: { amountPaidToDesigner: newPaid }
      });

      // Create FloatLedger entry — artist advance
      const clientReceived = request.sale.amountReceived;
      const runningFloat = clientReceived - newPaid; // negative = float exposure

      await prisma.floatLedger.create({
        data: {
          saleId: request.saleId,
          type: 'artist_payout_advance',
          amount: -request.amount, // money out
          description: `Expedited payout approved for ${request.designer.fullName}: $${request.amount}`,
          runningFloat,
          createdById: req.user.id
        }
      });

      // Mark payout as paid
      await prisma.designerPayoutRequest.update({
        where: { id },
        data: { status: 'paid' }
      });
    }

    // Notify the Designer
    if (request.designer.user?.id) {
      await prisma.notification.create({
        data: {
          userId: request.designer.user.id,
          title: action === 'approve' ? '✅ Payout Request Approved' : '❌ Payout Request Rejected',
          message: action === 'approve'
            ? `Your payout request of $${request.amount} for project #${request.sale.projectNumber} has been approved.`
            : `Your payout request was rejected. ${ceoNote ? `Note: ${ceoNote}` : ''}`,
          type: 'payout_request',
          link: '/dashboard/artist-assignments'
        }
      });
    }

    await logAudit(req.user.id, `${action.toUpperCase()}_PAYOUT_REQUEST`, 'DesignerPayoutRequest', id, {
      action, amount: request.amount
    });

    res.json({ message: `Request ${newStatus} successfully.`, request: updated });
  } catch (err) {
    next(err);
  }
};

const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const CEO_ADMIN_ROLES = ['Admin', 'CEO', 'COO'];

/**
 * POST /api/payroll/payslips/:payslipId/override
 * CEO applies a penalty override (waive/adjust) without altering time logs
 */
exports.createPayslipOverride = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEO/Admin can apply payslip overrides.' });
    }

    const { payslipId } = req.params;
    const { overrideType, originalAmount, overrideAmount, reason } = req.body;

    const validTypes = ['waive_late_deduction', 'waive_absence_deduction', 'custom_bonus', 'custom_deduction'];
    if (!validTypes.includes(overrideType)) {
      return res.status(400).json({ error: `overrideType must be one of: ${validTypes.join(', ')}` });
    }

    if (!reason) return res.status(400).json({ error: 'A reason is required for all payslip overrides.' });

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { payrollRun: true }
    });

    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });
    if (payslip.payrollRun.status === 'finalized') {
      return res.status(400).json({ error: 'Cannot apply overrides to a finalized payroll run. Contact system admin.' });
    }

    const origAmt = parseFloat(originalAmount || 0);
    const overrideAmt = parseFloat(overrideAmount || 0);
    const netAdjustment = overrideAmt - origAmt; // negative = reduction in deductions = benefit

    // Create override record
    const override = await prisma.payslipOverride.create({
      data: {
        payslipId,
        overrideType,
        originalAmount: origAmt,
        overrideAmount: overrideAmt,
        reason,
        approvedById: req.user.id
      },
      include: {
        approvedBy: { select: { email: true } }
      }
    });

    // Recompute overrideAdjustment on the payslip by summing all overrides
    const allOverrides = await prisma.payslipOverride.findMany({
      where: { payslipId }
    });

    let totalOverrideAdjustment = 0;
    for (const ov of allOverrides) {
      const adj = ov.overrideAmount - ov.originalAmount;
      totalOverrideAdjustment += adj;
    }

    // Recalculate netPay with override adjustment
    const updatedPayslip = await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        overrideAdjustment: totalOverrideAdjustment,
        netPay: payslip.baseSalary
          + (payslip.commissionPkr || 0)
          + (payslip.bonus || 0)
          + (payslip.spiffs || 0)
          + (payslip.attendanceAllowance || 0)
          + (payslip.punctualityAllowance || 0)
          - (payslip.unpaidLeaveDeduction || 0)
          - (payslip.lateDeduction || 0)
          - (payslip.loansDeduction || 0)
          - (payslip.otherDeductions || 0)
          + totalOverrideAdjustment
      }
    });

    await logAudit(req.user.id, 'PAYSLIP_OVERRIDE', 'PayslipOverride', override.id, {
      payslipId, overrideType, originalAmount: origAmt, overrideAmount: overrideAmt, reason
    });

    res.status(201).json({
      override,
      updatedNetPay: updatedPayslip.netPay,
      totalOverrideAdjustment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payroll/payslips/:payslipId/overrides
 * List all CEO overrides applied to a payslip
 */
exports.getPayslipOverrides = async (req, res, next) => {
  try {
    const { payslipId } = req.params;
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      select: { id: true, employeeId: true }
    });

    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });

    // Only CEO or the payslip's employee can view overrides
    if (!isCEOOrAdmin && payslip.employeeId !== req.user.employee?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const overrides = await prisma.payslipOverride.findMany({
      where: { payslipId },
      include: {
        approvedBy: { select: { id: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(overrides);
  } catch (err) {
    next(err);
  }
};

const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const CEO_ADMIN_ROLES = ['Admin', 'CEO', 'COO'];
const VAULT_ACCESS_ROLES = ['Admin', 'CEO', 'COO', 'Sales Executive', 'Employee', 'Team Lead'];

/**
 * GET /api/vault
 * - CEO/Admin: all vault entries (can filter by employeeId)
 * - Sales Executive / Employee: own entries only
 */
exports.getVaultEntries = async (req, res, next) => {
  try {
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);

    if (!isCEOOrAdmin && !VAULT_ACCESS_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const where = {};

    if (!isCEOOrAdmin) {
      // Regular users see only their own vault
      const empId = req.user.employee?.id;
      if (!empId) return res.status(400).json({ error: 'No employee profile linked.' });
      where.employeeId = empId;
    } else {
      // CEO/Admin can filter by employee
      if (req.query.employeeId) {
        where.employeeId = req.query.employeeId;
      }
    }

    if (req.query.platform) {
      where.platform = { contains: req.query.platform, mode: 'insensitive' };
    }
    if (req.query.accountType) {
      where.accountType = req.query.accountType;
    }

    const entries = await prisma.credentialVault.findMany({
      where,
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, designation: true }
        }
      },
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }]
    });

    res.json(entries);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vault
 * Create a new vault entry (own or on behalf of employee for CEO/Admin)
 */
exports.createVaultEntry = async (req, res, next) => {
  try {
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);
    const { platform, label, username, passwordHint, url, accountType, notes, employeeId } = req.body;

    if (!platform || !label) {
      return res.status(400).json({ error: 'Platform and Label are required.' });
    }

    let targetEmployeeId = req.user.employee?.id;

    if (isCEOOrAdmin && employeeId) {
      targetEmployeeId = employeeId;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'No employee profile to assign this credential to.' });
    }

    const entry = await prisma.credentialVault.create({
      data: {
        employeeId: targetEmployeeId,
        platform,
        label,
        username: username || null,
        passwordHint: passwordHint || null,
        url: url || null,
        accountType: accountType || 'primary',
        notes: notes || null,
        isActive: true
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } }
      }
    });

    await logAudit(req.user.id, 'CREATE_VAULT_ENTRY', 'CredentialVault', entry.id, { platform, label, accountType });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/vault/:id
 * Update a vault entry (owner or CEO/Admin)
 */
exports.updateVaultEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);

    const existing = await prisma.credentialVault.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vault entry not found.' });

    // Ownership check
    if (!isCEOOrAdmin && existing.employeeId !== req.user.employee?.id) {
      return res.status(403).json({ error: 'You can only edit your own vault entries.' });
    }

    const { platform, label, username, passwordHint, url, accountType, notes, isActive } = req.body;
    const updates = {};
    if (platform !== undefined) updates.platform = platform;
    if (label !== undefined) updates.label = label;
    if (username !== undefined) updates.username = username;
    if (passwordHint !== undefined) updates.passwordHint = passwordHint;
    if (url !== undefined) updates.url = url;
    if (accountType !== undefined) updates.accountType = accountType;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await prisma.credentialVault.update({
      where: { id },
      data: updates,
      include: { employee: { select: { id: true, fullName: true } } }
    });

    await logAudit(req.user.id, 'UPDATE_VAULT_ENTRY', 'CredentialVault', id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vault/:id
 * Delete a vault entry (CEO/Admin only, or own entry)
 */
exports.deleteVaultEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);

    const existing = await prisma.credentialVault.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vault entry not found.' });

    if (!isCEOOrAdmin && existing.employeeId !== req.user.employee?.id) {
      return res.status(403).json({ error: 'You can only delete your own vault entries.' });
    }

    await prisma.credentialVault.delete({ where: { id } });
    await logAudit(req.user.id, 'DELETE_VAULT_ENTRY', 'CredentialVault', id, { platform: existing.platform });

    res.json({ message: 'Vault entry deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

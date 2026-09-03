const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const NOTIF_ROLES = ['Admin', 'CEO', 'COO', 'Team Lead'];

/**
 * POST /api/sales/:id/assets
 * Designer uploads completed artwork (.png, .jpeg, .jpg, .pdf) for a project.
 * Emits immediate push notifications to both CEO and Team Lead.
 */
exports.uploadAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileName, fileUrl, fileType, stage, notes } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'File Name and File URL are required.' });
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    const validExts = ['png', 'jpeg', 'jpg', 'pdf'];
    const detectedType = fileType?.toLowerCase() || ext;

    if (!validExts.includes(detectedType)) {
      return res.status(400).json({ error: 'Invalid file type. Only .png, .jpeg, .jpg, and .pdf files are accepted.' });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        designer: { select: { fullName: true } }
      }
    });

    if (!sale) return res.status(404).json({ error: 'Project not found.' });

    const designerEmpId = req.user.employee?.id || sale.designerId || 'unknown';

    const asset = await prisma.projectAssetUpload.create({
      data: {
        saleId: id,
        uploadedById: req.user.id,
        designerId: designerEmpId,
        fileName,
        fileUrl,
        fileType: detectedType,
        stage: stage || sale.projectStage,
        notes: notes || null
      }
    });

    // Notify CEO & Team Leads
    const designerName = req.user.employee?.fullName || sale.designer?.fullName || 'Designer';
    const notifTargets = await prisma.user.findMany({
      where: { role: { in: NOTIF_ROLES }, isActive: true },
      select: { id: true }
    });

    if (notifTargets.length > 0) {
      await prisma.notification.createMany({
        data: notifTargets.map(u => ({
          userId: u.id,
          title: `🎨 New Artwork Delivered — ${sale.projectNumber}`,
          message: `${designerName} uploaded "${fileName}" (${detectedType.toUpperCase()}) for ${sale.projectName} [${sale.clientName}]. Stage: ${stage || sale.projectStage}`,
          type: 'asset_update',
          link: '/dashboard/briefs',
          isRead: false
        }))
      });
    }

    await logAudit(req.user.id, 'UPLOAD_PROJECT_ASSET', 'ProjectAssetUpload', asset.id, {
      saleId: id, fileName, fileType: detectedType
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sales/:id/assets
 * Get all asset uploads for a project
 */
exports.getAssets = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assets = await prisma.projectAssetUpload.findMany({
      where: { saleId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assets);
  } catch (err) {
    next(err);
  }
};

const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system');
const { requireAuth, requireRole } = require('../middlewares/auth');

const adminRoles = ['Admin', 'CEO', 'COO'];

const systemSettingController = require('../controllers/systemSetting');

// Notifications
router.get('/notifications', requireAuth, systemController.getNotifications);
router.put('/notifications/read-all', requireAuth, systemController.markAllAsRead);
router.put('/notifications/:id/read', requireAuth, systemController.markAsRead);

// Audit Logs
router.get('/audit-logs', requireAuth, requireRole(adminRoles), systemController.getAuditLogs);

// System Settings (Global USD -> PKR rate, Designer Payment Visibility)
router.get('/settings', requireAuth, systemSettingController.getSettings);
router.put('/settings', requireAuth, requireRole(adminRoles), systemSettingController.updateSettings);

module.exports = router;

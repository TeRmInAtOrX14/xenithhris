const express = require('express');
const router = express.Router();
const floatController = require('../controllers/float');
const { requireAuth, requireRole } = require('../middlewares/auth');

const ceoAdminRoles = ['Admin', 'CEO', 'COO'];

// GET float entries for a specific project
router.get('/', requireAuth, requireRole(ceoAdminRoles), floatController.getProjectFloat);

// GET company-wide float summary
router.get('/summary', requireAuth, requireRole(ceoAdminRoles), floatController.getFloatSummary);

// POST manual float reconciliation entry
router.post('/entry', requireAuth, requireRole(ceoAdminRoles), floatController.createFloatEntry);

module.exports = router;

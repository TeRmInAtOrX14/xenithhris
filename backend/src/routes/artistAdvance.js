const express = require('express');
const router = express.Router();
const artistAdvanceController = require('../controllers/artistAdvance');
const { requireAuth, requireRole } = require('../middlewares/auth');

const ceoAdminRoles = ['Admin', 'CEO', 'COO'];

// GET advances list (CEO sees all; Designer sees own)
router.get('/', requireAuth, artistAdvanceController.getAdvances);

// GET artist monthly advance summary (Base salary - total advances = net payable)
router.get('/summary', requireAuth, artistAdvanceController.getAdvanceSummary);

// GET overview of all artists for CEO
router.get('/all-artists', requireAuth, requireRole(ceoAdminRoles), artistAdvanceController.getAllArtistsSummary);

// POST log a mid-month advance draw (CEO/Admin only)
router.post('/', requireAuth, requireRole(ceoAdminRoles), artistAdvanceController.createAdvance);

// DELETE remove an advance entry (CEO/Admin only)
router.delete('/:id', requireAuth, requireRole(ceoAdminRoles), artistAdvanceController.deleteAdvance);

module.exports = router;

const express = require('express');
const router = express.Router();
const payoutRequestController = require('../controllers/payoutRequest');
const { requireAuth } = require('../middlewares/auth');

// GET all payout requests (CEO sees all, Designer sees own)
router.get('/', requireAuth, payoutRequestController.getPayoutRequests);

// POST create a new payout request (Designer only)
router.post('/', requireAuth, payoutRequestController.createPayoutRequest);

// PATCH approve or reject a request (CEO/Admin only)
router.patch('/:id', requireAuth, payoutRequestController.reviewPayoutRequest);

module.exports = router;

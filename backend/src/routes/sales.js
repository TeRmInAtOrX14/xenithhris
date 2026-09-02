const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, salesController.getSales);
router.post('/', requireAuth, salesController.createSale);
router.patch('/:id/stage', requireAuth, salesController.updateSaleStage);
router.post('/:id/briefs', requireAuth, salesController.uploadBrief);
router.post('/:id/payments', requireAuth, salesController.logPayment);
router.get('/alerts', requireAuth, salesController.getAlerts);

module.exports = router;

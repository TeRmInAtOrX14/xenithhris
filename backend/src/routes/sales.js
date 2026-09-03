const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales');
const projectAssetController = require('../controllers/projectAsset');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, salesController.getSales);
router.post('/', requireAuth, salesController.createSale);
router.put('/:id', requireAuth, salesController.updateSale);
router.patch('/:id/stage', requireAuth, salesController.updateSaleStage);
router.post('/:id/briefs', requireAuth, salesController.uploadBrief);

// Installment Sub-Sheet Drawer routes
router.get('/:id/installments', requireAuth, salesController.getInstallments);
router.post('/:id/payments', requireAuth, salesController.logPayment);
router.put('/:id/installments/:paymentId', requireAuth, salesController.updateInstallment);
router.delete('/:id/installments/:paymentId', requireAuth, salesController.deleteInstallment);

// CEO & Team Lead Financial Reconciliation Override route
router.post('/:id/override', requireAuth, salesController.saveSaleOverride);

// Project Asset Upload routes (Designer → CEO/TL alert)
router.post('/:id/assets', requireAuth, projectAssetController.uploadAsset);
router.get('/:id/assets', requireAuth, projectAssetController.getAssets);

router.get('/alerts', requireAuth, salesController.getAlerts);

module.exports = router;


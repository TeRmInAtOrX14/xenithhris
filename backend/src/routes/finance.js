const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance');
const { requireAuth, requireRole } = require('../middlewares/auth');

const adminRoles = ['Admin', 'CEO', 'COO'];

router.get('/expenses', requireAuth, requireRole(adminRoles), financeController.getExpenses);
router.post('/expenses', requireAuth, requireRole(adminRoles), financeController.createExpense);

router.get('/salaries', requireAuth, requireRole(adminRoles), financeController.getSalaryPayments);
router.post('/salaries', requireAuth, requireRole(adminRoles), financeController.logSalaryPayment);

router.get('/profit-loss', requireAuth, requireRole(adminRoles), financeController.getProfitLoss);

module.exports = router;

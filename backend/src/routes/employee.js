const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee');
const { requireAuth, requireRole } = require('../middlewares/auth');

const adminRoles = ['Admin', 'CEO', 'COO'];

// Employee Routes
router.get('/', requireAuth, employeeController.getEmployees);
router.get('/teams', requireAuth, employeeController.getTeams);
router.get('/sales-executive/earnings', requireAuth, employeeController.getSalesExecutiveEarnings);
router.get('/designer/projects', requireAuth, employeeController.getDesignerPortalData);
router.get('/:id', requireAuth, employeeController.getEmployeeById);
router.post('/', requireAuth, requireRole(adminRoles), employeeController.createEmployee);
router.post('/import', requireAuth, requireRole(adminRoles), employeeController.importEmployees);
router.put('/:id', requireAuth, employeeController.updateEmployee);
router.patch('/:id/reset-password', requireAuth, requireRole(adminRoles), employeeController.resetEmployeeCredentials);
router.delete('/:id', requireAuth, requireRole(adminRoles), employeeController.deleteEmployee);
router.post('/:id/terminate', requireAuth, requireRole(adminRoles), employeeController.terminateEmployee);

module.exports = router;

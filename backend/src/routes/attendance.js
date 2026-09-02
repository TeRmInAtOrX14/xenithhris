const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance');
const { requireAuth, requireRole } = require('../middlewares/auth');

const adminRoles = ['Admin', 'CEO', 'COO'];

router.get('/', requireAuth, attendanceController.getAttendance);
router.get('/summary', requireAuth, attendanceController.getAttendanceSummary);
router.get('/today-status', requireAuth, attendanceController.getTodayStatus);
router.post('/check-in', requireAuth, attendanceController.checkIn);
router.post('/check-out', requireAuth, attendanceController.checkOut);
router.post('/manual', requireAuth, requireRole(adminRoles), attendanceController.manualPunch);

module.exports = router;


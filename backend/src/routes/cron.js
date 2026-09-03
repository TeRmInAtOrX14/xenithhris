const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance');
const artistAdvanceController = require('../controllers/artistAdvance');

// POST /api/cron/auto-offmark — called by Vercel Cron at 19:30 UTC (00:30 AM PKT)
router.post('/auto-offmark', attendanceController.autoOffMark);

// POST /api/cron/artist-settlement-reminder — called by Vercel Cron on 5th of month
router.post('/artist-settlement-reminder', artistAdvanceController.settlementReminder);

module.exports = router;


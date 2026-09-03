const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');

const prisma = new PrismaClient();

exports.getAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    const where = {};
    
    // Date Range Filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (['Employee'].includes(req.user.role)) {
      // Regular employees and SDRs can only see their own attendance
      if (!req.user.employee) {
        return res.status(400).json({ error: 'No employee profile linked to user.' });
      }
      where.employeeId = req.user.employee.id;
    } else if (req.user.role === 'Team Lead') {
      // Find active campaigns this TL leads
      const ledCampaigns = await prisma.campaignMember.findMany({
        where: { employeeId: req.user.employee?.id, role: 'team_lead', status: 'active' },
        select: { campaignId: true }
      });
      const campaignIds = ledCampaigns.map(c => c.campaignId);

      // Find active SDRs in these campaigns
      const sdrs = await prisma.campaignMember.findMany({
        where: { campaignId: { in: campaignIds }, status: 'active' },
        select: { employeeId: true }
      });
      const sdrIds = sdrs.map(s => s.employeeId);
      if (req.user.employee?.id) {
        sdrIds.push(req.user.employee.id);
      }

      if (employeeId) {
        if (!sdrIds.includes(employeeId)) {
          return res.status(403).json({ error: 'Access denied.' });
        }
        where.employeeId = employeeId;
      } else {
        where.employeeId = { in: sdrIds };
      }
    } else {
      // Admins/Directors can filter by any employee
      if (employeeId) {
        where.employeeId = employeeId;
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, designation: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { checkIn: 'desc' }
      ]
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
};

exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { employeeId, year, month } = req.query;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: 'employeeId, year, and month are required' });
    }

    // RBAC check: standard Employees and SDRs can only see their own attendance summary
    if (['Employee'].includes(req.user.role) && req.user.employee?.id !== employeeId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // RBAC check: Team Leads can only see their own summary or the summary of employees on their led campaigns
    if (req.user.role === 'Team Lead' && req.user.employee?.id !== employeeId) {
      const ledCampaigns = await prisma.campaignMember.findMany({
        where: { employeeId: req.user.employee?.id, role: 'team_lead', status: 'active' },
        select: { campaignId: true }
      });
      const campaignIds = ledCampaigns.map(c => c.campaignId);
      
      const isMemberOfLedCampaign = await prisma.campaignMember.findFirst({
        where: {
          employeeId,
          campaignId: { in: campaignIds },
          status: 'active'
        }
      });

      if (!isMemberOfLedCampaign) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
    const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(month), 0));

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Compute metrics
    let present = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let halfDays = 0;
    let leaves = 0;
    let overtimeMinutes = 0;

    records.forEach(rec => {
      if (rec.status === 'present') present++;
      if (rec.status === 'half_day') halfDays++;
      if (rec.status === 'leave') leaves++;
      if (rec.late > 0) {
        lateCount++;
        totalLateMinutes += rec.late;
      }
      overtimeMinutes += rec.overtime;
    });

    res.json({
      employeeId,
      year: parseInt(year),
      month: parseInt(month),
      present,
      halfDays,
      leaves,
      lateCount,
      totalLateMinutes,
      overtimeMinutes,
      totalRecords: records.length
    });
  } catch (err) {
    next(err);
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ error: 'No employee profile linked to your user account.' });
    }

    const employeeId = req.user.employee.id;
    const now = new Date();
    const dateMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Check if employee already has an attendance record for today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateMidnight
        }
      }
    });

    if (existing && existing.checkIn) {
      const formattedTime = new Date(existing.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({ error: `You have already checked in today at ${formattedTime}.` });
    }

    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });

    // Attendance-exempt employees (Artists/Designers) can still clock in manually but no late penalty
    const isExempt = emp?.attendanceExempt || false;

    // Business rule:
    // Standard shift start: 18:00 (6:00 PM)
    // Standard late threshold: 18:15 (15 min grace)
    // Per-employee override: if customLateThresholdMinutes is set, threshold = 18:00 + customLateThresholdMinutes
    // For Adeen (customLateThresholdMinutes=45): threshold = 18:45
    const SHIFT_START_HOUR = 18;
    const SHIFT_START_MIN = 0;
    const shiftStartTotalMins = SHIFT_START_HOUR * 60 + SHIFT_START_MIN;
    const thresholdMins = emp?.customLateThresholdMinutes !== null && emp?.customLateThresholdMinutes !== undefined
      ? emp.customLateThresholdMinutes
      : 15; // system default: 15 min grace = 18:15

    const lateThresholdMins = shiftStartTotalMins + thresholdMins;

    // Use local PKT time for comparison (UTC+5)
    const checkInMins = now.getUTCHours() * 60 + now.getUTCMinutes() + 300; // +300 = +5 hours PKT offset
    const checkInMinsPKT = checkInMins % (24 * 60); // wrap around midnight

    let lateMins = 0;
    if (!isExempt && checkInMinsPKT > lateThresholdMins) {
      lateMins = checkInMinsPKT - shiftStartTotalMins; // minutes late from shift start
    }

    let status = 'present';
    if (existing?.status && existing.status !== 'absent') {
      status = existing.status;
    }

    const record = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateMidnight
        }
      },
      create: {
        employeeId,
        date: dateMidnight,
        status,
        checkIn: now,
        checkOut: null,
        late: lateMins,
        note: isExempt ? 'Attendance Exempt — HRIS Web Check-In' : 'HRIS Web Check-In'
      },
      update: {
        status,
        checkIn: now,
        late: lateMins,
        note: existing?.note ? `${existing.note} | Web Check-In` : 'HRIS Web Check-In'
      }
    });

    await logAudit(req.user.id, 'EMPLOYEE_CHECK_IN', 'Attendance', record.id, {
      checkIn: now,
      lateMins,
      isExempt,
      customThreshold: emp?.customLateThresholdMinutes
    });
    res.json({
      message: 'Check-in recorded successfully',
      record,
      lateMinutes: lateMins,
      isLate: lateMins > 0,
      isExempt
    });
  } catch (err) {
    next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ error: 'No employee profile linked to your user account.' });
    }

    const employeeId = req.user.employee.id;
    const now = new Date();
    const dateMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateMidnight
        }
      }
    });

    if (!existing || !existing.checkIn) {
      return res.status(400).json({ error: 'You must check in before checking out.' });
    }

    if (existing.checkOut) {
      const formattedTime = new Date(existing.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({ error: `You have already checked out today at ${formattedTime}.` });
    }

    // Calculate early departure or overtime against shiftEnd
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    const shiftEnd = emp?.shiftEnd || '18:30';
    const [eh, em] = shiftEnd.split(':').map(Number);
    const shiftEndMins = eh * 60 + em;
    const checkOutMins = now.getHours() * 60 + now.getMinutes();
    
    let earlyDeparture = 0;
    let overtime = 0;
    if (checkOutMins < shiftEndMins) {
      earlyDeparture = shiftEndMins - checkOutMins;
    } else if (checkOutMins > shiftEndMins) {
      overtime = checkOutMins - shiftEndMins;
    }

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        earlyDeparture,
        overtime
      }
    });

    await logAudit(req.user.id, 'EMPLOYEE_CHECK_OUT', 'Attendance', record.id, { checkOut: now });
    res.json({ message: 'Check-out recorded successfully', record });
  } catch (err) {
    next(err);
  }
};

exports.getTodayStatus = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.json({ checkedIn: false, checkedOut: false, record: null });
    }

    const employeeId = req.user.employee.id;
    const now = new Date();
    const dateMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateMidnight
        }
      }
    });

    res.json({
      checkedIn: Boolean(record && record.checkIn),
      checkedOut: Boolean(record && record.checkOut),
      record
    });
  } catch (err) {
    next(err);
  }
};

exports.manualPunch = async (req, res, next) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, note } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ error: 'Employee ID and Date are required.' });
    }
    const dateMidnight = new Date(date);

    // Calculate late minutes if checkIn provided
    let lateMins = 0;
    if (checkIn) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { customLateThresholdMinutes: true, attendanceExempt: true }
      });
      if (!emp?.attendanceExempt) {
        const ciDate = new Date(checkIn);
        // PKT offset: UTC+5
        const ciHour = (ciDate.getUTCHours() + 5) % 24;
        const ciMin = ciDate.getUTCMinutes();
        const checkInMinsPKT = ciHour * 60 + ciMin;
        const thresholdMins = emp?.customLateThresholdMinutes !== null && emp?.customLateThresholdMinutes !== undefined
          ? emp.customLateThresholdMinutes : 15;
        const lateThresholdMins = 18 * 60 + thresholdMins;
        if (checkInMinsPKT > lateThresholdMins) {
          lateMins = checkInMinsPKT - (18 * 60);
        }
      }
    }

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: dateMidnight } },
      create: {
        employeeId,
        date: dateMidnight,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'present',
        late: lateMins,
        note: note || 'Manual Punch by Admin'
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status: status || undefined,
        late: lateMins,
        note: note || 'Manual Punch by Admin'
      }
    });
    await logAudit(req.user.id, 'MANUAL_ATTENDANCE_PUNCH', 'Attendance', record.id, { employeeId, date, lateMins });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cron/auto-offmark
 * Auto off-mark: scan all non-exempt employees who have no check-in by 00:30 AM PKT
 * Called by Vercel Cron at 19:30 UTC (= 00:30 AM PKT, UTC+5)
 */
exports.autoOffMark = async (req, res, next) => {
  try {
    // Security: only allow from Vercel Cron (CRON_SECRET header) or internal
    const cronSecret = req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized cron request.' });
    }

    // Target date is "today" in PKT (UTC+5)
    const nowUtc = new Date();
    // Yesterday midnight PKT = today 19:00 UTC (00:00 PKT is previous day 19:00 UTC)
    // We want yesterday in PKT as the attendance date to mark
    const pktOffsetMs = 5 * 60 * 60 * 1000;
    const nowPKT = new Date(nowUtc.getTime() + pktOffsetMs);
    // Since cron fires at 00:30 AM PKT (just past midnight), the "today" date in PKT is the current PKT day
    const targetDatePKT = new Date(Date.UTC(
      nowPKT.getUTCFullYear(),
      nowPKT.getUTCMonth(),
      nowPKT.getUTCDate()
    ));
    // Convert back to UTC midnight of that date
    const targetDateUTC = new Date(targetDatePKT.getTime() - pktOffsetMs);

    // Get all non-exempt active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'active', attendanceExempt: false }
    });

    let markedCount = 0;
    const markedEmployees = [];

    for (const emp of employees) {
      // Check if they have a check-in or non-absent status for today
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: targetDateUTC
          }
        }
      });

      // If no record, or record exists but no check-in (and not leave/holiday/weekend)
      const shouldAutoMark = !existing || (
        !existing.checkIn &&
        !['leave', 'holiday', 'weekend', 'half_day'].includes(existing.status)
      );

      if (shouldAutoMark) {
        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date: targetDateUTC } },
          create: {
            employeeId: emp.id,
            date: targetDateUTC,
            status: 'absent',
            late: 0,
            note: 'Auto Off-Mark: No check-in by 00:30 AM cutoff'
          },
          update: {
            status: 'absent',
            note: 'Auto Off-Mark: No check-in by 00:30 AM cutoff'
          }
        });
        markedCount++;
        markedEmployees.push({ id: emp.id, fullName: emp.fullName, employeeCode: emp.employeeCode });
      }
    }

    console.log(`[AutoOffMark] Marked ${markedCount} employees as Absent for ${targetDateUTC.toISOString().split('T')[0]}`);
    res.json({
      success: true,
      date: targetDateUTC.toISOString().split('T')[0],
      markedAbsent: markedCount,
      employees: markedEmployees
    });
  } catch (err) {
    next(err);
  }
};

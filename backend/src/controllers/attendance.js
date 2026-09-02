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

    // Calculate late minutes based on shiftStart & graceMinutes
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    const shiftStart = emp?.shiftStart || '09:30';
    const [sh, sm] = shiftStart.split(':').map(Number);
    const shiftStartMins = sh * 60 + sm;
    const checkInMins = now.getHours() * 60 + now.getMinutes();
    const diff = checkInMins - shiftStartMins;
    const grace = emp?.graceMinutes !== undefined ? emp.graceMinutes : 15;
    
    let lateMins = 0;
    if (diff > grace) {
      lateMins = diff;
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
        note: 'HRIS Web Check-In'
      },
      update: {
        status,
        checkIn: now,
        late: lateMins,
        note: existing?.note ? `${existing.note} | Web Check-In` : 'HRIS Web Check-In'
      }
    });

    await logAudit(req.user.id, 'EMPLOYEE_CHECK_IN', 'Attendance', record.id, { checkIn: now });
    res.json({ message: 'Check-in recorded successfully', record });
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
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ error: 'Employee ID and Date are required.' });
    }
    const dateMidnight = new Date(date);
    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: dateMidnight } },
      create: {
        employeeId,
        date: dateMidnight,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'present',
        notes
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status: status || undefined,
        notes: notes || undefined
      }
    });
    await logAudit(req.user.id, 'MANUAL_ATTENDANCE_PUNCH', 'Attendance', record.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
};


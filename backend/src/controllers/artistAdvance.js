const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/audit');
const prisma = new PrismaClient();

const CEO_ADMIN_ROLES = ['Admin', 'CEO', 'COO'];

/**
 * Helper: push settlement notification to CEO/Admin users
 */
async function pushSettlementNotification(designerName, month, year, netPayable, userId) {
  try {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const admins = await prisma.user.findMany({
      where: { role: { in: CEO_ADMIN_ROLES }, isActive: true },
      select: { id: true }
    });
    await prisma.notification.createMany({
      data: admins.map(u => ({
        userId: u.id,
        title: `💰 Artist Salary Settlement — ${monthNames[month - 1]} ${year}`,
        message: `Net payable to ${designerName} on the 5th: PKR ${netPayable.toLocaleString()}. Review advances and confirm settlement.`,
        type: 'artist_settlement',
        link: '/dashboard/payout-requests',
        isRead: false
      }))
    });
  } catch (e) {
    console.error('[pushSettlementNotification] Failed:', e.message);
  }
}

/**
 * GET /api/artist-advances?employeeId=&month=&year=
 * CEO: sees all; Designer: sees only their own
 */
exports.getAdvances = async (req, res, next) => {
  try {
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);
    const isDesigner = req.user.role === 'Designer';

    if (!isCEOOrAdmin && !isDesigner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { month, year } = req.query;
    let { employeeId } = req.query;

    // Designers can only see their own advances
    if (isDesigner) {
      employeeId = req.user.employee?.id;
      if (!employeeId) return res.status(400).json({ error: 'No employee profile linked.' });
    }

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const advances = await prisma.artistAdvance.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, designation: true, baseSalary: true } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }]
    });

    res.json(advances);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/artist-advances/summary?employeeId=&month=&year=
 * Returns: baseSalary, totalAdvances, netPayable, advances[]
 * CEO can query any artist. Designer gets own.
 */
exports.getAdvanceSummary = async (req, res, next) => {
  try {
    const isCEOOrAdmin = CEO_ADMIN_ROLES.includes(req.user.role);
    const isDesigner = req.user.role === 'Designer';

    if (!isCEOOrAdmin && !isDesigner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date();
    let { employeeId, month, year } = req.query;
    month = parseInt(month) || (now.getMonth() + 1);
    year = parseInt(year) || now.getFullYear();

    if (isDesigner) {
      employeeId = req.user.employee?.id;
    }
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required.' });

    // Fetch employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, fullName: true, employeeCode: true, baseSalary: true, isArtist: true, attendanceExempt: true }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    // Fetch advances for this month
    const advances = await prisma.artistAdvance.findMany({
      where: { employeeId, month, year },
      orderBy: { createdAt: 'asc' }
    });

    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const netPayable = Math.max(0, employee.baseSalary - totalAdvances);

    // Settlement date: 5th of current/next month
    const settlementDate = new Date(year, month - 1, 5);
    if (settlementDate < now) {
      // Already past the 5th — show next month's
      settlementDate.setMonth(settlementDate.getMonth() + 1);
    }
    const daysToSettlement = Math.ceil((settlementDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      employee,
      month,
      year,
      baseSalary: employee.baseSalary,
      totalAdvances,
      netPayable,
      advances,
      settlementDate: settlementDate.toISOString(),
      daysToSettlement: Math.max(0, daysToSettlement)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/artist-advances/all-artists?month=&year=
 * CEO overview of ALL artists' salary cycles for a given month
 */
exports.getAllArtistsSummary = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'CEO/Admin only.' });
    }

    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    // Get all active artists/designers
    const artists = await prisma.employee.findMany({
      where: {
        status: 'active',
        OR: [
          { isArtist: true },
          { attendanceExempt: true },
          { user: { role: 'Designer' } }
        ]
      },
      include: {
        user: { select: { role: true } },
        artistAdvances: {
          where: { month, year }
        }
      }
    });

    const summaries = artists.map(emp => {
      const totalAdvances = emp.artistAdvances.reduce((s, a) => s + a.amount, 0);
      const netPayable = Math.max(0, emp.baseSalary - totalAdvances);
      return {
        id: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
        baseSalary: emp.baseSalary,
        totalAdvances,
        netPayable,
        advanceCount: emp.artistAdvances.length,
        advances: emp.artistAdvances
      };
    });

    res.json({ month, year, artists: summaries });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/artist-advances
 * CEO logs a new mid-month advance draw for a Designer
 */
exports.createAdvance = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEO/Admin can log artist advances.' });
    }

    const { employeeId, month, year, amount, note } = req.body;
    if (!employeeId || !month || !year || amount === undefined) {
      return res.status(400).json({ error: 'employeeId, month, year, and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number (PKR).' });
    }

    // Verify target is an artist/designer
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, fullName: true, baseSalary: true, isArtist: true, attendanceExempt: true, user: { select: { role: true } } }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    if (employee.user?.role !== 'Designer' && !employee.isArtist && !employee.attendanceExempt) {
      return res.status(400).json({ error: 'This employee is not a Designer/Artist. Only Artists have the monthly advance cycle.' });
    }

    // Guard: total advances cannot exceed base salary
    const existingAdvances = await prisma.artistAdvance.aggregate({
      _sum: { amount: true },
      where: { employeeId, month: parseInt(month), year: parseInt(year) }
    });
    const totalSoFar = existingAdvances._sum.amount || 0;
    if (totalSoFar + parsedAmount > employee.baseSalary) {
      return res.status(400).json({
        error: `Total advances (PKR ${(totalSoFar + parsedAmount).toLocaleString()}) would exceed base salary (PKR ${employee.baseSalary.toLocaleString()}). Net payable cannot go negative.`
      });
    }

    const advance = await prisma.artistAdvance.create({
      data: {
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        amount: parsedAmount,
        note: note || null,
        enteredById: req.user.id
      },
      include: {
        employee: { select: { fullName: true, employeeCode: true, baseSalary: true } }
      }
    });

    await logAudit(req.user.id, 'CREATE_ARTIST_ADVANCE', 'ArtistAdvance', advance.id, {
      employeeId, month, year, amount: parsedAmount
    });

    res.status(201).json(advance);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/artist-advances/:id
 * CEO removes an incorrectly entered advance
 */
exports.deleteAdvance = async (req, res, next) => {
  try {
    if (!CEO_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEO/Admin can remove advance entries.' });
    }

    const { id } = req.params;
    const advance = await prisma.artistAdvance.findUnique({ where: { id } });
    if (!advance) return res.status(404).json({ error: 'Advance entry not found.' });

    await prisma.artistAdvance.delete({ where: { id } });
    await logAudit(req.user.id, 'DELETE_ARTIST_ADVANCE', 'ArtistAdvance', id, { amount: advance.amount });

    res.json({ message: 'Advance entry removed successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cron/artist-settlement-reminder (called from vercel cron on 5th of month)
 * Pushes settlement notification to CEO for each artist
 */
exports.settlementReminder = async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const now = new Date();
    const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const month = pktNow.getUTCMonth() + 1;
    const year = pktNow.getUTCFullYear();

    const artists = await prisma.employee.findMany({
      where: { status: 'active', OR: [{ isArtist: true }, { attendanceExempt: true }, { user: { role: 'Designer' } }] },
      include: {
        artistAdvances: { where: { month, year } }
      }
    });

    const ceoAdmins = await prisma.user.findMany({
      where: { role: { in: CEO_ADMIN_ROLES }, isActive: true },
      select: { id: true }
    });

    const notifData = [];
    for (const artist of artists) {
      const totalAdvances = artist.artistAdvances.reduce((s, a) => s + a.amount, 0);
      const netPayable = Math.max(0, artist.baseSalary - totalAdvances);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      for (const admin of ceoAdmins) {
        notifData.push({
          userId: admin.id,
          title: `💰 Settlement Due — ${artist.fullName}`,
          message: `${monthNames[month - 1]} ${year} settlement: Base PKR ${artist.baseSalary.toLocaleString()} − Advances PKR ${totalAdvances.toLocaleString()} = Net PKR ${netPayable.toLocaleString()}`,
          type: 'artist_settlement',
          link: '/dashboard/payout-requests',
          isRead: false
        });
      }
    }

    if (notifData.length > 0) {
      await prisma.notification.createMany({ data: notifData });
    }

    console.log(`[ArtistSettlement] Sent ${notifData.length} settlement notifications for ${month}/${year}`);
    res.json({ success: true, month, year, notificationsSent: notifData.length, artistCount: artists.length });
  } catch (err) {
    next(err);
  }
};

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/audit');
const { sendMail } = require('../utils/mailer');

const prisma = new PrismaClient();

// ==============================================================================
// Teams / Campaigns Metadata for filters and forms
// ==============================================================================
exports.getTeams = async (req, res, next) => {
  try {
    const where = { status: 'active' };

    // Role restriction: Team Leads can only see campaigns they actively lead
    if (req.user.role === 'Team Lead' && req.user.employee?.id) {
      where.members = {
        some: { employeeId: req.user.employee.id, role: 'team_lead', status: 'active' }
      };
    }

    // Role restriction: SDRs & standard Employees can only see campaigns they are members of
    if (['Employee'].includes(req.user.role) && req.user.employee?.id) {
      where.members = {
        some: { employeeId: req.user.employee.id, status: 'active' }
      };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      select: { id: true, name: true }
    });
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
};

// ==============================================================================
// Employees
// ==============================================================================

exports.getEmployees = async (req, res, next) => {
  try {
    const { campaignId, status, search } = req.query;

    const where = {};
    if (campaignId) {
      where.campaignMembers = {
        some: { campaignId, status: 'active' }
      };
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Role restriction: Team Lead can only see employees in campaigns they actively lead, plus themselves
    if (req.user.role === 'Team Lead' && req.user.employee?.id) {
      const ledCampaigns = await prisma.campaignMember.findMany({
        where: { employeeId: req.user.employee.id, role: 'team_lead', status: 'active' },
        select: { campaignId: true }
      });
      const campaignIds = ledCampaigns.map(c => c.campaignId);
      where.OR = [
        { id: req.user.employee.id },
        {
          campaignMembers: {
            some: { campaignId: { in: campaignIds }, status: 'active' }
          }
        }
      ];
    }

    // Role restriction: SDR & Employee can only see their own record
    if (['Employee'].includes(req.user.role) && req.user.employee?.id) {
      where.id = req.user.employee.id;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: { email: true, role: true, isActive: true }
        },
        campaignMembers: {
          where: { status: 'active' },
          include: { campaign: true }
        },
        manager: {
          select: { id: true, fullName: true, designation: true }
        }
      },
      orderBy: { employeeCode: 'asc' }
    });

    const mapped = employees.map(emp => ({
      ...emp,
      team: emp.campaignMembers?.[0]?.campaign || null,
      teams: emp.campaignMembers.map(m => m.campaign)
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Standard employees and SDRs can only view their own details
    if (['Employee'].includes(req.user.role) && req.user.employee?.id !== id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Team Leads can only view their own details or employees on their led campaigns
    if (req.user.role === 'Team Lead' && req.user.employee?.id !== id) {
      const ledCampaigns = await prisma.campaignMember.findMany({
        where: { employeeId: req.user.employee?.id, role: 'team_lead', status: 'active' },
        select: { campaignId: true }
      });
      const campaignIds = ledCampaigns.map(c => c.campaignId);
      
      const isMemberOfLedCampaign = await prisma.campaignMember.findFirst({
        where: {
          employeeId: id,
          campaignId: { in: campaignIds },
          status: 'active'
        }
      });

      if (!isMemberOfLedCampaign) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true, role: true, isActive: true }
        },
        campaignMembers: {
          where: { status: 'active' },
          include: { campaign: true }
        },
        manager: {
          select: { id: true, fullName: true, designation: true }
        },
        salaryHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      ...employee,
      team: employee.campaignMembers?.[0]?.campaign || null,
      teams: employee.campaignMembers.map(m => m.campaign)
    });
  } catch (err) {
    next(err);
  }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role,
      employeeCode,
      fullName,
      designation,
      department,
      managerId,
      birthday,
      baseSalary,
      currency,
      phone,
      bankAccount,
      emergencyContact,
      shiftStart,
      shiftEnd,
      zkUserId,
      graceMinutes,
      teamId
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if employee code already exists
    const existingCode = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existingCode) {
      return res.status(400).json({ error: 'Employee code already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'ArtXenith2026!', salt);

    // Create user and employee in a single transaction
    const newEmployee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: role || 'Employee',
          mustChangePassword: true
        }
      });

      const isDesignerRole = (role === 'Designer') || (designation || '').toLowerCase().includes('designer') || (designation || '').toLowerCase().includes('artist');

      const emp = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          fullName,
          designation,
          department: department || (isDesignerRole ? 'Design' : 'Sales'),
          managerId: managerId || null,
          baseSalary: parseFloat(baseSalary) || 0,
          currency: currency || 'PKR',
          phone: phone || null,
          birthday: birthday || null,
          bankAccount: bankAccount || null,
          emergencyContact: emergencyContact || null,
          shiftStart: shiftStart || '18:00',
          shiftEnd: shiftEnd || '00:30',
          graceMinutes: graceMinutes !== undefined ? parseInt(graceMinutes) : 15,
          zkUserId: zkUserId || null,
          isArtist: isDesignerRole,
          attendanceExempt: isDesignerRole
        },
        include: {
          user: { select: { email: true, role: true } },
          campaignMembers: {
            where: { status: 'active' },
            include: { campaign: true }
          }
        }
      });

      const finalRole = role || 'Employee';
      const memberRole = (finalRole === 'Team Lead' || finalRole === 'Admin' || finalRole === 'CEO' || finalRole === 'COO') ? 'team_lead' : 'sdr';

      const selectedTeams = req.body.teamIds || (teamId ? [teamId] : []);
      for (const tId of selectedTeams) {
        await tx.campaignMember.create({
          data: {
            campaignId: tId,
            employeeId: emp.id,
            role: memberRole,
            status: 'active'
          }
        });
      }

      // Log initial salary history
      await tx.salaryHistory.create({
        data: {
          employeeId: emp.id,
          newSalary: parseFloat(baseSalary) || 0,
          reason: 'Initial Salary Setup',
          effectiveDate: new Date()
        }
      });

      // Refetch employee with fresh campaign member details inside transaction to be clean
      const freshEmp = await tx.employee.findUnique({
        where: { id: emp.id },
        include: {
          user: { select: { email: true, role: true } },
          campaignMembers: {
            where: { status: 'active' },
            include: { campaign: true }
          }
        }
      });

      return freshEmp;
    });

    await logAudit(req.user.id, 'CREATE_EMPLOYEE', 'Employee', newEmployee.id, { fullName, employeeCode });
    
    res.status(201).json({
      ...newEmployee,
      team: newEmployee.campaignMembers?.[0]?.campaign || null
    });
  } catch (err) {
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Restriction: Non-admin roles (Employee, SDR, Team Lead) can only edit some fields of their own profile
    if (['Employee', 'Team Lead'].includes(req.user.role)) {
      if (req.user.employee?.id !== id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      // Limit fields normal employee can change
      const allowedSelfUpdates = {
        phone: updates.phone,
        birthday: updates.birthday,
        emergencyContact: updates.emergencyContact,
        bankAccount: updates.bankAccount
      };
      const updated = await prisma.employee.update({
        where: { id },
        data: allowedSelfUpdates
      });
      await logAudit(req.user.id, 'SELF_UPDATE_EMPLOYEE', 'Employee', id, allowedSelfUpdates);
      return res.json(updated);
    }

    // HR / Admin update flow
    const currentEmp = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!currentEmp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updatedEmployee = await prisma.$transaction(async (tx) => {
      // 1. Update user table fields if provided
      if (updates.email || updates.role || updates.isActive !== undefined) {
        await tx.user.update({
          where: { id: currentEmp.userId },
          data: {
            email: updates.email,
            role: updates.role,
            isActive: updates.isActive
          }
        });
      }

      // 2. Log salary changes in salaryHistory if base salary changes
      if (updates.baseSalary !== undefined && parseFloat(updates.baseSalary) !== currentEmp.baseSalary) {
        await tx.salaryHistory.create({
          data: {
            employeeId: id,
            oldSalary: currentEmp.baseSalary,
            newSalary: parseFloat(updates.baseSalary),
            reason: updates.salaryChangeReason || 'Salary updated by Admin',
            effectiveDate: updates.salaryChangeEffectiveDate ? new Date(updates.salaryChangeEffectiveDate) : new Date()
          }
        });
      }

      // 3. Handle Campaign Member changes if teamId is provided
      // 3. Handle Campaign Member changes if teamId or teamIds is provided
      if (updates.teamIds !== undefined || updates.teamId !== undefined) {
        const selectedTeams = updates.teamIds || (updates.teamId ? [updates.teamId] : []);

        // Deactivate active campaigns that are not in the selected list
        await tx.campaignMember.updateMany({
          where: {
            employeeId: id,
            status: 'active',
            campaignId: { notIn: selectedTeams }
          },
          data: { status: 'inactive' }
        });

        const finalRole = updates.role || currentEmp.user.role;
        const memberRole = (finalRole === 'Team Lead' || finalRole === 'Admin' || finalRole === 'CEO' || finalRole === 'COO') ? 'team_lead' : 'sdr';

        for (const tId of selectedTeams) {
          const existing = await tx.campaignMember.findUnique({
            where: {
              campaignId_employeeId: {
                campaignId: tId,
                employeeId: id
              }
            }
          });

          if (existing) {
            await tx.campaignMember.update({
              where: { id: existing.id },
              data: { status: 'active', role: memberRole }
            });
          } else {
            await tx.campaignMember.create({
              data: {
                campaignId: tId,
                employeeId: id,
                role: memberRole,
                status: 'active'
              }
            });
          }
        }
      }

      // 4. Update employee fields
      const emp = await tx.employee.update({
        where: { id },
        data: {
          fullName: updates.fullName,
          designation: updates.designation,
          managerId: updates.managerId,
          baseSalary: updates.baseSalary ? parseFloat(updates.baseSalary) : undefined,
          currency: updates.currency,
          phone: updates.phone,
          birthday: updates.birthday,
          bankAccount: updates.bankAccount,
          emergencyContact: updates.emergencyContact,
          shiftStart: updates.shiftStart,
          shiftEnd: updates.shiftEnd,
          graceMinutes: updates.graceMinutes !== undefined ? parseInt(updates.graceMinutes) : undefined,
          zkUserId: updates.zkUserId,
          status: updates.status
        },
        include: {
          user: { select: { email: true, role: true, isActive: true } },
          campaignMembers: {
            where: { status: 'active' },
            include: { campaign: true }
          }
        }
      });

      // Refetch employee with fresh relation details
      const freshEmp = await tx.employee.findUnique({
        where: { id },
        include: {
          user: { select: { email: true, role: true, isActive: true } },
          campaignMembers: {
            where: { status: 'active' },
            include: { campaign: true }
          }
        }
      });

      return freshEmp;
    });

    await logAudit(req.user.id, 'UPDATE_EMPLOYEE', 'Employee', id, updates);
    
    res.json({
      ...updatedEmployee,
      team: updatedEmployee.campaignMembers?.[0]?.campaign || null
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Cascade hard-delete all related data in a transaction
    await prisma.$transaction([
      prisma.salaryHistory.deleteMany({ where: { employeeId: id } }),
      prisma.campaignMember.deleteMany({ where: { employeeId: id } }),
      prisma.campaignPerformance.deleteMany({ where: { employeeId: id } }),
      prisma.spiff.deleteMany({ where: { employeeId: id } }),
      prisma.attendance.deleteMany({ where: { employeeId: id } }),
      prisma.leaveRequest.deleteMany({ where: { employeeId: id } }),
      prisma.halfdayRequest.deleteMany({ where: { employeeId: id } }),
      prisma.wfhRequest.deleteMany({ where: { employeeId: id } }),
      prisma.loanRequest.deleteMany({ where: { employeeId: id } }),
      prisma.payslip.deleteMany({ where: { employeeId: id } }),
      prisma.document.deleteMany({ where: { employeeId: id } }),
      prisma.employee.delete({ where: { id } }),
      prisma.user.delete({ where: { id: emp.userId } })
    ]);

    await logAudit(req.user.id, 'DELETE_EMPLOYEE', 'Employee', id, { fullName: emp.fullName, employeeCode: emp.employeeCode });
    res.json({ message: 'Employee and all associated records deleted permanently.' });
  } catch (err) {
    next(err);
  }
};

exports.terminateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const emp = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Set employee status to terminated and user to inactive
    await prisma.$transaction([
      prisma.user.update({
        where: { id: emp.userId },
        data: { isActive: false }
      }),
      prisma.employee.update({
        where: { id },
        data: { status: 'terminated' }
      })
    ]);

    // Send termination email
    const subject = 'Employment Termination Notice - ArtXenith';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded-xl;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Employment Termination Notice</h2>
        <p>Dear <strong>${emp.fullName}</strong>,</p>
        <p>We are writing to officially inform you that your employment with <strong>ArtXenith</strong> has been terminated, effective immediately.</p>
        <p>Consequently, your credentials and user access to the ArtXenith HRIS portal have been deactivated.</p>
        <p>For any inquiries regarding your final settlement, unpaid salary clearance, or return of company properties, please reach out to the HR department directly at <a href="mailto:hr@artxenith.com">hr@artxenith.com</a>.</p>
        <p>We appreciate the time you spent with us and wish you the best in your future endeavors.</p>
        <br/>
        <p>Sincerely,</p>
        <p><strong>HR Department</strong><br/>ArtXenith</p>
      </div>
    `;

    // Attempt to send email; if email credentials aren't set up yet, it'll gracefully log warning
    await sendMail({
      to: emp.user.email,
      subject,
      html
    });

    await logAudit(req.user.id, 'TERMINATE_EMPLOYEE', 'Employee', id);
    res.json({ message: 'Employee terminated successfully. Notification email dispatched.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/employees/sales-executive/earnings
 * Calculates monthly earnings breakdown for Sales Executive in hybrid currency
 */
exports.getSalesExecutiveEarnings = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.query;
    const targetEmpId = employeeId || req.user.employee?.id;

    if (!targetEmpId) {
      return res.status(400).json({ error: 'No employee linked.' });
    }

    const emp = await prisma.employee.findUnique({
      where: { id: targetEmpId },
      select: { id: true, fullName: true, baseSalary: true, commissionPercentage: true }
    });

    if (!emp) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const curDate = new Date();
    const qMonth = month ? parseInt(month) : curDate.getUTCMonth() + 1;
    const qYear = year ? parseInt(year) : curDate.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(qYear, qMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(qYear, qMonth, 0, 23, 59, 59));

    // Fetch active exchange rate
    const rateSetting = await prisma.systemSetting.findUnique({ where: { key: 'usdToPkrRate' } });
    const usdToPkrRate = rateSetting ? (parseFloat(rateSetting.value) || 280) : 280;

    // Fetch sales for this month
    const sales = await prisma.sale.findMany({
      where: {
        employeeId: targetEmpId,
        saleDate: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const totalSalesUsd = sales.reduce((sum, s) => sum + s.saleAmount, 0);
    const totalReceivingsUsd = sales.reduce((sum, s) => sum + s.amountReceived, 0);
    const totalRemainingReceivingsUsd = sales.reduce((sum, s) => sum + s.remainingAmount, 0);
    const totalCommissionEarnedUsd = sales.reduce((sum, s) => sum + s.salesCommissionUsd, 0);

    const baseSalaryPkr = emp.baseSalary; // Always PKR
    const commissionPkr = totalCommissionEarnedUsd * usdToPkrRate;
    const totalEstimatedEarningsPkr = baseSalaryPkr + commissionPkr;

    // Check salary payments for this month
    const salaryPayment = await prisma.salaryPayment.findFirst({
      where: {
        employeeId: targetEmpId,
        periodMonth: qMonth,
        periodYear: qYear
      }
    });

    const paidAmountPkr = salaryPayment ? salaryPayment.amountPaid : 0;
    const remainingAmountPkr = Math.max(0, totalEstimatedEarningsPkr - paidAmountPkr);

    res.json({
      employeeId: emp.id,
      fullName: emp.fullName,
      month: qMonth,
      year: qYear,
      baseSalaryPkr,
      commissionPercentage: emp.commissionPercentage,
      totalSalesUsd,
      totalReceivingsUsd,
      totalRemainingReceivingsUsd,
      totalCommissionEarnedUsd,
      usdToPkrRate,
      commissionPkr,
      totalEstimatedEarningsPkr,
      paidAmountPkr,
      remainingAmountPkr
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/employees/designer/projects
 * Workspace endpoint for Designer Portal showing assigned projects, stages, & conditional payment info
 */
exports.getDesignerPortalData = async (req, res, next) => {
  try {
    const { designerId, search } = req.query;
    const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(req.user.role);
    const targetDesignerId = designerId || req.user.employee?.id;

    if (!targetDesignerId) {
      return res.status(400).json({ error: 'No designer employee linked.' });
    }

    // Check CEO setting for designer payment visibility
    const showPaySetting = await prisma.systemSetting.findUnique({ where: { key: 'showDesignerPayments' } });
    const showDesignerPayments = isCEOOrAdmin || (showPaySetting ? showPaySetting.value === 'true' : false);

    const where = { designerId: targetDesignerId };
    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.sale.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        briefs: { orderBy: { version: 'desc' } },
        stageLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const totalAssigned = projects.length;
    const completed = projects.filter(p => p.projectStage === 'Final Artwork').length;
    const inProgress = totalAssigned - completed;

    const totalEarnedUsd = projects.reduce((sum, p) => sum + (p.designerFee || 0), 0);
    const totalPaidUsd = projects.reduce((sum, p) => sum + (p.amountPaidToDesigner || 0), 0);
    const totalRemainingUsd = Math.max(0, totalEarnedUsd - totalPaidUsd);

    const sanitizedProjects = projects.map(p => {
      const pData = {
        id: p.id,
        projectNumber: p.projectNumber,
        clientName: p.clientName,
        projectName: p.projectName,
        projectStage: p.projectStage,
        stageUpdatedAt: p.stageUpdatedAt,
        briefStatus: p.briefStatus,
        notes: p.notes,
        employee: p.employee,
        briefs: p.briefs,
        stageLogs: p.stageLogs
      };

      if (showDesignerPayments) {
        pData.designerFee = p.designerFee;
        pData.amountPaidToDesigner = p.amountPaidToDesigner;
        pData.remainingDesignerPayment = Math.max(0, p.designerFee - p.amountPaidToDesigner);
      }

      return pData;
    });

    res.json({
      showDesignerPayments,
      metrics: {
        totalAssigned,
        inProgress,
        completed,
        financials: showDesignerPayments ? {
          totalEarnedUsd,
          totalPaidUsd,
          totalRemainingUsd
        } : null
      },
      projects: sanitizedProjects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/employees/import
 * Bulk import/seed employees from CSV/Excel data
 */
exports.importEmployees = async (req, res, next) => {
  try {
    if (!['Admin', 'CEO', 'COO'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Admin/CEO/COO can bulk import employee data.' });
    }

    const { employees: rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of employee objects in "employees" field.' });
    }

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      errors: []
    };

    const salt = await bcrypt.genSalt(10);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;

      try {
        const employeeCode = (row.employeeCode || row['Employee Code'] || `EMP-${100 + i}`).trim();
        const fullName = (row.fullName || row['Full Name'] || '').trim();
        const email = (row.email || row['Email Address'] || '').trim().toLowerCase();
        const password = row.password || row['Password'] || 'xenith@123';
        const role = (row.role || row['Role'] || 'Employee').trim();
        const designation = (row.designation || row['Designation'] || 'Employee').trim();
        const department = (row.department || row['Department'] || 'Operations').trim();
        const baseSalary = parseFloat(row.baseSalary || row['Basic Salary (PKR)'] || row['Basic Salary'] || 0);
        const commissionPercentage = parseFloat(row.commissionPercentage || row['Sales Commission (%)'] || row['Commission'] || 0);
        const phone = (row.phone || row['Phone Number'] || '').trim();
        const bankAccount = (row.bankAccount || row['Bank Account / IBAN'] || row['Bank Account'] || '').trim();
        const shiftStart = (row.shiftStart || row['Shift Start'] || '18:00').trim();
        const shiftEnd = (row.shiftEnd || row['Shift End'] || '23:59').trim();
        const joiningDateStr = row.joiningDate || row['Joining Date (YYYY-MM-DD)'] || row['Joining Date'];

        if (!fullName || !email) {
          results.errors.push({ line: lineNum, employeeCode, error: 'Missing Full Name or Email Address' });
          continue;
        }

        const isDesigner = role === 'Designer' || designation.toLowerCase().includes('designer') || designation.toLowerCase().includes('artist');
        const isSalesExec = role === 'Sales Executive' || designation.toLowerCase().includes('sales');

        const passwordHash = await bcrypt.hash(password, salt);
        let joiningDate = null;
        if (joiningDateStr) {
          const d = new Date(joiningDateStr);
          if (!isNaN(d.getTime())) joiningDate = d;
        }

        // Check existing user by email
        let existingUser = await prisma.user.findUnique({ where: { email } });
        let userId = existingUser?.id;

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role }
          });
        } else {
          const newUser = await prisma.user.create({
            data: {
              email,
              passwordHash,
              role,
              mustChangePassword: false
            }
          });
          userId = newUser.id;
        }

        // Check existing employee by code or userId
        let existingEmp = await prisma.employee.findFirst({
          where: { OR: [{ employeeCode }, { userId }] }
        });

        const empData = {
          employeeCode,
          fullName,
          designation,
          department,
          baseSalary,
          commissionPercentage,
          phone: phone || null,
          bankAccount: bankAccount || null,
          shiftStart,
          shiftEnd,
          joiningDate: joiningDate || new Date(),
          isArtist: isDesigner,
          attendanceExempt: isDesigner
        };

        if (existingEmp) {
          await prisma.employee.update({
            where: { id: existingEmp.id },
            data: empData
          });
          results.updated++;
        } else {
          await prisma.employee.create({
            data: {
              ...empData,
              userId
            }
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ line: lineNum, error: err.message });
      }
    }

    await logAudit(req.user.id, 'BULK_IMPORT_EMPLOYEES', 'Employee', 'bulk', {
      total: results.total,
      created: results.created,
      updated: results.updated
    });

    res.json({
      message: `Employee seed completed: ${results.created} created, ${results.updated} updated.`,
      results
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/employees/:id/reset-password
 * CEO / Admin resets password or updates login credentials for an Artist / Employee
 */
exports.resetEmployeeCredentials = async (req, res, next) => {
  try {
    if (!['Admin', 'CEO', 'COO'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only CEO/Admin can manage employee login credentials.' });
    }

    const { id } = req.params;
    const { password, email, role, isActive } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!employee || !employee.userId) {
      return res.status(404).json({ error: 'Employee or linked user account not found.' });
    }

    const userUpdates = {};
    if (email) userUpdates.email = email.toLowerCase().trim();
    if (role) userUpdates.role = role;
    if (isActive !== undefined) userUpdates.isActive = Boolean(isActive);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      userUpdates.passwordHash = await bcrypt.hash(password, salt);
      userUpdates.mustChangePassword = false;
    }

    const updatedUser = await prisma.user.update({
      where: { id: employee.userId },
      data: userUpdates,
      select: { id: true, email: true, role: true, isActive: true, updatedAt: true }
    });

    // If role updated to Designer, also sync isArtist / attendanceExempt
    if (role) {
      const isDesigner = role === 'Designer';
      await prisma.employee.update({
        where: { id },
        data: {
          isArtist: isDesigner,
          attendanceExempt: isDesigner
        }
      });
    }

    await logAudit(req.user.id, 'RESET_EMPLOYEE_CREDENTIALS', 'User', employee.userId, {
      employeeCode: employee.employeeCode,
      email: updatedUser.email,
      role: updatedUser.role,
      passwordChanged: Boolean(password)
    });

    res.json({
      message: `Login credentials updated for ${employee.fullName}.`,
      user: updatedUser,
      employee: { id: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode }
    });
  } catch (err) {
    next(err);
  }
};



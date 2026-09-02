const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function importEmployees(csvFilePath) {
  const filePath = csvFilePath || path.join(__dirname, '../../../employee_import_template.csv');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSV file not found at: ${filePath}`);
    process.exit(1);
  }

  console.log(`[Import] Processing employee CSV from: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.log('⚠️ CSV file contains no data rows.');
    return;
  }

  // Parse Header
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  console.log('[Import] Headers detected:', headers);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 1; i < lines.length; i++) {
    // Parse CSV row supporting quoted fields
    const rowValues = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanRow = rowValues.map(v => v.replace(/^"|"$/g, '').trim());

    const empCode = cleanRow[0];
    const fullName = cleanRow[1];
    const email = cleanRow[2]?.toLowerCase();
    const password = cleanRow[3] || 'xenith@12';
    const role = cleanRow[4] || 'Employee';
    const designation = cleanRow[5] || 'Employee';
    const department = cleanRow[6] || 'Operations';
    const baseSalary = parseFloat(cleanRow[7]) || 0;
    const commissionPercentage = parseFloat(cleanRow[8]) || 0;
    const phone = cleanRow[9] || '';
    const bankAccount = cleanRow[10] || '';
    const shiftStart = cleanRow[11] || '09:30';
    const shiftEnd = cleanRow[12] || '18:30';
    const joiningDateStr = cleanRow[13];

    if (!email || !fullName) {
      console.log(`⚠️ Skipping row ${i}: Missing email or name`);
      skipCount++;
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : new Date();

    // Check existing User
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { employee: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: ['Admin', 'CEO', 'COO', 'Team Lead', 'Employee'].includes(role) ? role : 'Employee',
          mustChangePassword: false,
          isActive: true
        }
      });
      console.log(`[Import] Created User: ${email}`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: ['Admin', 'CEO', 'COO', 'Team Lead', 'Employee'].includes(role) ? role : user.role,
          isActive: true
        }
      });
      console.log(`[Import] Updated User: ${email}`);
    }

    // Upsert Employee profile
    if (!user.employee) {
      const codeToUse = empCode || `EMP-${String(i).padStart(3, '0')}`;
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeCode: codeToUse,
          fullName,
          designation,
          department,
          baseSalary,
          currency: 'PKR',
          commissionPercentage,
          phone,
          bankAccount,
          shiftStart,
          shiftEnd,
          joiningDate,
          status: 'active'
        }
      });
      console.log(`[Import] Created Employee Profile for: ${fullName} (${codeToUse})`);
    } else {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          fullName,
          designation,
          department,
          baseSalary,
          commissionPercentage,
          phone,
          bankAccount,
          shiftStart,
          shiftEnd,
          status: 'active'
        }
      });
      console.log(`[Import] Updated Employee Profile for: ${fullName}`);
    }

    successCount++;
  }

  console.log(`\n🎉 CSV Import Completed! Successfully processed ${successCount} employees (Skipped: ${skipCount}).`);
}

const csvArg = process.argv[2];
importEmployees(csvArg)
  .catch((err) => {
    console.error('❌ Error during import:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

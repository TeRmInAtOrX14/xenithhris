const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const employeesToSeed = [
  {
    employeeCode: 'EMP-001',
    fullName: 'Subu Ahad',
    email: 'subuahad1@gmail.com',
    password: 'xenith@12',
    role: 'CEO',
    designation: 'CEO & Founder',
    department: 'Executive',
    baseSalary: 0,
    commissionPercentage: 0,
    phone: '3151057817',
    bankAccount: 'PK00MEZN0000000000000000',
    shiftStart: '18:00',
    shiftEnd: '23:59',
    joiningDate: new Date('2024-01-01'),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-002',
    fullName: 'Anas Ahmed',
    email: 'anasahmyd16@gmail.com',
    password: 'xenith@12',
    role: 'Team Lead',
    designation: 'Sales Team Lead',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 15,
    phone: '923342403058',
    bankAccount: 'PK45UNIL0109000336976912',
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date('2024-05-01'),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-003',
    fullName: 'Adeen Afzal',
    email: 'adeenafzal16@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 25,
    phone: '923128890865',
    bankAccount: 'PK69MEZN0001530107153013',
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date('2024-03-01'),
    customLateThresholdMinutes: 45, // Late threshold > 18:45 (6:45 PM)
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-004',
    fullName: 'Usama Riyaz',
    email: 'riazusama145@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 20,
    phone: '923152832488',
    bankAccount: 'PK50MEZN0000300112192804',
    shiftStart: '18:00',
    shiftEnd: '23:30',
    joiningDate: new Date('2024-10-22'),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-005',
    fullName: 'Ahmed Ali',
    email: 'ahmedali9502918@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 20,
    phone: '923089502918',
    bankAccount: null,
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date('2024-10-22'),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-006',
    fullName: 'Muhammad Safiullah Khan',
    email: 'muhsafiullahkhan@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 20,
    phone: '923233778770',
    bankAccount: null,
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date(),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-007',
    fullName: 'Muhammad Umar',
    email: 'bunny.og2003@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 0,
    phone: '923226358318',
    bankAccount: null,
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date(),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-008',
    fullName: 'Taha Asrar',
    email: 'tahaasrar9@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 30,
    phone: '923122797269',
    bankAccount: null,
    shiftStart: '18:00',
    shiftEnd: '00:30',
    joiningDate: new Date(),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  },
  {
    employeeCode: 'EMP-009',
    fullName: 'Muhammad Visam Khan',
    email: 'visamkhan73@gmail.com',
    password: 'xenith@12',
    role: 'Sales Executive',
    designation: 'Sales Executive',
    department: 'Sales',
    baseSalary: 0,
    commissionPercentage: 15,
    phone: '923191073405',
    bankAccount: null,
    shiftStart: '18:00',
    shiftEnd: '00:00',
    joiningDate: new Date(),
    customLateThresholdMinutes: null,
    attendanceExempt: false
  }
];

async function seed() {
  console.log('Updating employees in database with new phone numbers...');
  const salt = await bcrypt.genSalt(10);

  for (const emp of employeesToSeed) {
    const passwordHash = await bcrypt.hash(emp.password, salt);

    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: emp.email.toLowerCase() },
      create: {
        email: emp.email.toLowerCase(),
        passwordHash,
        role: emp.role,
        mustChangePassword: false,
        isActive: true
      },
      update: {
        passwordHash,
        role: emp.role,
        isActive: true
      }
    });

    // Upsert Employee
    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        designation: emp.designation,
        department: emp.department,
        baseSalary: emp.baseSalary,
        commissionPercentage: emp.commissionPercentage,
        phone: emp.phone,
        bankAccount: emp.bankAccount,
        shiftStart: emp.shiftStart,
        shiftEnd: emp.shiftEnd,
        joiningDate: emp.joiningDate,
        customLateThresholdMinutes: emp.customLateThresholdMinutes,
        attendanceExempt: emp.attendanceExempt
      },
      update: {
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        designation: emp.designation,
        department: emp.department,
        baseSalary: emp.baseSalary,
        commissionPercentage: emp.commissionPercentage,
        phone: emp.phone,
        bankAccount: emp.bankAccount,
        shiftStart: emp.shiftStart,
        shiftEnd: emp.shiftEnd,
        customLateThresholdMinutes: emp.customLateThresholdMinutes,
        attendanceExempt: emp.attendanceExempt
      }
    });

    console.log(`✅ Updated: ${emp.fullName} | Phone: ${emp.phone}`);
  }

  console.log('🎉 Employee records successfully updated with exact phone numbers!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

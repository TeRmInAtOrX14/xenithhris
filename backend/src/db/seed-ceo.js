const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding Admin/CEO credentials for ArtXenith...');

  const ceoEmail = 'subuahad1@gmail.com';
  const ceoPassword = 'xenith@12';
  const ceoName = 'Subu Ahad';

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ceoPassword, salt);

  // Check if User exists
  let user = await prisma.user.findUnique({
    where: { email: ceoEmail }
  });

  if (!user) {
    console.log(`[Seed] Creating CEO User account: ${ceoEmail}`);
    user = await prisma.user.create({
      data: {
        email: ceoEmail,
        passwordHash,
        role: 'CEO',
        mustChangePassword: false,
        isActive: true
      }
    });

    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: 'EMP-001',
        fullName: ceoName,
        designation: 'CEO & Founder',
        status: 'active',
        baseSalary: 0,
        currency: 'PKR',
        shiftStart: '09:30',
        shiftEnd: '18:30'
      }
    });
    console.log(`[Seed] CEO user created successfully!`);
  } else {
    console.log(`[Seed] Updating password and role for existing CEO user: ${ceoEmail}`);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        role: 'CEO',
        mustChangePassword: false,
        isActive: true
      }
    });
    console.log(`[Seed] CEO credentials updated successfully!`);
  }
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding CEO user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

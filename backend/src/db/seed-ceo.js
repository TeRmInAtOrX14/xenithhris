const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding Admin/CEO credentials for ArtXenith...');

  const accounts = [
    { email: 'subuahad1@gmail.com', name: 'Subu Ahad', role: 'CEO', code: 'EMP-001' },
    { email: 'admin@artxenith.com', name: 'System Admin', role: 'Admin', code: 'EMP-000' }
  ];

  const ceoPassword = 'xenith@12';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ceoPassword, salt);

  for (const acc of accounts) {
    let user = await prisma.user.findFirst({
      where: { email: { equals: acc.email, mode: 'insensitive' } }
    });

    if (!user) {
      console.log(`[Seed] Creating User account: ${acc.email}`);
      user = await prisma.user.create({
        data: {
          email: acc.email.toLowerCase(),
          passwordHash,
          role: acc.role,
          mustChangePassword: false,
          isActive: true
        }
      });

      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeCode: acc.code,
          fullName: acc.name,
          designation: acc.role,
          status: 'active',
          baseSalary: 0,
          currency: 'PKR',
          shiftStart: '09:30',
          shiftEnd: '18:30'
        }
      });
      console.log(`[Seed] ${acc.role} user created: ${acc.email}`);
    } else {
      console.log(`[Seed] Updating password and role for: ${acc.email}`);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: acc.role,
          mustChangePassword: false,
          isActive: true
        }
      });
      console.log(`[Seed] Updated: ${acc.email}`);
    }
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

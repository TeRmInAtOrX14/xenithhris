const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'subuahad1@gmail.com' } });
  console.log('User in DB:', user?.email, 'Role:', user?.role, 'IsActive:', user?.isActive);
  if (user) {
    const match = await bcrypt.compare('xenith@12', user.passwordHash);
    console.log('Password Match:', match);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@blacktrucks.co';
  const password = 'Admin@12345';
  const name = 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If exists but not admin, promote it
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { email }, data: { role: 'admin' } });
      console.log(`✅ Promoted ${email} to admin`);
    } else {
      console.log(`ℹ️  Admin already exists: ${email}`);
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, password: hashed, role: 'admin' },
  });

  console.log('✅ Admin account created');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

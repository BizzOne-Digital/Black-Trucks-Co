import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.vehicle.updateMany({
    where: { name: 'GLS Maybach 600' },
    data: { image: '/Maybach600.jpeg' },
  });
  console.log(`✅ Updated ${result.count} vehicle(s)`);
}

main()
  .catch(e => { console.error('❌ Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

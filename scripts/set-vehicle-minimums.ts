import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { nameContains: 'sprinter', minimumHours: 2 },
    { nameContains: 'limo', minimumHours: 4 },
  ];

  for (const { nameContains, minimumHours } of updates) {
    const vehicles = await prisma.vehicle.findMany({
      where: { name: { contains: nameContains, mode: 'insensitive' } },
    });
    for (const v of vehicles) {
      await prisma.vehicle.update({ where: { id: v.id }, data: { minimumHours } });
      console.log(`✓ ${v.name} → minimumHours: ${minimumHours}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

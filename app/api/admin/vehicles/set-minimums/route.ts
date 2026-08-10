import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// One-time route to enforce minimumHours for specific vehicles.
// POST /api/admin/vehicles/set-minimums
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = [
    { nameContains: 'sprinter', minimumHours: 2 },
    { nameContains: 'limo', minimumHours: 4 },
  ];

  const results = [];

  for (const { nameContains, minimumHours } of updates) {
    const vehicles = await prisma.vehicle.findMany({
      where: { name: { contains: nameContains, mode: 'insensitive' } },
    });
    for (const v of vehicles) {
      await prisma.vehicle.update({ where: { id: v.id }, data: { minimumHours } });
      results.push({ id: v.id, name: v.name, minimumHours });
    }
  }

  return NextResponse.json({ updated: results });
}

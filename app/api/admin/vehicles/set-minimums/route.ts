import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const updates = [
    { nameContains: 'sprinter', minimumHours: 2 },
    { nameContains: 'limo', minimumHours: 4 },
  ];

  const results = [];
  for (const { nameContains, minimumHours } of updates) {
    const vehicles = await db.collection('Vehicle').find(
      { name: { $regex: nameContains, $options: 'i' } }
    ).toArray();
    for (const v of vehicles) {
      await db.collection('Vehicle').updateOne({ _id: v._id }, { $set: { minimumHours, updatedAt: new Date() } });
      results.push({ id: v._id.toString(), name: v.name, minimumHours });
    }
  }

  return NextResponse.json({ updated: results });
}

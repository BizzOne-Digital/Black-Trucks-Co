import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false });

    const userId = (session.user as any).id;
    const body = await req.json();
    const db = await getDb();
    const now = new Date();

    const existing = await db.collection('AbandonedBooking').findOne({ userId });

    if (existing) {
      await db.collection('AbandonedBooking').updateOne({ userId }, {
        $set: {
          pickup: body.pickup, dropoff: body.dropoff,
          date: body.date || null, time: body.time || null,
          distance: body.distance || null, duration: body.duration || null,
          serviceType: body.serviceType || null, vehicleId: body.vehicleId || null,
          step: body.step || 0, emailSent: false, updatedAt: now,
        },
      });
    } else {
      await db.collection('AbandonedBooking').insertOne({
        userId, pickup: body.pickup, dropoff: body.dropoff,
        date: body.date || null, time: body.time || null,
        distance: body.distance || null, duration: body.duration || null,
        serviceType: body.serviceType || null, vehicleId: body.vehicleId || null,
        step: body.step || 0, emailSent: false, createdAt: now, updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('abandon track error:', err.message);
    return NextResponse.json({ ok: false });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false });

    const userId = (session.user as any).id;
    const db = await getDb();
    await db.collection('AbandonedBooking').deleteMany({ userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

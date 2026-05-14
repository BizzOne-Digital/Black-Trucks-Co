import { NextRequest, NextResponse } from 'next/server';
import { getDb, oid } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes } from '@/lib/availability';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const db = await getDb();
    const rawVehicles = await db.collection('Vehicle').find({}).sort({ name: 1 }).toArray();
    const bookings = await db.collection('Booking').find(
      { date, status: { $in: BLOCKING_STATUSES } },
      { projection: { vehicleId: 1, reference: 1, time: 1, duration: 1, status: 1, guestName: 1, userId: 1 } }
    ).toArray();

    const bookingsByVehicle: Record<string, any[]> = {};
    for (const b of bookings) {
      const vid = b.vehicleId?.toString();
      if (!vid) continue;
      if (!bookingsByVehicle[vid]) bookingsByVehicle[vid] = [];
      bookingsByVehicle[vid].push(b);
    }

    const result = await Promise.all(rawVehicles.map(async (v) => {
      const vid = v._id.toString();
      const slots = bookingsByVehicle[vid] || [];

      const bookingsOnDate = await Promise.all(slots.map(async (b) => {
        const startMin = timeToMinutes(b.time);
        const endMin = startMin + Math.ceil(b.duration);
        const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        const user = b.userId ? await db.collection('User').findOne({ _id: oid(b.userId?.toString()) }, { projection: { name: 1 } }) : null;
        return {
          reference: b.reference, time: b.time, endTime,
          duration: Math.ceil(b.duration), status: b.status,
          customer: b.guestName || user?.name || 'Guest',
        };
      }));

      return {
        id: vid, name: v.name, category: v.category,
        available: v.available,
        isAvailableOnDate: slots.length === 0,
        bookingsOnDate,
      };
    }));

    return NextResponse.json({ date, vehicles: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

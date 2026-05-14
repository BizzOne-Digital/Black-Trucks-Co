import { NextRequest, NextResponse } from 'next/server';
import { getDb, toIds, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPendingBooking } from '@/lib/createPendingBooking';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      vehicleId, pickup, dropoff, date, time, distance, duration,
      passengers, guestEmail, guestName, guestPhone, promoCode,
      serviceType, paymentMethod,
    } = body;

    const result = await createPendingBooking(
      { vehicleId, pickup, dropoff, date, time, distance, duration,
        passengers, guestEmail, guestName, guestPhone, promoCode,
        serviceType, paymentMethod: paymentMethod ?? 'cash' },
      session
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const isAdmin = (session.user as any).role === 'admin';
    const userId = (session.user as any).id;

    const db = await getDb();
    const filter = isAdmin ? {} : { userId };

    const [rawBookings, total] = await Promise.all([
      db.collection('Booking').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('Booking').countDocuments(filter),
    ]);

    // Populate vehicle and driver
    const bookings = await Promise.all(rawBookings.map(async (b) => {
      const vehicle = b.vehicleId ? await db.collection('Vehicle').findOne({ _id: parseId(b.vehicleId.toString()) }) : null;
      const driver = b.driverId ? await db.collection('User').findOne({ _id: parseId(b.driverId.toString()) }, { projection: { password: 0 } }) : null;
      return {
        ...b,
        id: b._id.toString(),
        _id: undefined,
        vehicle: vehicle ? { ...vehicle, id: vehicle._id.toString(), _id: undefined } : null,
        driver: driver ? { name: driver.name, phone: driver.phone } : null,
      };
    }));

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

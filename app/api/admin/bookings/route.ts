import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const filter: any = status ? { status } : {};
    const db = await getDb();

    const [rawBookings, total] = await Promise.all([
      db.collection('Booking').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('Booking').countDocuments(filter),
    ]);

    const bookings = await Promise.all(rawBookings.map(async (b) => {
      const vehicle = b.vehicleId ? await db.collection('Vehicle').findOne({ _id: parseId(b.vehicleId.toString()) }, { projection: { name: 1, category: 1, image: 1 } }) : null;
      const user = b.userId ? await db.collection('User').findOne({ _id: parseId(b.userId.toString()) }, { projection: { name: 1, email: 1, phone: 1 } }) : null;
      const driver = b.driverId ? await db.collection('User').findOne({ _id: parseId(b.driverId.toString()) }, { projection: { name: 1, phone: 1 } }) : null;
      return {
        ...b, id: b._id.toString(), _id: undefined,
        vehicle: vehicle ? { name: vehicle.name, category: vehicle.category, image: vehicle.image } : null,
        user: user ? { name: user.name, email: user.email, phone: user.phone } : null,
        driver: driver ? { name: driver.name, phone: driver.phone } : null,
      };
    }));

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

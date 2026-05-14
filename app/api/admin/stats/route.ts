import { NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    const [
      totalBookings, confirmedBookings, completedBookings, cancelledBookings,
      totalUsers, totalVehicles, paidBookings, recentRaw,
    ] = await Promise.all([
      db.collection('Booking').countDocuments(),
      db.collection('Booking').countDocuments({ status: 'confirmed' }),
      db.collection('Booking').countDocuments({ status: 'completed' }),
      db.collection('Booking').countDocuments({ status: 'cancelled' }),
      db.collection('User').countDocuments({ role: 'user' }),
      db.collection('Vehicle').countDocuments(),
      db.collection('Booking').find({ paymentStatus: 'paid' }, { projection: { totalPrice: 1 } }).toArray(),
      db.collection('Booking').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const recentBookings = await Promise.all(recentRaw.map(async (b) => {
      const vehicle = b.vehicleId ? await db.collection('Vehicle').findOne({ _id: parseId(b.vehicleId.toString()) }, { projection: { name: 1, category: 1 } }) : null;
      const user = b.userId ? await db.collection('User').findOne({ _id: parseId(b.userId.toString()) }, { projection: { name: 1 } }) : null;
      return {
        ...b, id: b._id.toString(), _id: undefined,
        vehicle: vehicle ? { name: vehicle.name, category: vehicle.category } : null,
        user: user ? { name: user.name } : null,
      };
    }));

    return NextResponse.json({
      totalBookings, confirmedBookings, completedBookings, cancelledBookings,
      totalUsers, totalVehicles, totalRevenue, recentBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

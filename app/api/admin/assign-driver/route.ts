import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { sendDriverAssignmentEmail } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, driverId } = await req.json();
    const db = await getDb();

    const bookingOid = parseId(bookingId);
    const driverOid = parseId(driverId);
    if (!bookingOid || !driverOid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const [booking, driver] = await Promise.all([
      db.collection('Booking').findOne({ _id: bookingOid }),
      db.collection('User').findOne({ _id: driverOid }),
    ]);

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (!driver || driver.role !== 'driver') return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const vehicle = booking.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(booking.vehicleId?.toString()) }, { projection: { name: 1 } }) : null;
    const user = booking.userId ? await db.collection('User').findOne({ _id: oid(booking.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;

    await db.collection('Booking').updateOne({ _id: bookingOid }, {
      $set: { driverId, status: 'assigned', updatedAt: new Date() },
    });

    const customerEmail = booking.guestEmail || user?.email;
    const customerName = booking.guestName || user?.name || 'Customer';

    if (customerEmail) {
      await sendDriverAssignmentEmail({
        to: customerEmail, name: customerName,
        reference: booking.reference,
        driverName: driver.name,
        driverPhone: driver.phone || 'N/A',
        vehicleName: vehicle?.name || 'Vehicle',
        pickup: booking.pickup,
        date: booking.date,
        time: booking.time,
      }).catch(e => console.error('Driver assignment email failed:', e.message));
    }

    return NextResponse.json({ message: 'Driver assigned successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

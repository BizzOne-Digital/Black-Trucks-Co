import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDriverAssignmentEmail, safeSend } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, driverId } = await req.json();

    const [booking, driver] = await Promise.all([
      prisma.booking.findUnique({ where: { id: bookingId }, include: { vehicle: { select: { name: true } }, user: true } }),
      prisma.user.findUnique({ where: { id: driverId } }),
    ]);

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (!driver || driver.role !== 'driver') return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    await prisma.booking.update({ where: { id: bookingId }, data: { driverId, status: 'assigned' } });

    const customerEmail = booking.guestEmail || booking.user?.email;
    const customerName = booking.guestName || booking.user?.name || 'Customer';

    if (customerEmail) {
      await safeSend(
        () =>
          sendDriverAssignmentEmail({
            to: customerEmail,
            name: customerName,
            reference: booking.reference,
            driverName: driver.name,
            driverPhone: driver.phone || 'N/A',
            vehicleName: booking.vehicle.name,
            pickup: booking.pickup,
            date: booking.date,
            time: booking.time,
          }),
        'driver assignment email'
      );
    }

    return NextResponse.json({ message: 'Driver assigned successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

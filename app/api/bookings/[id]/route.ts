import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendStatusUpdateEmail } from '@/lib/email';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { vehicle: true, driver: { select: { name: true, phone: true, email: true } } },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const isAdmin = (session.user as any).role === 'admin';

    if (!isAdmin && body.status && body.status !== 'cancelled') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current booking before update to detect status change
    const before = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        vehicle: { select: { name: true } },
        user: { select: { name: true, email: true } },
        driver: { select: { name: true, phone: true } },
      },
    });

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: body,
      include: {
        vehicle: true,
        driver: { select: { name: true, phone: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Send status update email if status changed
    const statusChanged = before && body.status && before.status !== body.status;
    if (statusChanged) {
      const email = before.guestEmail || before.user?.email;
      const name = before.guestName || before.user?.name || 'Valued Customer';

      if (email) {
        // Get driver info — may have just been set in this update
        const driverName = booking.driver?.name || before.driver?.name;
        const driverPhone = booking.driver?.phone || before.driver?.phone;

        sendStatusUpdateEmail({
          to: email,
          name,
          reference: before.reference,
          status: body.status,
          vehicle: before.vehicle.name,
          pickup: before.pickup,
          date: before.date,
          time: before.time,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
        }).catch(err => console.error('Status email failed:', err.message));
      }
    }

    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

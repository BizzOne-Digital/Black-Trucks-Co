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

    const rawBody = await req.json();
    const isAdmin = (session.user as any).role === 'admin';

    // Whitelist fields: never pass the raw body to the database (mass assignment
    // would let any user change paymentStatus, totalPrice, userId, etc.).
    const body: Record<string, unknown> = {};
    if (isAdmin) {
      for (const key of ['status', 'driverId', 'notes'] as const) {
        if (rawBody[key] !== undefined) body[key] = rawBody[key];
      }
    } else {
      if (rawBody.status !== 'cancelled') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const owned = await prisma.booking.findUnique({ where: { id: params.id }, select: { userId: true } });
      if (!owned || owned.userId !== (session.user as any).id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      body.status = 'cancelled';
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
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
          status: String(body.status),
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

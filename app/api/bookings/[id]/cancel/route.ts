import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCancellationEmail, safeSend } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const booking = await prisma.booking.findUnique({ where: { id: params.id }, include: { vehicle: true, user: true } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const isAdmin = (session?.user as any)?.role === 'admin';
    const isOwner = booking.userId === (session?.user as any)?.id;
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (['cancelled', 'completed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json({ error: `Cannot cancel a ${booking.status} booking` }, { status: 400 });
    }

    const { reason } = await req.json();
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const hoursUntilRide = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const refundAmount = booking.paymentStatus === 'paid' ? (hoursUntilRide >= 24 ? booking.totalPrice : booking.totalPrice * 0.5) : undefined;

    await prisma.booking.update({
      where: { id: params.id },
      data: { status: 'cancelled', paymentStatus: refundAmount ? 'refunded' : booking.paymentStatus, cancelReason: reason, cancelledAt: new Date() },
    });

    const email = booking.guestEmail || booking.user?.email;
    const name = booking.guestName || booking.user?.name || 'Customer';
    if (email) {
      await safeSend(
        () => sendCancellationEmail({ to: email, name, reference: booking.reference, refundAmount }),
        'cancellation email'
      );
    }

    return NextResponse.json({ message: 'Booking cancelled', refundAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

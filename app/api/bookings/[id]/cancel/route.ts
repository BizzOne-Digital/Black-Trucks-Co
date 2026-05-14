import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { sendCancellationEmail } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const db = await getDb();
    const docId = parseId(params.id);
    if (!docId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const booking = await db.collection('Booking').findOne({ _id: docId });
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
    const refundAmount = booking.paymentStatus === 'paid'
      ? (hoursUntilRide >= 24 ? booking.totalPrice : booking.totalPrice * 0.5)
      : undefined;

    await db.collection('Booking').updateOne({ _id: docId }, {
      $set: {
        status: 'cancelled',
        paymentStatus: refundAmount ? 'refunded' : booking.paymentStatus,
        cancelReason: reason || null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const user = booking.userId ? await db.collection('User').findOne({ _id: oid(booking.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;
    const email = booking.guestEmail || user?.email;
    const name = booking.guestName || user?.name || 'Customer';

    if (email) {
      await sendCancellationEmail({ to: email, name, reference: booking.reference, refundAmount })
        .catch(e => console.error('Cancel email failed:', e.message));
    }

    return NextResponse.json({ message: 'Booking cancelled', refundAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

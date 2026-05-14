import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { getDb, parseId, oid } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId?.trim()) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const bookingId = checkoutSession.metadata?.bookingId;
    let booking = null;

    if (bookingId) {
      const db = await getDb();
      const docId = parseId(bookingId);
      if (docId) {
        const raw = await db.collection('Booking').findOne({ _id: docId });
        if (raw) {
          const vehicle = raw.vehicleId ? await db.collection('Vehicle').findOne(
            { _id: oid(raw.vehicleId?.toString()) },
            { projection: { name: 1 } }
          ) : null;
          booking = { ...raw, id: raw._id.toString(), _id: undefined, vehicle } as any;
        }
      }
    }

    return NextResponse.json({
      paymentStatus: checkoutSession.payment_status,
      checkoutStatus: checkoutSession.status,
      reference: booking?.reference ?? null,
      pickup: booking?.pickup ?? checkoutSession.metadata?.pickupLocation ?? null,
      dropoff: booking?.dropoff ?? checkoutSession.metadata?.dropoffLocation ?? null,
      date: booking?.date ?? checkoutSession.metadata?.pickupDate ?? null,
      time: booking?.time ?? checkoutSession.metadata?.pickupTime ?? null,
      totalPrice: booking?.totalPrice ?? null,
      vehicleName: booking?.vehicle?.name ?? null,
      tripType: checkoutSession.metadata?.tripType ?? booking?.serviceType ?? null,
      currency: checkoutSession.currency ?? 'cad',
    });
  } catch (err: unknown) {
    console.error('[stripe/session-status]', err);
    return NextResponse.json({ error: 'Could not load payment status' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { getDb, parseId } from '@/lib/mongodb';
import { sendBookingConfirmation } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    const msg = process.env.NODE_ENV === 'development'
      ? 'STRIPE_WEBHOOK_SECRET is not set in .env.local'
      : 'Webhook is not configured';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid payload';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return NextResponse.json({ received: true });

    const db = await getDb();
    const oid = parseId(bookingId);
    if (!oid) return NextResponse.json({ received: true });

    let stripeChargeId: string | undefined;
    const piId = session.payment_intent;
    if (piId && typeof piId === 'string') {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        stripeChargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined;
      } catch (e) {
        console.error('[stripe/webhook] could not retrieve payment intent', e);
      }
    }

    const booking = await db.collection('Booking').findOne({ _id: oid });
    if (!booking || booking.paymentStatus === 'paid') return NextResponse.json({ received: true });

    await db.collection('Booking').updateOne({ _id: oid }, {
      $set: {
        paymentStatus: 'paid', status: 'confirmed',
        stripeCheckoutSessionId: session.id,
        ...(stripeChargeId ? { stripeChargeId } : {}),
        updatedAt: new Date(),
      },
    });

    const vehicle = booking.vehicleId ? await db.collection('Vehicle').findOne({ _id: parseId(booking.vehicleId.toString()) }, { projection: { name: 1 } }) : null;
    const user = booking.userId ? await db.collection('User').findOne({ _id: parseId(booking.userId.toString()) }, { projection: { name: 1, email: 1 } }) : null;
    const email = booking.guestEmail || user?.email;
    const name = booking.guestName || user?.name || 'Customer';

    if (email) {
      await sendBookingConfirmation({
        to: email, name, reference: booking.reference,
        pickup: booking.pickup, dropoff: booking.dropoff,
        date: booking.date, time: booking.time,
        vehicle: vehicle?.name || 'Vehicle',
        totalPrice: booking.totalPrice, distance: booking.distance,
        paymentMethod: 'card',
      }).catch(e => console.error('[stripe/webhook] confirmation email failed', e));
    }
  }

  return NextResponse.json({ received: true });
}

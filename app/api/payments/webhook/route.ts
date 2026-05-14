import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { sendBookingConfirmation } from '@/lib/email';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const db = await getDb();

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const bookingId = intent.metadata.bookingId;
    if (!bookingId) return NextResponse.json({ received: true });

    const docId = parseId(bookingId);
    if (!docId) return NextResponse.json({ received: true });

    const existing = await db.collection('Booking').findOne({ _id: docId });
    if (existing?.stripeCheckoutSessionId) return NextResponse.json({ received: true });

    await db.collection('Booking').updateOne({ _id: docId }, {
      $set: {
        paymentStatus: 'paid', status: 'confirmed',
        stripeChargeId: intent.latest_charge as string,
        updatedAt: new Date(),
      },
    });

    const booking = await db.collection('Booking').findOne({ _id: docId });
    if (booking) {
      const vehicle = booking.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(booking.vehicleId?.toString()) }, { projection: { name: 1 } }) : null;
      const user = booking.userId ? await db.collection('User').findOne({ _id: oid(booking.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;
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
        }).catch(e => console.error('Confirmation email failed:', e.message));
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const bookingId = intent.metadata.bookingId;
    if (bookingId) {
      const docId = parseId(bookingId);
      if (docId) {
        await db.collection('Booking').updateOne({ _id: docId }, {
          $set: { paymentStatus: 'failed', updatedAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

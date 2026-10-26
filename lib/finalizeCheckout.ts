import type Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { sendBookingConfirmation, safeSend } from '@/lib/email';

/**
 * Mark a paid Stripe Checkout session's booking as confirmed and email customer + admin.
 * Shared by the Stripe webhook and the payment-success page so a missing or delayed
 * webhook can never leave a paid booking unconfirmed. Idempotent: the status flip is a
 * single atomic update, so only the caller that wins it sends the emails.
 */
export async function finalizeCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return { finalized: false };

  const bookingId = session.metadata?.bookingId;
  const docId = bookingId ? parseId(bookingId) : null;
  if (!docId) return { finalized: false };

  const db = await getDb();
  const isDeposit = session.metadata?.paymentType === 'deposit';
  const newPaymentStatus = isDeposit ? 'deposit_paid' : 'paid';

  let stripeChargeId: string | undefined;
  const piId = session.payment_intent;
  if (piId && typeof piId === 'string') {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      stripeChargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined;
    } catch (e) {
      console.error('[finalizeCheckout] could not retrieve payment intent', e);
    }
  }

  // Atomic claim: only a booking not already at this payment state is updated.
  const booking = await db.collection('Booking').findOneAndUpdate(
    { _id: docId, paymentStatus: { $nin: ['paid', 'deposit_paid'] } },
    {
      $set: {
        paymentStatus: newPaymentStatus,
        status: 'confirmed',
        paymentMethod: isDeposit ? 'deposit' : 'card',
        stripeCheckoutSessionId: session.id,
        ...(stripeChargeId ? { stripeChargeId } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!booking) return { finalized: false }; // already processed (or missing)

  const vehicle = booking.vehicleId
    ? await db.collection('Vehicle').findOne({ _id: oid(booking.vehicleId?.toString()) }, { projection: { name: 1 } })
    : null;
  const user = booking.userId
    ? await db.collection('User').findOne({ _id: oid(booking.userId?.toString()) }, { projection: { name: 1, email: 1, phone: 1 } })
    : null;
  const email = booking.guestEmail || user?.email;
  const name = booking.guestName || user?.name || 'Customer';
  const phone = booking.guestPhone || user?.phone || undefined;

  const emailed = await safeSend(
    async () => {
      if (!email) throw new Error('booking has no customer email');
      await sendBookingConfirmation({
        to: email,
        name,
        reference: booking.reference,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        date: booking.date,
        time: booking.time,
        vehicle: vehicle?.name || 'Vehicle',
        totalPrice: booking.totalPrice,
        distance: booking.distance,
        paymentMethod: isDeposit ? 'deposit' : 'card',
        phone,
      });
    },
    'checkout confirmation'
  );

  await db.collection('Booking').updateOne(
    { _id: docId },
    { $set: { emailStatus: emailed ? 'sent' : 'failed' } }
  ).catch(() => {});

  return { finalized: true };
}

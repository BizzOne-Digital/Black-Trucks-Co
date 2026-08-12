import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';
import { getDb, parseId } from '@/lib/mongodb';
import { createPendingBooking } from '@/lib/createPendingBooking';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.' },
        { status: 503 }
      );
    }

    const authSession = await getServerSession(authOptions);
    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { vehicleId, pickup, dropoff, date, time, distance, duration, passengers, promoCode, serviceType } = body;

    if (!serviceType || typeof serviceType !== 'string') {
      return NextResponse.json({ error: 'Trip type (service) is required' }, { status: 400 });
    }
    if (!pickup || !dropoff) {
      return NextResponse.json({ error: 'Pickup and drop-off locations are required' }, { status: 400 });
    }
    if (!date || !time) {
      return NextResponse.json({ error: 'Pickup date and time are required' }, { status: 400 });
    }

    // Reject past bookings (5 min grace for clock skew)
    const bookingDateTime = new Date(`${date}T${time}`);
    if (isNaN(bookingDateTime.getTime()) || bookingDateTime.getTime() < Date.now() - 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Booking date and time must be in the future.' }, { status: 400 });
    }

    const dist = Number(distance);
    const dur = Number(duration);
    if (!Number.isFinite(dist) || !Number.isFinite(dur)) {
      return NextResponse.json({ error: 'Invalid trip distance or duration' }, { status: 400 });
    }

    const userId = (authSession.user as { id: string }).id;
    const normPromo = (p: string | undefined | null) => (p ? String(p).toUpperCase() : '');
    const promoKey = normPromo(promoCode);

    const db = await getDb();

    // Look for a recent pending card booking for the same trip
    const recentCandidates = await db.collection('Booking').find({
      userId,
      vehicleId,
      date,
      time,
      pickup,
      dropoff,
      paymentStatus: 'pending',
      paymentMethod: 'card',
      serviceType,
      createdAt: { $gte: new Date(Date.now() - 45 * 60 * 1000) },
    }).sort({ createdAt: -1 }).limit(8).toArray();

    let booking = recentCandidates.find(b => normPromo(b.promoCode) === promoKey) ?? null;

    // Reuse existing open Stripe session if available
    if (booking?.stripeCheckoutSessionId) {
      try {
        const prev = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId);
        if (prev.status === 'open' && prev.url) {
          return NextResponse.json({ url: prev.url });
        }
      } catch {
        // Previous session expired — create a fresh one below
      }
    }

    // Create a new pending booking if none found
    if (!booking) {
      const bookingResult = await createPendingBooking(
        { vehicleId, pickup, dropoff, date, time, distance: dist, duration: dur, passengers, promoCode, serviceType, paymentMethod: 'card' },
        authSession
      );
      if (!bookingResult.ok) {
        return NextResponse.json({ error: bookingResult.error }, { status: bookingResult.status });
      }
      booking = bookingResult.booking;
    }

    if (!booking) {
      return NextResponse.json({ error: 'Could not create or find booking' }, { status: 500 });
    }

    const bookingId = booking.id || booking._id?.toString();
    const customerEmail = authSession.user.email ?? undefined;
    const chargeAmount = Math.round(booking.totalPrice * 100);
    const siteUrl = getSiteUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: chargeAmount,
          product_data: { name: `Black Trucks Co — Booking (Ref: ${booking.reference})` },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment-cancelled`,
      metadata: {
        bookingId,
        tripType: serviceType,
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        pickupDate: date,
        pickupTime: time,
      },
      payment_intent_data: { metadata: { bookingId } },
    });

    // Save the checkout session ID to the booking
    const oid = parseId(bookingId);
    if (oid) {
      await db.collection('Booking').updateOne({ _id: oid }, {
        $set: { stripeCheckoutSessionId: checkoutSession.id, updatedAt: new Date() },
      });
    }

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    console.error('[stripe/create-checkout-session]', err);
    return NextResponse.json({ error: 'Unable to start checkout. Please try again.' }, { status: 500 });
  }
}

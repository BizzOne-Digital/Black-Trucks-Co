import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { getDb, parseId } from '@/lib/mongodb';
import { getSiteUrl } from '@/lib/siteUrl';
import { depositFromTotal } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Online deposit payments are not configured yet. We will contact you to arrange your deposit.' },
        { status: 503 }
      );
    }

    const { reference, email } = await req.json();
    if (!reference || !email) {
      return NextResponse.json({ error: 'Reference and email are required' }, { status: 400 });
    }

    const db = await getDb();
    const booking = await db.collection('Booking').findOne({
      reference: String(reference).trim().toUpperCase(),
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let bookingEmail = (booking.guestEmail || '').toLowerCase();
    if (!bookingEmail && booking.userId) {
      const userOid = parseId(booking.userId.toString());
      if (userOid) {
        const user = await db.collection('User').findOne({ _id: userOid });
        bookingEmail = (user?.email || '').toLowerCase();
      }
    }
    if (!bookingEmail || bookingEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Email does not match this booking' }, { status: 403 });
    }

    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'deposit_paid') {
      return NextResponse.json({ error: 'Deposit has already been paid for this booking' }, { status: 409 });
    }

    const deposit = depositFromTotal(booking.totalPrice);
    const chargeCents = Math.round(deposit * 100);
    if (chargeCents < 50) {
      return NextResponse.json({ error: 'Deposit amount is too small to process online' }, { status: 400 });
    }

    const bookingId = booking._id.toString();
    const siteUrl = getSiteUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: normalizedEmail,
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: chargeCents,
          product_data: {
            name: `Booking deposit — Ref ${booking.reference}`,
            description: `Deposit toward your chauffeur booking. Remaining balance due before or at service.`,
          },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment-cancelled?ref=${booking.reference}`,
      metadata: {
        bookingId,
        paymentType: 'deposit',
        tripType: booking.serviceType || '',
        pickupLocation: booking.pickup,
        dropoffLocation: booking.dropoff,
        pickupDate: booking.date,
        pickupTime: booking.time,
      },
      payment_intent_data: { metadata: { bookingId, paymentType: 'deposit' } },
    });

    await db.collection('Booking').updateOne(
      { _id: booking._id },
      { $set: { stripeCheckoutSessionId: checkoutSession.id, updatedAt: new Date() } }
    );

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Could not start deposit payment' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url, depositAmount: deposit });
  } catch (err: unknown) {
    console.error('[stripe/create-deposit-session]', err);
    return NextResponse.json({ error: 'Unable to start deposit payment. Please try again.' }, { status: 500 });
  }
}

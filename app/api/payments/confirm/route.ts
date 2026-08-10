import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { finalizePaidBooking } from '@/lib/finalizeBooking';

/**
 * Called from the checkout page after Stripe.js reports payment success.
 * Ensures booking is marked paid and emails are sent even when webhooks
 * are delayed or not configured locally.
 */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, paymentIntentId } = await req.json();
    if (!bookingId || !paymentIntentId) {
      return NextResponse.json({ error: 'bookingId and paymentIntentId are required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: `Payment not succeeded (status: ${intent.status})` }, { status: 400 });
    }

    if (intent.metadata?.bookingId && intent.metadata.bookingId !== bookingId) {
      return NextResponse.json({ error: 'Payment does not match this booking' }, { status: 400 });
    }

    const updated = await finalizePaidBooking(
      bookingId,
      typeof intent.latest_charge === 'string' ? intent.latest_charge : null
    );

    return NextResponse.json({ booking: updated, emailTriggered: true });
  } catch (err: any) {
    console.error('[payments/confirm]', err?.message || err);
    return NextResponse.json({ error: err.message || 'Confirm failed' }, { status: 500 });
  }
}

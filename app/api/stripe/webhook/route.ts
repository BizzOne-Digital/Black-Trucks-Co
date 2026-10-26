import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { finalizeCheckoutSession } from '@/lib/finalizeCheckout';

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
    try {
      await finalizeCheckoutSession(session);
    } catch (err: unknown) {
      // 500 makes Stripe retry the webhook instead of silently dropping the booking.
      console.error('[stripe/webhook] finalize failed', err);
      return NextResponse.json({ error: 'Could not finalize booking' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

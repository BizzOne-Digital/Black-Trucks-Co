import Stripe from 'stripe';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    stripe = new Stripe(key, {
      apiVersion: '2024-06-20',
    });
  }
  return stripe;
}

export default new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export async function createPaymentIntent(
  amount: number, // in dollars
  metadata: Record<string, string>
) {
  return getStripe().paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency: 'usd',
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
  if (amount) params.amount = Math.round(amount * 100);
  return getStripe().refunds.create(params);
}

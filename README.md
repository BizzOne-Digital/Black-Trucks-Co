# Black Trucks Co — Next.js site

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and fill in real values. Do **not** commit `.env.local`.

   Required for Stripe Checkout:

   - `STRIPE_SECRET_KEY` — server-only **test** secret (`sk_test_...`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — **test** publishable key (`pk_test_...`) if used by client features
   - `STRIPE_WEBHOOK_SECRET` — signing secret from Stripe CLI or Dashboard (`whsec_...`)
   - `NEXT_PUBLIC_SITE_URL` — e.g. `http://localhost:3000` locally, or `https://black-trucksco.vercel.app` in production (no trailing slash)

   Also configure `MONGODB_URI`, NextAuth, and email/SMTP variables as needed for your environment.

3. **Database**

   After schema changes, use the **project’s** Prisma 5 CLI (avoid bare `npx prisma`, which can install Prisma 7 and fail on this schema):

   ```bash
   npm run prisma:generate
   npx prisma db push
   ```

   Or after `npm install`, `npx prisma` should resolve to `node_modules/.bin/prisma` (5.x).

4. **Run locally**

   ```bash
   npm run dev
   ```

## Stripe Checkout (test mode)

1. Complete the booking flow, choose **Card**, then **Pay** — you are redirected to Stripe-hosted Checkout.
2. Use Stripe test card:

   - **4242 4242 4242 4242**
   - Any future expiry date  
   - Any 3-digit CVC  
   - Any postal code if asked  

3. Success redirects to `/payment-success?session_id=...`; cancel returns to `/payment-cancelled`.

## Webhooks

Stripe needs to deliver `checkout.session.completed` to your app:

- **Local:** [Stripe CLI](https://stripe.com/docs/stripe-cli) — `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Production:** In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), add endpoint `https://your-domain.com/api/stripe/webhook`, select `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET` in Vercel **Project → Settings → Environment Variables**.

If `STRIPE_WEBHOOK_SECRET` is missing, `/api/stripe/webhook` returns **500** with a clear message in development.

## Deploy (Vercel)

1. Connect the repo and deploy.
2. Add the same env vars in **Vercel Project Settings** (including `NEXT_PUBLIC_SITE_URL` for your production URL).
3. Use **test** Stripe keys until you have live `sk_live_...`, production webhook secret, and explicit approval to accept real payments.

## Security

- Never commit real API keys or `.env.local`.
- Never expose `STRIPE_SECRET_KEY` to the browser or client bundles.

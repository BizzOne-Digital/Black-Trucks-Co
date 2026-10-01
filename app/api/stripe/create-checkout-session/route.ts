import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Legacy full-fare checkout — disabled. Use /api/booking-inquiry + /api/stripe/create-deposit-session. */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Full online payment is no longer available. Submit a booking request at /book. After we confirm your trip, pay only the deposit using the link we send (or /checkout with your confirmation code).',
    },
    { status: 403 }
  );
}

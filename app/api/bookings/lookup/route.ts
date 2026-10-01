import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { depositFromTotal, DEPOSIT_PERCENT } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

/** Public lookup for deposit payment — requires matching email + reference. */
export async function POST(req: NextRequest) {
  try {
    const { reference, email } = await req.json();
    if (!reference || !email) {
      return NextResponse.json({ error: 'Reference and email are required' }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { reference: String(reference).trim().toUpperCase() },
      include: {
        vehicle: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const bookingEmail = (booking.guestEmail || booking.user?.email || '').toLowerCase();
    if (!bookingEmail || bookingEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Email does not match this booking' }, { status: 403 });
    }

    const depositAmount = depositFromTotal(booking.totalPrice);
    const canPayDeposit =
      booking.paymentStatus !== 'paid' &&
      booking.paymentStatus !== 'deposit_paid';

    return NextResponse.json({
      reference: booking.reference,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      date: booking.date,
      time: booking.time,
      vehicle: booking.vehicle.name,
      totalPrice: booking.totalPrice,
      depositAmount,
      depositPercent: DEPOSIT_PERCENT,
      paymentStatus: booking.paymentStatus,
      canPayDeposit,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

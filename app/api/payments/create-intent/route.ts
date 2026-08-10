import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { vehicle: { select: { name: true } } } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.paymentStatus === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const intent = await createPaymentIntent(booking.totalPrice, {
      bookingId: booking.id,
      reference: booking.reference,
      vehicleName: booking.vehicle.name,
    });

    await prisma.booking.update({ where: { id: bookingId }, data: { stripePaymentIntentId: intent.id } });

    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

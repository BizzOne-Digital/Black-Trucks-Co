import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { createPaymentIntent } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

    const db = await getDb();
    const docId = parseId(bookingId);
    if (!docId) return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });

    const booking = await db.collection('Booking').findOne({ _id: docId });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.paymentStatus === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const vehicle = booking.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(booking.vehicleId?.toString()) }, { projection: { name: 1 } }) : null;

    const intent = await createPaymentIntent(booking.totalPrice, {
      bookingId: booking._id.toString(),
      reference: booking.reference,
      vehicleName: vehicle?.name || 'Vehicle',
    });

    await db.collection('Booking').updateOne({ _id: docId }, {
      $set: { stripePaymentIntentId: intent.id, updatedAt: new Date() },
    });

    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

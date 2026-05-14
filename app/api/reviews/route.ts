import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    const db = await getDb();
    const filter = vehicleId ? { vehicleId } : {};
    const rawReviews = await db.collection('Review').find(filter).sort({ createdAt: -1 }).limit(20).toArray();

    const reviews = await Promise.all(rawReviews.map(async (r) => {
      const user = r.userId ? await db.collection('User').findOne({ _id: parseId(r.userId.toString()) }, { projection: { name: 1, image: 1 } }) : null;
      return {
        ...r, id: r._id.toString(), _id: undefined,
        user: user ? { name: user.name, image: user.image } : null,
      };
    }));

    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { bookingId, rating, comment } = await req.json();

    if (!bookingId || !rating || !comment) {
      return NextResponse.json({ error: 'bookingId, rating and comment are required' }, { status: 400 });
    }

    const db = await getDb();
    const bookingOid = parseId(bookingId);
    if (!bookingOid) return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });

    const booking = await db.collection('Booking').findOne({ _id: bookingOid });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed bookings' }, { status: 400 });
    }

    const existing = await db.collection('Review').findOne({ bookingId });
    if (existing) return NextResponse.json({ error: 'Review already submitted' }, { status: 409 });

    const result = await db.collection('Review').insertOne({
      bookingId,
      userId: session ? (session.user as any).id : null,
      guestName: booking.guestName || null,
      vehicleId: booking.vehicleId,
      rating,
      comment,
      createdAt: new Date(),
    });

    const review = { bookingId, rating, comment, id: result.insertedId.toString() };
    return NextResponse.json({ review }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

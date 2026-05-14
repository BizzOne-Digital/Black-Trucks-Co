import { NextRequest, NextResponse } from 'next/server';
import { getDb, oid } from '@/lib/mongodb';
import { sendAbandonmentEmail, sendReviewRequestEmail } from '@/lib/email';

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  return token === process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL || 'https://yoursite.com';
  const results = { abandonmentsSent: 0, reviewsSent: 0, errors: [] as string[] };
  const db = await getDb();

  // ── 1. Abandonment emails ──────────────────────────────────────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  try {
    const abandoned = await db.collection('AbandonedBooking').find({
      emailSent: false,
      updatedAt: { $lt: oneHourAgo },
    }).toArray();

    for (const record of abandoned) {
      try {
        const user = record.userId ? await db.collection('User').findOne({ _id: oid(record.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;
        if (!user?.email) continue;

        await sendAbandonmentEmail({
          to: user.email, name: user.name,
          pickup: record.pickup, dropoff: record.dropoff,
          date: record.date || undefined, time: record.time || undefined,
          resumeUrl: `${appUrl}/booking`,
        });

        await db.collection('AbandonedBooking').updateOne({ _id: record._id }, { $set: { emailSent: true } });
        results.abandonmentsSent++;
      } catch (e: any) {
        results.errors.push(`abandon ${record._id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`abandonment query: ${e.message}`);
  }

  // ── 2. Post-ride review request emails ────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  try {
    const completedBookings = await db.collection('Booking').find({
      status: 'completed',
      reviewSent: false,
      date: { $lt: today },
    }).limit(50).toArray();

    for (const booking of completedBookings) {
      const vehicle = booking.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(booking.vehicleId?.toString()) }, { projection: { name: 1 } }) : null;
      const user = booking.userId ? await db.collection('User').findOne({ _id: oid(booking.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;
      const email = booking.guestEmail || user?.email;
      const name = booking.guestName || user?.name || 'Valued Customer';
      if (!email) continue;

      try {
        await sendReviewRequestEmail({
          to: email, name,
          reference: booking.reference,
          vehicle: vehicle?.name || 'Vehicle',
          pickup: booking.pickup, dropoff: booking.dropoff,
          reviewUrl: `${appUrl}/bookings?review=${booking._id.toString()}`,
        });

        await db.collection('Booking').updateOne({ _id: booking._id }, { $set: { reviewSent: true } });
        results.reviewsSent++;
      } catch (e: any) {
        results.errors.push(`review ${booking._id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`review query: ${e.message}`);
  }

  return NextResponse.json({ success: true, ...results, timestamp: new Date().toISOString() });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

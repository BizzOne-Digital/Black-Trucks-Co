import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAbandonmentEmail, sendReviewRequestEmail, retryFailedEmails, verifySmtpConnection } from '@/lib/email';

// Protect with a secret token so only cron jobs / admin can call this
function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>"
  const bearer = req.headers.get('authorization')?.replace(/^Bearers+/i, '');
  const token = bearer || req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  return token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL || 'https://yoursite.com';
  const results = {
    abandonmentsSent: 0,
    reviewsSent: 0,
    smtp: 'unknown' as string,
    emailRetry: null as null | { checked: number; sent: number; failed: number },
    errors: [] as string[],
  };

  // ── 0. Email health: verify SMTP and re-send anything that previously failed ──
  try {
    await verifySmtpConnection();
    results.smtp = 'ok';
  } catch (e: any) {
    results.smtp = 'FAILED';
    results.errors.push(`SMTP verify failed: ${e.message}`);
    console.error('[cron] SMTP verify failed — check SMTP_PASS / Gmail App Password:', e.message);
  }
  try {
    results.emailRetry = await retryFailedEmails(30);
  } catch (e: any) {
    results.errors.push(`email retry: ${e.message}`);
  }

  // ── 1. Abandonment emails ──────────────────────────────────────────────────
  // Send to users who abandoned > 1 hour ago and haven't been emailed yet
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const abandoned = await (prisma as any).abandonedBooking.findMany({
      where: { emailSent: false, updatedAt: { lt: oneHourAgo } },
      include: { user: { select: { name: true, email: true } } },
    });

    for (const record of abandoned) {
      try {
        await sendAbandonmentEmail({
          to: record.user.email,
          name: record.user.name,
          pickup: record.pickup,
          dropoff: record.dropoff,
          date: record.date || undefined,
          time: record.time || undefined,
          resumeUrl: `${appUrl}/booking`,
        });

        await (prisma as any).abandonedBooking.update({
          where: { id: record.id },
          data: { emailSent: true },
        });

        results.abandonmentsSent++;
      } catch (e: any) {
        results.errors.push(`abandon ${record.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`abandonment query: ${e.message}`);
  }

  // ── 2. Post-ride review request emails ────────────────────────────────────
  // Send to completed bookings where ride date has passed and review not yet sent
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  try {
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'completed',
        reviewSent: false,
        date: { lt: today },
      },
      include: {
        vehicle: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      take: 50, // batch cap
    });

    for (const booking of completedBookings) {
      const email = booking.guestEmail || booking.user?.email;
      const name = booking.guestName || booking.user?.name || 'Valued Customer';

      if (!email) continue;

      try {
        await sendReviewRequestEmail({
          to: email,
          name,
          reference: booking.reference,
          vehicle: booking.vehicle.name,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          reviewUrl: `${appUrl}/bookings?review=${booking.id}`,
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: { reviewSent: true },
        });

        results.reviewsSent++;
      } catch (e: any) {
        results.errors.push(`review ${booking.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`review query: ${e.message}`);
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}

// Also allow GET for simple cron pings (Vercel cron uses GET)
export async function GET(req: NextRequest) {
  return POST(req);
}

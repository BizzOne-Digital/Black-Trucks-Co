import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { retryFailedEmails, verifySmtpConnection } from '@/lib/email';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'admin';
}

/** SMTP status, send counts, and the most recent failed emails + bookings missing emails. */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let smtp: { ok: boolean; error?: string } = { ok: true };
  try {
    await verifySmtpConnection();
  } catch (e: any) {
    smtp = { ok: false, error: e?.message || 'SMTP verify failed' };
  }

  const db = await getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [sent, failed, failedRows, bookingsMissingEmail] = await Promise.all([
    db.collection('EmailLog').countDocuments({ status: 'sent', createdAt: { $gte: since } }),
    db.collection('EmailLog').countDocuments({ status: { $in: ['failed', 'retrying', 'pending'] } }),
    db.collection('EmailLog')
      .find({ status: { $in: ['failed', 'retrying', 'pending'] } }, { projection: { html: 0, text: 0 } })
      .sort({ createdAt: -1 }).limit(20).toArray(),
    db.collection('Booking')
      .find({ emailStatus: 'failed' }, { projection: { reference: 1, guestEmail: 1, guestName: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(20).toArray(),
  ]);

  return NextResponse.json({ smtp, last7DaysSent: sent, unsentOrFailed: failed, failedRows, bookingsMissingEmail });
}

/** Re-send every failed email now. */
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await retryFailedEmails(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Retry failed' }, { status: 500 });
  }
}

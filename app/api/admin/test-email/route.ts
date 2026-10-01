import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendSmtpTestEmail, verifySmtpConnection } from '@/lib/email';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verify = await verifySmtpConnection();
    await sendSmtpTestEmail();

    return NextResponse.json({
      ok: true,
      message: `SMTP verified and test email sent to ${process.env.ADMIN_EMAIL || 'blacktrucksco@gmail.com'}`,
      smtp: verify,
    });
  } catch (err: any) {
    console.error('[admin/test-email]', err?.message || err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'SMTP test failed. Check SMTP_USER / SMTP_PASS (Gmail App Password) in .env',
      },
      { status: 500 }
    );
  }
}

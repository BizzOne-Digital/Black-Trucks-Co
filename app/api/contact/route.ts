import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }
    await sendContactFormEmail({ name, email, phone, message });
    return NextResponse.json({ message: 'Message sent successfully' });
  } catch (err: any) {
    console.error('[contact]', err?.message || err);
    return NextResponse.json({
      error: err.message?.includes('SMTP')
        ? 'Email could not be sent. Please call us or try again later.'
        : err.message,
    }, { status: 500 });
  }
}

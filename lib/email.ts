import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'blacktrucksco@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'blacktrucksco@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'blacktrucksco@gmail.com';
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '647-706-6325';

function getSmtpConfig(): SMTPTransport.Options {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      'SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env (use a Gmail App Password).'
    );
  }

  // Gmail: 587 = STARTTLS, 465 = SSL
  const secure = port === 465;

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
  }
  return transporter;
}

/** Verify SMTP credentials (used by admin test endpoint). */
export async function verifySmtpConnection() {
  const transport = getTransporter();
  await transport.verify();
  return { ok: true, host: process.env.SMTP_HOST || 'smtp.gmail.com', user: process.env.SMTP_USER };
}

async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
  replyTo?: string;
}) {
  const transport = getTransporter();
  const info = await transport.sendMail({
    from: `"Black Trucks Co" <${EMAIL_FROM}>`,
    to: options.to,
    bcc: options.bcc,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });
  console.log(`[email] sent → ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | ${options.subject} | id=${info.messageId}`);
  return info;
}

/** Fire-and-forget wrapper so booking APIs never fail solely because of email. */
export async function safeSend(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch (err: any) {
    console.error(`[email] ${label} failed:`, err?.message || err);
  }
}

interface BookingEmailData {
  to: string;
  name: string;
  reference: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  vehicle: string;
  totalPrice: number;
  distance: number;
  paymentMethod?: 'cash' | 'card';
  phone?: string;
}

function bookingDetailsTable(data: BookingEmailData, paymentNoteHtml: string) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Vehicle</td><td style="padding:10px 0;font-weight:bold;">${data.vehicle}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Pickup</td><td style="padding:10px 0;">${data.pickup}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Dropoff</td><td style="padding:10px 0;">${data.dropoff}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Date & Time</td><td style="padding:10px 0;">${data.date} at ${data.time}</td></tr>
      <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Distance</td><td style="padding:10px 0;">${data.distance} km</td></tr>
      ${paymentNoteHtml}
      <tr><td style="padding:10px 0;color:#666;">Total</td><td style="padding:10px 0;font-weight:bold;color:#2563eb;">$${data.totalPrice.toFixed(2)}</td></tr>
    </table>
  `;
}

/** Customer confirmation + dedicated admin alert to blacktrucksco@gmail.com */
export async function sendBookingConfirmation(data: BookingEmailData) {
  const paymentNote = data.paymentMethod === 'cash'
    ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;color:#d97706;">Cash — pay driver on pickup</td></tr>`
    : `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;color:#16a34a;">Paid online</td></tr>`;

  // 1) Customer confirmation
  await sendMail({
    to: data.to,
    subject: `Booking Confirmed – ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Black Trucks Co</h1>
          <p style="color:#aaa;margin:4px 0 0;">Luxury Chauffeur Service</p>
        </div>
        <div style="padding:32px;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
            <p style="color:#16a34a;font-weight:bold;font-size:18px;margin:0;">✓ Booking Confirmed</p>
            <p style="color:#555;margin:4px 0 0;">Reference: <strong>${data.reference}</strong></p>
          </div>
          <p>Hi ${data.name},</p>
          <p>Your booking has been confirmed. Here are your trip details:</p>
          ${bookingDetailsTable(data, paymentNote)}
          ${data.paymentMethod === 'cash' ? `
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
            <p style="color:#92400e;margin:0;font-size:13px;">
              <strong>Cash Payment Reminder:</strong> Please have <strong>$${data.totalPrice.toFixed(2)}</strong> ready to pay your driver at pickup.
            </p>
          </div>` : ''}
          <p style="color:#555;font-size:14px;">Your chauffeur will arrive 15 minutes early. For any changes, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> or call <a href="tel:${SUPPORT_PHONE.replace(/-/g, '')}">${SUPPORT_PHONE}</a>.</p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} Black Trucks Co. All rights reserved.
        </div>
      </div>
    `,
  });

  // 2) Dedicated admin notification (always TO admin — not only BCC)
  await sendAdminBookingAlert(data);
}

/** Explicit admin inbox alert for every new booking */
export async function sendAdminBookingAlert(data: BookingEmailData) {
  const paymentLabel =
    data.paymentMethod === 'cash' ? 'Cash (pay on pickup)' : 'Card (paid online)';

  await sendMail({
    to: ADMIN_EMAIL,
    replyTo: data.to,
    subject: `🚨 New Booking – ${data.reference} – $${data.totalPrice.toFixed(2)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">New Booking Alert</h1>
          <p style="color:#aaa;margin:4px 0 0;">Black Trucks Co Admin</p>
        </div>
        <div style="padding:32px;">
          <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
            <p style="color:#c2410c;font-weight:bold;font-size:18px;margin:0;">New booking received</p>
            <p style="color:#555;margin:4px 0 0;">Reference: <strong>${data.reference}</strong></p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Customer</td><td style="padding:10px 0;font-weight:bold;">${data.name}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Email</td><td style="padding:10px 0;"><a href="mailto:${data.to}">${data.to}</a></td></tr>
            ${data.phone ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Phone</td><td style="padding:10px 0;">${data.phone}</td></tr>` : ''}
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Vehicle</td><td style="padding:10px 0;font-weight:bold;">${data.vehicle}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Pickup</td><td style="padding:10px 0;">${data.pickup}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Dropoff</td><td style="padding:10px 0;">${data.dropoff}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Date & Time</td><td style="padding:10px 0;">${data.date} at ${data.time}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Distance</td><td style="padding:10px 0;">${data.distance} km</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;">${paymentLabel}</td></tr>
            <tr><td style="padding:10px 0;color:#666;">Total</td><td style="padding:10px 0;font-weight:bold;color:#2563eb;">$${data.totalPrice.toFixed(2)}</td></tr>
          </table>
          <p style="color:#666;font-size:13px;">Open the admin panel to assign a driver and manage this booking.</p>
        </div>
      </div>
    `,
  });
}

export async function sendCancellationEmail(data: {
  to: string;
  name: string;
  reference: string;
  refundAmount?: number;
}) {
  await sendMail({
    to: data.to,
    bcc: ADMIN_EMAIL,
    subject: `Booking Cancelled – ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Black Trucks Co</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi ${data.name},</p>
          <p>Your booking <strong>${data.reference}</strong> has been cancelled.</p>
          ${data.refundAmount ? `<p>A refund of <strong>$${data.refundAmount.toFixed(2)}</strong> will be processed within 5–10 business days.</p>` : ''}
          <p>We hope to serve you again soon.</p>
        </div>
      </div>
    `,
  });
}

export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  await sendMail({
    to: ADMIN_EMAIL,
    replyTo: data.email,
    subject: `New Contact Form Submission from ${data.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p style="background:#f5f5f5;padding:16px;border-radius:4px;">${data.message}</p>
      </div>
    `,
  });
}

export async function sendDriverAssignmentEmail(data: {
  to: string;
  name: string;
  reference: string;
  driverName: string;
  driverPhone: string;
  vehicleName: string;
  pickup: string;
  date: string;
  time: string;
}) {
  await sendMail({
    to: data.to,
    bcc: ADMIN_EMAIL,
    subject: `Driver Assigned – ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;">Black Trucks Co</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi ${data.name},</p>
          <p>Your chauffeur has been assigned for booking <strong>${data.reference}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Driver</td><td style="padding:10px 0;font-weight:bold;">${data.driverName}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Driver Phone</td><td style="padding:10px 0;">${data.driverPhone}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Vehicle</td><td style="padding:10px 0;">${data.vehicleName}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Pickup</td><td style="padding:10px 0;">${data.pickup}</td></tr>
            <tr><td style="padding:10px 0;color:#666;">Date & Time</td><td style="padding:10px 0;">${data.date} at ${data.time}</td></tr>
          </table>
        </div>
      </div>
    `,
  });
}

export async function sendAbandonmentEmail(data: {
  to: string;
  name: string;
  pickup: string;
  dropoff: string;
  date?: string;
  time?: string;
  resumeUrl: string;
}) {
  await sendMail({
    to: data.to,
    subject: `You left your booking unfinished — complete it now`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Black Trucks Co</h1>
          <p style="color:#aaa;margin:4px 0 0;">Luxury Chauffeur Service</p>
        </div>
        <div style="padding:32px;">
          <p style="font-size:18px;font-weight:bold;margin-bottom:8px;">Hi ${data.name}, you left something behind</p>
          <p style="color:#555;margin-bottom:24px;">You started a booking but didn't finish it. Your details are saved — pick up right where you left off.</p>
          <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 0;color:#666;font-size:13px;">Pick-up</td>
                <td style="padding:8px 0;font-weight:bold;font-size:13px;">${data.pickup}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 0;color:#666;font-size:13px;">Drop-off</td>
                <td style="padding:8px 0;font-weight:bold;font-size:13px;">${data.dropoff}</td>
              </tr>
              ${data.date ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#666;font-size:13px;">Date</td><td style="padding:8px 0;font-weight:bold;font-size:13px;">${data.date}</td></tr>` : ''}
              ${data.time ? `<tr><td style="padding:8px 0;color:#666;font-size:13px;">Time</td><td style="padding:8px 0;font-weight:bold;font-size:13px;">${data.time}</td></tr>` : ''}
            </table>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${data.resumeUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
              Complete My Booking →
            </a>
          </div>
          <p style="color:#999;font-size:12px;text-align:center;">This is a one-time reminder. We won't send this again.</p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} Black Trucks Co. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendReviewRequestEmail(data: {
  to: string;
  name: string;
  reference: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  reviewUrl: string;
}) {
  await sendMail({
    to: data.to,
    subject: `How was your ride? Leave a review — ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Black Trucks Co</h1>
          <p style="color:#aaa;margin:4px 0 0;">Luxury Chauffeur Service</p>
        </div>
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <p style="font-size:20px;font-weight:bold;margin:0;">How was your ride, ${data.name}?</p>
            <p style="color:#555;margin-top:8px;">We hope you had an amazing experience with us.</p>
          </div>
          <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 0;color:#666;font-size:13px;">Booking</td>
                <td style="padding:8px 0;font-weight:bold;font-size:13px;font-family:monospace;">${data.reference}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 0;color:#666;font-size:13px;">Vehicle</td>
                <td style="padding:8px 0;font-weight:bold;font-size:13px;">${data.vehicle}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 0;color:#666;font-size:13px;">From</td>
                <td style="padding:8px 0;font-size:13px;">${data.pickup}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#666;font-size:13px;">To</td>
                <td style="padding:8px 0;font-size:13px;">${data.dropoff}</td>
              </tr>
            </table>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${data.reviewUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
              Leave a Review →
            </a>
          </div>
          <p style="color:#555;font-size:13px;text-align:center;">Your feedback helps us improve and helps other customers choose with confidence.</p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} Black Trucks Co. All rights reserved.
        </div>
      </div>
    `,
  });
}

export async function sendStatusUpdateEmail(data: {
  to: string;
  name: string;
  reference: string;
  status: string;
  vehicle: string;
  pickup: string;
  date: string;
  time: string;
  driverName?: string;
  driverPhone?: string;
}) {
  const statusMessages: Record<string, { subject: string; heading: string; color: string; body: string; emoji: string }> = {
    confirmed: {
      emoji: '✅',
      subject: `Booking Confirmed – ${data.reference}`,
      heading: 'Your booking is confirmed',
      color: '#16a34a',
      body: 'Great news! Your booking has been confirmed. We\'ll be in touch with driver details closer to your pickup time.',
    },
    assigned: {
      emoji: '🚗',
      subject: `Driver Assigned – ${data.reference}`,
      heading: 'Your driver has been assigned',
      color: '#7c3aed',
      body: data.driverName
        ? `Your chauffeur <strong>${data.driverName}</strong>${data.driverPhone ? ` (${data.driverPhone})` : ''} has been assigned to your booking. They will arrive 15 minutes early.`
        : 'A driver has been assigned to your booking. They will arrive 15 minutes early.',
    },
    in_progress: {
      emoji: '🛣️',
      subject: `Your Ride is Underway – ${data.reference}`,
      heading: 'Your ride has started',
      color: '#ea580c',
      body: 'Your chauffeur is on the way. Sit back and enjoy the journey.',
    },
    completed: {
      emoji: '🏁',
      subject: `Ride Completed – ${data.reference}`,
      heading: 'Your ride is complete',
      color: '#16a34a',
      body: 'Thank you for choosing Black Trucks Co. We hope you had an excellent experience. We\'d love to hear your feedback!',
    },
    cancelled: {
      emoji: '❌',
      subject: `Booking Cancelled – ${data.reference}`,
      heading: 'Your booking has been cancelled',
      color: '#dc2626',
      body: 'Your booking has been cancelled. If you have any questions, please contact our support team.',
    },
  };

  const msg = statusMessages[data.status];
  if (!msg) return;

  await sendMail({
    to: data.to,
    bcc: ADMIN_EMAIL,
    subject: msg.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Black Trucks Co</h1>
          <p style="color:#aaa;margin:4px 0 0;">Luxury Chauffeur Service</p>
        </div>
        <div style="padding:32px;">
          <div style="background:#f9f9f9;border-left:4px solid ${msg.color};border-radius:4px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:20px;">${msg.emoji} <strong style="color:${msg.color};">${msg.heading}</strong></p>
            <p style="margin:6px 0 0;color:#555;font-size:13px;">Reference: <strong>${data.reference}</strong></p>
          </div>
          <p style="color:#333;">Hi ${data.name},</p>
          <p style="color:#555;">${msg.body}</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9f9f9;border-radius:8px;overflow:hidden;">
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:10px 16px;color:#666;font-size:13px;width:120px;">Vehicle</td>
              <td style="padding:10px 16px;font-weight:bold;font-size:13px;">${data.vehicle}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:10px 16px;color:#666;font-size:13px;">Pick-up</td>
              <td style="padding:10px 16px;font-size:13px;">${data.pickup}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:10px 16px;color:#666;font-size:13px;">Date</td>
              <td style="padding:10px 16px;font-size:13px;">${data.date} at ${data.time}</td>
            </tr>
            ${data.driverName ? `
            <tr>
              <td style="padding:10px 16px;color:#666;font-size:13px;">Driver</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:bold;">${data.driverName}${data.driverPhone ? ` · ${data.driverPhone}` : ''}</td>
            </tr>` : ''}
          </table>
          <p style="color:#999;font-size:12px;">Questions? Call <a href="tel:${SUPPORT_PHONE.replace(/-/g, '')}" style="color:#000;">${SUPPORT_PHONE}</a> or email <a href="mailto:${SUPPORT_EMAIL}" style="color:#000;">${SUPPORT_EMAIL}</a></p>
        </div>
        <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} Black Trucks Co. All rights reserved.
        </div>
      </div>
    `,
  });
}

/** Simple SMTP self-test email to the admin inbox */
export async function sendSmtpTestEmail() {
  await sendMail({
    to: ADMIN_EMAIL,
    subject: 'Black Trucks Co — SMTP test successful',
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;">
        <h2>SMTP is working</h2>
        <p>This test email was sent to <strong>${ADMIN_EMAIL}</strong> using your configured Gmail SMTP settings.</p>
        <p>New bookings will now notify this address automatically.</p>
        <p style="color:#666;font-size:13px;">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

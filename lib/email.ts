import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getDb } from '@/lib/mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'blacktrucksco@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'blacktrucksco@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'blacktrucksco@gmail.com';
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '647-706-6325';

const MAX_INLINE_ATTEMPTS = 3;
const MAX_TOTAL_ATTEMPTS = 12;
const EMAIL_LOG = 'EmailLog';

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

  // 587 = STARTTLS, 465 = SSL
  const secure = port === 465;

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    // Without timeouts a stalled SMTP socket hangs the whole booking request.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
  }
  return transporter;
}

/** Drop the cached transport so the next send opens a fresh SMTP session. */
function resetTransporter() {
  try { transporter?.close(); } catch { /* ignore */ }
  transporter = null;
}

/** Verify SMTP credentials (used by admin test endpoint and cron health check). */
export async function verifySmtpConnection() {
  resetTransporter();
  const transport = getTransporter();
  await transport.verify();
  return { ok: true, host: process.env.SMTP_HOST || 'smtp.gmail.com', user: process.env.SMTP_USER };
}

/** Escape user-supplied text before it goes into an HTML email. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape every string field except the recipient address (used for headers, not HTML). */
function escAll<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === 'string' && k !== 'to' ? esc(v) : v;
  }
  return out as T;
}

/** Plain-text alternative. HTML-only mail scores worse with spam filters. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(tr|p|div|h1|h2|h3|table)>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  bcc?: string;
  replyTo?: string;
  kind?: string;
  bookingRef?: string;
};

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

async function transmit(opts: { to: string; subject: string; html: string; text: string; bcc?: string; replyTo?: string }) {
  const transport = getTransporter();
  const fromDomain = (EMAIL_FROM.split('@')[1] || 'localhost').trim();
  return transport.sendMail({
    from: `"Black Trucks Co" <${EMAIL_FROM}>`,
    to: opts.to,
    bcc: opts.bcc,
    // Replies reach a monitored inbox even if the From address is a no-reply.
    replyTo: opts.replyTo || SUPPORT_EMAIL,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@${fromDomain}>`,
  });
}

async function logUpdate(id: unknown, set: Record<string, unknown>, inc?: Record<string, number>) {
  if (!id) return;
  try {
    const db = await getDb();
    await db.collection(EMAIL_LOG).updateOne(
      { _id: id as any },
      { $set: { ...set, updatedAt: new Date() }, ...(inc ? { $inc: inc } : {}) }
    );
  } catch (e: any) {
    console.error('[email] could not update EmailLog:', e?.message || e);
  }
}

/**
 * Send one email durably: the message is stored in EmailLog first, sent with
 * retries on a fresh SMTP session, and the outcome recorded. If every attempt
 * fails the row stays "failed" and is re-sent later by retryFailedEmails().
 * Throws only after all inline attempts have failed.
 */
async function sendMail(options: MailOptions) {
  if (!EMAIL_RE.test(options.to || '')) {
    throw new Error(`Invalid recipient address: ${options.to}`);
  }
  const text = htmlToText(options.html);

  let logId: unknown = null;
  try {
    const db = await getDb();
    const res = await db.collection(EMAIL_LOG).insertOne({
      kind: options.kind || 'general',
      bookingRef: options.bookingRef || null,
      to: options.to,
      bcc: options.bcc || null,
      replyTo: options.replyTo || null,
      subject: options.subject,
      html: options.html,
      text,
      status: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
    });
    logId = res.insertedId;
  } catch (e: any) {
    // Never block delivery because logging is down.
    console.error('[email] could not write EmailLog:', e?.message || e);
  }

  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_INLINE_ATTEMPTS; attempt++) {
    try {
      const info = await transmit({ ...options, text });
      console.log(`[email] sent → ${options.to} | ${options.subject} | id=${info.messageId}`);
      await logUpdate(logId, { status: 'sent', sentAt: new Date(), lastError: null, messageId: info.messageId }, { attempts: 1 });
      void flushFailedInBackground();
      return info;
    } catch (err: any) {
      lastErr = err;
      console.error(`[email] attempt ${attempt}/${MAX_INLINE_ATTEMPTS} failed (${options.subject}):`, err?.message || err);
      resetTransporter();
      await logUpdate(logId, { status: 'failed', lastError: String(err?.message || err).slice(0, 500) }, { attempts: 1 });
      if (attempt < MAX_INLINE_ATTEMPTS) await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }
  throw lastErr;
}

/** Re-send emails that previously failed. Safe to call repeatedly. */
export async function retryFailedEmails(limit = 20) {
  const db = await getDb();
  const rows = await db.collection(EMAIL_LOG).find({
    status: 'failed',
    attempts: { $lt: MAX_TOTAL_ATTEMPTS },
    updatedAt: { $lt: new Date(Date.now() - 60_000) },
  }).sort({ createdAt: 1 }).limit(limit).toArray();

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    // Claim the row so two concurrent flushes don't send it twice.
    const claim = await db.collection(EMAIL_LOG).updateOne(
      { _id: row._id, status: 'failed' },
      { $set: { status: 'retrying', updatedAt: new Date() } }
    );
    if (!claim.modifiedCount) continue;
    try {
      const info = await transmit({
        to: row.to, bcc: row.bcc || undefined, replyTo: row.replyTo || undefined,
        subject: row.subject, html: row.html, text: row.text || htmlToText(row.html),
      });
      await logUpdate(row._id, { status: 'sent', sentAt: new Date(), lastError: null, messageId: info.messageId }, { attempts: 1 });
      sent++;
    } catch (err: any) {
      resetTransporter();
      await logUpdate(row._id, { status: 'failed', lastError: String(err?.message || err).slice(0, 500) }, { attempts: 1 });
      failed++;
      break; // SMTP is still down; stop hammering it.
    }
  }
  return { checked: rows.length, sent, failed };
}

let lastFlush = 0;
/** Opportunistic self-heal after a successful send, at most once a minute per instance. */
async function flushFailedInBackground() {
  if (Date.now() - lastFlush < 60_000) return;
  lastFlush = Date.now();
  try { await retryFailedEmails(5); } catch (e: any) { console.error('[email] flush failed:', e?.message || e); }
}

/** Run each send independently so one failure never blocks the others; throw if any failed. */
async function sendAll(label: string, jobs: Array<() => Promise<unknown>>) {
  const results = await Promise.allSettled(jobs.map(j => j()));
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => String(r.reason?.message || r.reason));
  if (errors.length) throw new Error(`${label}: ${errors.length}/${jobs.length} email(s) failed — ${errors.join(' | ')}`);
}

/** Wrapper so booking APIs never fail solely because of email. Returns whether it succeeded. */
export async function safeSend(fn: () => Promise<unknown>, label: string): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (err: any) {
    console.error(`[email] ${label} failed:`, err?.message || err);
    return false;
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
  paymentMethod?: 'cash' | 'card' | 'inquiry' | 'deposit';
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
export async function sendBookingConfirmation(rawData: BookingEmailData) {
  const data = escAll(rawData);
  const paymentNote =
    data.paymentMethod === 'cash'
      ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;color:#d97706;">Cash — pay driver on pickup</td></tr>`
      : data.paymentMethod === 'deposit'
        ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;color:#16a34a;">Deposit paid online — balance due before/at service</td></tr>`
        : `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Payment</td><td style="padding:10px 0;font-weight:bold;color:#16a34a;">Paid online</td></tr>`;

  // Customer and admin emails are sent independently so one failure never blocks the other.
  const customerMail = () => sendMail({
    to: rawData.to,
    kind: 'booking-confirmation',
    bookingRef: rawData.reference,
    subject: `Booking Confirmed – ${rawData.reference}`,
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

  await sendAll('booking confirmation', [customerMail, () => sendAdminBookingAlert(rawData)]);
}

/** Explicit admin inbox alert for every new booking */
export async function sendAdminBookingAlert(rawData: BookingEmailData) {
  const data = escAll(rawData);
  const paymentLabel =
    data.paymentMethod === 'cash'
      ? 'Cash (pay on pickup)'
      : data.paymentMethod === 'inquiry'
        ? 'Inquiry — no payment yet'
        : data.paymentMethod === 'deposit'
          ? 'Deposit paid online'
          : 'Card (paid online)';

  await sendMail({
    to: ADMIN_EMAIL,
    replyTo: EMAIL_RE.test(rawData.to) ? rawData.to : undefined,
    kind: 'admin-booking-alert',
    bookingRef: rawData.reference,
    subject: `New Booking – ${rawData.reference} – ${rawData.totalPrice.toFixed(2)}`,
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
            <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Email</td><td style="padding:10px 0;"><a href="mailto:${esc(rawData.to)}">${esc(rawData.to)}</a></td></tr>
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

export async function sendCancellationEmail(rawData: {
  to: string;
  name: string;
  reference: string;
  refundAmount?: number;
}) {
  const data = escAll(rawData);
  await sendMail({
    to: rawData.to,
    kind: 'cancellation',
    bookingRef: rawData.reference,
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

export async function sendBookingInquiryEmails(rawData: {
  to: string;
  name: string;
  phone: string;
  reference: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  vehicle: string;
  totalPrice: number;
  depositAmount: number;
  distance: number;
  serviceType?: string;
}) {
  const data = escAll(rawData);
  const customerMail = () => sendMail({
    to: rawData.to,
    kind: 'inquiry-customer',
    bookingRef: rawData.reference,
    subject: `Booking request received – ${rawData.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#000;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Request received</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi ${data.name},</p>
          <p>Thank you for your booking request. Our team will review your trip and confirm your finalized pickup window shortly — the same process as our online reservation form.</p>
          <p style="font-weight:bold;">Confirmation code: <span style="font-family:monospace;">${data.reference}</span></p>
          <p style="color:#666;font-size:14px;">No payment was taken online. After we confirm your ride, we will contact you if a deposit is required to hold the vehicle (deposit only — not full prepayment).</p>
          <p style="font-size:13px;color:#888;">Questions? Call ${SUPPORT_PHONE} any time.</p>
        </div>
      </div>
    `,
  });

  // Admin alert first: the team must see every request even if the customer address bounces.
  await sendAll('booking inquiry', [
    () => sendAdminBookingAlert({
      to: rawData.to,
      name: rawData.name,
      phone: rawData.phone,
      reference: rawData.reference,
      pickup: rawData.pickup,
      dropoff: rawData.dropoff,
      date: rawData.date,
      time: rawData.time,
      vehicle: rawData.vehicle,
      totalPrice: rawData.totalPrice,
      distance: rawData.distance,
      paymentMethod: 'inquiry',
    }),
    customerMail,
  ]);
}

export async function sendContactFormEmail(rawData: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const data = escAll(rawData);
  await sendMail({
    to: ADMIN_EMAIL,
    kind: 'contact-form',
    replyTo: EMAIL_RE.test(rawData.email) ? rawData.email : undefined,
    subject: `New Contact Form Submission from ${rawData.name.replace(/[\r\n]+/g, ' ')}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p style="background:#f5f5f5;padding:16px;border-radius:4px;white-space:pre-wrap;">${data.message}</p>
      </div>
    `,
  });
}

export async function sendDriverAssignmentEmail(rawData: {
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
  const data = escAll(rawData);
  await sendMail({
    to: rawData.to,
    kind: 'driver-assigned',
    bookingRef: rawData.reference,
    bcc: ADMIN_EMAIL,
    subject: `Driver Assigned – ${rawData.reference}`,
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

export async function sendAbandonmentEmail(rawData: {
  to: string;
  name: string;
  pickup: string;
  dropoff: string;
  date?: string;
  time?: string;
  resumeUrl: string;
}) {
  const data = escAll(rawData);
  await sendMail({
    to: rawData.to,
    kind: 'abandonment',
    subject: `Your Black Trucks Co booking is saved`,
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

export async function sendReviewRequestEmail(rawData: {
  to: string;
  name: string;
  reference: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  reviewUrl: string;
}) {
  const data = escAll(rawData);
  await sendMail({
    to: rawData.to,
    kind: 'review-request',
    bookingRef: rawData.reference,
    subject: `How was your ride? – ${rawData.reference}`,
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

export async function sendStatusUpdateEmail(rawData: {
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
  const data = escAll(rawData);
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

  const msg = statusMessages[rawData.status];
  if (!msg) return;

  await sendMail({
    to: rawData.to,
    kind: `status-${rawData.status}`,
    bookingRef: rawData.reference,
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
    kind: 'smtp-test',
    subject: 'Black Trucks Co - SMTP test successful',
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

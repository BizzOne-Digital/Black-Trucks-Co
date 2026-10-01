import { prisma } from '@/lib/prisma';
import { sendBookingConfirmation, safeSend } from '@/lib/email';

/**
 * Mark a card booking as paid/confirmed and email customer + admin.
 * Idempotent: if already paid, skips email re-send unless forceEmail is true.
 */
export async function finalizePaidBooking(
  bookingId: string,
  stripeChargeId?: string | null,
  options?: { forceEmail?: boolean }
) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!existing) return null;

  const alreadyPaid = existing.paymentStatus === 'paid';

  const booking = alreadyPaid
    ? existing
    : await prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          ...(stripeChargeId ? { stripeChargeId: String(stripeChargeId) } : {}),
        },
        include: {
          vehicle: { select: { name: true } },
          user: { select: { name: true, email: true, phone: true } },
        },
      });

  const shouldEmail = !alreadyPaid || options?.forceEmail;
  if (!shouldEmail) return booking;

  const email = booking.guestEmail || booking.user?.email;
  const name = booking.guestName || booking.user?.name || 'Customer';
  const phone = booking.guestPhone || booking.user?.phone || undefined;

  if (email) {
    await safeSend(
      () =>
        sendBookingConfirmation({
          to: email,
          name,
          reference: booking.reference,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          date: booking.date,
          time: booking.time,
          vehicle: booking.vehicle.name,
          totalPrice: booking.totalPrice,
          distance: booking.distance,
          paymentMethod: 'card',
          phone: phone || undefined,
        }),
      'booking confirmation (card)'
    );
  }

  return booking;
}

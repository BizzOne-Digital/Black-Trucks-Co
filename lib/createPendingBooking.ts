import { getDb, parseId } from '@/lib/mongodb';
import { generateBookingRef } from '@/lib/generateRef';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';
import type { Session } from 'next-auth';

export type CreateBookingInput = {
  vehicleId: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  distance: number;
  duration: number;
  passengers?: number;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  promoCode?: string;
  serviceType?: string;
  paymentMethod?: string;
};

export type CreateBookingResult =
  | { ok: true; booking: any }
  | { ok: false; status: number; error: string };

export async function createPendingBooking(
  input: CreateBookingInput,
  authSession: Session | null
): Promise<CreateBookingResult> {
  const {
    vehicleId, pickup, dropoff, date, time, distance, duration,
    passengers, guestEmail, guestName, guestPhone, promoCode,
    serviceType, paymentMethod = 'card',
  } = input;

  if (!vehicleId || !pickup || !dropoff || !date || !time) {
    return { ok: false, status: 400, error: 'Missing required fields' };
  }

  // Reject past bookings (allow up to 5 min grace for clock skew)
  const bookingDateTime = new Date(`${date}T${time}`);
  if (isNaN(bookingDateTime.getTime()) || bookingDateTime.getTime() < Date.now() - 5 * 60 * 1000) {
    return { ok: false, status: 400, error: 'Booking date and time must be in the future.' };
  }

  const db = await getDb();
  const vehicleOid = parseId(vehicleId);
  if (!vehicleOid) return { ok: false, status: 400, error: 'Invalid vehicleId' };

  const vehicle = await db.collection('Vehicle').findOne({ _id: vehicleOid });
  if (!vehicle) return { ok: false, status: 404, error: 'Vehicle not found' };
  if (!vehicle.available) return { ok: false, status: 409, error: 'This vehicle is not available for booking' };

  // Time-window conflict check
  const existingBookings = await db.collection('Booking').find(
    { vehicleId: vehicleId, date, status: { $in: BLOCKING_STATUSES } },
    { projection: { time: 1, duration: 1 } }
  ).toArray();

  const requestedStart = timeToMinutes(time);
  const requestedDuration = Math.ceil(duration || 60);
  const conflict = existingBookings.find(b =>
    timesOverlap(timeToMinutes(b.time), Math.ceil(b.duration), requestedStart, requestedDuration)
  );
  if (conflict) {
    return {
      ok: false, status: 409,
      error: `This vehicle is already booked at ${conflict.time} on this date and the time windows overlap. Please choose a different time or vehicle.`,
    };
  }

  const hours = Math.max(Math.ceil((duration / 60) * 2) / 2, vehicle.minimumHours || 1);
  const ridePrice = hours * vehicle.pricePerHour;
  const serviceFee = 5;
  const tax = ridePrice * 0.1;
  let discount = 0;

  if (promoCode) {
    const promo = await db.collection('PromoCode').findOne({
      code: promoCode.toUpperCase(),
      active: true,
      expiresAt: { $gt: new Date() },
    });
    if (promo && promo.usedCount < promo.maxUses && ridePrice >= promo.minBookingAmount) {
      discount = promo.discountType === 'percentage'
        ? (ridePrice * promo.discountValue) / 100
        : promo.discountValue;
      await db.collection('PromoCode').updateOne(
        { _id: promo._id },
        { $inc: { usedCount: 1 } }
      );
    }
  }

  const totalPrice = ridePrice + serviceFee + tax - discount;
  const now = new Date();

  const bookingDoc: any = {
    reference: generateBookingRef(),
    vehicleId: vehicleId,
    pickup, dropoff, date, time,
    distance, duration,
    passengers: passengers || 1,
    ridePrice, serviceFee, tax, discount, totalPrice,
    promoCode: promoCode || null,
    serviceType: serviceType || null,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod,
    stripePaymentIntentId: null,
    stripeCheckoutSessionId: null,
    stripeChargeId: null,
    notes: null,
    cancelReason: null,
    cancelledAt: null,
    completedAt: null,
    reviewSent: false,
    driverId: null,
    createdAt: now,
    updatedAt: now,
  };

  if (authSession?.user) {
    bookingDoc.userId = (authSession.user as any).id;
    bookingDoc.guestEmail = null;
    bookingDoc.guestName = null;
    bookingDoc.guestPhone = null;
  } else {
    if (!guestEmail || !guestName) {
      return { ok: false, status: 400, error: 'Guest name and email required' };
    }
    bookingDoc.userId = null;
    bookingDoc.guestEmail = guestEmail;
    bookingDoc.guestName = guestName;
    bookingDoc.guestPhone = guestPhone || null;
  }

  try {
    const result = await db.collection('Booking').insertOne(bookingDoc);

    // Clear abandoned booking for logged-in user
    if (authSession?.user) {
      const uid = (authSession.user as any).id;
      await db.collection('AbandonedBooking').deleteMany({ userId: uid }).catch(() => {});
    }

    const booking = { ...bookingDoc, id: result.insertedId.toString(), _id: undefined };
    return { ok: true, booking };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

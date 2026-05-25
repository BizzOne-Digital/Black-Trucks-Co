import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { generateBookingRef } from '@/lib/generateRef';
import { sendBookingConfirmation } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'You must be logged in to book' }, { status: 401 });

    const body = await req.json();
    const { vehicleId, pickup, dropoff, date, time, distance, duration, promoCode, serviceType } = body;

    if (!vehicleId || !pickup || !dropoff || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Reject past bookings (5 min grace for clock skew)
    const bookingDateTime = new Date(`${date}T${time}`);
    if (isNaN(bookingDateTime.getTime()) || bookingDateTime.getTime() < Date.now() - 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Booking date and time must be in the future.' }, { status: 400 });
    }

    const db = await getDb();
    const vehicleOid = parseId(vehicleId);
    if (!vehicleOid) return NextResponse.json({ error: 'Invalid vehicleId' }, { status: 400 });

    const vehicle = await db.collection('Vehicle').findOne({ _id: vehicleOid });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (!vehicle.available) return NextResponse.json({ error: 'This vehicle is not available' }, { status: 409 });

    // Conflict check
    const existingBookings = await db.collection('Booking').find(
      { vehicleId, date, status: { $in: BLOCKING_STATUSES } },
      { projection: { time: 1, duration: 1 } }
    ).toArray();

    const requestedStart = timeToMinutes(time);
    const requestedDuration = Math.ceil(duration || 60);
    const conflict = existingBookings.find(b =>
      timesOverlap(timeToMinutes(b.time), Math.ceil(b.duration), requestedStart, requestedDuration)
    );
    if (conflict) {
      return NextResponse.json({
        error: `This vehicle is already booked at ${conflict.time} on this date. Please choose a different time or vehicle.`,
      }, { status: 409 });
    }

    const userId = (session.user as any).id;
    const user = await db.collection('User').findOne({ _id: oid(userId) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hours = Math.max(Math.ceil((duration / 60) * 2) / 2, vehicle.minimumHours || 1);
    const ridePrice = hours * vehicle.pricePerHour;
    const serviceFee = 5;
    const tax = ridePrice * 0.1;
    let discount = 0;

    if (promoCode) {
      const promo = await db.collection('PromoCode').findOne({
        code: promoCode.toUpperCase(), active: true, expiresAt: { $gt: new Date() },
      });
      if (promo && promo.usedCount < promo.maxUses && ridePrice >= promo.minBookingAmount) {
        discount = promo.discountType === 'percentage' ? (ridePrice * promo.discountValue) / 100 : promo.discountValue;
        await db.collection('PromoCode').updateOne({ _id: promo._id }, { $inc: { usedCount: 1 } });
      }
    }

    const totalPrice = ridePrice + serviceFee + tax - discount;
    const now = new Date();

    const bookingDoc = {
      reference: generateBookingRef(),
      userId, vehicleId, pickup, dropoff, date, time,
      distance, duration, passengers: 1,
      ridePrice, serviceFee, tax, discount, totalPrice,
      promoCode: promoCode || null, serviceType: serviceType || null,
      status: 'confirmed', paymentStatus: 'pending', paymentMethod: 'cash',
      stripePaymentIntentId: null, stripeCheckoutSessionId: null, stripeChargeId: null,
      driverId: null, notes: null, cancelReason: null, cancelledAt: null,
      completedAt: null, reviewSent: false,
      guestEmail: null, guestName: null, guestPhone: null,
      createdAt: now, updatedAt: now,
    };

    const result = await db.collection('Booking').insertOne(bookingDoc);
    const booking = { ...bookingDoc, id: result.insertedId.toString() };

    // Clear abandoned booking
    await db.collection('AbandonedBooking').deleteMany({ userId }).catch(() => {});

    // Send confirmation email
    await sendBookingConfirmation({
      to: user.email, name: user.name,
      reference: booking.reference,
      pickup: booking.pickup, dropoff: booking.dropoff,
      date: booking.date, time: booking.time,
      vehicle: vehicle.name,
      totalPrice: booking.totalPrice, distance: booking.distance,
      paymentMethod: 'cash',
    }).catch(e => console.error('Email failed:', e.message));

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    console.error('[bookings/cash]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

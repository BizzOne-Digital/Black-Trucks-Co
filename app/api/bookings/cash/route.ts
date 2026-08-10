import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBookingRef } from '@/lib/generateRef';
import { sendBookingConfirmation, safeSend } from '@/lib/email';
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

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (!vehicle.available) return NextResponse.json({ error: 'This vehicle is not available for booking' }, { status: 409 });

    // Time-window conflict check
    const existingBookings = await prisma.booking.findMany({
      where: { vehicleId, date, status: { in: BLOCKING_STATUSES } },
      select: { time: true, duration: true },
    });
    const requestedStart = timeToMinutes(time);
    const requestedDuration = Math.ceil(duration || 60);
    const conflict = existingBookings.find(b =>
      timesOverlap(timeToMinutes(b.time), Math.ceil(b.duration), requestedStart, requestedDuration)
    );
    if (conflict) {
      return NextResponse.json({
        error: `This vehicle is already booked at ${conflict.time} on this date and the time windows overlap. Please choose a different time or vehicle.`,
      }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hours = Math.max(
      Math.ceil((duration / 60) * 2) / 2,
      (vehicle as any).minimumHours || 1
    );
    const ridePrice = hours * (vehicle as any).pricePerHour;
    const serviceFee = 5;
    const tax = ridePrice * 0.1;
    let discount = 0;

    if (promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: { code: promoCode.toUpperCase(), active: true, expiresAt: { gt: new Date() } },
      });
      if (promo && promo.usedCount < promo.maxUses && ridePrice >= promo.minBookingAmount) {
        discount = promo.discountType === 'percentage' ? (ridePrice * promo.discountValue) / 100 : promo.discountValue;
        await prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    const totalPrice = ridePrice + serviceFee + tax - discount;

    const booking = await prisma.booking.create({
      data: {
        reference: generateBookingRef(),
        userId: user.id,
        vehicleId,
        pickup, dropoff, date, time,
        distance, duration,
        passengers: 1,
        ridePrice, serviceFee, tax, discount, totalPrice,
        promoCode, serviceType,
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'cash',
      },
    });

    // Clear any abandoned booking record for this user
    await (prisma as any).abandonedBooking.deleteMany({ where: { userId: user.id } }).catch(() => {});

    // Customer + admin emails (never fail the booking if SMTP misconfigured)
    await safeSend(
      () =>
        sendBookingConfirmation({
          to: user.email,
          name: user.name,
          reference: booking.reference,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          date: booking.date,
          time: booking.time,
          vehicle: vehicle.name,
          totalPrice: booking.totalPrice,
          distance: booking.distance,
          paymentMethod: 'cash',
          phone: user.phone || undefined,
        }),
      'booking confirmation (cash)'
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

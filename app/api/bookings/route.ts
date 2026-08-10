import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBookingRef } from '@/lib/generateRef';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { vehicleId, pickup, dropoff, date, time, distance, duration, passengers, guestEmail, guestName, guestPhone, promoCode, serviceType } = body;

    if (!vehicleId || !pickup || !dropoff || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    if (!vehicle.available) return NextResponse.json({ error: 'This vehicle is not available for booking' }, { status: 409 });

    // Time-window conflict check — only block if windows actually overlap
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

    const hours = Math.max(
      Math.ceil((duration / 60) * 2) / 2,
      (vehicle as any).minimumHours || 1
    ); // round up to nearest 0.5h, then enforce minimum
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

    const bookingData: any = {
      reference: generateBookingRef(),
      vehicleId, pickup, dropoff, date, time,
      distance, duration,
      passengers: passengers || 1,
      ridePrice, serviceFee, tax, discount, totalPrice,
      promoCode, serviceType,
      status: 'pending', paymentStatus: 'pending',
    };

    if (session?.user) {
      bookingData.userId = (session.user as any).id;
    } else {
      if (!guestEmail || !guestName) return NextResponse.json({ error: 'Guest name and email required' }, { status: 400 });
      bookingData.guestEmail = guestEmail;
      bookingData.guestName = guestName;
      bookingData.guestPhone = guestPhone;
    }

    const booking = await prisma.booking.create({ data: bookingData });

    // Clear any abandoned booking record for this user
    if (session?.user) {
      await (prisma as any).abandonedBooking.deleteMany({ where: { userId: (session.user as any).id } }).catch(() => {});
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const isAdmin = (session.user as any).role === 'admin';
    const where = isAdmin ? {} : { userId: (session.user as any).id };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({ where, include: { vehicle: true, driver: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

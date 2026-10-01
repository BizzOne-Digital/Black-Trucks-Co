import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPendingBooking } from '@/lib/createPendingBooking';
import { sendBookingInquiryEmails, safeSend } from '@/lib/email';
import { getDb, parseId } from '@/lib/mongodb';
import { depositFromTotal } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      pickup,
      dropoff,
      date,
      time,
      serviceType,
      serviceStyle,
      passengers,
      bags,
      roundTrip,
      returnDate,
      returnTime,
      notes,
      vehicleId,
      distance,
      duration,
    } = body;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name, email and phone are required' }, { status: 400 });
    }
    if (!pickup?.trim() || !date || !time) {
      return NextResponse.json({ error: 'Pickup location, date and time are required' }, { status: 400 });
    }

    const isHourly = serviceStyle === 'hourly';
    const drop = isHourly ? pickup : (dropoff?.trim() || pickup);
    if (!isHourly && !dropoff?.trim()) {
      return NextResponse.json({ error: 'Drop-off location is required' }, { status: 400 });
    }

    const dist = Number(distance);
    const dur = Number(duration);
    const tripDistance = Number.isFinite(dist) && dist > 0 ? dist : 10;
    const tripDuration = Number.isFinite(dur) && dur > 0 ? dur : isHourly ? 120 : 60;

    const session = await getServerSession(authOptions);

    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId) {
      const db = await getDb();
      const vehicle = await db.collection('Vehicle').findOne(
        { available: true },
        { sort: { pricePerHour: 1 } }
      );
      if (!vehicle) {
        return NextResponse.json({ error: 'No vehicles are available. Please call us to book.' }, { status: 503 });
      }
      resolvedVehicleId = vehicle._id.toString();
    }

    const noteParts: string[] = [];
    if (notes?.trim()) noteParts.push(notes.trim());
    if (bags) noteParts.push(`Bags: ${bags}`);
    if (roundTrip) {
      noteParts.push(
        `Round trip — return ${returnDate || 'TBD'} at ${returnTime || 'TBD'}`
      );
    }
    noteParts.push('Submitted via booking inquiry form (not paid online yet).');

    const result = await createPendingBooking(
      {
        vehicleId: resolvedVehicleId,
        pickup: pickup.trim(),
        dropoff: drop,
        date,
        time,
        distance: tripDistance,
        duration: tripDuration,
        passengers: passengers ? Number(passengers) : 1,
        guestEmail: email.trim(),
        guestName: name.trim(),
        guestPhone: phone.trim(),
        serviceType: serviceType || (isHourly ? 'hourly' : 'point-to-point'),
        paymentMethod: 'inquiry',
      },
      session
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const booking = result.booking;
    const db = await getDb();
    if (noteParts.length) {
      await db.collection('Booking').updateOne(
        { reference: booking.reference },
        { $set: { notes: noteParts.join('\n'), paymentStatus: 'awaiting_confirmation', updatedAt: new Date() } }
      );
    } else {
      await db.collection('Booking').updateOne(
        { reference: booking.reference },
        { $set: { paymentStatus: 'awaiting_confirmation', updatedAt: new Date() } }
      );
    }

    const vehicleOid = parseId(resolvedVehicleId);
    const vehicle = vehicleOid
      ? await db.collection('Vehicle').findOne({ _id: vehicleOid }, { projection: { name: 1 } })
      : null;
    const deposit = depositFromTotal(booking.totalPrice);

    await safeSend(
      () =>
        sendBookingInquiryEmails({
          to: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          reference: booking.reference,
          pickup: pickup.trim(),
          dropoff: drop,
          date,
          time,
          vehicle: vehicle?.name || 'Chauffeur vehicle',
          totalPrice: booking.totalPrice,
          depositAmount: deposit,
          distance: tripDistance,
          serviceType: serviceType || '',
        }),
      'booking inquiry'
    );

    return NextResponse.json({
      reference: booking.reference,
      totalPrice: booking.totalPrice,
      depositAmount: deposit,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not submit request';
    console.error('[booking-inquiry]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

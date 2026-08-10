import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Called when a logged-in user reaches the Summary step → "Choose Vehicle"
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false }); // guests: silently skip

    const userId = (session.user as any).id;
    const body = await req.json();

    await (prisma as any).abandonedBooking.upsert({
      where: { userId },
      update: {
        pickup: body.pickup,
        dropoff: body.dropoff,
        date: body.date || null,
        time: body.time || null,
        distance: body.distance || null,
        duration: body.duration || null,
        serviceType: body.serviceType || null,
        vehicleId: body.vehicleId || null,
        step: body.step || 0,
        emailSent: false, // reset so a new reminder can go out
        updatedAt: new Date(),
      },
      create: {
        userId,
        pickup: body.pickup,
        dropoff: body.dropoff,
        date: body.date || null,
        time: body.time || null,
        distance: body.distance || null,
        duration: body.duration || null,
        serviceType: body.serviceType || null,
        vehicleId: body.vehicleId || null,
        step: body.step || 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Non-critical — never break the booking flow
    console.error('abandon track error:', err.message);
    return NextResponse.json({ ok: false });
  }
}

// Called after a booking is successfully completed — clears the abandoned record
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false });

    const userId = (session.user as any).id;
    await (prisma as any).abandonedBooking.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const date = searchParams.get('date');   // "YYYY-MM-DD"
    const time = searchParams.get('time');   // "HH:MM" — requested pickup time
    const duration = parseInt(searchParams.get('duration') || '0'); // minutes

    const session = all ? await getServerSession(authOptions) : null;
    const isAdmin = session && (session.user as any).role === 'admin';

    const vehicles = await prisma.vehicle.findMany({
      where: all && isAdmin ? {} : { available: true },
      orderBy: { pricePerHour: 'asc' },
    });

    if (date) {
      // Fetch all active bookings on this date with their time + duration
      const bookings = await prisma.booking.findMany({
        where: { date, status: { in: BLOCKING_STATUSES } },
        select: { vehicleId: true, time: true, duration: true },
      });

      // Build map: vehicleId → list of {startMin, durationMin}
      const bookedMap: Record<string, { startMin: number; durationMin: number }[]> = {};
      for (const b of bookings) {
        if (!bookedMap[b.vehicleId]) bookedMap[b.vehicleId] = [];
        bookedMap[b.vehicleId].push({
          startMin: timeToMinutes(b.time),
          durationMin: Math.ceil(b.duration), // duration stored in minutes
        });
      }

      const requestedStart = time ? timeToMinutes(time) : null;
      const requestedDuration = duration || 60; // default 60min if unknown

      const annotated = vehicles.map(v => {
        const slots = bookedMap[v.id] || [];

        // If no time requested, mark unavailable if ANY booking exists that day
        let isAvailableOnDate = true;
        let conflictingSlots: string[] = [];

        if (requestedStart !== null) {
          // Check time-window overlap
          for (const slot of slots) {
            if (timesOverlap(slot.startMin, slot.durationMin, requestedStart, requestedDuration)) {
              isAvailableOnDate = false;
              const endH = Math.floor((slot.startMin + slot.durationMin) / 60);
              const endM = (slot.startMin + slot.durationMin) % 60;
              conflictingSlots.push(
                `${String(Math.floor(slot.startMin / 60)).padStart(2, '0')}:${String(slot.startMin % 60).padStart(2, '0')}–${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
              );
            }
          }
        } else {
          // No time given — just flag if any booking exists
          isAvailableOnDate = slots.length === 0;
          conflictingSlots = slots.map(s =>
            `${String(Math.floor(s.startMin / 60)).padStart(2, '0')}:${String(s.startMin % 60).padStart(2, '0')}`
          );
        }

        return { ...v, isAvailableOnDate, bookedTimes: conflictingSlots };
      });

      return NextResponse.json({ vehicles: annotated });
    }

    return NextResponse.json({ vehicles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const vehicle = await prisma.vehicle.create({ data: body });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

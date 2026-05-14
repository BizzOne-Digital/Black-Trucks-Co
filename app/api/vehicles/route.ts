import { NextRequest, NextResponse } from 'next/server';
import { getDb, toIds, toId, ObjectId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const duration = parseInt(searchParams.get('duration') || '0');

    const session = all ? await getServerSession(authOptions) : null;
    const isAdmin = session && (session.user as any).role === 'admin';

    const db = await getDb();

    const filter = all && isAdmin ? {} : { available: true };
    const rawVehicles = await db.collection('Vehicle').find(filter).sort({ pricePerHour: 1 }).toArray();
    const vehicles = toIds(rawVehicles);

    if (date) {
      const bookings = await db.collection('Booking').find(
        { date, status: { $in: BLOCKING_STATUSES } },
        { projection: { vehicleId: 1, time: 1, duration: 1 } }
      ).toArray();

      const bookedMap: Record<string, { startMin: number; durationMin: number }[]> = {};
      for (const b of bookings) {
        const vid = b.vehicleId?.toString();
        if (!vid) continue;
        if (!bookedMap[vid]) bookedMap[vid] = [];
        bookedMap[vid].push({
          startMin: timeToMinutes(b.time),
          durationMin: Math.ceil(b.duration),
        });
      }

      const requestedStart = time ? timeToMinutes(time) : null;
      const requestedDuration = duration || 60;

      const annotated = vehicles.map((v: any) => {
        const slots = bookedMap[v.id] || [];
        let isAvailableOnDate = true;
        let conflictingSlots: string[] = [];

        if (requestedStart !== null) {
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
    console.error('[vehicles GET]', err.message);
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
    const db = await getDb();
    const now = new Date();
    const result = await db.collection('Vehicle').insertOne({
      ...body,
      available: body.available ?? true,
      createdAt: now,
      updatedAt: now,
    });
    const vehicle = toId(await db.collection('Vehicle').findOne({ _id: result.insertedId }));
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err: any) {
    console.error('[vehicles POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

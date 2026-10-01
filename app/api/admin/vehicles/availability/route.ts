import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOCKING_STATUSES, timeToMinutes } from '@/lib/availability';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const vehicles = await prisma.vehicle.findMany({ orderBy: { name: 'asc' } });

    const bookings = await prisma.booking.findMany({
      where: { date, status: { in: BLOCKING_STATUSES } },
      select: {
        vehicleId: true,
        reference: true,
        time: true,
        duration: true,
        status: true,
        guestName: true,
        user: { select: { name: true } },
      },
    });

    const bookingsByVehicle: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      if (!bookingsByVehicle[b.vehicleId]) bookingsByVehicle[b.vehicleId] = [];
      bookingsByVehicle[b.vehicleId].push(b);
    }

    const result = vehicles.map(v => {
      const slots = bookingsByVehicle[v.id] || [];

      // Build human-readable time windows for each booking
      const bookingsOnDate = slots.map(b => {
        const startMin = timeToMinutes(b.time);
        const endMin = startMin + Math.ceil(b.duration);
        const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        return {
          reference: b.reference,
          time: b.time,
          endTime,
          duration: Math.ceil(b.duration),
          status: b.status,
          customer: b.guestName || b.user?.name || 'Guest',
        };
      });

      return {
        id: v.id,
        name: v.name,
        category: v.category,
        available: v.available,
        isAvailableOnDate: slots.length === 0,
        bookingsOnDate,
      };
    });

    return NextResponse.json({ date, vehicles: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

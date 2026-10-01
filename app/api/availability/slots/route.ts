import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BLOCKING_STATUSES, timeToMinutes, timesOverlap } from '@/lib/availability';

export const dynamic = 'force-dynamic';

const SLOT_STEP_MIN = 30;
const SERVICE_DURATION_MIN = 60;
/** First slot 6:00 AM, last start 11:00 PM */
const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 23 * 60;

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: { date, status: { in: BLOCKING_STATUSES } },
      select: { time: true, duration: true },
    });

    const slots: string[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = date === todayStr;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (let start = DAY_START_MIN; start <= DAY_END_MIN; start += SLOT_STEP_MIN) {
      if (isToday && start <= nowMinutes) continue;

      const taken = bookings.some((b) =>
        timesOverlap(timeToMinutes(b.time), Math.ceil(b.duration || SERVICE_DURATION_MIN), start, SERVICE_DURATION_MIN)
      );
      if (!taken) slots.push(formatTime(start));
    }

    return NextResponse.json({ date, slots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const reviews = await prisma.review.findMany({
      where: vehicleId ? { vehicleId } : {},
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { bookingId, rating, comment } = await req.json();
    if (!bookingId || !rating || !comment) {
      return NextResponse.json({ error: 'bookingId, rating and comment are required' }, { status: 400 });
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed bookings' }, { status: 400 });
    }
    const existing = await prisma.review.findUnique({ where: { bookingId } });
    if (existing) return NextResponse.json({ error: 'Review already submitted' }, { status: 409 });

    const review = await prisma.review.create({
      data: {
        bookingId,
        userId: session ? (session.user as any).id : undefined,
        guestName: booking.guestName ?? undefined,
        vehicleId: booking.vehicleId,
        rating,
        comment,
      },
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

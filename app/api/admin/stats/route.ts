import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [totalBookings, confirmedBookings, completedBookings, cancelledBookings, totalUsers, totalVehicles, revenueResult, recentBookings] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'confirmed' } }),
      prisma.booking.count({ where: { status: 'completed' } }),
      prisma.booking.count({ where: { status: 'cancelled' } }),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.vehicle.count(),
      prisma.booking.aggregate({ where: { paymentStatus: 'paid' }, _sum: { totalPrice: true } }),
      prisma.booking.findMany({ include: { vehicle: { select: { name: true, category: true } }, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return NextResponse.json({
      totalBookings, confirmedBookings, completedBookings, cancelledBookings,
      totalUsers, totalVehicles,
      totalRevenue: revenueResult._sum.totalPrice || 0,
      recentBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

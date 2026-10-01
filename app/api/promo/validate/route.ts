import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { code, amount } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const promo = await prisma.promoCode.findFirst({
      where: { code: code.toUpperCase(), active: true, expiresAt: { gt: new Date() } },
    });

    if (!promo || promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired promo code' });
    }
    if (amount && amount < promo.minBookingAmount) {
      return NextResponse.json({ valid: false, error: `Minimum booking amount of $${promo.minBookingAmount} required` });
    }

    const discount = promo.discountType === 'percentage' ? (amount * promo.discountValue) / 100 : promo.discountValue;
    return NextResponse.json({ valid: true, discountType: promo.discountType, discountValue: promo.discountValue, discount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

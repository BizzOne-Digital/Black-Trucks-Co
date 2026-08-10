import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function adminGuard(session: any) {
  return !session || (session.user as any).role !== 'admin';
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const promo = await prisma.promoCode.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ promo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.promoCode.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Promo code deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

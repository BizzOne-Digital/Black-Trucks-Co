import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
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
    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('PromoCode').updateOne({ _id: oid }, { $set: { ...body, updatedAt: new Date() } });
    const promo = await db.collection('PromoCode').findOne({ _id: oid });
    return NextResponse.json({ promo: { ...promo, id: promo!._id.toString(), _id: undefined } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('PromoCode').deleteOne({ _id: oid });
    return NextResponse.json({ message: 'Promo code deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

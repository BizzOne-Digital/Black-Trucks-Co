import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = await getDb();
    const raw = await db.collection('PromoCode').find({}).sort({ createdAt: -1 }).toArray();
    const promos = raw.map(p => ({ ...p, id: p._id.toString(), _id: undefined }));
    return NextResponse.json({ promos });
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
    const db = await getDb();
    const now = new Date();
    const result = await db.collection('PromoCode').insertOne({
      ...body,
      code: body.code.toUpperCase(),
      usedCount: body.usedCount ?? 0,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
    const promo = await db.collection('PromoCode').findOne({ _id: result.insertedId });
    return NextResponse.json({ promo: { ...promo, id: promo!._id.toString(), _id: undefined } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

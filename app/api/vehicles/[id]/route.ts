import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const raw = await db.collection('Vehicle').findOne({ _id: oid });
    if (!raw) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    const vehicle = { ...raw, id: raw._id.toString(), _id: undefined };
    return NextResponse.json({ vehicle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('Vehicle').updateOne({ _id: oid }, { $set: { ...body, updatedAt: new Date() } });
    const raw = await db.collection('Vehicle').findOne({ _id: oid });
    const vehicle = { ...raw, id: raw!._id.toString(), _id: undefined };
    return NextResponse.json({ vehicle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('Vehicle').deleteOne({ _id: oid });
    return NextResponse.json({ message: 'Vehicle deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

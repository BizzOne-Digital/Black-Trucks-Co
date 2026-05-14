import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function adminGuard(session: any) {
  return !session || (session.user as any).role !== 'admin';
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const raw = await db.collection('User').findOne({ _id: oid }, { projection: { password: 0 } });
    if (!raw) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const rawBookings = await db.collection('Booking').find({ userId: params.id }).sort({ createdAt: -1 }).limit(10).toArray();
    const bookings = await Promise.all(rawBookings.map(async (b) => {
      const vehicle = b.vehicleId ? await db.collection('Vehicle').findOne({ _id: parseId(b.vehicleId.toString()) }, { projection: { name: 1 } }) : null;
      return { ...b, id: b._id.toString(), _id: undefined, vehicle: vehicle ? { name: vehicle.name } : null };
    }));

    const user = { ...raw, id: raw._id.toString(), _id: undefined, bookings };
    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const allowed = ['name', 'phone', 'role'];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    data.updatedAt = new Date();

    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('User').updateOne({ _id: oid }, { $set: data });
    const updated = await db.collection('User').findOne({ _id: oid }, { projection: { password: 0 } });
    const user = { ...updated, id: updated!._id.toString(), _id: undefined };
    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (adminGuard(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const self = (session!.user as any).id;
    if (self === params.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

    const db = await getDb();
    const oid = parseId(params.id);
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await db.collection('User').deleteOne({ _id: oid });
    return NextResponse.json({ message: 'User deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

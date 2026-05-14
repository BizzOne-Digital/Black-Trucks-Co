import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId, oid } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendStatusUpdateEmail } from '@/lib/email';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const docId = parseId(params.id);
    if (!docId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const raw = await db.collection('Booking').findOne({ _id: docId });
    if (!raw) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const vehicle = raw.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(raw.vehicleId?.toString()) }) : null;
    const driver = raw.driverId ? await db.collection('User').findOne({ _id: oid(raw.driverId?.toString()) }, { projection: { name: 1, phone: 1, email: 1 } }) : null;

    const booking = {
      ...raw, id: raw._id.toString(), _id: undefined,
      vehicle: vehicle ? { ...vehicle, id: vehicle._id.toString(), _id: undefined } : null,
      driver: driver ? { name: driver.name, phone: driver.phone, email: driver.email } : null,
    };

    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const isAdmin = (session.user as any).role === 'admin';

    if (!isAdmin && body.status && body.status !== 'cancelled') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const docId = parseId(params.id);
    if (!docId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const before = await db.collection('Booking').findOne({ _id: docId });
    if (!before) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const updateData = { ...body, updatedAt: new Date() };
    await db.collection('Booking').updateOne({ _id: docId }, { $set: updateData });

    const updated = await db.collection('Booking').findOne({ _id: docId });
    const vehicle = updated?.vehicleId ? await db.collection('Vehicle').findOne({ _id: oid(updated.vehicleId?.toString()) }) : null;
    const driver = updated?.driverId ? await db.collection('User').findOne({ _id: oid(updated.driverId?.toString()) }, { projection: { name: 1, phone: 1 } }) : null;

    const booking = {
      ...updated, id: updated!._id.toString(), _id: undefined,
      vehicle: vehicle ? { ...vehicle, id: vehicle._id.toString(), _id: undefined } : null,
      driver: driver ? { name: driver.name, phone: driver.phone } : null,
    };

    if (body.status && before.status !== body.status) {
      const user = before.userId ? await db.collection('User').findOne({ _id: oid(before.userId?.toString()) }, { projection: { name: 1, email: 1 } }) : null;
      const email = before.guestEmail || user?.email;
      const name = before.guestName || user?.name || 'Valued Customer';
      const beforeVehicle = vehicle ? vehicle.name : '';

      if (email) {
        sendStatusUpdateEmail({
          to: email, name,
          reference: before.reference,
          status: body.status,
          vehicle: beforeVehicle,
          pickup: before.pickup,
          date: before.date,
          time: before.time,
          driverName: driver?.name,
          driverPhone: driver?.phone,
        }).catch(e => console.error('Status email failed:', e.message));
      }
    }

    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

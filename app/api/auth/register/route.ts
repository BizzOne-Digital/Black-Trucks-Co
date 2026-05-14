import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseId } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection('User').findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();
    const result = await db.collection('User').insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      phone: phone || null,
      role: 'user',
      emailVerified: null,
      image: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { message: 'Account created successfully', userId: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[register]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

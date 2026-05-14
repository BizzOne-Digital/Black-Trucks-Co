import { NextRequest, NextResponse } from 'next/server';
import { getDistanceAndDuration } from '@/lib/maps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination, originCoords, destinationCoords } = body;

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const result = await getDistanceAndDuration({
      origin,
      destination,
      originCoords,      // [lng, lat] — passed from AddressInput when user picks from dropdown
      destinationCoords, // skips geocoding, faster + more accurate
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

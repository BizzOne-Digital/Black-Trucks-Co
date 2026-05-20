import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Try ORS first if key is available (more accurate, better suggestions)
    const orsKey = process.env.ORS_API_KEY;
    if (orsKey) {
      const params = new URLSearchParams({
        api_key: orsKey,
        text: query,
        size: '8',
        layers: 'venue,address,street,neighbourhood,locality,localadmin,county,region',
      });

      const res = await fetch(
        `https://api.openrouteservice.org/geocode/autocomplete?${params}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (res.ok) {
        const data = await res.json();
        const results = (data?.features || []).map((f: any) => ({
          label: f.properties.label,
          value: f.properties.label,
          coords: f.geometry.coordinates as [number, number],
        }));
        if (results.length > 0) return NextResponse.json({ results });
      }
    }

    // Fallback: Nominatim (OpenStreetMap) — free, no key required
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '8',
        countrycodes: 'ca,us', // Canada + US (adjust if needed)
      }),
      {
        headers: {
          // Nominatim requires a User-Agent
          'User-Agent': 'BlackTrucksCo/1.0 (blacktrucksco@hotmail.com)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!nominatimRes.ok) return NextResponse.json({ results: [] });

    const nominatimData = await nominatimRes.json();

    const results = (nominatimData || []).map((item: any) => ({
      label: item.display_name,
      value: item.display_name,
      coords: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

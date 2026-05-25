import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Priority cities — results containing these are ranked first
const PRIORITY_CITIES = [
  'toronto', 'mississauga', 'brampton', 'vaughan', 'markham',
  'scarborough', 'north york', 'etobicoke', 'richmond hill',
  'oakville', 'burlington', 'ajax', 'pickering', 'whitby',
  'oshawa', 'newmarket', 'aurora', 'king city', 'woodbridge',
  'montreal', 'new york', 'brooklyn', 'manhattan', 'queens',
  'bronx', 'newark', 'jersey city',
];

function priorityScore(label: string): number {
  const lower = label.toLowerCase();
  for (let i = 0; i < PRIORITY_CITIES.length; i++) {
    if (lower.includes(PRIORITY_CITIES[i])) return i;
  }
  return PRIORITY_CITIES.length;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const orsKey = process.env.ORS_API_KEY;

    if (orsKey) {
      // ORS with bounding box: covers GTA → Montreal → New York corridor
      const params = new URLSearchParams({
        api_key: orsKey,
        text: query,
        size: '10',
        // Bounding box: SW corner (NY area) to NE corner (Montreal area)
        'boundary.rect.min_lon': '-79.9',
        'boundary.rect.min_lat': '40.4', // includes New York
        'boundary.rect.max_lon': '-73.4',
        'boundary.rect.max_lat': '45.7', // includes Montreal
        'boundary.country': 'CA,US',
        layers: 'venue,address,street,neighbourhood,locality,localadmin,county',
        lang: 'en',
      });

      const res = await fetch(
        `https://api.openrouteservice.org/geocode/autocomplete?${params}`,
        { headers: { Accept: 'application/json' } }
      );

      if (res.ok) {
        const data = await res.json();
        const features: any[] = data?.features || [];

        const results = features
          .map((f: any) => ({
            label: f.properties.label,
            value: f.properties.label,
            coords: f.geometry.coordinates as [number, number],
            _score: priorityScore(f.properties.label),
          }))
          .sort((a, b) => a._score - b._score)
          .slice(0, 8)
          .map(({ _score: _s, ...r }) => r);

        if (results.length > 0) return NextResponse.json({ results });
      }
    }

    // Fallback: Nominatim restricted to CA + US with viewbox around GTA/NY/Montreal
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '10',
          countrycodes: 'ca,us',
          // viewbox: W, N, E, S  (GTA to NY corridor)
          viewbox: '-79.9,45.7,-73.4,40.4',
          bounded: '0', // soft bound — prefer inside but allow nearby
        }),
      {
        headers: {
          'User-Agent': 'BlackTrucksCo/1.0 (blacktrucksco@hotmail.com)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!nominatimRes.ok) return NextResponse.json({ results: [] });

    const nominatimData: any[] = await nominatimRes.json();

    const results = nominatimData
      .map((item: any) => ({
        label: item.display_name,
        value: item.display_name,
        coords: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
        _score: priorityScore(item.display_name),
      }))
      .sort((a, b) => a._score - b._score)
      .slice(0, 8)
      .map(({ _score: _s, ...r }) => r);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

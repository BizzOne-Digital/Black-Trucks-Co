import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Format a Photon feature into a clean readable label
function formatPhotonLabel(f: any): string {
  const p = f.properties || {};
  const parts: string[] = [];

  // Street address
  if (p.housenumber && p.street) {
    parts.push(`${p.housenumber} ${p.street}`);
  } else if (p.street) {
    parts.push(p.street);
  } else if (p.name) {
    parts.push(p.name);
  }

  // Suburb / district
  if (p.district && p.district !== p.city) parts.push(p.district);
  else if (p.suburb && p.suburb !== p.city) parts.push(p.suburb);

  // City
  const city = p.city || p.town || p.village || '';
  if (city) parts.push(city);

  // Province
  if (p.state) parts.push(p.state);

  return parts.filter(Boolean).join(', ');
}

// Deduplicate results by label
function dedupe(results: any[]): any[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // ── Primary: Photon (OpenStreetMap-based, free, no key, great prefix matching) ──
    // Focus on Toronto, bounding box around GTA
    const photonParams = new URLSearchParams({
      q: query,
      limit: '8',
      lang: 'en',
      lon: '-79.3832',  // focus: Toronto
      lat: '43.6532',
    });

    const photonRes = await fetch(
      `https://photon.komoot.io/api/?${photonParams}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'BlackTrucksCo/1.0',
        },
      }
    );

    if (photonRes.ok) {
      const data = await photonRes.json();
      const features: any[] = data?.features || [];

      // Filter to Canada only and GTA/Ontario area
      const filtered = features.filter((f: any) => {
        const p = f.properties || {};
        if (p.country !== 'Canada') return false;
        // Keep Ontario results, or results near Toronto (within ~200km)
        const [lon, lat] = f.geometry?.coordinates || [0, 0];
        const inOntario = p.state === 'Ontario';
        const nearToronto = Math.abs(lon - (-79.38)) < 3 && Math.abs(lat - 43.65) < 2;
        return inOntario || nearToronto;
      });

      if (filtered.length > 0) {
        const results = dedupe(
          filtered.map((f: any) => ({
            label: formatPhotonLabel(f),
            value: formatPhotonLabel(f),
            coords: f.geometry.coordinates as [number, number],
          })).filter(r => r.label.length > 0)
        );
        if (results.length > 0) return NextResponse.json({ results });
      }
    }

    // ── Fallback: ORS with focus on Toronto ──────────────────────────────
    const orsKey = process.env.ORS_API_KEY;
    if (orsKey) {
      const params = new URLSearchParams({
        api_key: orsKey,
        text: query,
        size: '8',
        layers: 'address,street,venue,neighbourhood,locality',
        'focus.point.lon': '-79.3832',
        'focus.point.lat': '43.6532',
        'boundary.country': 'CA',
        lang: 'en',
      });

      const res = await fetch(
        `https://api.openrouteservice.org/geocode/autocomplete?${params}`,
        { headers: { Accept: 'application/json' } }
      );

      if (res.ok) {
        const data = await res.json();
        const features: any[] = data?.features || [];
        if (features.length > 0) {
          const results = features.map((f: any) => ({
            label: f.properties.label,
            value: f.properties.label,
            coords: f.geometry.coordinates as [number, number],
          }));
          return NextResponse.json({ results });
        }
      }
    }

    return NextResponse.json({ results: [] });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

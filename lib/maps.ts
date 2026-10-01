export interface DistanceResult {
  distance: number;     // km
  duration: number;     // minutes
  distanceText: string;
  durationText: string;
  originAddress: string;
  destinationAddress: string;
}

async function geocode(address: string, apiKey: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    text: address,
    size: '1',
    layers: 'venue,address,street,neighbourhood,locality,localadmin,county,region',
  });

  const res = await fetch(`https://api.openrouteservice.org/geocode/search?${params}`);
  const data = await res.json();
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return [coords[0], coords[1]]; // [lng, lat]
}

export interface DistanceInput {
  origin: string;
  destination: string;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
}

export async function getDistanceAndDuration(
  input: DistanceInput | string,
  destination?: string,
): Promise<DistanceResult> {
  const apiKey = process.env.ORS_API_KEY;

  const params: DistanceInput = typeof input === 'string'
    ? { origin: input, destination: destination! }
    : input;

  // No API key — return a sensible fallback so the app doesn't break
  if (!apiKey) {
    return {
      distance: 25, duration: 35,
      distanceText: '25 km', durationText: '35 mins',
      originAddress: params.origin,
      destinationAddress: params.destination,
    };
  }

  const [fromCoords, toCoords] = await Promise.all([
    params.originCoords ? Promise.resolve(params.originCoords) : geocode(params.origin, apiKey),
    params.destinationCoords ? Promise.resolve(params.destinationCoords) : geocode(params.destination, apiKey),
  ]);

  if (!fromCoords || !toCoords) {
    throw new Error('Could not find one or both addresses. Please select from the suggestions.');
  }

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: [fromCoords, toCoords] }),
  });

  const data = await res.json();

  if (!res.ok || !data?.routes?.[0]) {
    // ORS couldn't route — fall back to straight-line estimate
    const R = 6371;
    const [lng1, lat1] = fromCoords;
    const [lng2, lat2] = toCoords;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    const straightLine = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.3).toFixed(1)); // ×1.3 road factor
    const estDuration = Math.round(straightLine / 50 * 60); // assume 50 km/h avg

    return {
      distance: straightLine,
      duration: estDuration,
      distanceText: `~${straightLine} km`,
      durationText: `~${estDuration} mins`,
      originAddress: params.origin,
      destinationAddress: params.destination,
    };
  }

  const route = data.routes[0].summary;
  const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
  const durationMin = Math.round(route.duration / 60);

  return {
    distance: distanceKm,
    duration: durationMin,
    distanceText: `${distanceKm} km`,
    durationText: `${durationMin} mins`,
    originAddress: params.origin,
    destinationAddress: params.destination,
  };
}

require('dotenv').config({ path: '.env.local' });
const key = process.env.ORS_API_KEY;

async function test(query, extraParams = {}) {
  const params = new URLSearchParams({
    api_key: key,
    text: query,
    size: '5',
    'focus.point.lon': '-79.3832',
    'focus.point.lat': '43.6532',
    ...extraParams,
  });
  const r = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?${params}`, {
    headers: { Accept: 'application/json' },
  });
  const d = await r.json();
  console.log(`\n"${query}" [${JSON.stringify(extraParams)}]:`);
  (d.features || []).forEach((f, i) => console.log(` ${i+1}. ${f.properties.label}`));
  if (!d.features?.length) console.log(' No results');
}

(async () => {
  // Test 1: no boundary at all
  await test('80 Hummin');
  // Test 2: with country only
  await test('80 Hummin', { 'boundary.country': 'CA' });
  // Test 3: with layers=address only
  await test('80 Hummin', { layers: 'address', 'boundary.country': 'CA' });
  // Test 4: full street name
  await test('80 Hummingbird', { 'boundary.country': 'CA' });
  // Test 5: with Toronto appended
  await test('80 Hummin Toronto');
  // Test 6: Photon geocoder (no key needed)
  const r = await fetch('https://photon.komoot.io/api/?q=80+Hummingbird+Drive+Toronto&limit=5&lang=en');
  const d = await r.json();
  console.log('\nPhoton "80 Hummingbird Drive Toronto":');
  (d.features || []).forEach((f, i) => {
    const p = f.properties;
    console.log(` ${i+1}. ${p.housenumber || ''} ${p.street || p.name || ''}, ${p.city || ''}, ${p.state || ''}`);
  });
})();

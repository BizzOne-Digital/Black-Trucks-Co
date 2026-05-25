require('dotenv').config({ path: '.env.local' });

const key = process.env.ORS_API_KEY;
console.log('ORS Key present:', !!key);

async function testORS(query) {
  const params = new URLSearchParams({
    api_key: key,
    text: query,
    size: '5',
    'focus.point.lon': '-79.3832',
    'focus.point.lat': '43.6532',
  });
  const url = `https://api.openrouteservice.org/geocode/autocomplete?${params}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const d = await r.json();
  console.log(`\nORS "${query}" (status ${r.status}):`);
  (d.features || []).forEach((f, i) => console.log(` ${i+1}. ${f.properties.label}`));
  if (!d.features?.length) console.log(' No results. Error:', d.error || d.message || JSON.stringify(d).substring(0,200));
}

async function testNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'ca',
    viewbox: '-80.0,44.3,-78.8,43.4',
    bounded: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'BlackTrucksCo/1.0', 'Accept-Language': 'en' } });
  const d = await r.json();
  console.log(`\nNominatim "${query}" (status ${r.status}):`);
  (d || []).forEach((item, i) => console.log(` ${i+1}. ${item.display_name}`));
  if (!d?.length) console.log(' No results');
}

(async () => {
  await testORS('80 Hummingbird');
  await testORS('Hummingbird Drive Toronto');
  await testNominatim('80 Hummingbird Drive Toronto');
  await testNominatim('Hummingbird Drive Scarborough');
  await testORS('King Street Toronto');
  await testNominatim('King Street Toronto');
})();

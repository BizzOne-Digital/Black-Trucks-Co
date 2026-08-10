require('dotenv').config({ path: '.env.local' });

async function testPhoton(query) {
  // Photon: focus on Toronto, bbox around GTA
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    // Focus point: Toronto
    lon: '-79.3832',
    lat: '43.6532',
    // Bounding box: GTA
    'bbox': '-80.0,43.3,-78.7,44.4',
  });
  const r = await fetch(`https://photon.komoot.io/api/?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });
  const d = await r.json();
  console.log(`\nPhoton "${query}":`);
  (d.features || []).forEach((f, i) => {
    const p = f.properties;
    const parts = [
      p.housenumber ? `${p.housenumber} ${p.street}` : (p.street || p.name || ''),
      p.district || p.suburb || '',
      p.city || p.town || '',
      p.state || '',
    ].filter(Boolean);
    console.log(` ${i+1}. ${parts.join(', ')}`);
  });
  if (!d.features?.length) console.log(' No results');
}

(async () => {
  await testPhoton('80 Hummin');
  await testPhoton('80 Hummingbird');
  await testPhoton('King Street Toronto');
  await testPhoton('100 Queen');
  await testPhoton('Pearson Airport');
  await testPhoton('Yonge Bloor');
  await testPhoton('Toronto Pearson');
})();

const tests = [
  '80 Hummin',
  '80 Hummingbird',
  'King St',
  '100 Queen',
  'Pearson Airport',
  'Toronto Pearson',
  'Yonge Bloor',
  'Toronto airport',
  'Mississauga',
  'Brampton',
];

(async () => {
  for (const q of tests) {
    const r = await fetch('http://localhost:3000/api/geocode/autocomplete?q=' + encodeURIComponent(q));
    const d = await r.json();
    console.log('"' + q + '":');
    (d.results || []).slice(0, 3).forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.label));
    if (!d.results?.length) console.log('  No results');
  }
})().catch(e => console.log('ERR:', e.message));

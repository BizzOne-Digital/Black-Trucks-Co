const { MongoClient } = require('mongodb');
const c = new MongoClient('mongodb://127.0.0.1:27017/blacktrucks', { serverSelectionTimeoutMS: 3000 });
c.connect().then(async () => {
  const db = c.db('blacktrucks');
  const vehicles = await db.collection('Vehicle').find({}, { projection: { name: 1, _id: 0 } }).toArray();
  console.log('Vehicles in DB (' + vehicles.length + '):');
  vehicles.forEach(v => console.log(' -', v.name));
  const suburban = vehicles.find(v => v.name === 'Suburban');
  console.log('\nSuburban exists:', suburban ? 'YES - STILL THERE' : 'NO - removed correctly');
  process.exit(0);
}).catch(e => { console.log('ERR:', e.message); process.exit(1); });

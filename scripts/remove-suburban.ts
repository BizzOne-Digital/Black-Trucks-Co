/**
 * Run this script with your Atlas URI to remove Suburban from production:
 * 
 * 1. Set MONGODB_URI to your Atlas URI in .env.local
 * 2. Run: npx tsx scripts/remove-suburban.ts
 * 3. Set MONGODB_URI back to localhost
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const dbName = uri.split('/').pop()?.split('?')[0] || 'blacktrucks';
  console.log('Connecting to:', dbName, '...');
  console.log('URI starts with:', uri.substring(0, 30) + '...');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Check before
  const before = await db.collection('Vehicle').countDocuments();
  console.log('Vehicles before:', before);

  // Delete Suburban
  const result = await db.collection('Vehicle').deleteOne({ name: 'Suburban' });
  console.log('Deleted:', result.deletedCount, 'vehicle(s)');

  // Show remaining
  const vehicles = await db.collection('Vehicle').find({}, { projection: { name: 1 } }).toArray();
  console.log('Remaining vehicles (' + vehicles.length + '):');
  vehicles.forEach(v => console.log(' -', v.name));

  await client.close();
  console.log('\n✅ Done! Suburban removed from', uri.includes('mongodb+srv') ? 'Atlas (production)' : 'local');
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

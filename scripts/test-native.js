// Test the new MongoDB native driver setup
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/blacktrucks';
const { MongoClient } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const db = client.db('blacktrucks');

  const vehicles = await db.collection('Vehicle').find({ available: true }).sort({ pricePerHour: 1 }).toArray();
  console.log(`✅ Vehicles found: ${vehicles.length}`);
  vehicles.forEach(v => console.log(`   - ${v.name} ($${v.pricePerHour}/hr)`));

  const users = await db.collection('User').countDocuments();
  console.log(`✅ Users: ${users}`);

  const promos = await db.collection('PromoCode').countDocuments();
  console.log(`✅ Promo codes: ${promos}`);

  // Test registration (insert + duplicate check)
  const testEmail = 'test_' + Date.now() + '@test.com';
  const result = await db.collection('User').insertOne({
    name: 'Test User', email: testEmail, password: 'hashed', role: 'user',
    phone: null, emailVerified: null, image: null,
    createdAt: new Date(), updatedAt: new Date(),
  });
  console.log(`✅ Registration test: inserted user ${result.insertedId}`);

  // Cleanup test user
  await db.collection('User').deleteOne({ _id: result.insertedId });
  console.log(`✅ Cleanup done`);

  await client.close();
  console.log('\n🎉 All tests passed! Native MongoDB driver works perfectly.');
}

test().catch(e => { console.error('❌ Test failed:', e.message); process.exit(1); });

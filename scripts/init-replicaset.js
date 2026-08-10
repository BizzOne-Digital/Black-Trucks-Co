/**
 * Run this AFTER MongoDB has been restarted with replSetName: rs0 in mongod.cfg
 * Usage: node scripts/init-replicaset.js
 */
const { MongoClient } = require('mongodb');

async function initReplicaSet() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Check current status
    const status = await client.db('admin').command({ isMaster: 1 });
    console.log('Current status:', JSON.stringify(status, null, 2));

    if (status.setName) {
      console.log(`✅ Already in replica set: ${status.setName}`);
      return;
    }

    // Initialize replica set
    const result = await client.db('admin').command({
      replSetInitiate: {
        _id: 'rs0',
        members: [{ _id: 0, host: '127.0.0.1:27017' }],
      },
    });
    console.log('✅ Replica set initialized:', result);
  } catch (err) {
    if (err.message.includes('already initialized')) {
      console.log('✅ Replica set already initialized');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

initReplicaSet();

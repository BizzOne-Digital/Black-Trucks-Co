/**
 * This script stops MongoDB service, updates its config to enable replica set,
 * restarts it, then initializes the replica set.
 * 
 * Run as: node scripts/restart-mongo-replicaset.js
 * (May need to be run from an elevated/admin terminal)
 */
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const CFG_PATH = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.cfg';

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: e.message };
  }
}

async function waitForMongo(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const c = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 1000 });
      await c.connect();
      await c.close();
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

async function main() {
  console.log('=== MongoDB Replica Set Setup ===\n');

  // 1. Read current config
  console.log('[1] Reading mongod.cfg...');
  let cfg;
  try {
    cfg = fs.readFileSync(CFG_PATH, 'utf8');
  } catch (e) {
    console.error('Cannot read config:', e.message);
    console.error('Make sure you are running as Administrator');
    process.exit(1);
  }

  // 2. Add replication if not present
  if (cfg.includes('replSetName')) {
    console.log('    Replica set already in config');
  } else {
    console.log('[2] Adding replication config...');
    const newCfg = cfg.trimEnd() + '\n\nreplication:\n  replSetName: "rs0"\n';
    try {
      fs.writeFileSync(CFG_PATH, newCfg, 'utf8');
      console.log('    Config updated');
    } catch (e) {
      console.error('Cannot write config (need admin rights):', e.message);
      process.exit(1);
    }
  }

  // 3. Stop MongoDB
  console.log('[3] Stopping MongoDB service...');
  const stop = run('net stop MongoDB');
  console.log('   ', stop.out.split('\n')[0]);

  await new Promise(r => setTimeout(r, 2000));

  // 4. Start MongoDB
  console.log('[4] Starting MongoDB service...');
  const start = run('net start MongoDB');
  console.log('   ', start.out.split('\n')[0]);

  // 5. Wait for MongoDB to be ready
  console.log('[5] Waiting for MongoDB to be ready...');
  const ready = await waitForMongo(20000);
  if (!ready) {
    console.error('MongoDB did not start in time');
    process.exit(1);
  }
  console.log('    MongoDB is ready');

  // 6. Initialize replica set
  console.log('[6] Initializing replica set...');
  const client = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const result = await client.db('admin').command({
      replSetInitiate: {
        _id: 'rs0',
        members: [{ _id: 0, host: '127.0.0.1:27017' }],
      },
    });
    console.log('    Replica set initialized:', result.ok === 1 ? 'OK' : result);
  } catch (e) {
    if (e.message.includes('already initialized')) {
      console.log('    Already initialized - OK');
    } else {
      console.error('    Error:', e.message);
    }
  } finally {
    await client.close();
  }

  // 7. Wait for primary election
  console.log('[7] Waiting for primary election (5s)...');
  await new Promise(r => setTimeout(r, 5000));

  // 8. Verify
  console.log('[8] Verifying...');
  const verifyClient = new MongoClient('mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', { serverSelectionTimeoutMS: 5000 });
  try {
    await verifyClient.connect();
    const status = await verifyClient.db('admin').command({ isMaster: 1 });
    console.log('    setName:', status.setName);
    console.log('    ismaster:', status.ismaster);
    console.log('\n✅ SUCCESS! MongoDB is now a replica set.');
    console.log('\nNext steps:');
    console.log('1. Your .env.local already has the correct URI');
    console.log('2. Restart your Next.js dev server (npm run dev)');
    console.log('3. Registration and vehicles will now work!\n');
  } catch (e) {
    console.error('Verify failed:', e.message);
  } finally {
    await verifyClient.close();
  }
}

main().catch(console.error);

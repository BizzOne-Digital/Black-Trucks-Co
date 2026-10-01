const { MongoClient } = require('mongodb');
const c = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 3000 });
c.connect()
  .then(() => c.db('admin').command({ isMaster: 1 }))
  .then(r => {
    console.log('setName:', r.setName || 'NONE (standalone)');
    console.log('ismaster:', r.ismaster);
    process.exit(0);
  })
  .catch(e => { console.log('ERR:', e.message); process.exit(1); })
  .finally(() => c.close());

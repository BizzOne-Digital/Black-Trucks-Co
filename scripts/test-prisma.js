process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/blacktrucks?replicaSet=rs0&directConnection=true';
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.vehicle.findMany({ take: 3 })
  .then(v => {
    console.log('✅ Prisma works! Vehicles found:', v.length);
    v.forEach(x => console.log('  -', x.name, '($' + x.pricePerHour + '/hr)'));
  })
  .catch(e => console.log('❌ Prisma error:', e.message))
  .finally(() => p.$disconnect());

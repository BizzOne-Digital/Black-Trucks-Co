/**
 * Black Trucks Co — Complete Database Setup Script
 * 
 * Yeh script MongoDB mein saara data directly insert karta hai
 * (Prisma transactions ki zaroorat nahi — replica set ke baghair bhi kaam karta hai)
 * 
 * Usage: npx tsx scripts/setup-database.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// ─── Extract DB name from URI ─────────────────────────────────────────────────
const dbName = MONGODB_URI.split('/').pop()?.split('?')[0] || 'blacktrucks';

// ─── Vehicles Data ────────────────────────────────────────────────────────────
const vehicles = [
  {
    name: 'Yukon XL',
    category: 'Black SUV',
    image: '/Yukon XL.jpg',
    pricePerHour: 100,
    minimumHours: 1,
    passengers: 7,
    luggage: 5,
    description: 'The blacked-out GMC Yukon XL delivers maximum space without sacrificing style. Ideal for group transfers, corporate events, and airport runs.',
    features: ['Extended Wheelbase', 'All-Black Trim', 'Third Row Seating', 'Dual Climate Zones'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Suburban',
    category: 'Black SUV',
    image: '/Suburban.jpg',
    pricePerHour: 100,
    minimumHours: 1,
    passengers: 8,
    luggage: 7,
    description: 'The iconic all-black Chevrolet Suburban — trusted by executives and security details worldwide. Massive interior, smooth ride, and an unmistakable black-on-black finish.',
    features: ['Black-on-Black Finish', 'Massive Cargo Space', 'Rear Entertainment', 'USB Charging Ports', 'Advanced Safety Suite'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Cadillac Escalade',
    category: 'Luxury SUV',
    image: '/Cadillac Escalade.jpg',
    pricePerHour: 120,
    minimumHours: 1,
    passengers: 6,
    luggage: 4,
    description: 'Our signature all-black Cadillac Escalade — the ultimate statement in executive luxury. Tinted windows, blacked-out trim, and a commanding presence on every road.',
    features: ['All-Black Exterior', 'Tinted Privacy Glass', 'Premium Leather', 'Ambient Lighting'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Sprinter Van',
    category: 'Luxury Van',
    image: '/Sprinter Van.jpg',
    pricePerHour: 150,
    minimumHours: 2,
    passengers: 12,
    luggage: 10,
    description: 'Our executive black Sprinter Van — the go-to for large group transfers, airport shuttles, and corporate events. Fully customized interior with premium seating.',
    features: ['12-Passenger Capacity', 'Custom Interior', 'Individual Leather Seats', 'Custom Audio System', 'Onboard WiFi & USB'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'GLS Maybach 600',
    category: 'Ultra Luxury',
    image: '/Maybach600.jpeg',
    pricePerHour: 350,
    minimumHours: 1,
    passengers: 4,
    luggage: 3,
    description: 'The pinnacle of automotive luxury. The GLS Maybach 600 delivers an unmatched first-class experience for VIPs, executives, and special occasions.',
    features: ['Executive Rear Seating', 'Massage Seats', 'Burmester Sound', 'Panoramic Roof', 'Champagne Cooler'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Mercedes S Class',
    category: 'Executive Sedan',
    image: '/Mercedes S Class.jpg',
    pricePerHour: 160,
    minimumHours: 1,
    passengers: 4,
    luggage: 3,
    description: 'The Mercedes S-Class sets the standard for executive sedans. Effortless performance, cutting-edge technology, and first-class comfort in every mile.',
    features: ['Air Suspension', 'Burmester Sound', 'Executive Rear Seating', 'Ambient Lighting', 'Panoramic Sunroof'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Lexus ES',
    category: 'Luxury Sedan',
    image: '/Lexus ES.jpg',
    pricePerHour: 80,
    minimumHours: 1,
    passengers: 4,
    luggage: 3,
    description: 'The Lexus ES combines refined luxury with whisper-quiet comfort. Perfect for business travel and airport transfers with a premium touch.',
    features: ['Mark Levinson Audio', 'Heated & Ventilated Seats', 'Panoramic Roof', 'Advanced Safety', 'Wireless Charging'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Stretch Limo',
    category: 'Ultra Luxury',
    image: '/Stretch Limo.jpg',
    pricePerHour: 200,
    minimumHours: 4,
    passengers: 10,
    luggage: 4,
    description: 'Make a grand entrance with our elegant stretch limousine. Perfect for weddings, proms, and VIP events.',
    features: ['LED Mood Lighting', 'Privacy Partition', 'Premium Entertainment', 'Fiber Optic Ceiling'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ─── Promo Codes ──────────────────────────────────────────────────────────────
const promoCodes = [
  {
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    maxUses: 500,
    usedCount: 0,
    minBookingAmount: 50,
    active: true,
    expiresAt: new Date('2027-12-31'),
    createdAt: new Date(),
  },
  {
    code: 'FLAT15',
    discountType: 'fixed',
    discountValue: 15,
    maxUses: 200,
    usedCount: 0,
    minBookingAmount: 80,
    active: true,
    expiresAt: new Date('2027-06-30'),
    createdAt: new Date(),
  },
  {
    code: 'VIP30',
    discountType: 'percentage',
    discountValue: 30,
    maxUses: 50,
    usedCount: 0,
    minBookingAmount: 150,
    active: true,
    expiresAt: new Date('2027-12-31'),
    createdAt: new Date(),
  },
  {
    code: 'AIRPORT10',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 300,
    usedCount: 0,
    minBookingAmount: 0,
    active: true,
    expiresAt: new Date('2027-12-31'),
    createdAt: new Date(),
  },
];

// ─── Main Setup Function ──────────────────────────────────────────────────────
async function setupDatabase() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Black Trucks Co — Database Setup           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📦 Database: ${dbName}`);
  console.log(`🔗 URI: ${MONGODB_URI!.replace(/\/\/.*@/, '//***@')}`);
  console.log('');

  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);

    // ── Step 1: Clear all existing collections ──────────────────────────────
    console.log('\n🗑  Clearing existing data...');
    const collectionsToClear = ['Review', 'AbandonedBooking', 'Booking', 'PromoCode', 'Vehicle', 'User'];
    for (const col of collectionsToClear) {
      try {
        const result = await db.collection(col).deleteMany({});
        if (result.deletedCount > 0) {
          console.log(`   Cleared ${result.deletedCount} records from ${col}`);
        }
      } catch {
        // Collection may not exist yet — that's fine
      }
    }
    console.log('   ✓ All collections cleared');

    // ── Step 2: Create indexes ──────────────────────────────────────────────
    console.log('\n📑 Creating indexes...');

    // User indexes
    await db.collection('User').createIndex({ email: 1 }, { unique: true });
    console.log('   ✓ User.email (unique)');

    // Booking indexes
    await db.collection('Booking').createIndex({ reference: 1 }, { unique: true });
    await db.collection('Booking').createIndex({ userId: 1 });
    await db.collection('Booking').createIndex({ vehicleId: 1 });
    await db.collection('Booking').createIndex({ date: 1, vehicleId: 1 });
    await db.collection('Booking').createIndex({ status: 1 });
    await db.collection('Booking').createIndex({ createdAt: -1 });
    console.log('   ✓ Booking indexes (reference, userId, vehicleId, date, status, createdAt)');

    // Vehicle indexes
    await db.collection('Vehicle').createIndex({ available: 1 });
    await db.collection('Vehicle').createIndex({ pricePerHour: 1 });
    console.log('   ✓ Vehicle indexes (available, pricePerHour)');

    // PromoCode indexes
    await db.collection('PromoCode').createIndex({ code: 1 }, { unique: true });
    console.log('   ✓ PromoCode.code (unique)');

    // Review indexes
    await db.collection('Review').createIndex({ bookingId: 1 }, { unique: true });
    await db.collection('Review').createIndex({ vehicleId: 1 });
    console.log('   ✓ Review indexes (bookingId unique, vehicleId)');

    // AbandonedBooking indexes
    await db.collection('AbandonedBooking').createIndex({ userId: 1 }, { unique: true });
    console.log('   ✓ AbandonedBooking.userId (unique)');

    // ── Step 3: Seed Users ──────────────────────────────────────────────────
    console.log('\n👤 Creating users...');

    const adminPassword = await bcrypt.hash('admin123456', 12);
    const driverPassword = await bcrypt.hash('driver123456', 12);

    const usersToInsert = [
      {
        name: 'Admin User',
        email: 'admin@blacktrucks.co',
        password: adminPassword,
        phone: '+1-647-706-6325',
        role: 'admin',
        emailVerified: new Date(),
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'John Driver',
        email: 'driver@blacktrucks.co',
        password: driverPassword,
        phone: '+1-647-555-0101',
        role: 'driver',
        emailVerified: new Date(),
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mike Driver',
        email: 'mike.driver@blacktrucks.co',
        password: driverPassword,
        phone: '+1-647-555-0102',
        role: 'driver',
        emailVerified: new Date(),
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const userResult = await db.collection('User').insertMany(usersToInsert);
    console.log(`   ✓ Created ${userResult.insertedCount} users`);
    console.log('   → admin@blacktrucks.co / admin123456');
    console.log('   → driver@blacktrucks.co / driver123456');
    console.log('   → mike.driver@blacktrucks.co / driver123456');

    // ── Step 4: Seed Vehicles ───────────────────────────────────────────────
    console.log('\n🚗 Creating vehicles...');
    const vehicleResult = await db.collection('Vehicle').insertMany(vehicles);
    console.log(`   ✓ Created ${vehicleResult.insertedCount} vehicles:`);
    vehicles.forEach(v => {
      console.log(`   → ${v.name} (${v.category}) — $${v.pricePerHour}/hr, min ${v.minimumHours}hr, ${v.passengers} passengers`);
    });

    // ── Step 5: Seed Promo Codes ────────────────────────────────────────────
    console.log('\n🎟  Creating promo codes...');
    const promoResult = await db.collection('PromoCode').insertMany(promoCodes);
    console.log(`   ✓ Created ${promoResult.insertedCount} promo codes:`);
    promoCodes.forEach(p => {
      const discount = p.discountType === 'percentage' ? `${p.discountValue}% off` : `$${p.discountValue} off`;
      console.log(`   → ${p.code}: ${discount} (min $${p.minBookingAmount}, max ${p.maxUses} uses)`);
    });

    // ── Step 6: Verify ──────────────────────────────────────────────────────
    console.log('\n🔍 Verifying database...');
    const counts = {
      users: await db.collection('User').countDocuments(),
      vehicles: await db.collection('Vehicle').countDocuments(),
      promoCodes: await db.collection('PromoCode').countDocuments(),
      bookings: await db.collection('Booking').countDocuments(),
      reviews: await db.collection('Review').countDocuments(),
    };
    console.log(`   Users:       ${counts.users}`);
    console.log(`   Vehicles:    ${counts.vehicles}`);
    console.log(`   Promo Codes: ${counts.promoCodes}`);
    console.log(`   Bookings:    ${counts.bookings}`);
    console.log(`   Reviews:     ${counts.reviews}`);

    // ── Done ────────────────────────────────────────────────────────────────
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   ✅ Database Setup Complete!                ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Admin:   admin@blacktrucks.co  /  admin123456');
    console.log('   Driver:  driver@blacktrucks.co /  driver123456');
    console.log('');
    console.log('🎟  Promo Codes:');
    console.log('   WELCOME20 — 20% off (min $50)');
    console.log('   FLAT15    — $15 off (min $80)');
    console.log('   VIP30     — 30% off (min $150)');
    console.log('   AIRPORT10 — 10% off (no minimum)');
    console.log('');
    console.log('⚠️  IMPORTANT: MongoDB needs to be a replica set for Prisma to work.');
    console.log('   Run setup-mongodb-replicaset.bat as Administrator if not done yet.');
    console.log('   Then update MONGODB_URI in .env.local to:');
    console.log(`   mongodb://127.0.0.1:27017/${dbName}?replicaSet=rs0&directConnection=true`);
    console.log('');

  } catch (err: any) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();

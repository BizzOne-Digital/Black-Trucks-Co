import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient, ObjectId } from 'mongodb';

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

const users = [
  {
    name: 'Admin User', email: 'admin@blacktrucks.co',
    password: '$2b$12$Q6R4D88HHhVCox7.3i7Ml.MoTU3DEsCE9rxKEKx0IGmAqpC8RZgJq',
    role: 'admin', phone: '+1-555-0100',
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    name: 'John Driver', email: 'driver@blacktrucks.co',
    password: '$2b$12$Q6R4D88HHhVCox7.3i7Ml.MoTU3DEsCE9rxKEKx0IGmAqpC8RZgJq',
    role: 'driver', phone: '+1-555-0101',
    createdAt: new Date(), updatedAt: new Date(),
  },
];

const promoCodes = [
  { code: 'WELCOME20', discountType: 'percentage', discountValue: 20, maxUses: 500, usedCount: 0, minBookingAmount: 50, active: true, expiresAt: new Date('2027-12-31'), createdAt: new Date(), updatedAt: new Date() },
  { code: 'FLAT15',    discountType: 'fixed',      discountValue: 15, maxUses: 200, usedCount: 0, minBookingAmount: 80, active: true, expiresAt: new Date('2027-06-30'), createdAt: new Date(), updatedAt: new Date() },
  { code: 'VIP30',     discountType: 'percentage', discountValue: 30, maxUses: 50,  usedCount: 0, minBookingAmount: 150, active: true, expiresAt: new Date('2027-12-31'), createdAt: new Date(), updatedAt: new Date() },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set in .env.local');

  const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'blacktrucks';
  console.log(`Connecting to MongoDB: ${dbName}...`);

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  // Clear existing data
  const collections = ['Review', 'AbandonedBooking', 'Booking', 'PromoCode', 'Vehicle', 'User'];
  for (const col of collections) {
    try { await db.collection(col).deleteMany({}); } catch { /* collection may not exist */ }
  }
  console.log('🗑  Cleared existing data');

  // Seed vehicles
  await db.collection('Vehicle').insertMany(vehicles);
  console.log(`🚗 Seeded ${vehicles.length} vehicles`);

  // Seed users
  await db.collection('User').insertMany(users);
  console.log(`👤 Seeded ${users.length} users`);

  // Seed promo codes
  await db.collection('PromoCode').insertMany(promoCodes);
  console.log(`🎟  Seeded ${promoCodes.length} promo codes`);

  await client.close();

  console.log('\n✅ Seed complete!');
  console.log('   Admin:  admin@blacktrucks.co  /  admin123456');
  console.log('   Driver: driver@blacktrucks.co /  admin123456');
  console.log('   Promos: WELCOME20, FLAT15, VIP30');
}

seed()
  .catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });

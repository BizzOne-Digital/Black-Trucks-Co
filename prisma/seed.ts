import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Default fleet — matches production (no sedan / suburban / limo). Admin edits are preserved on re-seed. */
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
  },
  {
    name: 'Sprinter Van',
    category: 'Luxury Van',
    image: '/Sprinter Van.jpg',
    pricePerHour: 220,
    minimumHours: 2,
    passengers: 12,
    luggage: 10,
    description: 'Our executive black Sprinter Van — the go-to for large group transfers, airport shuttles, and corporate events. Fully customized interior with premium seating.',
    features: ['12-Passenger Capacity', 'Custom Interior', 'Individual Leather Seats', 'Custom Audio System', 'Onboard WiFi & USB'],
    available: true,
  },
  {
    name: 'GLS Maybach 600',
    category: 'Ultra Luxury',
    image: '/Maybach600.jpeg',
    pricePerHour: 300,
    minimumHours: 1,
    passengers: 4,
    luggage: 3,
    description: 'The pinnacle of automotive luxury. The GLS Maybach 600 delivers an unmatched first-class experience for VIPs, executives, and special occasions.',
    features: ['Executive Rear Seating', 'Massage Seats', 'Burmester Sound', 'Panoramic Roof', 'Champagne Cooler'],
    available: true,
  },
];

const users = [
  {
    name: 'Admin User', email: 'admin@blacktrucks.co',
    password: '$2b$12$Q6R4D88HHhVCox7.3i7Ml.MoTU3DEsCE9rxKEKx0IGmAqpC8RZgJq',
    role: 'admin', phone: '+1-555-0100',
  },
  {
    name: 'John Driver', email: 'driver@blacktrucks.co',
    password: '$2b$12$Q6R4D88HHhVCox7.3i7Ml.MoTU3DEsCE9rxKEKx0IGmAqpC8RZgJq',
    role: 'driver', phone: '+1-555-0101',
  },
];

const promoCodes = [
  { code: 'WELCOME20', discountType: 'percentage', discountValue: 20, maxUses: 500, minBookingAmount: 50, expiresAt: new Date('2027-12-31') },
  { code: 'FLAT15',    discountType: 'fixed',      discountValue: 15, maxUses: 200, minBookingAmount: 80, expiresAt: new Date('2027-06-30') },
  { code: 'VIP30',     discountType: 'percentage', discountValue: 30, maxUses: 50,  minBookingAmount: 150, expiresAt: new Date('2027-12-31') },
];

/** Vehicles the client removed from the public fleet — hidden, not deleted (keeps booking history). */
const RETIRED_VEHICLE_NAMES = ['Lexus ES', 'Suburban', 'Stretch Limo'];

async function upsertVehicle(data: typeof vehicles[0]) {
  const existing = await prisma.vehicle.findFirst({ where: { name: data.name } });
  if (existing) {
    // Existing rows are owned by admin — seed must not overwrite prices or copy
    return 'skipped';
  }
  await prisma.vehicle.create({ data });
  return 'created';
}

async function retireRemovedVehicles() {
  for (const name of RETIRED_VEHICLE_NAMES) {
    await prisma.vehicle.updateMany({
      where: { name },
      data: { available: false },
    });
  }
}

async function seed() {
  console.log('Connecting via Prisma...');

  const forceReset = process.env.SEED_FORCE_RESET === 'true';

  if (forceReset) {
    console.warn('⚠️  SEED_FORCE_RESET=true — wiping bookings and vehicles');
    await prisma.review.deleteMany();
    await prisma.abandonedBooking.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.promoCode.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
  }

  let created = 0;
  let skipped = 0;
  for (const v of vehicles) {
    const result = await upsertVehicle(v);
    if (result === 'created') created++;
    else skipped++;
  }
  await retireRemovedVehicles();
  console.log(`🚗 Vehicles: ${created} created, ${skipped} already in DB (unchanged)`);

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: u,
      update: { name: u.name, role: u.role, phone: u.phone },
    });
  }
  console.log(`👤 Ensured ${users.length} users`);

  for (const p of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      create: { ...p, active: true },
      update: {},
    });
  }
  console.log(`🎟  Ensured ${promoCodes.length} promo codes`);

  console.log('\n✅ Seed complete (safe mode — set SEED_FORCE_RESET=true only to wipe data)');
  console.log('   Admin:  admin@blacktrucks.co  /  admin123456');
}

seed()
  .catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

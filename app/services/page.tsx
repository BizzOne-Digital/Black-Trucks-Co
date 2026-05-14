import Image from 'next/image';
import Link from 'next/link';
import {
  Briefcase,
  Plane,
  Sparkles,
  Heart,
  PartyPopper,
  Crown,
  Clock,
  Camera,
  ArrowRight,
} from 'lucide-react';

const services = [
  {
    id: 'corporate',
    icon: Briefcase,
    name: 'Corporate Transportation',
    tagline: 'Executive-level service for business professionals',
    description:
      'Reliable, executive-level service for business professionals. Perfect for meetings, client pickups, and corporate events, offering punctual arrivals and a polished, discreet experience.',
    image: '/Corporate Transportation.jpeg',
    highlights: ['On-time guarantee', 'Discreet & professional', 'Corporate billing available', 'Meet & greet service'],
  },
  {
    id: 'airport',
    icon: Plane,
    name: 'Airport Transfers',
    tagline: 'Stress-free pickups and drop-offs',
    description:
      'Stress-free pickups and drop-offs to and from the airport. Includes flight tracking, on-time service, and smooth, comfortable rides — ideal for both business and personal travel.',
    image: '/Airport Transfers.jpeg',
    highlights: ['Live flight tracking', 'Free wait time', 'All terminals covered', 'Meet inside arrivals'],
  },
  {
    id: 'prom',
    icon: Sparkles,
    name: 'Prom & Formal Events',
    tagline: 'Arrive in style for your big night',
    description:
      'Arrive in style with a luxury black truck experience. Perfect for prom, graduations, and formal nights, combining safety, elegance, and a memorable entrance.',
    image: '/Prom & Formal Events.png',
    highlights: ['Safe & supervised', 'Red carpet arrival', 'Group packages', 'Decorated interiors available'],
  },
  {
    id: 'wedding',
    icon: Heart,
    name: 'Wedding Transportation',
    tagline: 'Premium service for your big day',
    description:
      'Premium service for your big day. From bridal party transport to guest shuttles, enjoy a seamless, elegant ride that complements your wedding aesthetic.',
    image: '/Wedding Transportation.png',
    highlights: ['Bridal party packages', 'Guest shuttle service', 'Decorated vehicles', 'Coordinated timing'],
  },
  {
    id: 'events',
    icon: PartyPopper,
    name: 'Special Events & Nights Out',
    tagline: 'Elevate every celebration',
    description:
      'Perfect for birthdays, celebrations, concerts, and city nights. Travel together in comfort and make the night feel elevated from start to finish.',
    image: '/Special Events & Nights Ou.jpeg',
    highlights: ['Group bookings', 'Multiple stops', 'No parking stress', 'Safe designated driver'],
  },
  {
    id: 'vip',
    icon: Crown,
    name: 'VIP & Luxury Service',
    tagline: 'For clients who expect more',
    description:
      'High-end, personalized transportation for clients who expect more. Ideal for celebrities, executives, or anyone wanting a premium, private experience.',
    image: '/VIP & Luxury Service.jpeg',
    highlights: ['Fully private', 'NDA available', 'Concierge coordination', 'Premium amenities'],
  },
  {
    id: 'hourly',
    icon: Clock,
    name: 'Hourly / As-Directed',
    tagline: 'A driver on standby, your schedule',
    description:
      'Keep a driver on standby for multiple stops or flexible plans. Great for shopping days, business itineraries, or events with changing schedules.',
    image: '/Hourly  As-Directed.jpeg',
    highlights: ['Flexible itinerary', 'Multiple stops', 'Minimum 2-hour booking', 'Wait & return included'],
  },
  {
    id: 'photoshoot',
    icon: Camera,
    name: 'Photoshoots & Content Creation',
    tagline: 'Bold luxury aesthetics for your brand',
    description:
      'Use luxury trucks as a backdrop or prop for photos, videos, and branding shoots. Adds a bold, premium aesthetic to your visuals.',
    image: '/Gallery (6).jpg',
    highlights: ['Stationary or moving shots', 'Multiple vehicles available', 'Location flexible', 'Half & full day rates'],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <div className="relative h-[100svh] min-h-[600px] bg-black">
        {/* Mobile image */}
        <Image
          src="/Mercedes S Class.jpg"
          alt="Our Services"
          fill
          className="object-cover object-center sm:hidden"
          priority
          sizes="100vw"
        />
        {/* Desktop image */}
        <Image
          src="/Gallery (12).jpg"
          alt="Our Services"
          fill
          className="object-cover object-[center_25%] hidden sm:block"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pt-16 sm:pt-28">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white">What We Offer</p>
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold mb-2">Our Services</h1>
          <p className="text-xs sm:text-base text-white max-w-xl">
            Every occasion deserves a premium ride. Choose the service that fits your moment.
          </p>
        </div>
      </div>

      {/* Services grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image — fixed aspect ratio so all cards align */}
                <div className="relative w-full aspect-[16/9] overflow-hidden flex-shrink-0">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  {/* Icon badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                    <Icon className="h-5 w-5 text-black" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-white/80">{service.tagline}</p>
                    <h2 className="text-lg font-bold leading-tight text-white">{service.name}</h2>
                  </div>
                </div>

                {/* Content — flex-1 so all cards stretch to same height in a row */}
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-sm text-gray-600 leading-relaxed mb-5">{service.description}</p>

                  {/* Highlights */}
                  <ul className="grid grid-cols-2 gap-2 mb-6">
                    {service.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/booking?service=${service.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-black hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-medium transition-colors mt-auto"
                  >
                    Book This Service <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA banner */}
      <div className="bg-black text-white py-16 px-4 text-center">
        <p className="text-xs font-medium tracking-widest uppercase mb-3 opacity-60">Not sure which to pick?</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">We'll help you choose</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
          Contact our team and we'll match you with the perfect service and vehicle for your occasion.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/booking"
            className="bg-white text-black px-8 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">
            Book Now
          </Link>
          <Link href="/contact"
            className="border border-white/30 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  );
}



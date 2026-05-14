'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Briefcase, Plane, Sparkles, Heart, PartyPopper, Crown,
  Clock, Camera, Shield, Users, Car, Phone, Mail, ArrowRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

// ─── Services data (6 boxes from PDF) ────────────────────────────────────────
const services = [
  {
    icon: Briefcase,
    title: 'Corporate Transportation',
    desc: 'Professional travel solutions for meetings, executives, and business needs. Designed for punctuality, comfort, and a seamless experience.',
  },
  {
    icon: Plane,
    title: 'Airport Transfers',
    desc: 'Reliable pick and drop services for stress-free airport travel. We ensure timely arrivals and departures every time.',
  },
  {
    icon: Sparkles,
    title: 'Prom & Formal Events',
    desc: 'Arrive in style for your special nights and formal occasions. Luxury rides that make every entrance memorable.',
  },
  {
    icon: Heart,
    title: 'Wedding Transportation',
    desc: 'Elegant and comfortable travel for your big day. Focused on smooth coordination and premium service.',
  },
  {
    icon: PartyPopper,
    title: 'Special Events & Nights Out',
    desc: 'Perfect transportation for celebrations, dinners, and outings. Travel safely while enjoying your occasion.',
  },
  {
    icon: Crown,
    title: 'VIP & Luxury Service',
    desc: 'Exclusive rides for clients who expect privacy and high-end comfort. A premium experience from pickup to drop-off.',
  },
  {
    icon: Clock,
    title: 'Hourly / As-Directed',
    desc: 'Flexible booking options based on your schedule. Your driver stays with you as long as needed.',
  },
  {
    icon: Camera,
    title: 'Photoshoots & Content Creation',
    desc: 'Stylish vehicles for shoots, branding, and creative projects. Ideal for professional photo and video production needs.',
  },
];

const stats = [
  { value: '10+', label: 'Years of Experience' },
  { value: '15K+', label: 'Clients Served' },
  { value: null, label: 'Premium Vehicles' }, // dynamic
  { value: '24/7', label: 'Available Service' },
];

const fleetHighlights = [
  {
    icon: Car,
    title: 'Luxury Vehicles',
    desc: 'A selection of high-end cars maintained to the highest standards for a smooth and comfortable ride.',
    href: '/fleet',
  },
  {
    icon: Shield,
    title: 'Professional Chauffeurs',
    desc: 'Trained and experienced drivers focused on safety, discretion, and a premium travel experience.',
    href: '/fleet',
  },
  {
    icon: Users,
    title: 'Group & Private Travel',
    desc: 'From solo executives to large groups, we have the right vehicle and service for every occasion.',
    href: '/booking',
  },
];

// ─── Hero Slideshow ───────────────────────────────────────────────────────────
const heroSlides = [
  '/Fleet Hero.jpg',
  '/Gallery (1).jpg',
  '/Gallery (2).jpg',
  '/Gallery (3).jpg',
  '/Gallery (5).jpg',
  '/Gallery (6).jpg',
];

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % heroSlides.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {heroSlides.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt="Black Trucks Co fleet"
            fill
            className="object-cover object-center"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/40 sm:bg-black/60" />
      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </>
  );
}

export default function AboutPage() {
  useReveal();
  const [vehicles, setVehicles] = useState<{ name: string }[]>([]);

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(d => setVehicles(d.vehicles || []))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white">

      {/* ── HERO — full width ── */}
      <div className="relative h-[100svh] min-h-[600px] bg-black">
        <Image
          src="/Cadillac Escalade.jpg"
          alt="Black Trucks Co luxury service"
          fill
          className="object-cover object-[center_30%]"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 sm:px-16 lg:px-24 pt-16 sm:pt-28">
          <div className="max-w-2xl">
            <p className="hero-text-enter text-xs font-semibold tracking-widest uppercase text-white mb-3">
              Premium Ground Transportation
            </p>
            <h1 className="hero-text-enter-delay text-2xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Travel with comfort and class
            </h1>
            <p className="hero-text-enter-delay text-gray-100 text-xs sm:text-base leading-relaxed mb-2 max-w-xl">
              We provide premium black car and black truck service for executives, corporate clients, and anyone who demands a higher standard of travel.
            </p>
            <p className="hero-text-enter-delay text-gray-200 text-xs sm:text-sm leading-relaxed mb-6">
              Every journey is planned with attention to detail and care.
            </p>
            <div className="hero-text-enter-delay-2 flex flex-wrap gap-3">
              <Link href="/booking"
                className="bg-white text-black hover:bg-gray-100 px-6 py-3 rounded text-sm font-semibold transition-colors flex items-center gap-2">
                Book your ride now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/fleet"
                className="border border-white/30 hover:border-white text-white px-6 py-3 rounded text-sm font-medium transition-colors">
                View Fleet
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── ABOUT US — image left, text right ── */}
      <div className="flex flex-col lg:flex-row">
        {/* Image — on mobile full width with aspect ratio so it never crops */}
        <div className="relative w-full lg:w-1/2 aspect-[4/3] lg:aspect-auto lg:min-h-[480px]">
          <Image
            src="/Whisk_d0bc80ebd705bde994247dcf03df8e1ddr.jpeg"
            alt="About Black Trucks Co"
            fill
            className="object-cover object-[center_15%] sm:object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />

        </div>
        {/* Right — text */}
        <div className="w-full lg:w-1/2 flex items-center px-8 sm:px-12 lg:px-20 py-14 lg:py-20 bg-white">
          <div className="max-w-lg reveal-right">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-3">About Us</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-6 leading-tight">
              Redefining luxury ground transportation
            </h2>
            <div className="space-y-4 text-gray-500 text-sm sm:text-base leading-relaxed">
              <p>
                Black Trucks Co was built to make luxury transportation simple, smooth, and reliable. For us, it's not just about getting you from one place to another — it's about making every journey comfortable, stress-free, and enjoyable.
              </p>
              <p>
                For over a decade, we've been trusted by executives, celebrities, and travellers who value privacy, punctuality, and high-quality service.
              </p>
            </div>

            {/* What makes us different */}
            <div className="mt-6">
              <p className="text-sm font-bold text-gray-900 mb-3">What makes us different:</p>
              <ul className="space-y-2.5">
                {[
                  { bold: 'Carefully selected luxury vehicles', rest: '— clean, comfortable, and always reliable' },
                  { bold: 'Professional chauffeurs', rest: ': polite, punctual, and focused on your comfort' },
                  { bold: 'Well-planned journeys', rest: ': on time, every time, without the stress' },
                  { bold: 'Attention to detail', rest: ': small things that make a big difference in your experience' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500">
                    <span className="w-1.5 h-1.5 bg-black rounded-full flex-shrink-0 mt-2" />
                    <span><span className="font-semibold text-gray-800">{item.bold}</span>{item.rest}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-5 text-gray-500 text-sm sm:text-base leading-relaxed">
              At Black Trucks Co, we focus on giving you a smooth, comfortable ride so you can relax and arrive feeling your best.
            </p>

            <div className="mt-8">
              <Link href="/booking"
                className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded text-sm font-semibold transition-colors">
                Reserve your luxury ride <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="bg-black text-white py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s, i) => (
            <div key={i} className={`reveal delay-${(i + 1) * 100}`}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">
                {s.value === null ? (vehicles.length > 0 ? vehicles.length : '—') : s.value}
              </div>
              <div className="text-gray-300 text-xs sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── OUR SERVICES — 6-box grid (PDF ref) ── */}
      <div className="py-16 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header — two-column like PDF */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-12">
            <div className="lg:w-1/2 reveal-left">
              <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-2">Our Services</p>
              <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                Premium ground transportation for every occasion
              </h2>
            </div>
            <div className="lg:w-1/2 reveal-right">
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                Black Trucks Co provides premium ground transportation tailored for comfort, reliability, and luxury. Whether it is business travel, special events, or personal bookings, we ensure every ride is smooth, private, and professional. Your journey is always handled with care from start to finish.
              </p>
            </div>
          </div>

          {/* 8-box grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {services.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={i}
                className={`reveal delay-${Math.min((i % 4 + 1) * 100, 400)} bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group`}
              >
                <div className="w-11 h-11 bg-black rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-gray-900">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                <Link href="/booking" className="inline-flex items-center gap-1 text-xs font-medium text-black mt-4 hover:gap-2 transition-all">
                  Book Now <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OUR FLEET — 3 highlight cards (PDF ref) ── */}
      <div className="py-16 px-4 sm:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-2">Our Fleet</p>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">Our Black Car & Truck Fleet</h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
              Ride in a range of premium black cars and black trucks — well-maintained vehicles designed for comfort, safety, and style.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {fleetHighlights.map(({ icon: Icon, title, desc, href }, i) => (
              <div key={i} className={`reveal delay-${(i + 1) * 100} group relative overflow-hidden rounded-xl border border-gray-100 p-8 hover:border-black transition-all duration-300`}>
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-full flex items-center justify-center mb-5 transition-colors duration-300">
                  <Icon className="h-6 w-6 text-gray-700 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
                <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:gap-3 transition-all">
                  Learn More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>

          {/* Fleet image strip */}
          <div className="relative aspect-[16/7] sm:h-[360px] sm:aspect-auto rounded-2xl overflow-hidden reveal">
            <Image
              src="/Cadillac Escalade.jpg"
              alt="Our fleet"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
              <h3 className="text-xl sm:text-3xl font-bold mb-3">
                {vehicles.length > 0 ? `${vehicles.length} Premium Vehicle${vehicles.length !== 1 ? 's' : ''}` : 'Premium Vehicles'}
              </h3>
              <p className="text-white text-sm mb-5">
                {vehicles.length > 0 ? vehicles.map(v => v.name).join(' · ') : 'Loading...'}
              </p>
              <Link href="/fleet"
                className="bg-white text-black hover:bg-gray-100 px-6 py-2.5 rounded text-sm font-semibold transition-colors">
                View Full Fleet
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── YOUR JOURNEY COMMITMENT ── */}
      <div className="py-16 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center reveal">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-3">Our Promise</p>
          <h2 className="text-2xl sm:text-4xl font-bold mb-6 leading-tight">
            Your Journey, Backed by Our Commitment
          </h2>
          <div className="space-y-4 text-gray-500 text-sm sm:text-base leading-relaxed mb-8">
            <p>
              All journeys are not the same, and we believe your experience shouldn't be either. Tell us what you have in mind, and we'll take care of the rest, pairing you with the ideal service and vehicle to match your occasion perfectly.
            </p>
            <p>
              Every journey we plan is guided by one promise — to deliver a service that feels effortless, reliable, and tailored to you.
            </p>
            <p>
              From the moment you reach out to the final drop-off, we're committed to precision, comfort, and a seamless experience you can trust.
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-6">Start your journey with confidence</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/booking"
              className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded text-sm font-semibold transition-colors">
              Book Now
            </Link>
            <Link href="/contact"
              className="border border-gray-300 hover:border-gray-600 text-black px-8 py-3 rounded text-sm font-medium transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTACT CTA — two columns (PDF ref: Call Us + Email Us) ── */}
      <div className="bg-black text-white py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-2">Get In Touch</p>
            <h2 className="text-2xl sm:text-4xl font-bold">Ready to book your ride?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {/* Call Us */}
            <div className="reveal-left bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-5">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Call Us</h3>
              <p className="text-gray-400 text-sm mb-4">
                Speak with our team for quick booking and assistance.
              </p>
              <a href="tel:6477066325" className="text-white font-semibold text-lg hover:text-gray-300 transition-colors">
                647-706-6325
              </a>
              <p className="text-gray-500 text-xs mt-1">Available 24/7</p>
            </div>
            {/* Email Us */}
            <div className="reveal-right bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-5">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Email Us</h3>
              <p className="text-gray-400 text-sm mb-4">
                Send us your inquiries and booking details anytime.
              </p>
              <a href="mailto:Blacktrucksco@hotmail.com" className="text-white font-semibold hover:text-gray-300 transition-colors">
                Blacktrucksco@hotmail.com
              </a>
              <p className="text-gray-500 text-xs mt-1">We respond within 24 hours</p>
            </div>
          </div>
          <div className="text-center reveal">
            <Link href="/booking"
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-100 px-8 py-3.5 rounded text-sm font-semibold transition-colors">
              Book Your Ride Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}




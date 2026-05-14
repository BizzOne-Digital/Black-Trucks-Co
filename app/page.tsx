'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, Shield, Clock, Star, Users, ArrowRight, Loader2, Quote } from 'lucide-react';
import AddressInput from '@/components/AddressInput';
import { useRouter } from 'next/navigation';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

interface DbVehicle {
  id: string;
  name: string;
  category: string;
  image: string;
  pricePerHour: number;
  passengers: number;
  luggage: number;
}

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<'oneway' | 'hourly'>('oneway');
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>();
  const [dropoff, setDropoff] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | undefined>();
  const [bookedHours, setBookedHours] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ distance: number; duration: number } | null>(null);

  const canCalculate = pickup && (mode === 'hourly' || dropoff);

  const handleCalculate = async () => {
    if (!canCalculate) return;
    setLoading(true); setError(''); setResult(null);
    try {
      if (mode === 'oneway') {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: pickup, destination: dropoff, originCoords: pickupCoords, destinationCoords: dropoffCoords }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not calculate route');
        setResult({ distance: data.distance, duration: data.duration });
      } else {
        setResult({ distance: 0, duration: bookedHours * 60 });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg === 'Failed to fetch'
          ? 'Could not reach the server. Check your connection and try again.'
          : msg || 'Could not calculate. Please select addresses from the dropdown suggestions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBook = () => {
    const bookingData = {
      pickup, dropoff: mode === 'oneway' ? dropoff : pickup, date, time,
      distance: result?.distance ?? 0,
      duration: mode === 'hourly' ? bookedHours * 60 : (result?.duration ?? 60),
      hours: mode === 'hourly' ? bookedHours : undefined,
      serviceType: mode === 'hourly' ? 'hourly' : 'oneway',
      _ts: Date.now(),
    };
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    router.push('/vehicles');
  };

  return (
    <div className="relative w-full flex flex-col" style={{ minHeight: '100svh' }}>
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover object-[center_40%] sm:object-center">
        <source src="/home page hero banner.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65 sm:from-black/70 sm:via-black/55 sm:to-black/80" />

      <div className="relative z-10 flex flex-col flex-1 px-4 sm:px-8 lg:px-16 pt-28 sm:pt-40 pb-10 sm:pb-14">
        {/* Headline */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
          <h1 className="hero-text-enter-delay text-2xl sm:text-3xl lg:text-5xl font-bold text-white leading-tight mb-4 max-w-3xl">
            ARRIVE IN STYLE.<br />GUARANTEED PUNCTUALITY.
          </h1>
          <p className="hero-text-enter-delay text-white text-sm sm:text-lg mb-8 max-w-xl">
            Premium black car & truck service — available 24/7 across Toronto.
          </p>

        </div>

        {/* Calculator — no heading, just tabs + bar */}
        <div className="mt-auto w-full max-w-5xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              {(['oneway', 'hourly'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setResult(null); }}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${mode === m ? 'bg-white text-black shadow' : 'text-white/80 hover:text-white'}`}>
                  {m === 'oneway' ? 'One way' : 'By the hour'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-white/15">
              <div className="flex-1 px-4 sm:px-5 py-3 sm:py-4 min-w-0">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Pickup location</p>
                <AddressInput placeholder="Address, airport, hotel..." value={pickup}
                  onChange={(val, coords) => { setPickup(val); setPickupCoords(coords); setResult(null); setError(''); }} glass />
              </div>

              {mode === 'oneway' && (
                <div className="flex-1 px-4 sm:px-5 py-3 sm:py-4 min-w-0">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Drop-off location</p>
                  <AddressInput placeholder="Address, airport, hotel..." value={dropoff}
                    onChange={(val, coords) => { setDropoff(val); setDropoffCoords(coords); setResult(null); setError(''); }} glass />
                </div>
              )}

              {mode === 'hourly' && (
                <div className="px-4 sm:px-5 py-3 sm:py-4 min-w-0 sm:min-w-[160px]">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Duration</p>
                  <select value={bookedHours} onChange={e => { setBookedHours(Number(e.target.value)); setResult(null); }}
                    className="text-sm font-semibold text-white outline-none w-full bg-transparent cursor-pointer">
                    {HOUR_OPTIONS.map(h => (
                      <option key={h} value={h} className="text-black bg-white">{h} {h === 1 ? 'hour' : 'hours'}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex divide-x divide-white/15 sm:contents">
                <div className="flex-1 px-4 sm:px-5 py-3 sm:py-4 sm:min-w-[150px]">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Date</p>
                  <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    className="text-sm text-white outline-none w-full bg-transparent [color-scheme:dark]" />
                </div>
                <div className="flex-1 px-4 sm:px-5 py-3 sm:py-4 sm:min-w-[130px]">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Pickup time</p>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="text-sm text-white outline-none w-full bg-transparent [color-scheme:dark]" />
                </div>
              </div>

              <div className="flex items-center px-4 py-3 sm:py-0">
                <button onClick={handleCalculate} disabled={!canCalculate || loading}
                  className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Calculating...</> : 'Get a Quote'}
                </button>
              </div>
            </div>

            {result && (
              <div className="border-t border-white/15 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-6 text-sm">
                  {mode === 'oneway' && result.distance > 0 && (
                    <>
                      <div><p className="text-xs text-white/50 mb-0.5">Distance</p><p className="font-bold text-white">{result.distance} km</p></div>
                      <div><p className="text-xs text-white/50 mb-0.5">Est. duration</p><p className="font-bold text-white">{result.duration} min</p></div>
                    </>
                  )}
                  {mode === 'hourly' && (
                    <div><p className="text-xs text-white/50 mb-0.5">Booked duration</p><p className="font-bold text-white">{bookedHours} {bookedHours === 1 ? 'hour' : 'hours'}</p></div>
                  )}
                  <div className="text-xs text-white/40 self-end">Select your vehicle to see pricing</div>
                </div>
                <button onClick={handleBook}
                  className="bg-white text-black hover:bg-gray-100 px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2">
                  Select Vehicle <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-300 bg-white/5 rounded-lg px-4 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Featured Vehicles (Escalade + Mercedes S-Class) ─────────────────────────
function FeaturedVehicles({ vehicles }: { vehicles: DbVehicle[] }) {
  // Prioritize Escalade and Mercedes S-Class
  const escalade = vehicles.find(v => v.name.toLowerCase().includes('escalade'));
  const sClass = vehicles.find(v =>
    v.name.toLowerCase().includes('s-class') ||
    v.name.toLowerCase().includes('s class') ||
    (v.name.toLowerCase().includes('mercedes') && v.name.toLowerCase().includes('s'))
  );
  const display = [escalade, sClass].filter(Boolean) as DbVehicle[];
  const fallback = display.length < 2 ? vehicles.slice(0, 2 - display.length) : [];
  const final = [...display, ...fallback].slice(0, 2);
  if (!final.length) return null;

  return (
    <section className="py-20 px-4 sm:px-8 bg-white section-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Featured Vehicles</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">Ride in Signature Style</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {final.map((v) => (
            <div key={v.id} className="group relative rounded-2xl overflow-hidden h-[460px] reveal">
              <Image src={v.image} alt={v.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                <p className="text-xs font-semibold tracking-widest uppercase text-white/60 mb-1">{v.category}</p>
                <h3 className="text-2xl font-bold mb-2">{v.name}</h3>
                <p className="text-sm text-white/70 mb-5 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {v.passengers} passengers
                </p>
                <div className="flex gap-3">
                  <Link href="/booking" className="bg-white text-black hover:bg-gray-100 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    Book Now
                  </Link>
                  <Link href="/fleet" className="bg-white/15 hover:bg-white/25 backdrop-blur text-white border border-white/25 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Full Fleet Carousel ──────────────────────────────────────────────────────
function VehiclePanelGrid({ vehicles }: { vehicles: DbVehicle[] }) {
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!vehicles.length) return null;

  // Pin Escalade and S-Class to the front
  const priority = (v: DbVehicle) => {
    if (v.name.toLowerCase().includes('escalade')) return 0;
    if (v.name.toLowerCase().includes('s-class') || v.name.toLowerCase().includes('s class')) return 1;
    return 2;
  };
  const sorted = [...vehicles].sort((a, b) => priority(a) - priority(b));

  const visible = isMobile ? 1 : 2;
  const pct = isMobile ? 100 : 50;
  const max = Math.max(0, vehicles.length - visible);

  return (
    <section className="bg-[#0d0d0d] section-fade-in">
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${offset * pct}%)` }}>
          {sorted.map((v) => (
            <div key={v.id} className="group relative w-full md:w-1/2 flex-shrink-0 h-[300px] sm:h-[380px] md:h-[460px] overflow-hidden">
              <Image src={v.image} alt={v.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/55 transition-all duration-500 group-hover:bg-black/70" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-7 sm:left-6 sm:right-6 md:left-10 text-white">
                <p className="text-xs font-semibold tracking-widest uppercase mb-1 text-white/60">{v.category}</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{v.name}</h2>
                <p className="text-xs sm:text-sm mb-3 sm:mb-5 text-white/70 flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {v.passengers} passengers
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/booking" className="border border-white/30 hover:bg-white/10 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors">Book Now</Link>
                  <Link href="/fleet" className="bg-white/15 hover:bg-white/25 backdrop-blur text-white border border-white/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors">Learn More</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        {offset > 0 && (
          <button onClick={() => setOffset(o => Math.max(0, o - 1))}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3 shadow z-10 backdrop-blur border border-white/20 transition-colors" aria-label="Previous">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}
        {offset < max && (
          <button onClick={() => setOffset(o => Math.min(max, o + 1))}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3 shadow z-10 backdrop-blur border border-white/20 transition-colors" aria-label="Next">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  { icon: Shield, title: 'Professional Chauffeurs', desc: 'Experienced, licensed, and background-checked drivers' },
  { icon: Star, title: 'Premium Black Car Fleet', desc: 'Black cars and black trucks maintained to the highest standards' },
  { icon: Clock, title: 'Always On Time', desc: 'Punctuality and reliability you can count on' },
  { icon: Users, title: '24/7 Service', desc: 'Available around the clock for your convenience' },
];

function FeaturesSection() {
  return (
    <section className="bg-white text-black py-20 px-4 sm:px-8 section-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14 reveal">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-black">The Black Trucks Experience</h2>
          <p className="text-gray-500 text-sm">Toronto's trusted black car & black truck service — 10+ years, 15,000+ clients</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className={`reveal text-center delay-${(i + 1) * 100}`}>
              <div className="bg-black w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 hover:scale-110 transition-transform duration-300">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-sm font-bold mb-2 text-black">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Section ──────────────────────────────────────────────────────────
const galleryImages = [
  { src: '/Gallery (1).jpg', label: 'Interior' },
  { src: '/Gallery (2).jpg', label: 'Interior' },
  { src: '/Gallery (3).jpg', label: 'Interior' },
  { src: '/Gallery (4).jpg', label: 'Interior' },
  { src: '/Gallery (5).jpg', label: 'Exterior' },
  { src: '/Gallery (6).jpg', label: 'Exterior' },
];

function GallerySection() {
  return (
    <section className="py-20 px-4 sm:px-8 bg-white section-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Gallery</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">Inside the Experience</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">Every detail crafted for comfort, style, and a premium black car experience.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[200px] sm:auto-rows-[240px]">
          {galleryImages.map((img, i) => (
            <div key={i} className={`relative rounded-xl overflow-hidden group ${i === 0 ? 'col-span-2 row-span-2' : ''} reveal delay-${Math.min(i * 100, 400)}`}>
              <Image
                src={img.src}
                alt={img.label}
                fill
                className="object-cover transition-transform duration-600 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
            </div>
          ))}
        </div>
        <div className="text-center mt-10 reveal">
          <Link href="/gallery" className="inline-flex items-center gap-2 bg-black hover:bg-gray-900 text-white px-8 py-3.5 rounded-lg text-sm font-semibold transition-colors">
            View Full Gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Google Reviews Section ───────────────────────────────────────────────────
const placeholderReviews = [
  { name: 'James R.', rating: 5, text: 'Absolutely flawless service. The Escalade showed up 10 minutes early and the driver was incredibly professional. Will never use another service.', date: 'March 2025' },
  { name: 'Sophia M.', rating: 5, text: 'Used Black Trucks Co for our wedding day. The vehicle was immaculate and the team coordinated everything perfectly. Our guests were blown away.', date: 'February 2025' },
  { name: 'Marcus T.', rating: 5, text: "Best airport transfer I've ever had. Flight was delayed and they tracked it automatically — driver was right there when I landed. Impressive.", date: 'January 2025' },
  { name: 'Priya K.', rating: 5, text: 'Booked for a corporate event. On time, clean, professional. Our clients were very impressed. Already booked again for next month.', date: 'December 2024' },
  { name: 'Derek W.', rating: 5, text: 'Took the Yukon XL for a night out with friends. Spacious, smooth ride, and the driver was super cool. Made the whole night feel premium.', date: 'November 2024' },
  { name: 'Aaliyah J.', rating: 5, text: 'Prom night was perfect thanks to Black Trucks Co. My daughter felt like a celebrity. The vehicle was stunning and the driver was so kind.', date: 'October 2024' },
];

function GoogleReviews() {
  return (
    <section className="py-20 bg-[#0d0d0d] section-fade-in overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-12 text-center reveal">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3">Google Reviews</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">What Our Clients Say</h2>
        <div className="flex items-center justify-center gap-1 mt-3">
          {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
          <span className="text-white font-bold ml-2 text-lg">5.0</span>
          <span className="text-gray-500 text-sm ml-1">on Google</span>
        </div>
      </div>
      {/* Marquee */}
      <div className="overflow-hidden w-full">
        <div className="flex gap-5 animate-marquee" style={{ width: 'max-content' }}>
          {[...placeholderReviews, ...placeholderReviews].map((r, i) => (
            <div key={i} className="flex flex-col justify-between bg-white/5 border border-white/8 rounded-2xl p-6 w-[300px] sm:w-[320px] flex-shrink-0">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {/* Google G icon */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <Quote className="h-4 w-4 text-white/20 mb-2" />
                <p className="text-sm text-gray-300 leading-relaxed">{r.text}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/8">
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-gray-500">{r.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="relative h-[400px] sm:h-[440px] overflow-hidden section-fade-in">
      <Image src="/Book now.jpeg" alt="Book your ride" fill className="object-cover" />
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
        <p className="reveal text-xs font-semibold tracking-widest uppercase text-white/50 mb-3">Black Car & Black Truck Service · Toronto</p>
        <h2 className="reveal text-3xl sm:text-5xl font-bold mb-4 tracking-tight">Ready to Book Your Ride?</h2>
        <p className="reveal delay-100 text-sm sm:text-base mb-2 text-white/70">Professional chauffeur service available 24/7 — airports, corporate, events & more.</p>
        <p className="reveal delay-150 text-xs text-white/40 mb-8">10+ years of experience · 15,000+ clients served · 5.0 ★ on Google</p>
        <div className="reveal delay-200 flex flex-wrap justify-center gap-3">
          <Link href="/booking" className="bg-white text-black hover:bg-gray-100 px-7 py-3 rounded-lg text-sm font-semibold transition-colors">Book Now</Link>
          <Link href="/fleet" className="bg-white/15 hover:bg-white/25 backdrop-blur text-white border border-white/30 px-7 py-3 rounded-lg text-sm font-medium transition-colors">View Fleet</Link>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [vehicles, setVehicles] = useState<DbVehicle[]>([]);
  useReveal();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/vehicles');
        if (!res.ok || cancelled) return;
        const d = await res.json();
        if (cancelled) return;
        setVehicles((d.vehicles || []).map((v: any) => ({ ...v, id: v.id || v._id })));
      } catch {
        // Network error, server restarting, or offline — avoid unhandled rejection / Next overlay
        if (!cancelled) setVehicles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white">
      <Hero />
      <VehiclePanelGrid vehicles={vehicles} />
      <FeaturesSection />
      <GallerySection />
      <GoogleReviews />
      <CTABanner />
    </div>
  );
}



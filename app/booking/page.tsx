'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin, Calendar, Clock, ArrowRight, ChevronRight, Loader2,
  Briefcase, Plane, Sparkles, Heart, PartyPopper, Crown, Camera,
} from 'lucide-react';
import AddressInput from '@/components/AddressInput';
import Stepper from '@/components/Stepper';
import { BookingData, BookingService } from '@/lib/types';

// ─── Service definitions ──────────────────────────────────────────────────────
const SERVICES: (BookingService & { icon: any; color: string })[] = [
  { id: 'corporate',  name: 'Corporate',         description: 'Executive travel for meetings & client pickups', icon: Briefcase,   color: 'bg-slate-50 border-slate-200' },
  { id: 'airport',    name: 'Airport Transfer',  description: 'Flight tracking, on-time pickups & drop-offs',  icon: Plane,       color: 'bg-sky-50 border-sky-200' },
  { id: 'prom',       name: 'Prom & Formal',     description: 'Elegant arrivals for prom, graduation & formals', icon: Sparkles,  color: 'bg-purple-50 border-purple-200' },
  { id: 'wedding',    name: 'Wedding',           description: 'Bridal party & guest transport for your big day', icon: Heart,     color: 'bg-rose-50 border-rose-200' },
  { id: 'events',     name: 'Special Events',    description: 'Birthdays, concerts & nights out in the city',   icon: PartyPopper, color: 'bg-orange-50 border-orange-200' },
  { id: 'vip',        name: 'VIP & Luxury',      description: 'Private, high-end service for those who expect more', icon: Crown, color: 'bg-yellow-50 border-yellow-200' },
  { id: 'hourly',     name: 'Hourly / As-Directed', description: 'Driver on standby for flexible multi-stop plans', icon: Clock, color: 'bg-green-50 border-green-200' },
  { id: 'photoshoot', name: 'Photoshoot',        description: 'Luxury trucks as backdrop for photos & content',  icon: Camera,    color: 'bg-pink-50 border-pink-200' },
];

// ─── Inner component (needs useSearchParams) ──────────────────────────────────
function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get('service');

  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>({ pickup: '', dropoff: '', date: '', time: '' });
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>();
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | undefined>();
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState('');

  // Pre-select service if coming from /services page
  useEffect(() => {
    if (preselectedService) {
      const found = SERVICES.find(s => s.id === preselectedService);
      if (found) {
        const { icon: _icon, color: _color, ...service } = found;
        setData(d => ({ ...d, service }));
        setStep(1); // skip straight to location step
      }
    }
  }, [preselectedService]);

  const steps = ['Service', 'Location', 'Date & Time', 'Summary'];

  const set = (field: keyof BookingData, value: any) => setData(d => ({ ...d, [field]: value }));

  const valid = () => {
    if (step === 0) return !!data.service;
    if (step === 1) return !!(data.pickup && data.dropoff);
    if (step === 2) return !!(data.date && data.time);
    return true;
  };

  const next = async () => {
    // Step 1 → 2: calculate distance
    if (step === 1) {
      setDistanceLoading(true);
      setDistanceError('');
      try {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: data.pickup,
            destination: data.dropoff,
            originCoords: pickupCoords,
            destinationCoords: dropoffCoords,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Could not calculate distance');
        setData(d => ({ ...d, distance: result.distance, duration: result.duration }));
      } catch (err: any) {
        setDistanceError(err.message || 'Could not calculate distance. Please select addresses from the suggestions.');
        setDistanceLoading(false);
        return; // don't advance — force user to fix the address
      }
      setDistanceLoading(false);
      setStep(s => s + 1);
      return;
    }
    // Last step → go to vehicles
    if (step === steps.length - 1) {
      // Always write fresh bookingData with a timestamp
      sessionStorage.setItem('bookingData', JSON.stringify({ ...data, _ts: Date.now() }));
      // Track abandonment for logged-in users (fire-and-forget)
      fetch('/api/bookings/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: data.pickup,
          dropoff: data.dropoff,
          date: data.date,
          time: data.time,
          distance: data.distance,
          duration: data.duration,
          serviceType: data.service?.id,
          step: steps.length - 1,
        }),
      }).catch(() => {}); // never block the user
      router.push('/vehicles');
      return;
    }
    setStep(s => s + 1);
  };

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white";
  const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2";

  return (
    <div className="min-h-screen bg-white pt-12 flex flex-col lg:flex-row">

      {/* Left — image panel: hidden on mobile, full height on desktop */}
      <div className="hidden lg:block relative lg:w-5/12 xl:w-1/2 lg:min-h-screen flex-shrink-0">
        <Image
          src="/Book now.jpeg"
          alt="Book your ride"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
          {data.service && (
            <div className="mb-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 w-fit">
              <span className="text-xs font-medium">{data.service.name}</span>
            </div>
          )}
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white/90">Premium Service</p>
          <h2 className="text-3xl font-bold mb-2">Book Your Ride</h2>
          <p className="text-sm text-white">Luxury chauffeur service at your fingertips</p>
        </div>
      </div>

      {/* Right — form: full width on mobile, half on desktop */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex flex-col justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-12">
        <div className="max-w-lg w-full mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">
            Step {step + 1} of {steps.length}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">{steps[step]}</h1>

          <Stepper steps={steps} currentStep={step} />

          <div className="mt-8">

            {/* ── Step 0: Service selection ── */}
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  const isSelected = data.service?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        const { icon: _icon, color: _color, ...s } = service;
                        set('service', s);
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                        isSelected
                          ? 'border-black bg-gray-50 shadow-sm'
                          : `border-gray-100 hover:border-gray-300 ${service.color}`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-black' : 'bg-white shadow-sm'}`}>
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-black' : 'text-gray-800'}`}>
                            {service.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{service.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Step 1: Location ── */}
            {step === 1 && (
              <div className="space-y-5">
                {data.service && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                    <span className="text-xs text-gray-700 font-medium">{data.service.name}</span>
                    <button
                      onClick={() => { set('service', undefined); setStep(0); }}
                      className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Change
                    </button>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Pick-up Location</label>
                  <AddressInput
                    placeholder="Enter pick-up address"
                    value={data.pickup}
                    onChange={(val, coords) => { set('pickup', val); setPickupCoords(coords); }}
                  />
                </div>
                <div>
                  <label className={labelCls}>Drop-off Location</label>
                  <AddressInput
                    placeholder="Enter drop-off address"
                    value={data.dropoff}
                    onChange={(val, coords) => { set('dropoff', val); setDropoffCoords(coords); }}
                  />
                </div>
              </div>
            )}

            {/* ── Step 2: Date & Time ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}><Calendar className="inline h-3.5 w-3.5 mr-1" />Date</label>
                  <input type="date" value={data.date} onChange={e => set('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}><Clock className="inline h-3.5 w-3.5 mr-1" />Time</label>
                  <input type="time" value={data.time} onChange={e => set('time', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {/* ── Step 3: Summary ── */}
            {step === 3 && (
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {data.service && (
                  <div className="flex items-start gap-3 p-4">
                    <span className="text-blue-600 mt-0.5">
                      {(() => {
                        const s = SERVICES.find(s => s.id === data.service!.id);
                        if (!s) return null;
                        const Icon = s.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                    </span>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Service</p>
                      <p className="text-sm font-medium text-gray-800">{data.service.name}</p>
                    </div>
                  </div>
                )}
                {[
                  { icon: MapPin, label: 'Pick-up', value: data.pickup },
                  { icon: MapPin, label: 'Drop-off', value: data.dropoff },
                  {
                    icon: Calendar, label: 'Date',
                    value: new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                  },
                  { icon: Clock, label: 'Time', value: data.time },
                ].map(({ icon: Icon, label, value }, i) => (
                  <div key={i} className="flex items-start gap-3 p-4">
                    <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value}</p>
                    </div>
                  </div>
                ))}
                <div className="p-4 flex justify-between text-sm">
                  <span className="text-gray-500">Est. Distance</span>
                  <span className="font-medium">{data.distance ?? '—'} km</span>
                </div>
                <div className="p-4 flex justify-between text-sm">
                  <span className="text-gray-500">Est. Duration</span>
                  <span className="font-medium">{data.duration ?? '—'} min</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 gap-4">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="border border-gray-300 hover:border-gray-600 text-black px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Back
              </button>
            ) : <div />}

            {distanceError && (
              <p className="text-red-500 text-xs flex-1 text-center">{distanceError}</p>
            )}

            <button
              onClick={next}
              disabled={!valid() || distanceLoading}
              className="flex items-center gap-2 bg-black hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {distanceLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === steps.length - 1 ? 'Choose Vehicle' : 'Continue'}
              {!distanceLoading && (
                step === steps.length - 1
                  ? <ArrowRight className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense>
      <BookingForm />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Phone, CheckCircle, MessageCircle } from 'lucide-react';
import AddressInput from '@/components/AddressInput';
import { Calendar } from '@/components/ui/calendar';

const SERVICE_TYPES = [
  'Airport Transfers',
  'Corporate Travel',
  'Events & Occasions',
  'Personalized Service',
];

const SUPPORT_PHONE = '647-706-6325';
const SUPPORT_PHONE_TEL = '6477066325';
const WHATSAPP_URL = `https://wa.me/1${SUPPORT_PHONE_TEL}`;

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function BookForm() {
  const searchParams = useSearchParams();
  const prefillVehicle = searchParams.get('vehicle');

  const [serviceStyle, setServiceStyle] = useState<'point' | 'hourly'>('point');
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    time: '',
    serviceType: '',
    pickup: '',
    dropoff: '',
    passengers: '1',
    bags: '',
    notes: '',
    roundTrip: false,
    returnDate: '',
    returnTime: '',
  });
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>();
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const dateStr = selectedDay ? toDateStr(selectedDay) : '';

  useEffect(() => {
    if (!dateStr) {
      setTimeSlots([]);
      setForm((f) => ({ ...f, time: '' }));
      return;
    }
    setSlotsLoading(true);
    fetch(`/api/availability/slots?date=${encodeURIComponent(dateStr)}`)
      .then((r) => r.json())
      .then((d) => setTimeSlots(d.slots || []))
      .catch(() => setTimeSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [dateStr]);

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !form.time) {
      setError('Please choose a date and an available time.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      let distance = 10;
      let duration = serviceStyle === 'hourly' ? 120 : 60;

      if (form.pickup && (serviceStyle === 'hourly' || form.dropoff)) {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: form.pickup,
            destination: serviceStyle === 'hourly' ? form.pickup : form.dropoff,
            originCoords: pickupCoords,
            destinationCoords: serviceStyle === 'hourly' ? pickupCoords : dropoffCoords,
          }),
        });
        const result = await res.json();
        if (res.ok && result.distance) {
          distance = result.distance;
          duration = result.duration || duration;
        }
      }

      const res = await fetch('/api/booking-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          date: dateStr,
          serviceStyle: serviceStyle === 'hourly' ? 'hourly' : 'point-to-point',
          vehicleId: prefillVehicle || undefined,
          distance,
          duration,
          passengers: Number(form.passengers) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit request');

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors bg-white';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2';

  if (success) {
    return (
      <div className="min-h-screen bg-white pt-12 px-4 py-20 max-w-lg mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Thank you</h1>
        <p className="text-gray-600 text-sm">
          We&apos;ll confirm your reservation shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-12 flex flex-col lg:flex-row">
      <div className="hidden lg:block relative lg:w-5/12 xl:w-1/2 lg:min-h-screen flex-shrink-0">
        <Image src="/Book now.jpeg" alt="Reserve your chauffeur" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white/90">Reserve</p>
          <h2 className="text-3xl font-bold mb-2">Book your ride</h2>
          <p className="text-sm text-white/90">
            Choose your date and time on our live calendar. Prefer to talk? Call {SUPPORT_PHONE}.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-7/12 xl:w-1/2 px-4 sm:px-8 lg:px-12 py-10">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1 lg:hidden">Reserve</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Book your ride</h1>
          <p className="text-sm text-gray-500 mb-8 lg:hidden">
            Choose your date and time on our live calendar. Prefer to talk? Call{' '}
            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="font-medium text-black underline">{SUPPORT_PHONE}</a>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className={labelCls}>Service style</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'point' as const, title: 'Point-to-Point Transfer', sub: 'Point-to-Point' },
                  { id: 'hourly' as const, title: 'Hourly / As Directed', sub: 'Hourly' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setServiceStyle(opt.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      serviceStyle === opt.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
              {serviceStyle === 'point' && (
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  A single trip from pickup to drop-off (airport runs, one-way transfers). The driver reviews each
                  request and confirms your finalized pickup window shortly after you submit.
                </p>
              )}
            </div>

            <div>
              <p className={labelCls}>Date &amp; time</p>
              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => {
                    setSelectedDay(d);
                    setForm((f) => ({ ...f, time: '' }));
                  }}
                  disabled={{ before: new Date() }}
                  className="mx-auto bg-white rounded-lg"
                />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Available times</p>
                {!dateStr ? (
                  <p className="text-sm text-gray-400">Pick a date to see available times.</p>
                ) : slotsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : timeSlots.length === 0 ? (
                  <p className="text-sm text-gray-500">No open times on this date — try another day or call us.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('time', t)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                          form.time === t
                            ? 'bg-black text-white border-black'
                            : 'bg-white border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone number</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Service type</label>
              <select
                required
                value={form.serviceType}
                onChange={(e) => set('serviceType', e.target.value)}
                className={inputCls}
              >
                <option value="">Select a service</option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Pickup location</label>
              <AddressInput
                placeholder="Enter pickup address"
                value={form.pickup}
                onChange={(val, coords) => {
                  set('pickup', val);
                  setPickupCoords(coords);
                }}
              />
            </div>

            {serviceStyle === 'point' && (
              <div>
                <label className={labelCls}>Drop-off location</label>
                <AddressInput
                  placeholder="Enter drop-off address"
                  value={form.dropoff}
                  onChange={(val, coords) => {
                    set('dropoff', val);
                    setDropoffCoords(coords);
                  }}
                />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Number of passengers</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={form.passengers}
                  onChange={(e) => set('passengers', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Number of bags (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={form.bags}
                  onChange={(e) => set('bags', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.roundTrip}
                onChange={(e) => set('roundTrip', e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Round trip</span>
                <span className="block text-gray-500 text-xs">Include a return leg with a separate date and time.</span>
              </span>
            </label>

            {form.roundTrip && (
              <div className="grid sm:grid-cols-2 gap-4 pl-6 border-l-2 border-gray-100">
                <div>
                  <label className={labelCls}>Return date</label>
                  <input
                    type="date"
                    value={form.returnDate}
                    onChange={(e) => set('returnDate', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Return time</label>
                  <input
                    type="time"
                    value={form.returnTime}
                    onChange={(e) => set('returnTime', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Special requests / notes (optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className={inputCls}
                placeholder="Flight number, child seat, etc."
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !form.time}
              className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Submit Booking Request'}
            </button>
            <p className="text-xs text-gray-400 text-center">We&apos;ll confirm your reservation shortly.</p>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 space-y-4">
            <p className="text-sm font-semibold">Contact the Driver</p>
            <p className="text-xs text-gray-500">Reach us any time — we answer 24/7 for reservations and questions.</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 hover:border-black transition-colors"
              >
                <Phone className="h-4 w-4" /> Call {SUPPORT_PHONE}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 hover:border-black transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Text WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookForm />
    </Suspense>
  );
}

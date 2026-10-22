'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Users,
  Luggage,
} from 'lucide-react';
import Stepper from '@/components/Stepper';
import { BookingData, Vehicle, billableHours } from '@/lib/types';

type AnnotatedVehicle = Vehicle & {
  isAvailableOnDate: boolean;
  bookedTimes?: string[];
};

function quoteForVehicle(vehicle: Vehicle, durationMinutes: number) {
  const hours = billableHours(durationMinutes, vehicle.minimumHours ?? 1);
  const ridePrice = hours * vehicle.pricePerHour;
  const serviceFee = 5;
  const tax = ridePrice * 0.1;
  return { hours, ridePrice, serviceFee, tax, totalPrice: ridePrice + serviceFee + tax };
}

function VehiclesBookingFlow() {
  const router = useRouter();
  const { data: session } = useSession();

  const [trip, setTrip] = useState<BookingData | null>(null);
  const [vehicles, setVehicles] = useState<AnnotatedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('bookingData');
    if (!raw) {
      router.replace('/');
      return;
    }
    try {
      const data = JSON.parse(raw) as BookingData;
      if (!data.pickup || !data.date || !data.time) {
        router.replace('/');
        return;
      }
      setTrip(data);
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!trip?.date || !trip.time) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      date: trip.date,
      time: trip.time,
      duration: String(Math.max(trip.duration ?? 60, 30)),
    });
    fetch(`/api/vehicles?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list: AnnotatedVehicle[] = (d.vehicles || []).map((v: Record<string, unknown>) => ({
          id: String(v.id ?? v._id),
          name: String(v.name ?? ''),
          category: String(v.category ?? ''),
          image: String(v.image ?? '/logo.png'),
          pricePerHour: Number(v.pricePerHour) || 0,
          minimumHours: Number(v.minimumHours) || 1,
          passengers: Number(v.passengers) || 1,
          luggage: Number(v.luggage) || 0,
          description: String(v.description ?? ''),
          features: Array.isArray(v.features) ? (v.features as string[]) : [],
          isAvailableOnDate: v.isAvailableOnDate !== false,
          bookedTimes: Array.isArray(v.bookedTimes) ? (v.bookedTimes as string[]) : [],
        }));
        setVehicles(list);
      })
      .catch(() => setError('Could not load vehicles. Please try again.'))
      .finally(() => setLoading(false));
  }, [trip]);

  useEffect(() => {
    if (!session?.user) return;
    setGuestName(session.user.name || '');
    setGuestEmail(session.user.email || '');
  }, [session]);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId]
  );

  const quote = selected && trip ? quoteForVehicle(selected, trip.duration ?? 60) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !selected) {
      setError('Please select a vehicle to continue.');
      return;
    }
    if (!selected.isAvailableOnDate) {
      setError('This vehicle is not available at your selected time. Please pick another option.');
      return;
    }
    if (!session?.user && (!guestName.trim() || !guestEmail.trim())) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selected.id,
          pickup: trip.pickup,
          dropoff: trip.dropoff,
          date: trip.date,
          time: trip.time,
          distance: trip.distance ?? 0,
          duration: trip.duration ?? 60,
          passengers: 1,
          serviceType: trip.serviceType,
          promoCode: promoCode.trim() || undefined,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      const confirmed = {
        ...trip,
        vehicle: selected,
        totalPrice: data.booking?.totalPrice ?? quote?.totalPrice,
        reference: data.booking?.reference,
        discount: data.booking?.discount ?? 0,
        paymentMethod: 'card',
        guestEmail: session?.user?.email || guestEmail.trim(),
      };
      sessionStorage.setItem('confirmedBooking', JSON.stringify(confirmed));
      sessionStorage.removeItem('bookingData');
      router.push('/confirmation');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Edit trip details
          </Link>
          <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-1">Step 2 of 2</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Choose your vehicle</h1>
          <Stepper steps={['Trip details', 'Vehicle']} currentStep={1} />
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {trip.pickup} → {trip.dropoff}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              {trip.date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              {trip.time}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl border p-6">
              No vehicles are available right now. Please call{' '}
              <a href="tel:6477066325" className="font-medium text-black underline">647-706-6325</a>.
            </p>
          ) : (
            vehicles.map((v) => {
              const isSelected = selectedId === v.id;
              const canSelect = v.isAvailableOnDate;
              const preview = quoteForVehicle(v, trip.duration ?? 60);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!canSelect}
                  onClick={() => canSelect && setSelectedId(v.id)}
                  className={`w-full text-left bg-white rounded-xl border overflow-hidden transition-all ${
                    isSelected ? 'border-black ring-2 ring-black/10' : 'border-gray-100 hover:border-gray-300'
                  } ${!canSelect ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-48 h-44 sm:h-auto flex-shrink-0">
                      <Image src={v.image} alt={v.name} fill className="object-cover" sizes="192px" />
                    </div>
                    <div className="flex-1 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-400">{v.category}</p>
                      <h2 className="text-lg font-bold">{v.name}</h2>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{v.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {v.passengers}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Luggage className="h-3.5 w-3.5" /> {v.luggage} bags
                        </span>
                        {v.minimumHours > 1 && (
                          <span>Min. {v.minimumHours}h</span>
                        )}
                      </div>
                      {!canSelect && v.bookedTimes && v.bookedTimes.length > 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          Booked {v.bookedTimes.join(', ')} — overlaps your pickup time
                        </p>
                      )}
                      <p className="mt-3 font-bold text-lg">
                        ${preview.totalPrice.toFixed(2)}{' '}
                        <span className="text-sm font-normal text-gray-400">
                          est. ({preview.hours}h @ ${v.pricePerHour}/hr)
                        </span>
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24 space-y-4"
          >
            <h2 className="font-bold text-lg">Complete booking</h2>
            {selected && quote ? (
              <div className="text-sm space-y-1 border-b border-gray-100 pb-4">
                <p className="font-medium">{selected.name}</p>
                <div className="flex justify-between text-gray-500">
                  <span>Ride ({quote.hours}h)</span>
                  <span>${quote.ridePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Service fee</span>
                  <span>${quote.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span>${quote.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2">
                  <span>Total</span>
                  <span>${quote.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a vehicle to see pricing.</p>
            )}

            {!session?.user && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Full name</label>
                  <input
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Promo code (optional)</label>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !selected}
              className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</> : 'Confirm booking'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Prefer to inquire first?{' '}
              <Link href="/book" className="underline text-gray-600">Use the inquiry form</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <VehiclesBookingFlow />
    </Suspense>
  );
}

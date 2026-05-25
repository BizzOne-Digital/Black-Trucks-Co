'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin, Calendar, Car, Tag, Lock, Loader2,
  CheckCircle, User, CreditCard, Info,
} from 'lucide-react';
import { BookingData, billableHours } from '@/lib/types';
import { useSession } from 'next-auth/react';

// ─── Configurable deposit amount (CAD) ───────────────────────────────────────
const DEPOSIT_AMOUNT = 40;

// ─── Deposit payment section ──────────────────────────────────────────────────
function DepositSection({
  booking,
  promoCode,
  promoResult,
  total,
}: {
  booking: BookingData;
  promoCode: string;
  promoResult: { valid: boolean; discount?: number; error?: string } | null;
  total: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tripType = booking.service?.id || booking.serviceType;
  const remaining = Math.max(0, total - DEPOSIT_AMOUNT);

  if (!tripType) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
        Please go back and select a service type to continue.
      </div>
    );
  }

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: booking.vehicle!.id,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          date: booking.date,
          time: booking.time,
          distance: booking.distance,
          duration: booking.duration,
          promoCode: promoResult?.valid ? promoCode : undefined,
          serviceType: tripType,
          depositOnly: true,
          depositAmount: DEPOSIT_AMOUNT,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Deposit breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Deposit due now</p>
          <p className="text-2xl font-bold text-blue-700">${DEPOSIT_AMOUNT.toFixed(2)}</p>
          <p className="text-xs text-blue-500 mt-0.5">Paid online via Stripe</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Balance on the day</p>
          <p className="text-2xl font-bold text-gray-700">${remaining.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Paid to driver at pickup</p>
        </div>
      </div>

      {/* Info list */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-blue-800">Online deposit required to confirm booking</p>
        </div>
        <ul className="text-xs text-blue-700 space-y-1.5 pl-1">
          {[
            `A $${DEPOSIT_AMOUNT} deposit is charged now to secure your booking`,
            `Remaining $${remaining.toFixed(2)} balance is paid directly to your driver on pickup`,
            'Accepts Visa, Mastercard, Amex, Apple Pay & Google Pay',
            'Deposit is refundable if cancelled 24+ hours before pickup',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Stripe…</>
        ) : (
          <><Lock className="h-4 w-4" /> Pay ${DEPOSIT_AMOUNT.toFixed(2)} Deposit &amp; Confirm Booking</>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" />
        Powered by Stripe · 256-bit SSL encryption
      </p>
    </div>
  );
}

// ─── Main checkout page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount?: number; error?: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('bookingData');
    if (saved) {
      const d = JSON.parse(saved);
      const isExpired = d._ts && Date.now() - d._ts > 2 * 60 * 60 * 1000;
      if (!d.vehicle || isExpired) {
        sessionStorage.removeItem('bookingData');
        router.push('/vehicles');
      } else {
        setBooking(d);
      }
    } else {
      router.push('/booking');
    }
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login?callbackUrl=/checkout');
  }, [status, router]);

  if (!booking?.vehicle || status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 pt-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  const hours = billableHours(booking.duration || 60, booking.vehicle.minimumHours || 1);
  const ridePrice = hours * booking.vehicle.pricePerHour;
  const serviceFee = 5;
  const tax = ridePrice * 0.1;
  const discount = promoResult?.valid ? promoResult.discount || 0 : 0;
  const total = ridePrice + serviceFee + tax - discount;
  const remaining = Math.max(0, total - DEPOSIT_AMOUNT);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode, amount: ridePrice }),
    });
    setPromoResult(await res.json());
    setPromoLoading(false);
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Final Step</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Verified user */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-400">{session?.user?.email}</p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Verified
              </span>
            </div>

            {/* Booking summary */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-base">Booking Summary</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ...(booking.service ? [{ icon: Car, label: 'Service', value: booking.service.name }] : []),
                  { icon: MapPin, label: 'Pick-up', value: booking.pickup },
                  { icon: MapPin, label: 'Drop-off', value: booking.dropoff },
                  {
                    icon: Calendar,
                    label: 'Date & Time',
                    value: `${new Date(booking.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                    })} at ${booking.time}`,
                  },
                  { icon: Car, label: 'Vehicle', value: `${booking.vehicle.name} · ${booking.vehicle.category}` },
                ].map(({ icon: Icon, label, value }, i) => (
                  <div key={i} className="flex items-start gap-3 px-6 py-4">
                    <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-base">Promo Code</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g. WELCOME20"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-5 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {promoResult && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${promoResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {promoResult.valid ? (
                      <><CheckCircle className="h-4 w-4" /> Promo applied — you save ${promoResult.discount?.toFixed(2)}</>
                    ) : promoResult.error}
                  </div>
                )}
              </div>
            </div>

            {/* Deposit payment */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-base">Secure Your Booking</h2>
              </div>
              <div className="px-6 pt-5 pb-6">
                <DepositSection
                  booking={booking}
                  promoCode={promoCode}
                  promoResult={promoResult}
                  total={total}
                />
              </div>
            </div>
          </div>

          {/* ── Right — price summary ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden lg:sticky lg:top-24">
              <div className="relative h-44">
                <Image src={booking.vehicle.image} alt={booking.vehicle.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="text-xs opacity-75">{booking.vehicle.category}</p>
                  <p className="font-bold">{booking.vehicle.name}</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{hours} hr × ${booking.vehicle.pricePerHour}/hr</span>
                  <span className="font-medium">${ridePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service fee</span>
                  <span className="font-medium">${serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (10%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo discount</span>
                    <span>−${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-3 font-bold text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                {/* Deposit split */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-blue-700 font-semibold text-sm">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Deposit (due now)
                    </span>
                    <span>${DEPOSIT_AMOUNT.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" /> Balance (pay driver)
                    </span>
                    <span>${remaining.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-1 text-xs text-gray-400 space-y-1">
                  <p>· {booking.distance} km · {hours} hr estimated</p>
                  <p>· Free cancellation 24h before pickup</p>
                  <p className="text-blue-600 font-medium">· ${DEPOSIT_AMOUNT} deposit charged in CAD via Stripe</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin, Calendar, Car, Tag, Lock, Loader2,
  CheckCircle, User, CreditCard,
} from 'lucide-react';
import { BookingData, billableHours } from '@/lib/types';
import { useSession } from 'next-auth/react';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount?: number; error?: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('bookingData');
    if (saved) {
      const d = JSON.parse(saved);
      const isExpired = d._ts && (Date.now() - d._ts) > 2 * 60 * 60 * 1000;
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

  const hours = billableHours(booking.duration || 35);
  const ridePrice = booking.totalPrice || 0;
  const serviceFee = 5;
  const tax = ridePrice * 0.1;
  const discount = promoResult?.valid ? (promoResult.discount || 0) : 0;
  const total = ridePrice + serviceFee + tax - discount;

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

  const handleStripeCheckout = async () => {
    setPayError('');
    setPayLoading(true);
    try {
      if (!booking.service?.id) {
        throw new Error('Trip type is missing. Please start your booking again.');
      }

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
          serviceType: booking.service.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start payment');

      if (!data.url) throw new Error('Stripe checkout URL was not returned');

      sessionStorage.removeItem('bookingData');
      window.location.href = data.url;
    } catch (err: any) {
      setPayError(err.message || 'Payment could not be started. Please try again.');
      setPayLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 pt-12">

      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Final Step</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">Secure online payment only — powered by Stripe</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-5">

            <div className="bg-white rounded-xl border border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-400">{session?.user?.email}</p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Verified</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-base">Booking Summary</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ...(booking.service ? [{ icon: Car, label: 'Service', value: booking.service.name }] : []),
                  { icon: MapPin, label: 'Pick-up', value: booking.pickup },
                  { icon: MapPin, label: 'Drop-off', value: booking.dropoff },
                  { icon: Calendar, label: 'Date & Time', value: `${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} at ${booking.time}` },
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

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-base">Promo Code</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex gap-3">
                  <input type="text" placeholder="e.g. WELCOME20" value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                    className={`${inputCls} flex-1`} />
                  <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                    className="px-5 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {promoResult && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${promoResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {promoResult.valid
                      ? <><CheckCircle className="h-4 w-4" /> Promo applied — you save ${promoResult.discount?.toFixed(2)}</>
                      : promoResult.error}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-base">Payment</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                  <p className="font-semibold mb-1">Pay securely online</p>
                  <p className="text-blue-700 text-xs">
                    You will be redirected to Stripe to pay by card. Your booking is confirmed only after successful payment.
                  </p>
                </div>

                {payError && (
                  <p className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{payError}</p>
                )}

                <button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={payLoading}
                  className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {payLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Stripe…</>
                    : <><Lock className="h-4 w-4" /> Pay ${total.toFixed(2)} with Stripe</>
                  }
                </button>
                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> Secured by Stripe · 256-bit SSL
                </p>
              </div>
            </div>

          </div>

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
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
                <div className="pt-1 text-xs text-gray-400 space-y-1">
                  <p>· {booking.distance} km · {hours} hr estimated</p>
                  <p>· Free cancellation 24h before pickup</p>
                  <p className="text-green-600 font-medium">· Full payment required online</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

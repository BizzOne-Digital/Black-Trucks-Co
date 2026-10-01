'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, MapPin, Calendar, Car } from 'lucide-react';
import { DEPOSIT_PERCENT } from '@/lib/deposit';

type BookingLookup = {
  reference: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  vehicle: string;
  totalPrice: number;
  depositAmount: number;
  paymentStatus: string;
  canPayDeposit: boolean;
};

function DepositCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reference, setReference] = useState(searchParams.get('ref') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [booking, setBooking] = useState<BookingLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const loadBooking = async () => {
    setLookupError('');
    setLookupLoading(true);
    setBooking(null);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not find booking');
      setBooking(data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('ref') && searchParams.get('email')) {
      loadBooking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeposit = async () => {
    if (!booking) return;
    setPayError('');
    setPayLoading(true);
    try {
      const res = await fetch('/api/stripe/create-deposit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: booking.reference, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start deposit payment');
      if (!data.url) throw new Error('Payment link was not returned');
      window.location.href = data.url;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Payment could not be started');
      setPayLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Secure deposit</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Pay booking deposit</h1>
          <p className="text-sm text-gray-500 mt-1">
            {DEPOSIT_PERCENT}% deposit only — remaining balance is due before or at your service. No full prepayment required.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10 space-y-6">
        {!booking && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Enter the email and confirmation code from your booking request email.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Confirmation code</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. BTCXXXX"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            {lookupError && (
              <p className="text-red-600 text-sm">{lookupError}</p>
            )}
            <button
              type="button"
              onClick={loadBooking}
              disabled={lookupLoading || !reference.trim() || !email.trim()}
              className="w-full bg-black text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Find my booking'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Haven&apos;t submitted a request yet?{' '}
              <Link href="/book" className="text-black underline">Book via inquiry form</Link>
            </p>
          </div>
        )}

        {booking && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {[
                { icon: Car, label: 'Reference', value: booking.reference },
                { icon: MapPin, label: 'Pick-up', value: booking.pickup },
                { icon: MapPin, label: 'Drop-off', value: booking.dropoff },
                { icon: Calendar, label: 'Date & time', value: `${booking.date} at ${booking.time}` },
                { icon: Car, label: 'Vehicle', value: booking.vehicle },
              ].map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-start gap-3 px-6 py-4">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated total</span>
                <span>${booking.totalPrice.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-3">
                <span>Deposit due ({DEPOSIT_PERCENT}%)</span>
                <span>${booking.depositAmount.toFixed(2)} CAD</span>
              </div>
              <p className="text-xs text-gray-400">
                Balance of ${(booking.totalPrice - booking.depositAmount).toFixed(2)} due before or at service.
              </p>
            </div>

            {!booking.canPayDeposit ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800">
                Deposit already received for this booking. Thank you!
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                {payError && (
                  <p className="mb-4 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{payError}</p>
                )}
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={payLoading}
                  className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {payLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Stripe…</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Pay ${booking.depositAmount.toFixed(2)} deposit</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> Secured by Stripe
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setBooking(null); setLookupError(''); }}
              className="text-sm text-gray-500 underline"
            >
              Use a different code
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push('/book')}
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to booking form
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <DepositCheckout />
    </Suspense>
  );
}

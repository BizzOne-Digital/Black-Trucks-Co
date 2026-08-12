'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, MapPin, Calendar, Clock, Car, XCircle, AlertCircle } from 'lucide-react';

type SessionPayload = {
  paymentStatus: string;
  checkoutStatus: string;
  reference: string | null;
  pickup: string | null;
  dropoff: string | null;
  date: string | null;
  time: string | null;
  totalPrice: number | null;
  vehicleName: string | null;
  tripType: string | null;
  currency?: string;
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [data, setData] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing payment session. Please contact support if you were charged.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not verify payment');
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not verify payment');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Confirming your payment…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 pt-12">
        <div className="bg-white border-b border-gray-100 px-4 py-10 text-center max-w-lg mx-auto rounded-b-xl shadow-sm">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">We couldn&apos;t verify this payment</h1>
          <p className="text-sm text-gray-600 mb-6">{error || 'Something went wrong.'}</p>
          <Link
            href="/checkout"
            className="inline-block bg-black text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Back to checkout
          </Link>
        </div>
      </div>
    );
  }

  const paid = data.paymentStatus === 'paid';
  const processing = data.paymentStatus === 'unpaid' && data.checkoutStatus === 'open';

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className={`px-4 py-12 text-center ${paid ? 'bg-black text-white' : processing ? 'bg-amber-500 text-white' : 'bg-gray-800 text-white'}`}>
        {paid ? (
          <CheckCircle className="h-14 w-14 text-green-400 mx-auto mb-4" />
        ) : processing ? (
          <AlertCircle className="h-14 w-14 text-white mx-auto mb-4" />
        ) : (
          <AlertCircle className="h-14 w-14 text-amber-300 mx-auto mb-4" />
        )}
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {paid ? 'Payment successful' : processing ? 'Payment processing' : 'Payment status'}
        </h1>
        <p className="text-gray-300 text-sm max-w-md mx-auto">
          {paid
            ? 'Thank you — your chauffeur booking payment was received and your ride is confirmed.'
            : processing
              ? 'Your payment may still be processing. Refresh in a moment or check your email for confirmation.'
              : 'If you completed checkout, confirmation email may follow shortly. Contact us if you need help.'}
        </p>
        {data.reference && (
          <p className="mt-6 text-sm">
            <span className="text-gray-400">Reference</span>{' '}
            <span className="font-mono font-bold">{data.reference}</span>
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10 space-y-6">
        {(data.pickup || data.dropoff || data.date) && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold">Booking summary</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {data.tripType && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <Car className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Trip type</p>
                    <p className="text-sm font-medium">{data.tripType}</p>
                  </div>
                </div>
              )}
              {data.pickup && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Pick-up</p>
                    <p className="text-sm font-medium">{data.pickup}</p>
                  </div>
                </div>
              )}
              {data.dropoff && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Drop-off</p>
                    <p className="text-sm font-medium">{data.dropoff}</p>
                  </div>
                </div>
              )}
              {data.date && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                    <p className="text-sm font-medium">{data.date}</p>
                  </div>
                </div>
              )}
              {data.time && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
                    <p className="text-sm font-medium">{data.time}</p>
                  </div>
                </div>
              )}
              {data.vehicleName && (
                <div className="flex items-start gap-3 px-6 py-4">
                  <Car className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Vehicle</p>
                    <p className="text-sm font-medium">{data.vehicleName}</p>
                  </div>
                </div>
              )}
              {data.totalPrice != null && (
                <div className="flex justify-between px-6 py-4 text-sm font-bold">
                  <span className="text-gray-500">Total paid ({(data.currency || 'cad').toUpperCase()})</span>
                  <span className="text-blue-600">${data.totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="flex-1 text-center border border-gray-300 hover:border-gray-600 text-black py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            href="/booking"
            className="flex-1 text-center bg-black hover:bg-gray-800 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Book another ride
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 pt-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

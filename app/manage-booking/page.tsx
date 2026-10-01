'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Calendar, Car } from 'lucide-react';

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

function ManageBookingForm() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<BookingLookup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBooking(null);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking not found');
      setBooking(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not find booking');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors';

  return (
    <div className="min-h-screen bg-white pt-12 px-4 py-12 max-w-md mx-auto">
      <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Manage</p>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manage My Booking</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the email you used to book and your confirmation code to view your ride.
      </p>

      {!booking ? (
        <form onSubmit={handleFind} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Confirmation code</label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="From your confirmation email"
              className={inputCls}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Find My Booking'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
            {[
              { icon: Car, label: 'Code', value: booking.reference },
              { icon: MapPin, label: 'Pick-up', value: booking.pickup },
              { icon: MapPin, label: 'Drop-off', value: booking.dropoff },
              { icon: Calendar, label: 'Date & time', value: `${booking.date} at ${booking.time}` },
              { icon: Car, label: 'Vehicle', value: booking.vehicle },
            ].map(({ icon: Icon, label, value }, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 uppercase">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Status: <span className="font-medium text-gray-800">{booking.paymentStatus.replace(/_/g, ' ')}</span>
          </p>
          {booking.canPayDeposit && (
            <Link
              href={`/checkout?ref=${encodeURIComponent(booking.reference)}&email=${encodeURIComponent(email)}`}
              className="block text-center bg-black text-white py-3 rounded-lg text-sm font-semibold"
            >
              Pay deposit (${booking.depositAmount.toFixed(2)})
            </Link>
          )}
          <button type="button" onClick={() => setBooking(null)} className="text-sm text-gray-500 underline">
            Search again
          </button>
        </div>
      )}

      <p className="text-center text-sm text-gray-400 mt-10">
        <Link href="/book" className="underline text-black">Submit a new booking request</Link>
      </p>
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense>
      <ManageBookingForm />
    </Suspense>
  );
}

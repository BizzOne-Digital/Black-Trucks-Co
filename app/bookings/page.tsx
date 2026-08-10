'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Car, Clock, CheckCircle, XCircle, Loader2, Copy, Check, User, Phone } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'bg-yellow-100 text-yellow-700' },
  confirmed:   { label: 'Confirmed',   color: 'bg-blue-100 text-blue-700' },
  assigned:    { label: 'Driver Assigned', color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-700' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
  refunded:    { label: 'Refunded',    color: 'bg-gray-100 text-gray-600' },
};

function CopyRef({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(reference); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black transition-colors"
    >
      {reference}
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login?callbackUrl=/bookings'); return; }
    if (status !== 'authenticated') return;

    const load = () =>
      fetch('/api/bookings')
        .then(r => r.json())
        .then(d => { setBookings(d.bookings || []); setLoading(false); });

    load();
    // Auto-refresh every 30s so status changes from admin appear
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [status, router]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(id);
    await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by customer' }),
    });
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    setCancellingId(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Account</p>
          <h1 className="text-2xl sm:text-3xl font-bold">My Bookings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No bookings yet</h2>
            <p className="text-sm text-gray-400 mb-6">Your booking history will appear here.</p>
            <Link href="/booking"
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b: any) => {
              const id = b.id;
              const sc = statusConfig[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
              const canCancel = ['pending', 'confirmed'].includes(b.status);

              return (
                <div key={id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                    <CopyRef reference={b.reference} />
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        b.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                        b.paymentMethod === 'cash' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {b.paymentMethod === 'cash' ? 'Cash' : b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 grid sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Pick-up</p>
                          <p className="text-sm font-medium text-gray-800">{b.pickup}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Drop-off</p>
                          <p className="text-sm font-medium text-gray-800">{b.dropoff}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Date & Time</p>
                          <p className="text-sm font-medium text-gray-800">
                            {new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {b.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Car className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Vehicle</p>
                          <p className="text-sm font-medium text-gray-800">
                            {b.vehicle?.name || '—'} · {b.distance} km
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Driver info — shown when assigned */}
                  {b.driver && ['assigned', 'in_progress'].includes(b.status) && (
                    <div className="px-6 py-3 bg-purple-50 border-t border-purple-100 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-purple-800">
                        <User className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{b.driver.name}</span>
                      </div>
                      {b.driver.phone && (
                        <a href={`tel:${b.driver.phone}`} className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 transition-colors">
                          <Phone className="h-4 w-4 text-purple-500" />
                          {b.driver.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-lg font-bold">${b.totalPrice?.toFixed(2)}</p>
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(id)}
                        disabled={cancellingId === id}
                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {cancellingId === id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <XCircle className="h-3.5 w-3.5" />
                        }
                        Cancel
                      </button>
                    )}
                    {b.status === 'completed' && (
                      <span className="flex items-center gap-1.5 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/booking" className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Book Another Ride
          </Link>
        </div>
      </div>
    </div>
  );
}

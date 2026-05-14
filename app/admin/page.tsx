'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, Car, Calendar, CheckCircle, XCircle, Clock, Mail, Loader2 } from 'lucide-react';

interface Stats {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalUsers: number;
  totalVehicles: number;
  totalRevenue: number;
  recentBookings: any[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-black-100 text-blue-700',
  assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpResult, setFollowUpResult] = useState<{ abandonmentsSent: number; reviewsSent: number } | null>(null);

  const runFollowUps = async () => {
    setFollowUpLoading(true);
    setFollowUpResult(null);
    try {
      const res = await fetch(`/api/cron/follow-up?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`, { method: 'POST' });
      const data = await res.json();
      setFollowUpResult({ abandonmentsSent: data.abandonmentsSent || 0, reviewsSent: data.reviewsSent || 0 });
    } catch {
      setFollowUpResult({ abandonmentsSent: 0, reviewsSent: 0 });
    } finally {
      setFollowUpLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login?callbackUrl=/admin'); return; }
    if (status === 'authenticated' && (session.user as any).role !== 'admin') {
      router.push('/'); return;
    }
    if (status === 'authenticated') {
      fetch('/api/admin/stats')
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false); });
    }
  }, [status, session, router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-12 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
    </div>
  );

  if (!stats) return null;

  const statCards = [
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'text-blue-600' },
    { label: 'Confirmed', value: stats.confirmedBookings, icon: CheckCircle, color: 'text-blue-500' },
    { label: 'Completed', value: stats.completedBookings, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Cancelled', value: stats.cancelledBookings, icon: XCircle, color: 'text-red-500' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-600' },
    { label: 'Vehicles', value: stats.totalVehicles, icon: Car, color: 'text-gray-600' },
    { label: 'Pending', value: stats.totalBookings - stats.confirmedBookings - stats.completedBookings - stats.cancelledBookings, icon: Clock, color: 'text-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-8 py-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide truncate pr-1">{card.label}</p>
                <card.icon className={`h-4 w-4 flex-shrink-0 ${card.color}`} />
              </div>
              <p className="text-xl font-bold truncate">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold">Recent Bookings</h2>
            <a href="/admin/bookings" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Reference', 'Customer', 'Vehicle', 'Date', 'Total', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentBookings.map((b: any) => (
                  <tr key={b.id || b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                    <td className="px-4 py-3">{b.guestName || b.user?.name || '—'}</td>
                    <td className="px-4 py-3">{b.vehicle?.name || '—'}</td>
                    <td className="px-4 py-3">{b.date}</td>
                    <td className="px-4 py-3 font-medium">${b.totalPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Manage Bookings', href: '/admin/bookings' },
            { label: 'Manage Vehicles', href: '/admin/vehicles' },
            { label: 'Promo Codes', href: '/admin/promos' },
            { label: 'Users', href: '/admin/users' },
          ].map(link => (
            <a key={link.href} href={link.href}
              className="bg-white rounded-xl p-4 shadow-sm text-center text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-100">
              {link.label}
            </a>
          ))}
        </div>

        {/* Follow-up Emails */}
        <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold">Follow-up Emails</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-1">Send automated follow-ups</p>
                <p className="text-xs text-gray-500">
                  Sends abandonment reminders to users who started but didn't complete a booking (&gt;1 hr ago),
                  and review requests to customers whose ride date has passed.
                </p>
              </div>
              <button
                onClick={runFollowUps}
                disabled={followUpLoading}
                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {followUpLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  : <><Mail className="h-4 w-4" /> Run Follow-ups</>
                }
              </button>
            </div>
            {followUpResult && (
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-700 font-medium">{followUpResult.abandonmentsSent} abandonment email{followUpResult.abandonmentsSent !== 1 ? 's' : ''} sent</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 font-medium">{followUpResult.reviewsSent} review request{followUpResult.reviewsSent !== 1 ? 's' : ''} sent</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

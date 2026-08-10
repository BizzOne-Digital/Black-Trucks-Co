'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, MapPin, Calendar, Clock, Car, Phone, Mail, Copy, Check } from 'lucide-react';
import { BookingData } from '@/lib/types';

export default function ConfirmationPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData & { reference?: string; discount?: number; paymentMethod?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('confirmedBooking');
    if (saved) {
      setBooking(JSON.parse(saved));
      // Always clean up all booking state on confirmation
      sessionStorage.removeItem('bookingData');
      sessionStorage.removeItem('confirmedBooking');
    } else {
      router.push('/');
    }
  }, [router]);

  if (!booking?.vehicle) return null;

  const ref = booking.reference || `BTC${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const copyRef = () => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    'You will receive a confirmation email with your booking details',
    'Our team will contact you 24 hours before your scheduled pickup',
    'Your chauffeur will arrive 15 minutes early at the pickup location',
    'Enjoy your luxurious journey with Black Trucks Co',
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-12">

      {/* Hero */}
      <div className="bg-black text-white px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-5">
          <CheckCircle className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Booking Confirmed</h1>
        <p className="text-gray-400 text-sm mb-4">Your luxury ride has been successfully booked</p>
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
          <span className="text-sm text-gray-300">Reference:</span>
          <span className="font-mono font-bold text-white">{ref}</span>
          <button onClick={copyRef} className="text-gray-400 hover:text-white transition-colors ml-1">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-6">

        {/* Trip Details */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold">Trip Details</h2>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="divide-y divide-gray-50">
              {[
                ...(booking.service ? [{ icon: MapPin, label: 'Service', value: booking.service.name }] : []),
                { icon: MapPin, label: 'Pick-up', value: booking.pickup },
                { icon: MapPin, label: 'Drop-off', value: booking.dropoff },
              ].map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-start gap-3 px-6 py-4">
                  <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: Calendar, label: 'Date', value: new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: Clock, label: 'Time', value: booking.time },
              ].map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-start gap-3 px-6 py-4">
                  <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle + Price */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-row">
            <div className="relative w-32 sm:w-48 h-36 sm:h-44 flex-shrink-0">
              <Image src={booking.vehicle.image} alt={booking.vehicle.name} fill className="object-cover" />
            </div>
            <div className="flex-1 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{booking.vehicle.category}</p>
                  <h3 className="font-bold text-lg">{booking.vehicle.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-blue-600">${booking.totalPrice?.toFixed(2)}</p>
                  {(booking.discount || 0) > 0 && (
                    <p className="text-xs text-green-600">Saved ${booking.discount?.toFixed(2)}</p>
                  )}
                  {booking.paymentMethod === 'cash' && (
                    <p className="text-xs text-amber-600 font-medium mt-1">Pay cash to driver</p>
                  )}
                  {booking.paymentMethod === 'card' && (
                    <p className="text-xs text-green-600 font-medium mt-1">Paid online</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Car className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">{booking.distance} km · {booking.duration} min estimated</span>
              </div>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold">What Happens Next</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-600 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold mb-4">Need Help?</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="tel:6477066325" className="flex items-center gap-3 text-sm text-gray-600 hover:text-black transition-colors">
              <Phone className="h-4 w-4 text-blue-600" /> 647-706-6325
            </a>
            <a href="mailto:Blacktrucksco@hotmail.com" className="flex items-center gap-3 text-sm text-gray-600 hover:text-black transition-colors">
              <Mail className="h-4 w-4 text-blue-600" /> Blacktrucksco@hotmail.com
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1 text-center border border-gray-300 hover:border-gray-600 text-black py-3 rounded-lg text-sm font-medium transition-colors">
            Back to Home
          </Link>
          <Link href="/booking" className="flex-1 text-center bg-black hover:bg-gray-800 text-white py-3 rounded-lg text-sm font-medium transition-colors">
            Book Another Ride
          </Link>
        </div>
      </div>
    </div>
  );
}

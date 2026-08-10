'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Users, Luggage, ArrowRight, Check, AlertCircle, Car } from 'lucide-react';
import { Vehicle, BookingData, billableHours } from '@/lib/types';

interface VehicleWithAvailability extends Vehicle {
  isAvailableOnDate?: boolean;
  bookedTimes?: string[];
}

export default function VehiclesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<VehicleWithAvailability | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [vehicles, setVehicles] = useState<VehicleWithAvailability[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('bookingData');
    if (!saved) { router.push('/booking'); return; }

    const parsed = JSON.parse(saved);
    const isExpired = parsed._ts && (Date.now() - parsed._ts) > 2 * 60 * 60 * 1000;
    if (!parsed.pickup || isExpired) {
      sessionStorage.removeItem('bookingData');
      router.push('/booking');
      return;
    }
    // For hourly, dropoff = pickup — that's fine
    if (!parsed.dropoff) parsed.dropoff = parsed.pickup;
    setBooking(parsed);

    const params = new URLSearchParams();
    if (parsed.date) params.set('date', parsed.date);
    if (parsed.time) params.set('time', parsed.time);
    if (parsed.duration) params.set('duration', String(Math.ceil(parsed.duration)));

    fetch(`/api/vehicles?${params}`)
      .then(r => r.json())
      .then(d => setVehicles((d.vehicles || []).map((v: any) => ({ ...v, id: v.id || v._id }))))
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, [router]);

  const handleContinue = () => {
    if (!selected || !booking) return;
    const hours = billableHours(booking.duration || 60, selected.minimumHours || 1);
    const totalPrice = hours * selected.pricePerHour;
    sessionStorage.setItem('bookingData', JSON.stringify({ ...booking, vehicle: selected, totalPrice }));
    router.push('/checkout');
  };

  if (!booking) return null;

  if (loadingVehicles) return (
    <div className="min-h-screen bg-white pt-12 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
    </div>
  );

  const availableCount = vehicles.filter(v => v.isAvailableOnDate !== false).length;

  return (
    <div className="min-h-screen bg-white pt-12">

      {/* Page header */}
      <div className="border-b border-gray-100 px-4 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-1">Select Your Vehicle</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Choose your ride</h1>
          {booking.pickup && (
            <p className="text-sm text-gray-500 mt-1">
              {booking.serviceType === 'hourly'
                ? `${booking.pickup} · ${booking.hours || Math.round((booking.duration || 60) / 60)} hrs`
                : `${booking.pickup} → ${booking.dropoff} · ${booking.distance} km · ${booking.duration} min`
              }
            </p>
          )}
          {booking.date && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {booking.time && ` at ${booking.time}`}
            </p>
          )}
        </div>
      </div>

      {/* Vehicle grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-36 sm:pb-28">

          {vehicles.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <Car className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-1">No vehicles available</p>
              <p className="text-sm text-gray-400 max-w-sm">
                There are no vehicles available right now. Please try a different date or contact us directly.
              </p>
            </div>
          ) : (
            vehicles.map((v) => {
              const isSelected = selected?.id === v.id;
              const unavailable = v.isAvailableOnDate === false;

              return (
                <button
                  key={v.id}
                  onClick={() => !unavailable && setSelected(v)}
                  disabled={unavailable}
                  className={`text-left rounded-xl overflow-hidden border-2 transition-all relative
                    ${unavailable
                      ? 'border-gray-100 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'border-blue-600 shadow-lg'
                        : 'border-gray-100 hover:border-gray-300 shadow-sm'
                    }`}
                >
                  <div className="relative h-44 sm:h-52 w-full">
                    <Image src={v.image} alt={v.name} fill className="object-cover object-center" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    {isSelected && !unavailable && (
                      <div className="absolute top-3 right-3 bg-black text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    {unavailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-gray-800">Booked on this date</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{v.category}</p>
                    <h3 className="font-bold text-lg mb-1">{v.name}</h3>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{v.description}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-gray-400" />{v.passengers} passengers</span>
                      <span className="flex items-center gap-1.5"><Luggage className="h-4 w-4 text-gray-400" />{v.luggage} bags</span>
                      {(v.minimumHours || 1) > 1 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          min. {v.minimumHours} hrs
                        </span>
                      )}
                    </div>
                    {/* Fare for this vehicle */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-gray-400 mb-0.5">
                        {booking.serviceType === 'hourly'
                          ? `${booking.hours || Math.round((booking.duration || 60) / 60)} hr × $${v.pricePerHour}/hr`
                          : `${billableHours(booking.duration || 60, v.minimumHours || 1)} hr × $${v.pricePerHour}/hr`
                        }
                      </p>
                      <p className="font-bold text-gray-900">
                        ${(billableHours(booking.duration || 60, v.minimumHours || 1) * v.pricePerHour).toFixed(2)}
                        <span className="text-xs font-normal text-gray-400 ml-1">est. total</span>
                      </p>
                    </div>
                    <div className={`w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-colors
                      ${unavailable
                        ? 'bg-gray-100 text-gray-400'
                        : isSelected
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      {unavailable ? 'Unavailable' : isSelected ? '✓ Selected' : 'Select'}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-10 rounded overflow-hidden flex-shrink-0">
                <Image src={selected.image} alt={selected.name} fill className="object-cover" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Selected</p>
                <p className="font-bold text-sm sm:text-base">{selected.name}</p>
                <p className="text-xs text-gray-500">${selected.pricePerHour}/hr</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <div>
                <p className="text-xs text-gray-400">Estimated Total</p>
                <p className="text-xl sm:text-2xl font-bold">
                  ${(billableHours(booking.duration || 60, selected.minimumHours || 1) * selected.pricePerHour).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {billableHours(booking.duration || 60, selected.minimumHours || 1)} hr billed · excl. fees &amp; tax
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors ml-auto sm:ml-0"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

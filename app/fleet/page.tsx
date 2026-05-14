'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Luggage, Clock } from 'lucide-react';
import { Vehicle } from '@/lib/types';

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(d => {
        if (d.vehicles?.length) {
          setVehicles(d.vehicles.map((v: any) => ({ ...v, id: v.id || v._id })));
        } else {
          import('@/lib/mockData').then(m => setVehicles(m.vehicles));
        }
      })
      .catch(() => import('@/lib/mockData').then(m => setVehicles(m.vehicles)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white">

      {/* Hero */}
      <div className="relative h-[100svh] min-h-[600px] bg-black">
        <Image
          src="/Fleet Hero.jpg"
          alt="Our Fleet"
          fill
          className="object-cover object-[center_25%] sm:object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pt-16 sm:pt-28">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white">Premium Collection</p>
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold mb-2">Our Fleet</h1>
          <p className="text-xs sm:text-base text-white max-w-md">Hand-selected luxury vehicles for every occasion</p>
        </div>
      </div>



      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        </div>
      ) : (
        <>
          {vehicles.map((vehicle, index) => (
            <div key={vehicle.id} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
              {/* Image */}
              <div className="relative w-full lg:w-1/2 h-[260px] sm:h-[360px] lg:h-[520px] flex-shrink-0">
                <Image src={vehicle.image} alt={vehicle.name} fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              {/* Content */}
              <div className={`w-full lg:w-1/2 flex items-center px-5 sm:px-10 lg:px-14 py-8 lg:py-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="max-w-lg w-full">
                  <p className="text-xs font-semibold tracking-widest uppercase text-gray-600 mb-2">{vehicle.category}</p>
                  <h2 className="text-2xl sm:text-4xl font-bold mb-3">{vehicle.name}</h2>
                  <p className="text-gray-500 text-sm sm:text-base mb-6 leading-relaxed">{vehicle.description}</p>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Passengers</p>
                        <p className="font-bold text-sm">{vehicle.passengers}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Luggage className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Luggage</p>
                        <p className="font-bold text-sm">{vehicle.luggage} bags</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Rate</p>
                        <p className="font-bold text-sm">${vehicle.pricePerHour}/hr</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-7">
                    <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-3">Features</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {vehicle.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 bg-black rounded-full flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href="/booking" className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded text-sm font-medium transition-colors">
                      Book Now
                    </Link>
                    <Link href="/contact" className="border border-gray-300 hover:border-gray-600 text-black px-5 py-2.5 rounded text-sm font-medium transition-colors">
                      Enquire
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* CTA */}
      <div className="relative h-[320px] sm:h-[380px] overflow-hidden">
        <Image src="/Book now.jpeg" alt="Book now" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h2 className="text-2xl sm:text-4xl font-bold mb-3">Ready to Book Your Ride?</h2>
          <p className="text-sm sm:text-base text-white mb-6">Experience the luxury you deserve</p>
          <Link href="/booking" className="bg-white text-black hover:bg-gray-100 text-black px-8 py-3 rounded text-sm font-semibold transition-colors">
            Book Now
          </Link>
        </div>
      </div>

    </div>
  );
}



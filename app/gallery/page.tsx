'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const galleryImages = [
  { src: '/Gallery (1).jpg' },
  { src: '/Gallery (2).jpg' },
  { src: '/Gallery (3).jpg' },
  { src: '/Gallery (4).jpg' },
  { src: '/Gallery (5).jpg' },
  { src: '/Gallery (6).jpg' },
  { src: '/Gallery (7).jpg' },
  { src: '/Gallery (8).jpg' },
  { src: '/Gallery (9).jpg' },
  { src: '/Gallery (10).jpg' },
  { src: '/Gallery (11).jpg' },
  { src: '/Gallery (12).jpg' },
];

export default function GalleryPage() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox(i => (i !== null ? (i - 1 + galleryImages.length) % galleryImages.length : null));
  const next = () => setLightbox(i => (i !== null ? (i + 1) % galleryImages.length : null));

  return (
    <div className="bg-white min-h-screen">

      {/* Hero — navbar blends in */}
      <div className="relative h-[100svh] min-h-[600px] bg-black">
        <Image
          src="/Gallery (4).jpg"
          alt="Gallery"
          fill
          className="object-cover object-[center_30%]"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pt-16 sm:pt-28">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white">Black Trucks Co</p>
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold mb-2">Gallery</h1>
          <p className="text-xs sm:text-base text-white max-w-md">A look inside the luxury experience</p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[220px]">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              onClick={() => setLightbox(i)}
              className={`relative rounded-xl overflow-hidden group cursor-pointer ${
                i === 0 ? 'col-span-2 row-span-2' : i === 5 ? 'col-span-2' : ''
              }`}
            >
              <Image
                src={img.src}
                alt={`Gallery image ${i + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/40">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-black text-white py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to experience it yourself?</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">Book your luxury ride today and arrive in style.</p>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-100 px-8 py-3 rounded-lg text-sm font-semibold transition-colors"
        >
          Book Now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-4xl max-h-[85vh] mx-8"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={galleryImages[lightbox].src}
              alt={`Gallery image ${lightbox + 1}`}
              width={1200}
              height={800}
              className="object-contain w-full h-full max-h-[85vh] rounded-lg"
            />
          </div>

          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            {lightbox + 1} / {galleryImages.length}
          </p>
        </div>
      )}
    </div>
  );
}



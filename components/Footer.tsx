import Link from 'next/link';
import Image from 'next/image';

const companyLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Fleet', href: '/fleet' },
  { label: 'Gallery', href: '/gallery' },
];

const bookingLinks = [
  { label: 'Book Now', href: '/booking' },
  { label: 'Contact', href: '/contact' },
  { label: 'My Bookings', href: '/bookings' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black text-white w-full">

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col">
            <Link href="/" className="block mb-3">
              <Image
                src="/logo.png"
                alt="Black Trucks Co"
                width={400}
                height={120}
                className="h-24 sm:h-32 w-auto object-contain object-left"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Premium luxury chauffeur service available 24/7. Arrive in style, every time.
            </p>
          </div>

          {/* Company links */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-5">Company</p>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Booking links */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-5">Bookings</p>
            <ul className="flex flex-col gap-3">
              {bookingLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-5">Contact</p>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              <li>
                <a href="tel:6477066325" className="hover:text-white transition-colors">
                  647-706-6325
                </a>
              </li>
              <li>
                <a href="mailto:Blacktrucksco@hotmail.com" className="hover:text-white transition-colors break-all">
                  Blacktrucksco@hotmail.com
                </a>
              </li>
              <li className="text-gray-600 text-xs pt-1">Available 24/7</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-6 sm:px-10 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

          <p className="text-xs text-gray-500">© {year} Black Trucks Co. All rights reserved.</p>

          {/* Instagram + Facebook only */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/blacktruckco?igsh=ZjBob256ZzRsa3Ey"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 flex items-center justify-center transition-all text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 flex items-center justify-center transition-all text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>

        </div>
      </div>

    </footer>
  );
}

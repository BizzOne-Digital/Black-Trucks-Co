'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/fleet', label: 'Fleet' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
  { href: '/booking', label: 'Book Now' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const isHomePage = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isAdminPage) return null;

  // Transparent on hero, blurred when scrolled or on other pages
  const isTransparent = isHomePage && !scrolled && !open;

  const navBg = isTransparent
    ? 'bg-transparent'
    : 'bg-black/60 backdrop-blur-xl shadow-sm border-b border-white/10';

  const textColor = 'text-white';
  const linkHover = isTransparent ? 'hover:text-white/60' : 'hover:text-gray-300';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-20 sm:h-24 flex items-center px-4 sm:px-10 transition-all duration-500 ${navBg}`}>

      {/* Logo */}
      <Link href="/" className="flex-shrink-0 flex items-center">
        <Image
          src="/logo.png"
          alt="Black Trucks Co"
          width={400}
          height={120}
          className="h-24 sm:h-32 w-auto object-contain"
          priority
        />
      </Link>

      {/* Right side — nav links + auth (desktop) */}
      <div className="hidden md:flex items-center gap-6 ml-auto">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
              l.label === 'Book Now'
                ? 'bg-white text-black hover:bg-gray-100 px-6 py-3 rounded-full font-bold shadow-lg'
                : `${textColor} ${linkHover}`
            }`}
          >
            {l.label}
          </Link>
        ))}

        {session ? (
          <>
            <Link
              href="/bookings"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 rounded-full text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <User className="h-4 w-4" /> My Bookings
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30 border border-white/30 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 rounded-full text-white/60 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-black hover:bg-gray-100 rounded-full text-sm font-semibold transition-colors shadow-lg"
          >
            <User className="h-4 w-4" /> Sign In
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto text-white p-1"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-20 sm:top-24 left-0 right-0 bg-black backdrop-blur-xl border-t border-white/10 shadow-2xl z-50">
          <div className="flex flex-col px-6 py-5 gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-white text-sm font-medium hover:text-gray-300 transition-colors py-1"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center gap-4 pt-3 border-t border-white/10">
              {session ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
                      <LayoutDashboard className="h-3.5 w-3.5" /> Admin
                    </Link>
                  )}
                  <Link href="/bookings" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
                    <User className="h-3.5 w-3.5" /> My Bookings
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300">
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/auth/login" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
                  <User className="h-3.5 w-3.5" /> Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

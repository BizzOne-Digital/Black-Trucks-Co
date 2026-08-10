'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Car, Tag, Users, ArrowLeft, LogOut, UserCog } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { href: '/admin/promos', label: 'Promo Codes', icon: Tag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/profile', label: 'Profile', icon: UserCog },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 h-16">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Image
                src="/logo.png"
                alt="Black Trucks Co"
                width={140}
                height={38}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-gray-900">Admin Dashboard</span>
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Site</span>
            </Link>
            
            {session && (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm text-gray-600">
                  {session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 fixed top-16 left-0 h-[calc(100vh-4rem)] z-30 hidden md:flex flex-col">
        <nav className="px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 ${active ? 'text-black font-medium' : 'text-gray-400'}`}>
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-56 min-w-0 overflow-x-hidden pb-16 md:pb-0 pt-16">
        {children}
      </main>
    </div>
  );
}

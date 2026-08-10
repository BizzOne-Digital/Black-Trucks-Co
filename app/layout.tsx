import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Providers from './providers';
import PageLoader from '@/components/PageLoader';
import ConditionalLayout from '@/components/ConditionalLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Black Trucks Co - Luxury Chauffeur Service',
  description: 'Premium luxury chauffeur services for discerning travelers',
  icons: {
    icon: [
      { url: '/Favicon.jpeg', type: 'image/jpeg' },
    ],
    apple: '/Favicon.jpeg',
    shortcut: '/Favicon.jpeg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Blocks page flash before JS loads — removed by PageLoader on mount */}
        <div
          id="initial-loader"
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#000',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img src="/logo.png" alt="Black Trucks Co" style={{ width: 140, height: 140, objectFit: 'contain', marginBottom: 20 }} />
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
            Black Trucks Co
          </p>
          <p style={{ color: '#9ca3af', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
            Luxury Chauffeur Service
          </p>
          <div style={{ width: 160, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' }}>
            <div id="initial-loader-bar" style={{ height: '100%', background: '#fff', borderRadius: 9999, width: '0%', transition: 'width 1.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
        <Providers>
          <Suspense>
            <PageLoader />
          </Suspense>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}


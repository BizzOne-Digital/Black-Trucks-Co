'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// ─── Route-change top bar ─────────────────────────────────────────────────────
function RouteProgressBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (active) {
      setWidth(0);
      const t1 = setTimeout(() => setWidth(70), 50);
      const t2 = setTimeout(() => setWidth(90), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setWidth(100);
      const t = setTimeout(() => setWidth(0), 400);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (width === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9998] h-[3px] bg-white transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.6)]"
      style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1, transitionDuration: width === 100 ? '400ms' : '300ms' }}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [prevPath, setPrevPath] = useState('');

  // On first mount: animate the loader bar then fade it out
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    const bar = document.getElementById('initial-loader-bar');
    if (!loader) return;

    // Kick off the bar animation
    if (bar) {
      requestAnimationFrame(() => { bar.style.width = '100%'; });
    }

    // Fade out and remove after 1.8s
    const t = setTimeout(() => {
      loader.style.transition = 'opacity 0.4s ease';
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 400);
    }, 1800);

    return () => clearTimeout(t);
  }, []);

  // Detect route changes for the top progress bar
  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (prevPath && prevPath !== current) {
      setNavigating(true);
      const t = setTimeout(() => setNavigating(false), 500);
      return () => clearTimeout(t);
    }
    setPrevPath(current);
  }, [pathname, searchParams]);

  return <RouteProgressBar active={navigating} />;
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  label: string;
  value: string;
  coords: [number, number]; // [lng, lat]
}

interface AddressInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string, coords?: [number, number]) => void;
  glass?: boolean;
}

export default function AddressInput({ placeholder, value, onChange, glass = false }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        api_key: process.env.NEXT_PUBLIC_ORS_API_KEY!,
        text: query,
        size: '8',
        layers: 'venue,address,street,neighbourhood,locality,localadmin,county,region',
      });

      const res = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?${params}`);
      const data = await res.json();

      const results: Suggestion[] = (data?.features || []).map((f: any) => ({
        label: f.properties.label,
        value: f.properties.label,
        coords: f.geometry.coordinates as [number, number],
      }));

      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val); // pass no coords — user is still typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: Suggestion) => {
    onChange(s.value, s.coords); // pass coords so distance API can skip geocoding
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${glass ? 'text-white/50' : 'text-gray-400'}`} />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none transition-colors ${
            glass
              ? 'bg-transparent text-white placeholder-white/50 border border-white/20 focus:border-white/50'
              : 'border border-gray-200 bg-white focus:border-blue-500'
          }`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

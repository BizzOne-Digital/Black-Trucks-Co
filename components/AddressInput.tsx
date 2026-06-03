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
  // Track whether a suggestion tap is in progress (prevents blur from closing before select)
  const selectingRef = useRef(false);

  // Close dropdown when clicking/touching outside
  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results: Suggestion[] = data.results || [];
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
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: Suggestion) => {
    selectingRef.current = false;
    onChange(s.value, s.coords);
    setSuggestions([]);
    setOpen(false);
  };

  const handleBlur = () => {
    // Delay close so touch/click on suggestion fires first
    setTimeout(() => {
      if (!selectingRef.current) setOpen(false);
    }, 150);
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
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none transition-colors ${
            glass
              ? 'bg-transparent text-white placeholder-white/50 border border-white/20 focus:border-white/50'
              : 'border border-gray-200 bg-white focus:border-blue-500'
          }`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                // onMouseDown + onTouchEnd covers both desktop and mobile
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before select
                  handleSelect(s);
                }}
                onTouchStart={() => { selectingRef.current = true; }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 leading-snug">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import type { TemperatureUnit, ThemeMode, WeatherLocation } from '../types/weather.ts';

interface TopBarProps {
  unit: TemperatureUnit;
  onUnitChange: (unit: TemperatureUnit) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectLocation: (loc: WeatherLocation) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  locationNotice: string | null;
  onDismissNotice: () => void;
}

export function TopBar({
  unit,
  onUnitChange,
  theme,
  onThemeToggle,
  onRefresh,
  isRefreshing,
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  locationNotice,
  onDismissNotice,
}: TopBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results?: WeatherLocation[]; error?: string };
        if (!res.ok) {
          setSearchError(data.error || 'Could not search cities.');
          setResults([]);
        } else {
          setResults(data.results ?? []);
          setActiveIndex(-1);
          setIsOpen(true);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSearchError('Unable to reach city search service.');
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handlePick(loc: WeatherLocation) {
    onSelectLocation(loc);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSearchError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && e.key === 'ArrowDown' && results.length > 0) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handlePick(results[activeIndex]);
      } else if (results.length > 0) {
        handlePick(results[0]);
      } else if (query.trim().length >= 2 && !isSearching) {
        setIsOpen(true);
      }
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#070B14]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
            <Compass className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            Atmos Weather
          </span>
        </div>

        {/* Zone 2: City Search + Geolocation */}
        <div ref={containerRef} className="relative flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    setIsOpen(true);
                  }
                }}
                onFocus={() => {
                  if (query.trim().length >= 2) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search city worldwide..."
                aria-label="Search city worldwide"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                className="w-full h-10 pl-9 pr-8 rounded-lg text-sm bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setIsOpen(false);
                    setSearchError(null);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              title="Use my browser location"
              className="h-10 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-[#111A2E] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" aria-hidden="true" />
              ) : (
                <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Locate'}</span>
            </button>
          </div>

          {/* Search dropdown */}
          {isOpen && query.trim().length >= 2 && (
            <div
              role="listbox"
              className="absolute left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#0E1629] shadow-xl overflow-hidden z-40"
            >
              {isSearching && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" aria-hidden="true" />
                  <span>Searching cities...</span>
                </div>
              )}

              {!isSearching && searchError && (
                <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{searchError}</div>
              )}

              {!isSearching && !searchError && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching cities found for &ldquo;{query.trim()}&rdquo;. Try a different city or spelling.
                </div>
              )}

              {!isSearching && !searchError && results.length > 0 && (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
                  {results.map((loc, idx) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={idx === activeIndex}
                        onClick={() => handlePick(loc)}
                        className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                          idx === activeIndex
                            ? 'bg-sky-50 dark:bg-sky-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {loc.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                          {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Zone 3: Functional Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Unit Toggle */}
          <div
            role="group"
            aria-label="Temperature unit"
            className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#111A2E] border border-slate-200 dark:border-slate-700/80"
          >
            <button
              type="button"
              onClick={() => onUnitChange('C')}
              aria-pressed={unit === 'C'}
              className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                unit === 'C'
                  ? 'bg-white dark:bg-sky-500 text-slate-900 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => onUnitChange('F')}
              aria-pressed={unit === 'F'}
              className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                unit === 'F'
                  ? 'bg-white dark:bg-sky-500 text-slate-900 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              °F
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#111A2E] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh weather data"
            title="Refresh weather data"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#111A2E] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Geolocation status/error bar when triggered */}
      {locationNotice && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span>{locationNotice}</span>
            <button
              type="button"
              onClick={onDismissNotice}
              className="text-amber-700 dark:text-amber-300 hover:underline font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type {
  TemperatureUnit,
  ThemeMode,
  WeatherInsightsResponse,
  WeatherLocation,
  WeatherResponse,
} from './types/weather.ts';
import { TopBar } from './components/TopBar.tsx';
import { FavoritesBar } from './components/FavoritesBar.tsx';
import { AlertsBanner } from './components/AlertsBanner.tsx';
import { CurrentWeatherHero } from './components/CurrentWeatherHero.tsx';
import { WeatherInsightsPanel } from './components/WeatherInsightsPanel.tsx';
import { HourlyForecastSection } from './components/HourlyForecastSection.tsx';
import { SevenDayForecast } from './components/SevenDayForecast.tsx';
import { DashboardSkeleton } from './components/DashboardSkeleton.tsx';

const DEFAULT_LOCATION: WeatherLocation = {
  id: '37.7749,-122.4194',
  name: 'San Francisco',
  admin1: 'California',
  country: 'United States',
  countryCode: 'US',
  latitude: 37.7749,
  longitude: -122.4194,
  timezone: 'America/Los_Angeles',
};

const STARTER_FAVORITES: WeatherLocation[] = [
  DEFAULT_LOCATION,
  {
    id: '40.7128,-74.0060',
    name: 'New York',
    admin1: 'New York',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
  },
  {
    id: '51.5074,-0.1278',
    name: 'London',
    admin1: 'England',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
  },
  {
    id: '35.6762,139.6503',
    name: 'Tokyo',
    admin1: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
  },
];

function readInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('atmos-theme');
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readInitialUnit(): TemperatureUnit {
  try {
    const saved = localStorage.getItem('atmos-unit');
    return saved === 'F' ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

function readInitialFavorites(): WeatherLocation[] {
  try {
    const raw = localStorage.getItem('atmos-favorites');
    if (!raw) return STARTER_FAVORITES;
    const parsed = JSON.parse(raw) as WeatherLocation[];
    return Array.isArray(parsed) ? parsed : STARTER_FAVORITES;
  } catch {
    return STARTER_FAVORITES;
  }
}

function readInitialLocation(): WeatherLocation {
  try {
    const raw = localStorage.getItem('atmos-last-location');
    if (raw) {
      const parsed = JSON.parse(raw) as WeatherLocation;
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LOCATION;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);
  const [unit, setUnit] = useState<TemperatureUnit>(readInitialUnit);
  const [favorites, setFavorites] = useState<WeatherLocation[]>(readInitialFavorites);
  const [activeLocation, setActiveLocation] = useState<WeatherLocation>(readInitialLocation);

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [insights, setInsights] = useState<WeatherInsightsResponse | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const weatherAbortRef = useRef<AbortController | null>(null);
  const insightsAbortRef = useRef<AbortController | null>(null);

  // Sync theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('atmos-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist unit
  useEffect(() => {
    try {
      localStorage.setItem('atmos-unit', unit);
    } catch {
      // ignore
    }
  }, [unit]);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('atmos-favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const fetchInsights = useCallback(async (data: WeatherResponse, displayUnit: TemperatureUnit) => {
    insightsAbortRef.current?.abort();
    const controller = new AbortController();
    insightsAbortRef.current = controller;

    setIsLoadingInsights(true);
    setInsightsError(null);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weather: data, unit: displayUnit }),
        signal: controller.signal,
      });

      const payload = (await res.json()) as WeatherInsightsResponse & { error?: string };
      if (!res.ok) {
        setInsightsError(payload.error || 'Unable to generate AI weather insights.');
        setInsights(null);
      } else {
        setInsights(payload);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setInsightsError('Network error while contacting the weather insights service.');
        setInsights(null);
      }
    } finally {
      if (insightsAbortRef.current === controller) {
        setIsLoadingInsights(false);
      }
    }
  }, []);

  const loadWeather = useCallback(
    async (loc: WeatherLocation, options?: { isRefresh?: boolean; activeUnit?: TemperatureUnit }) => {
      weatherAbortRef.current?.abort();
      const controller = new AbortController();
      weatherAbortRef.current = controller;

      if (options?.isRefresh && weather) {
        setIsRefreshing(true);
      } else {
        setIsLoadingWeather(true);
      }
      setWeatherError(null);

      try {
        const params = new URLSearchParams({
          lat: String(loc.latitude),
          lon: String(loc.longitude),
          name: loc.name,
        });
        if (loc.admin1) params.set('admin1', loc.admin1);
        if (loc.country) params.set('country', loc.country);
        if (loc.countryCode) params.set('countryCode', loc.countryCode);

        const res = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
        });

        const payload = (await res.json()) as WeatherResponse & { error?: string };
        if (!res.ok) {
          setWeatherError(payload.error || 'Failed to load weather data for this location.');
          setIsLoadingWeather(false);
          setIsRefreshing(false);
          return;
        }

        setWeather(payload);
        setIsLoadingWeather(false);
        setIsRefreshing(false);

        try {
          localStorage.setItem('atmos-last-location', JSON.stringify(loc));
        } catch {
          // ignore
        }

        void fetchInsights(payload, options?.activeUnit ?? unit);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setWeatherError('Could not connect to the weather forecast service. Please check your connection and try again.');
          setIsLoadingWeather(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetchInsights, unit, weather],
  );

  // Initial weather load + passive check if geolocation permission is already granted
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let hasSavedLocation = false;
    try {
      hasSavedLocation = Boolean(localStorage.getItem('atmos-last-location'));
    } catch {
      hasSavedLocation = false;
    }

    if (!hasSavedLocation && 'permissions' in navigator && 'geolocation' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          if (perm.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  const res = await fetch(
                    `/api/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
                  );
                  const data = (await res.json()) as { location?: WeatherLocation };
                  if (data.location) {
                    setActiveLocation(data.location);
                    void loadWeather(data.location);
                    return;
                  }
                } catch {
                  // fall back to default
                }
                void loadWeather(activeLocation);
              },
              () => {
                void loadWeather(activeLocation);
              },
              { timeout: 6000 },
            );
          } else {
            void loadWeather(activeLocation);
          }
        })
        .catch(() => {
          void loadWeather(activeLocation);
        });
    } else {
      void loadWeather(activeLocation);
    }
  }, [activeLocation, loadWeather]);

  function handleSelectLocation(loc: WeatherLocation) {
    setLocationNotice(null);
    setActiveLocation(loc);
    void loadWeather(loc);
  }

  function handleUnitChange(nextUnit: TemperatureUnit) {
    if (nextUnit === unit) return;
    setUnit(nextUnit);
    if (weather) {
      void fetchInsights(weather, nextUnit);
    }
  }

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setLocationNotice('Geolocation is not supported by your browser. Search for a city above instead.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          const data = (await res.json()) as { location?: WeatherLocation; error?: string };
          const resolved: WeatherLocation = data.location ?? {
            id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
            name: 'Current Location',
            latitude,
            longitude,
          };
          setActiveLocation(resolved);
          await loadWeather(resolved);
        } catch {
          setLocationNotice('Found your coordinates, but could not resolve the city name.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNotice(
            'Location permission was denied. Allow location access in your browser settings or search for any city above.',
          );
        } else if (err.code === err.TIMEOUT) {
          setLocationNotice('Location request timed out. Please try again or search for a city manually.');
        } else {
          setLocationNotice('Unable to determine your current location. Search for a city above instead.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const isFavorite = favorites.some((f) => f.id === activeLocation.id);

  function handleToggleFavorite() {
    if (isFavorite) {
      setFavorites((prev) => prev.filter((f) => f.id !== activeLocation.id));
    } else {
      const toSave = weather?.location ?? activeLocation;
      setFavorites((prev) => [toSave, ...prev.filter((f) => f.id !== toSave.id)].slice(0, 10));
    }
  }

  function handleRemoveFavorite(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070B14] dark:text-slate-100 transition-colors duration-200">
      <TopBar
        unit={unit}
        onUnitChange={handleUnitChange}
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onRefresh={() => loadWeather(activeLocation, { isRefresh: true })}
        isRefreshing={isRefreshing}
        onSelectLocation={handleSelectLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
        locationNotice={locationNotice}
        onDismissNotice={() => setLocationNotice(null)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FavoritesBar
          favorites={favorites}
          activeLocationId={activeLocation.id}
          onSelect={handleSelectLocation}
          onRemove={handleRemoveFavorite}
        />

        {isLoadingWeather && <DashboardSkeleton />}

        {!isLoadingWeather && weatherError && (
          <section
            role="alert"
            className="rounded-2xl border border-rose-200 dark:border-rose-500/35 bg-white dark:bg-[#0D1528] p-8 text-center max-w-xl mx-auto my-12"
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Weather Data Unavailable
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {weatherError}
            </p>
            <button
              type="button"
              onClick={() => loadWeather(activeLocation)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
          </section>
        )}

        {!isLoadingWeather && !weatherError && weather && (
          <>
            <AlertsBanner alerts={weather.alerts} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <CurrentWeatherHero
                  weather={weather}
                  unit={unit}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <WeatherInsightsPanel
                  insights={insights}
                  isLoading={isLoadingInsights}
                  error={insightsError}
                  alerts={weather.alerts}
                  onRetry={() => fetchInsights(weather, unit)}
                />
              </div>
            </div>

            <HourlyForecastSection hourly={weather.hourly} unit={unit} theme={theme} />

            <SevenDayForecast daily={weather.daily} unit={unit} />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#070B14]/80 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Atmos Weather</span>
            <span aria-hidden="true">·</span>
            <span>
              Forecast &amp; geocoding by{' '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-slate-400/50 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Open-Meteo
              </a>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Reverse lookup via{' '}
              <a
                href="https://nominatim.openstreetmap.org/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-slate-400/50 hover:text-slate-800 dark:hover:text-slate-200"
              >
                OpenStreetMap Nominatim
              </a>
            </span>
            <span aria-hidden="true">·</span>
            <span>AI weather explanations via Gemini</span>
          </div>
          <div className="font-mono tabular-nums">
            Units: °{unit} / {unit === 'F' ? 'mph' : 'km/h'}
          </div>
        </div>
      </footer>
    </div>
  );
}

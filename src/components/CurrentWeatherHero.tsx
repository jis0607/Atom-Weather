import { useEffect, useState } from 'react';
import {
  Droplets,
  Eye,
  Gauge,
  Navigation,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react';
import type { TemperatureUnit, WeatherResponse } from '../types/weather.ts';
import {
  formatCityLocalClock,
  formatSunTime,
  formatTemp,
  formatVisibility,
  formatWindSpeed,
  getCompassDirection,
  getHumidityDescriptor,
  getPressureDescriptor,
  getUvCategory,
  getVisibilityDescriptor,
  getWeatherInfo,
} from '../lib/weatherCodes.ts';
import { WeatherHeroVisual } from './WeatherArt.tsx';

interface CurrentWeatherHeroProps {
  weather: WeatherResponse;
  unit: TemperatureUnit;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function CurrentWeatherHero({
  weather,
  unit,
  isFavorite,
  onToggleFavorite,
}: CurrentWeatherHeroProps) {
  const [localClock, setLocalClock] = useState(() => formatCityLocalClock(weather.timezone));

  useEffect(() => {
    setLocalClock(formatCityLocalClock(weather.timezone));
    const interval = window.setInterval(() => {
      setLocalClock(formatCityLocalClock(weather.timezone));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [weather.timezone]);

  const { current, daily, location } = weather;
  const today = daily[0];
  const weatherInfo = getWeatherInfo(current.weatherCode);
  const uvInfo = getUvCategory(current.uvIndex);
  const windCompass = getCompassDirection(current.windDirection);

  const locationSubtitle = [location.admin1, location.country].filter(Boolean).join(', ');
  const updatedTime = new Date(weather.fetchedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Daylight progress calculation using today's sunrise/sunset local ISO strings
  let daylightProgress = 0.5;
  if (today?.sunrise && today?.sunset) {
    const parseLocalMinutes = (iso: string) => {
      const timePart = iso.split('T')[1] ?? '00:00';
      const [h, m] = timePart.split(':').map(Number);
      return h * 60 + m;
    };
    const riseMins = parseLocalMinutes(today.sunrise);
    const setMins = parseLocalMinutes(today.sunset);
    const nowTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: weather.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    const [nowH, nowM] = nowTime.split(':').map(Number);
    const currentMins = nowH * 60 + nowM;
    if (setMins > riseMins) {
      daylightProgress = Math.max(0, Math.min(1, (currentMins - riseMins) / (setMins - riseMins)));
    }
  }

  return (
    <section
      aria-label="Current weather conditions"
      className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 flex flex-col justify-between"
    >
      {/* Subtle atmospheric aura in midnight navy */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-25 dark:opacity-30 ${
          current.isDay
            ? weatherInfo.category === 'clear' || weatherInfo.category === 'partly-cloudy'
              ? 'bg-sky-400 dark:bg-sky-500'
              : 'bg-slate-400 dark:bg-sky-700'
            : 'bg-indigo-400 dark:bg-indigo-600'
        }`}
      />

      {/* Location Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
              {location.name}
            </h1>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${location.name} from saved cities` : `Save ${location.name} to favorites`}
              title={isFavorite ? 'Remove from saved cities' : 'Save to favorites'}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                  : 'border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-amber-500 hover:border-amber-500/40'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {locationSubtitle || `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`}
          </p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="text-sm font-medium font-mono tabular-nums text-slate-800 dark:text-slate-200">
            {localClock}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {weather.timezoneAbbreviation} · Elev. {Math.round(weather.elevation)} m · Updated {updatedTime}
          </div>
        </div>
      </div>

      {/* Primary Temperature & Condition */}
      <div className="relative my-6 sm:my-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5 sm:gap-6">
          <WeatherHeroVisual code={current.weatherCode} isDay={current.isDay} />
          <div>
            <div className="font-display text-6xl sm:text-7xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white leading-none">
              {formatTemp(current.temperature, unit)}
            </div>
            <div className="mt-2.5 text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-200">
              {weatherInfo.label}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-2 text-sm text-slate-600 dark:text-slate-300 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200/80 dark:border-slate-800/80">
          <div>
            Feels like{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatTemp(current.apparentTemperature, unit)}
            </span>
          </div>
          {today && (
            <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              High {formatTemp(today.temperatureMax, unit)} · Low {formatTemp(today.temperatureMin, unit)}
            </div>
          )}
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Cloud cover {current.cloudCover}%
          </div>
        </div>
      </div>

      {/* 6-Metric Atmospheric Telemetry Grid (clean hairline separators, no nested boxes) */}
      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 pt-6 border-t border-slate-200/90 dark:border-slate-800/90">
        {/* Humidity */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Droplets className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Humidity</span>
          </div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {Math.round(current.humidity)}%
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {getHumidityDescriptor(current.humidity)}
          </p>
        </div>

        {/* Wind Speed & Direction */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Wind className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Wind</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatWindSpeed(current.windSpeed, unit)}
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs font-mono font-medium text-sky-600 dark:text-sky-400"
              title={`Wind from ${windCompass} (${Math.round(current.windDirection)}°)`}
            >
              <Navigation
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: `rotate(${(current.windDirection + 180) % 360}deg)` }}
                aria-hidden="true"
              />
              {windCompass}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Gusts {formatWindSpeed(current.windGusts, unit)}
          </p>
        </div>

        {/* Atmospheric Pressure */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Pressure</span>
          </div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {Math.round(current.pressureMsl)}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">hPa</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {getPressureDescriptor(current.pressureMsl)}
          </p>
        </div>

        {/* Visibility */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Eye className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Visibility</span>
          </div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatVisibility(current.visibilityKm, unit)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {getVisibilityDescriptor(current.visibilityKm)}
          </p>
        </div>

        {/* UV Index */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>UV Index</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {current.uvIndex.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {uvInfo.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{uvInfo.guidance}</p>
        </div>

        {/* Sunrise & Sunset */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Sunrise className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Daylight</span>
          </div>
          {today ? (
            <>
              <div className="mt-2 flex items-center justify-between text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <Sunrise className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  {formatSunTime(today.sunrise)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sunset className="w-3 h-3 text-orange-400" aria-hidden="true" />
                  {formatSunTime(today.sunset)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-400 transition-all duration-300"
                  style={{ width: `${Math.round(daylightProgress * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mt-1.5 text-sm text-slate-500">—</div>
          )}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { ChevronDown, Droplets, Sun, Sunrise, Sunset, Wind } from 'lucide-react';
import type { DailyForecastItem, TemperatureUnit } from '../types/weather.ts';
import {
  formatDayLabel,
  formatPrecipitation,
  formatSunTime,
  formatTemp,
  formatWindSpeed,
  getWeatherInfo,
} from '../lib/weatherCodes.ts';
import { WeatherConditionIcon } from './WeatherArt.tsx';

interface SevenDayForecastProps {
  daily: DailyForecastItem[];
  unit: TemperatureUnit;
}

export function SevenDayForecast({ daily, unit }: SevenDayForecastProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (daily.length === 0) return null;

  const weekMin = Math.min(...daily.map((d) => d.temperatureMin));
  const weekMax = Math.max(...daily.map((d) => d.temperatureMax));
  const weekSpan = Math.max(1, weekMax - weekMin);

  return (
    <section
      aria-label="7-day weather forecast"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            7-Day Outlook
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Daily temperature range, weather conditions, and rain probability · Select a day for details
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
        {daily.map((day, index) => {
          const { dayName, dateShort } = formatDayLabel(day.date, index);
          const info = getWeatherInfo(day.weatherCode);
          const isExpanded = expandedDate === day.date;

          const leftPct = ((day.temperatureMin - weekMin) / weekSpan) * 100;
          const widthPct = Math.max(6, ((day.temperatureMax - day.temperatureMin) / weekSpan) * 100);

          return (
            <div key={day.date}>
              <button
                type="button"
                onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                aria-expanded={isExpanded}
                className="w-full py-3.5 px-2 -mx-2 rounded-xl grid grid-cols-12 items-center gap-2 sm:gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {/* Day & Date */}
                <div className="col-span-4 sm:col-span-3 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {dayName}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {dateShort}
                  </div>
                </div>

                {/* Condition & Icon */}
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2.5 min-w-0">
                  <WeatherConditionIcon code={day.weatherCode} isDay={true} className="w-5 h-5 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">
                    {info.shortLabel}
                  </span>
                </div>

                {/* Rain Probability */}
                <div className="hidden sm:flex col-span-2 items-center gap-1.5 text-xs font-mono tabular-nums">
                  <Droplets
                    className={`w-3.5 h-3.5 shrink-0 ${
                      day.precipitationProbabilityMax >= 30
                        ? 'text-sky-500'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      day.precipitationProbabilityMax >= 30
                        ? 'text-sky-600 dark:text-sky-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {day.precipitationProbabilityMax}%
                  </span>
                </div>

                {/* Min / Range Bar / Max */}
                <div className="col-span-4 sm:col-span-4 flex items-center justify-end gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-mono tabular-nums text-slate-500 dark:text-slate-400 w-9 text-right">
                    {formatTemp(day.temperatureMin, unit)}
                  </span>
                  <div className="hidden md:block relative flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden max-w-[120px]">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-amber-400"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 w-9 text-right">
                    {formatTemp(day.temperatureMax, unit)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                      isExpanded ? 'rotate-180 text-sky-500' : ''
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="pb-4 pt-1 px-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-slate-100 dark:border-slate-800/60">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                      Precipitation
                    </div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {day.precipitationProbabilityMax}% · {formatPrecipitation(day.precipitationSum, unit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                      Peak Wind
                    </div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatWindSpeed(day.windSpeedMax, unit)} (Gusts {formatWindSpeed(day.windGustsMax, unit)})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      Max UV & Feels Like
                    </div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      UV {day.uvIndexMax.toFixed(1)} · {formatTemp(day.apparentTemperatureMin, unit)} / {formatTemp(day.apparentTemperatureMax, unit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sunrise className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                      Sunrise / Sunset
                    </div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                      <span>{formatSunTime(day.sunrise)}</span>
                      <Sunset className="w-3 h-3 text-orange-400" aria-hidden="true" />
                      <span>{formatSunTime(day.sunset)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Droplets } from 'lucide-react';
import type { HourlyForecastItem, TemperatureUnit, ThemeMode } from '../types/weather.ts';
import {
  convertTempValue,
  formatHourLabel,
  formatPrecipitation,
  formatTemp,
  formatWindSpeed,
  getWeatherInfo,
} from '../lib/weatherCodes.ts';
import { WeatherConditionIcon } from './WeatherArt.tsx';

interface HourlyForecastSectionProps {
  hourly: HourlyForecastItem[];
  unit: TemperatureUnit;
  theme: ThemeMode;
}

type ChartMode = 'temperature' | 'precipitation' | 'wind';

interface ChartPoint {
  hourLabel: string;
  fullTime: string;
  temp: number;
  feelsLike: number;
  precipProb: number;
  precipMm: number;
  wind: number;
  uv: number;
  condition: string;
  rawWindKmh: number;
  rawPrecipMm: number;
}

export function HourlyForecastSection({ hourly, unit, theme }: HourlyForecastSectionProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('temperature');

  const chartData = useMemo<ChartPoint[]>(() => {
    return hourly.map((item, idx) => {
      const windVal = unit === 'F' ? Math.round(item.windSpeed * 0.621371) : Math.round(item.windSpeed);
      return {
        hourLabel: idx === 0 ? 'Now' : formatHourLabel(item.time),
        fullTime: formatHourLabel(item.time),
        temp: convertTempValue(item.temperature, unit),
        feelsLike: convertTempValue(item.apparentTemperature, unit),
        precipProb: item.precipitationProbability,
        precipMm: item.precipitation,
        wind: windVal,
        uv: item.uvIndex,
        condition: getWeatherInfo(item.weatherCode).shortLabel,
        rawWindKmh: item.windSpeed,
        rawPrecipMm: item.precipitation,
      };
    });
  }, [hourly, unit]);

  const gridStroke = theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';
  const tickColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <section
      aria-label="24-hour forecast"
      className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7"
    >
      {/* Header & Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            24-Hour Forecast
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Hourly progression in local city time
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Hourly chart metric"
          className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 self-start sm:self-auto"
        >
          {(
            [
              { id: 'temperature', label: 'Temperature' },
              { id: 'precipitation', label: 'Precipitation' },
              { id: 'wind', label: 'Wind & UV' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={chartMode === tab.id}
              onClick={() => setChartMode(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                chartMode === tab.id
                  ? 'bg-white dark:bg-sky-500 text-slate-900 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="mt-5 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="atmosTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="atmosWindGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#818CF8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            {chartMode === 'temperature' && (
              <YAxis
                tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 2', 'dataMax + 2']}
                tickFormatter={(v) => `${Math.round(v)}°`}
              />
            )}
            {chartMode === 'precipitation' && (
              <YAxis
                tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            {chartMode === 'wind' && (
              <YAxis
                tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 5']}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload as ChartPoint;
                return (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0B1222]/95 px-3.5 py-2.5 shadow-lg text-xs">
                    <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {d.hourLabel} · {d.condition}
                    </div>
                    <div className="mt-1.5 space-y-1 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <div>
                        Temp: <span className="text-slate-900 dark:text-white font-semibold">{Math.round(d.temp)}°{unit}</span> (Feels {Math.round(d.feelsLike)}°{unit})
                      </div>
                      <div>
                        Precip chance: <span className="text-sky-600 dark:text-sky-400 font-semibold">{d.precipProb}%</span>
                        {d.rawPrecipMm > 0 ? ` (${formatPrecipitation(d.rawPrecipMm, unit)})` : ''}
                      </div>
                      <div>
                        Wind: {formatWindSpeed(d.rawWindKmh, unit)} · UV {d.uv.toFixed(1)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {chartMode === 'temperature' && (
              <>
                <Area
                  type="monotone"
                  dataKey="temp"
                  name="Temperature"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fill="url(#atmosTempGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#38BDF8', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="feelsLike"
                  name="Feels like"
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </>
            )}

            {chartMode === 'precipitation' && (
              <Bar
                dataKey="precipProb"
                name="Precipitation probability"
                fill="#38BDF8"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            )}

            {chartMode === 'wind' && (
              <>
                <Area
                  type="monotone"
                  dataKey="wind"
                  name="Wind speed"
                  stroke="#818CF8"
                  strokeWidth={2.2}
                  fill="url(#atmosWindGrad)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="uv"
                  name="UV index"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend note for active chart */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        {chartMode === 'temperature' && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" /> Actual temperature (°{unit})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" /> Feels like (°{unit})
            </span>
          </>
        )}
        {chartMode === 'precipitation' && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 inline-block" /> Precipitation probability (%)
          </span>
        )}
        {chartMode === 'wind' && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-400 inline-block" /> Wind speed ({unit === 'F' ? 'mph' : 'km/h'})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block" /> UV index
            </span>
          </>
        )}
      </div>

      {/* Scrollable 24-hour timeline strip */}
      <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-stretch gap-3 overflow-x-auto atmos-scroll pb-2">
        {hourly.map((item, idx) => (
          <div
            key={item.time}
            className={`min-w-[74px] flex flex-col items-center justify-between gap-2.5 py-3 px-2.5 rounded-xl border transition-colors shrink-0 ${
              idx === 0
                ? 'bg-sky-500/10 border-sky-500/35'
                : 'bg-slate-50/70 dark:bg-[#111A2E]/70 border-slate-200/70 dark:border-slate-800/80'
            }`}
          >
            <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {idx === 0 ? 'Now' : formatHourLabel(item.time)}
            </span>
            <WeatherConditionIcon code={item.weatherCode} isDay={item.isDay} className="w-5 h-5" />
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatTemp(item.temperature, unit)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums ${
                item.precipitationProbability >= 30
                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Droplets className="w-3 h-3" aria-hidden="true" />
              {item.precipitationProbability}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

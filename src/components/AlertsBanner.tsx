import { AlertTriangle, CloudRain, Flame, Info, Snowflake, Sun, Wind, Zap } from 'lucide-react';
import type { AlertCategory, SmartWeatherAlert } from '../types/weather.ts';

interface AlertsBannerProps {
  alerts: SmartWeatherAlert[];
}

function getCategoryIcon(category: AlertCategory) {
  switch (category) {
    case 'heat':
      return Flame;
    case 'cold':
      return Snowflake;
    case 'rain':
      return CloudRain;
    case 'wind':
      return Wind;
    case 'uv':
      return Sun;
    case 'storm':
      return Zap;
  }
}

export function AlertsBanner({ alerts }: AlertsBannerProps) {
  if (alerts.length === 0) {
    return null;
  }

  const hasWarning = alerts.some((a) => a.severity === 'warning');

  return (
    <section
      aria-label="Forecast-based weather advisories"
      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
        hasWarning
          ? 'bg-rose-50/90 dark:bg-rose-950/35 border-rose-200 dark:border-rose-500/35'
          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/35'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              hasWarning ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`}
            aria-hidden="true"
          />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Forecast-Derived Weather {alerts.length === 1 ? 'Advisory' : `Advisories (${alerts.length})`}
          </h2>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <span>Model threshold alert from Open-Meteo data — not an official emergency broadcast.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
        {alerts.map((alert) => {
          const Icon = getCategoryIcon(alert.category);
          const isWarn = alert.severity === 'warning';
          return (
            <div key={alert.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                  isWarn
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {alert.title}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isWarn ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    · {isWarn ? 'Forecast Warning' : 'Forecast Advisory'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {alert.description}
                </p>
                <div className="mt-1.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {alert.metricLabel} · {alert.timeframe}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Compass,
  RefreshCw,
  ShieldCheck,
  Shirt,
} from 'lucide-react';
import type { SmartWeatherAlert, WeatherInsightsResponse } from '../types/weather.ts';

interface WeatherInsightsPanelProps {
  insights: WeatherInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  alerts: SmartWeatherAlert[];
  onRetry: () => void;
}

function getVerdictStyle(verdict: WeatherInsightsResponse['outdoorActivity']['verdict']) {
  switch (verdict) {
    case 'Ideal':
      return 'text-emerald-700 dark:text-emerald-300';
    case 'Favorable':
      return 'text-sky-700 dark:text-sky-300';
    case 'Use Caution':
      return 'text-amber-700 dark:text-amber-300';
    case 'Not Recommended':
      return 'text-rose-700 dark:text-rose-300';
  }
}

export function WeatherInsightsPanel({
  insights,
  isLoading,
  error,
  alerts,
  onRetry,
}: WeatherInsightsPanelProps) {
  return (
    <aside
      aria-label="Gemini weather insights"
      className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1528] p-6 sm:p-7 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Weather Insights
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Gemini interpretation of live Open-Meteo measurements
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            title="Regenerate weather insights"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} aria-hidden="true" />
            <span>{isLoading ? 'Analyzing' : 'Regenerate'}</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-6 space-y-5 animate-pulse" aria-busy="true">
            <div className="space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
              <div className="h-3.5 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="py-6">
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30 p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                    Unable to generate AI insights
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  >
                    Retry Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Populated Insights */}
        {!isLoading && !error && insights && (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {/* Condition Explanation */}
            <div className="py-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                <span>Condition Breakdown</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {insights.conditionSummary}
              </p>
            </div>

            {/* Clothing Suggestions */}
            <div className="py-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                <Shirt className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                <span>What to Wear</span>
              </div>
              <ul className="space-y-1.5">
                {insights.clothingSuggestions.map((item, idx) => (
                  <li key={idx} className="text-sm leading-snug text-slate-700 dark:text-slate-200 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Outdoor Activity Verdict */}
            <div className="py-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                  <span>Outdoor Outlook</span>
                </span>
                <span className={`text-xs font-semibold ${getVerdictStyle(insights.outdoorActivity.verdict)}`}>
                  {insights.outdoorActivity.verdict} · {insights.outdoorActivity.bestWindow}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {insights.outdoorActivity.explanation}
              </p>
            </div>

            {/* Comfort & Outlook Note */}
            <div className="pt-4 pb-2">
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {insights.comfortNotes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Forecast Monitor Status Footer */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        {alerts.length === 0 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              No forecast-based heat, cold, heavy rain, or gale thresholds triggered over the next 24 hours.
            </span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {alerts.length} forecast-derived threshold {alerts.length === 1 ? 'advisory' : 'advisories'} active above. Always consult local meteorological agencies for official emergency alerts.
            </span>
          </>
        )}
      </div>
    </aside>
  );
}

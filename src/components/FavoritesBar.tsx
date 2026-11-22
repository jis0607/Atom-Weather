import { Star, X } from 'lucide-react';
import type { WeatherLocation } from '../types/weather.ts';

interface FavoritesBarProps {
  favorites: WeatherLocation[];
  activeLocationId?: string;
  onSelect: (loc: WeatherLocation) => void;
  onRemove: (id: string) => void;
}

export function FavoritesBar({ favorites, activeLocationId, onSelect, onRemove }: FavoritesBarProps) {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Saved favorite cities" className="flex items-center gap-2 overflow-x-auto atmos-scroll pb-1">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 pr-1">
        <Star className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
        Saved
      </span>
      <div className="flex items-center gap-2">
        {favorites.map((city) => {
          const isActive = city.id === activeLocationId;
          return (
            <div
              key={city.id}
              className={`inline-flex items-center rounded-lg border text-xs transition-colors shrink-0 ${
                isActive
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 font-medium'
                  : 'bg-white dark:bg-[#0E1629] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(city)}
                className="pl-3 pr-2 py-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-l-lg"
              >
                {city.name}
                {city.countryCode ? (
                  <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-mono">{city.countryCode}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => onRemove(city.id)}
                aria-label={`Remove ${city.name} from favorites`}
                className="pr-2 pl-1 py-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 rounded-r-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

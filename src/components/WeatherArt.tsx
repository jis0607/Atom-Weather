import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudMoon,
  Moon,
  Sun,
} from 'lucide-react';
import { getWeatherInfo } from '../lib/weatherCodes.ts';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
}

export function WeatherConditionIcon({ code, isDay = true, className = 'w-5 h-5' }: WeatherIconProps) {
  const { category } = getWeatherInfo(code);

  switch (category) {
    case 'clear':
      return isDay ? (
        <Sun className={`${className} text-amber-400`} aria-hidden="true" />
      ) : (
        <Moon className={`${className} text-sky-300`} aria-hidden="true" />
      );
    case 'partly-cloudy':
      return isDay ? (
        <CloudSun className={`${className} text-amber-300`} aria-hidden="true" />
      ) : (
        <CloudMoon className={`${className} text-sky-300`} aria-hidden="true" />
      );
    case 'cloudy':
      return <Cloud className={`${className} text-slate-400`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} aria-hidden="true" />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-sky-400`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-400`} aria-hidden="true" />;
    case 'snow':
      return <CloudSnow className={`${className} text-cyan-200`} aria-hidden="true" />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-amber-400`} aria-hidden="true" />;
  }
}

interface HeroVisualProps {
  code: number;
  isDay: boolean;
}

export function WeatherHeroVisual({ code, isDay }: HeroVisualProps) {
  const { category, label } = getWeatherInfo(code);

  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center shrink-0 select-none" aria-label={label}>
      <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible" role="img" aria-label={label}>
        <defs>
          <radialGradient id="atmosSunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="atmosMoonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#7DD3FC" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="atmosCloudFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="atmosCloudStorm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {/* Celestial body for clear or partly cloudy */}
        {(category === 'clear' || category === 'partly-cloudy') && isDay && (
          <g className="animate-atmos-float">
            <circle
              cx={category === 'clear' ? 70 : 88}
              cy={category === 'clear' ? 70 : 50}
              r={category === 'clear' ? 48 : 34}
              fill="url(#atmosSunGlow)"
              opacity="0.35"
            />
            <circle
              cx={category === 'clear' ? 70 : 88}
              cy={category === 'clear' ? 70 : 50}
              r={category === 'clear' ? 28 : 20}
              fill="#FBBF24"
            />
          </g>
        )}

        {(category === 'clear' || category === 'partly-cloudy') && !isDay && (
          <g className="animate-atmos-float">
            <circle
              cx={category === 'clear' ? 70 : 88}
              cy={category === 'clear' ? 70 : 48}
              r={category === 'clear' ? 46 : 30}
              fill="url(#atmosMoonGlow)"
              opacity="0.3"
            />
            <path
              d={
                category === 'clear'
                  ? 'M78 44 A24 24 0 1 0 96 84 A20 20 0 1 1 78 44 Z'
                  : 'M92 30 A17 17 0 1 0 105 58 A14 14 0 1 1 92 30 Z'
              }
              fill="#E0F2FE"
            />
            <circle cx={category === 'clear' ? 42 : 52} cy="36" r="1.8" fill="#BAE6FD" opacity="0.85" />
            <circle cx="106" cy="34" r="1.4" fill="#BAE6FD" opacity="0.7" />
            <circle cx={category === 'clear' ? 104 : 114} cy="86" r="1.6" fill="#7DD3FC" opacity="0.75" />
          </g>
        )}

        {/* Cloud mass for all non-clear categories */}
        {category !== 'clear' && (
          <g className="animate-atmos-float">
            <path
              d="M38 88 H98 C109 88 117 80 117 70 C117 61 110 53 101 52 C98 39 86 30 72 30 C57 30 45 40 43 54 C33 55 25 63 25 73 C25 81 31 88 38 88 Z"
              fill={category === 'thunderstorm' || category === 'rain' ? 'url(#atmosCloudStorm)' : 'url(#atmosCloudFront)'}
            />
          </g>
        )}

        {/* Fog layers */}
        {category === 'fog' && (
          <g stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" opacity="0.75">
            <line x1="28" y1="98" x2="108" y2="98" />
            <line x1="38" y1="108" x2="114" y2="108" />
            <line x1="24" y1="118" x2="96" y2="118" />
          </g>
        )}

        {/* Rain / Drizzle streaks */}
        {(category === 'rain' || category === 'drizzle') && (
          <g className="animate-atmos-rain" stroke="#38BDF8" strokeLinecap="round">
            <line x1="48" y1="96" x2="43" y2={category === 'rain' ? 114 : 106} strokeWidth={category === 'rain' ? 3 : 2.2} />
            <line x1="68" y1="98" x2="63" y2={category === 'rain' ? 118 : 109} strokeWidth={category === 'rain' ? 3 : 2.2} />
            <line x1="88" y1="96" x2="83" y2={category === 'rain' ? 114 : 106} strokeWidth={category === 'rain' ? 3 : 2.2} />
            {category === 'rain' && (
              <line x1="58" y1="104" x2="53" y2="122" strokeWidth="2.6" opacity="0.7" />
            )}
          </g>
        )}

        {/* Snow crystals */}
        {category === 'snow' && (
          <g className="animate-atmos-rain" fill="#E0F2FE">
            <circle cx="48" cy="102" r="3.2" />
            <circle cx="68" cy="110" r="3.5" />
            <circle cx="88" cy="101" r="3.2" />
            <circle cx="58" cy="118" r="2.6" opacity="0.8" />
            <circle cx="80" cy="119" r="2.6" opacity="0.8" />
          </g>
        )}

        {/* Thunderstorm bolt */}
        {category === 'thunderstorm' && (
          <g>
            <polygon points="72,88 59,107 69,107 63,125 84,102 73,102" fill="#FBBF24" />
            <line x1="46" y1="98" x2="41" y2="112" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="94" y1="98" x2="89" y2="112" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

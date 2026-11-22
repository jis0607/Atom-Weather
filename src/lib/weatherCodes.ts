import type { TemperatureUnit, WeatherCategory } from '../types/weather.ts';

export interface WmoWeatherInfo {
  label: string;
  shortLabel: string;
  category: WeatherCategory;
}

const WMO_MAP: Record<number, WmoWeatherInfo> = {
  0: { label: 'Clear sky', shortLabel: 'Clear', category: 'clear' },
  1: { label: 'Mainly clear', shortLabel: 'Mostly Clear', category: 'partly-cloudy' },
  2: { label: 'Partly cloudy', shortLabel: 'Partly Cloudy', category: 'partly-cloudy' },
  3: { label: 'Overcast', shortLabel: 'Overcast', category: 'cloudy' },
  45: { label: 'Fog', shortLabel: 'Fog', category: 'fog' },
  48: { label: 'Depositing rime fog', shortLabel: 'Rime Fog', category: 'fog' },
  51: { label: 'Light drizzle', shortLabel: 'Light Drizzle', category: 'drizzle' },
  53: { label: 'Moderate drizzle', shortLabel: 'Drizzle', category: 'drizzle' },
  55: { label: 'Dense drizzle', shortLabel: 'Dense Drizzle', category: 'drizzle' },
  56: { label: 'Light freezing drizzle', shortLabel: 'Freezing Drizzle', category: 'drizzle' },
  57: { label: 'Dense freezing drizzle', shortLabel: 'Freezing Drizzle', category: 'drizzle' },
  61: { label: 'Slight rain', shortLabel: 'Light Rain', category: 'rain' },
  63: { label: 'Moderate rain', shortLabel: 'Rain', category: 'rain' },
  65: { label: 'Heavy rain', shortLabel: 'Heavy Rain', category: 'rain' },
  66: { label: 'Light freezing rain', shortLabel: 'Freezing Rain', category: 'rain' },
  67: { label: 'Heavy freezing rain', shortLabel: 'Freezing Rain', category: 'rain' },
  71: { label: 'Slight snowfall', shortLabel: 'Light Snow', category: 'snow' },
  73: { label: 'Moderate snowfall', shortLabel: 'Snow', category: 'snow' },
  75: { label: 'Heavy snowfall', shortLabel: 'Heavy Snow', category: 'snow' },
  77: { label: 'Snow grains', shortLabel: 'Snow Grains', category: 'snow' },
  80: { label: 'Slight rain showers', shortLabel: 'Rain Showers', category: 'rain' },
  81: { label: 'Moderate rain showers', shortLabel: 'Showers', category: 'rain' },
  82: { label: 'Violent rain showers', shortLabel: 'Heavy Showers', category: 'rain' },
  85: { label: 'Slight snow showers', shortLabel: 'Snow Showers', category: 'snow' },
  86: { label: 'Heavy snow showers', shortLabel: 'Heavy Snow', category: 'snow' },
  95: { label: 'Thunderstorm', shortLabel: 'Thunderstorm', category: 'thunderstorm' },
  96: { label: 'Thunderstorm with slight hail', shortLabel: 'T-Storm & Hail', category: 'thunderstorm' },
  99: { label: 'Thunderstorm with heavy hail', shortLabel: 'Severe T-Storm', category: 'thunderstorm' },
};

export function getWeatherInfo(code: number): WmoWeatherInfo {
  return WMO_MAP[code] ?? { label: 'Variable conditions', shortLabel: 'Variable', category: 'cloudy' };
}

export function formatTemp(celsius: number, unit: TemperatureUnit, withSymbol = true): string {
  const val = unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
  const rounded = Math.round(val);
  return withSymbol ? `${rounded}°` : `${rounded}`;
}

export function convertTempValue(celsius: number, unit: TemperatureUnit): number {
  return unit === 'F' ? Math.round(((celsius * 9) / 5 + 32) * 10) / 10 : Math.round(celsius * 10) / 10;
}

export function formatWindSpeed(kmh: number, unit: TemperatureUnit): string {
  if (unit === 'F') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatVisibility(km: number, unit: TemperatureUnit): string {
  if (unit === 'F') {
    const miles = km * 0.621371;
    return `${miles >= 10 ? Math.round(miles) : miles.toFixed(1)} mi`;
  }
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
}

export function formatPrecipitation(mm: number, unit: TemperatureUnit): string {
  if (unit === 'F') {
    const inches = mm / 25.4;
    return `${inches.toFixed(2)} in`;
  }
  return `${mm < 1 && mm > 0 ? mm.toFixed(1) : Math.round(mm * 10) / 10} mm`;
}

export function getCompassDirection(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return dirs[idx];
}

export function getUvCategory(uv: number): { label: string; guidance: string } {
  if (uv < 3) return { label: 'Low', guidance: 'Minimal protection needed' };
  if (uv < 6) return { label: 'Moderate', guidance: 'SPF 30+ & sunglasses advised' };
  if (uv < 8) return { label: 'High', guidance: 'Seek shade during midday' };
  if (uv < 11) return { label: 'Very High', guidance: 'Extra sun protection required' };
  return { label: 'Extreme', guidance: 'Avoid prolonged sun exposure' };
}

export function getPressureDescriptor(hpa: number): string {
  if (hpa >= 1022) return 'High pressure · Fair & stable';
  if (hpa <= 1005) return 'Low pressure · Unsettled air';
  return 'Normal atmospheric pressure';
}

export function getHumidityDescriptor(humidity: number): string {
  if (humidity < 30) return 'Dry air';
  if (humidity <= 60) return 'Comfortable';
  if (humidity <= 75) return 'Moderately humid';
  return 'Muggy / High moisture';
}

export function getVisibilityDescriptor(km: number): string {
  if (km >= 20) return 'Crystal clear';
  if (km >= 10) return 'Clear visibility';
  if (km >= 4) return 'Moderate haze';
  return 'Reduced visibility';
}

export function formatCityLocalClock(timezone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

export function formatHourLabel(isoLocal: string): string {
  // Open-Meteo returns local ISO strings like "2026-11-21T14:00" when timezone=auto
  const parts = isoLocal.split('T');
  if (parts.length !== 2) return isoLocal;
  const [hourStr] = parts[1].split(':');
  const h = Number(hourStr);
  if (Number.isNaN(h)) return parts[1];
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function formatSunTime(isoLocal: string): string {
  const parts = isoLocal.split('T');
  if (parts.length !== 2) return isoLocal;
  const [hourStr, minStr] = parts[1].split(':');
  const h = Number(hourStr);
  if (Number.isNaN(h)) return parts[1];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${minStr} ${suffix}`;
}

export function formatDayLabel(dateStr: string, index: number): { dayName: string; dateShort: string } {
  if (index === 0) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return {
      dayName: 'Today',
      dateShort: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dt),
    };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dt),
    dateShort: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dt),
  };
}

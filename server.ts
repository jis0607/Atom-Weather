import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  SmartWeatherAlert,
  TemperatureUnit,
  WeatherInsightsResponse,
  WeatherLocation,
  WeatherResponse,
} from './src/types/weather.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_CACHE_SIZE = 100;
const geocodeCache = new Map<string, CacheEntry<WeatherLocation[]>>();
const reverseCache = new Map<string, CacheEntry<WeatherLocation>>();
const weatherCache = new Map<string, CacheEntry<WeatherResponse>>();
const insightsCache = new Map<string, CacheEntry<WeatherInsightsResponse>>();

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  if (map.size >= MAX_CACHE_SIZE) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseCoordinate(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return Math.round(num * 10000) / 10000;
}

function sanitizeText(raw: unknown, maxLen = 120): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLen);
}

function formatHourShort(isoLocal: string): string {
  const parts = isoLocal.split('T');
  if (parts.length !== 2) return isoLocal;
  const h = Number(parts[1].split(':')[0]);
  if (Number.isNaN(h)) return parts[1];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

function computeSmartAlerts(
  current: CurrentWeatherData,
  hourly24: HourlyForecastItem[],
  daily: DailyForecastItem[],
): SmartWeatherAlert[] {
  const alerts: SmartWeatherAlert[] = [];

  // 1. Thunderstorm check (WMO 95, 96, 99)
  const stormHours = hourly24.filter((h) => h.weatherCode >= 95);
  if (current.weatherCode >= 95 || stormHours.length > 0) {
    const firstHour = current.weatherCode >= 95 ? 'Now' : formatHourShort(stormHours[0].time);
    const hasHail = current.weatherCode >= 96 || stormHours.some((h) => h.weatherCode >= 96);
    alerts.push({
      id: 'alert-storm',
      category: 'storm',
      severity: 'warning',
      title: hasHail ? 'Thunderstorm & Hail Forecast' : 'Thunderstorm Activity Forecast',
      description: `Convective storm conditions are modeled starting around ${firstHour}. Seek indoor shelter if thunder is heard.`,
      metricLabel: `WMO Code ${current.weatherCode >= 95 ? current.weatherCode : stormHours[0].weatherCode}`,
      timeframe: stormHours.length > 0 ? `Next 24h · From ${firstHour}` : 'Active now',
      source: 'forecast-derived',
    });
  }

  // 2. High Temperature / Heat check
  const maxTemp24 = Math.max(current.temperature, ...hourly24.map((h) => h.temperature));
  const maxApparent24 = Math.max(current.apparentTemperature, ...hourly24.map((h) => h.apparentTemperature));
  if (maxTemp24 >= 35 || maxApparent24 >= 38) {
    alerts.push({
      id: 'alert-heat',
      category: 'heat',
      severity: 'warning',
      title: 'Extreme Heat Threshold',
      description: `Forecast temperatures peak near ${Math.round(maxTemp24)}°C (feels like ${Math.round(maxApparent24)}°C). Hydrate frequently and limit strenuous midday exertion.`,
      metricLabel: `Peak ${Math.round(maxTemp24)}°C / ${Math.round((maxTemp24 * 9) / 5 + 32)}°F`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  } else if (maxTemp24 >= 32 || maxApparent24 >= 34) {
    alerts.push({
      id: 'alert-heat-adv',
      category: 'heat',
      severity: 'advisory',
      title: 'High Temperature Advisory',
      description: `Warm conditions reaching ${Math.round(maxTemp24)}°C (feels like ${Math.round(maxApparent24)}°C) are forecast within the next 24 hours.`,
      metricLabel: `Peak ${Math.round(maxTemp24)}°C / ${Math.round((maxTemp24 * 9) / 5 + 32)}°F`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  }

  // 3. Freezing / Sub-zero check
  const minTemp24 = Math.min(current.temperature, ...hourly24.map((h) => h.temperature));
  if (minTemp24 <= -10) {
    alerts.push({
      id: 'alert-cold',
      category: 'cold',
      severity: 'warning',
      title: 'Severe Cold Threshold',
      description: `Temperatures are forecast to drop to ${Math.round(minTemp24)}°C. Wear insulated layers and watch for icy surfaces.`,
      metricLabel: `Low ${Math.round(minTemp24)}°C / ${Math.round((minTemp24 * 9) / 5 + 32)}°F`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  } else if (minTemp24 <= 0) {
    alerts.push({
      id: 'alert-cold-adv',
      category: 'cold',
      severity: 'advisory',
      title: 'Freezing Temperature Advisory',
      description: `Temperatures fall to ${Math.round(minTemp24)}°C over the next 24 hours, creating potential frost or slick pavement.`,
      metricLabel: `Low ${Math.round(minTemp24)}°C / ${Math.round((minTemp24 * 9) / 5 + 32)}°F`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  }

  // 4. Heavy Rain check
  const maxHourlyRain = Math.max(current.precipitation, ...hourly24.map((h) => h.precipitation));
  const total24hRain = hourly24.reduce((acc, h) => acc + h.precipitation, 0);
  const peakRainHour = hourly24.find((h) => h.precipitation >= 6);
  const todayRain = daily[0]?.precipitationSum ?? 0;
  if (maxHourlyRain >= 7.5 || total24hRain >= 30 || todayRain >= 35) {
    alerts.push({
      id: 'alert-rain',
      category: 'rain',
      severity: maxHourlyRain >= 12 || total24hRain >= 45 ? 'warning' : 'advisory',
      title: 'Heavy Rainfall Forecast',
      description: `Substantial rainfall is modeled (${total24hRain.toFixed(1)} mm over 24h, peaking at ${maxHourlyRain.toFixed(1)} mm/h${peakRainHour ? ` around ${formatHourShort(peakRainHour.time)}` : ''}). Plan for wet roads and reduced visibility.`,
      metricLabel: `${total24hRain.toFixed(1)} mm / 24h`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  }

  // 5. Strong Wind check
  const maxWind24 = Math.max(current.windSpeed, ...hourly24.map((h) => h.windSpeed));
  const maxGusts24 = Math.max(current.windGusts, ...hourly24.map((h) => h.windGusts));
  if (maxGusts24 >= 55 || maxWind24 >= 38) {
    alerts.push({
      id: 'alert-wind',
      category: 'wind',
      severity: maxGusts24 >= 75 || maxWind24 >= 55 ? 'warning' : 'advisory',
      title: 'Strong Wind Advisory',
      description: `Sustained winds up to ${Math.round(maxWind24)} km/h with gusts reaching ${Math.round(maxGusts24)} km/h are forecast. Secure loose outdoor items.`,
      metricLabel: `Gusts ${Math.round(maxGusts24)} km/h`,
      timeframe: 'Next 24 hours',
      source: 'forecast-derived',
    });
  }

  // 6. Very High UV check
  const maxUv24 = Math.max(current.uvIndex, ...hourly24.map((h) => h.uvIndex));
  if (maxUv24 >= 8 && hourly24.length > 0) {
    const peakUvHour = hourly24.reduce((best, h) => (h.uvIndex > best.uvIndex ? h : best), hourly24[0]);
    alerts.push({
      id: 'alert-uv',
      category: 'uv',
      severity: maxUv24 >= 11 ? 'warning' : 'advisory',
      title: maxUv24 >= 11 ? 'Extreme UV Exposure' : 'Very High UV Index',
      description: `UV index reaches ${maxUv24.toFixed(1)}${peakUvHour ? ` around ${formatHourShort(peakUvHour.time)}` : ''}. Broad-spectrum SPF 30+, hat, and sunglasses are strongly recommended.`,
      metricLabel: `Peak UV ${maxUv24.toFixed(1)}`,
      timeframe: 'Daylight hours',
      source: 'forecast-derived',
    });
  }

  return alerts;
}

const app = express();
app.use(express.json({ limit: '256kb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Geocoding proxy (Open-Meteo Geocoding API)
app.get('/api/geocode', async (req: Request, res: Response) => {
  const query = sanitizeText(req.query.q, 100);
  if (!query || query.length < 2) {
    res.status(400).json({ error: 'Please enter at least 2 characters to search for a city.' });
    return;
  }

  const cacheKey = query.toLowerCase();
  const cached = getCached(geocodeCache, cacheKey);
  if (cached) {
    res.json({ results: cached });
    return;
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const upstream = await fetch(url.toString(), {
      signal: AbortSignal.timeout(7000),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Location lookup failed (HTTP ${upstream.status}).` });
      return;
    }

    const data = (await upstream.json()) as {
      results?: Array<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        elevation?: number;
        country?: string;
        country_code?: string;
        admin1?: string;
        timezone?: string;
      }>;
    };

    const results: WeatherLocation[] = (data.results ?? []).map((item) => ({
      id: `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`,
      name: item.name,
      admin1: item.admin1,
      country: item.country,
      countryCode: item.country_code,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
      elevation: item.elevation,
    }));

    setCached(geocodeCache, cacheKey, results, 10 * 60 * 1000);
    res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach geocoding service.';
    res.status(502).json({ error: `Location search error: ${message}` });
  }
});

// Reverse geocoding for browser geolocation (races BigDataCloud & Nominatim for low latency)
app.get('/api/reverse-geocode', async (req: Request, res: Response) => {
  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lon = parseCoordinate(req.query.lon, -180, 180);

  if (lat === null || lon === null) {
    res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    return;
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = getCached(reverseCache, cacheKey);
  if (cached) {
    res.json({
      location: {
        ...cached,
        id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
        latitude: lat,
        longitude: lon,
      },
    });
    return;
  }

  const fromBigDataCloud = async (): Promise<WeatherLocation> => {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const resp = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) });
    if (!resp.ok) throw new Error(`BDC ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('json')) throw new Error('BDC non-json');
    const bdc = (await resp.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    };
    const name = bdc.city || bdc.locality || bdc.principalSubdivision;
    if (!name) throw new Error('BDC empty');
    return {
      id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
      name,
      admin1: bdc.principalSubdivision,
      country: bdc.countryName,
      countryCode: bdc.countryCode,
      latitude: lat,
      longitude: lon,
    };
  };

  const fromNominatim = async (): Promise<WeatherLocation> => {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`;
    const resp = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AtmosWeatherApp/1.0 (https://open-meteo.com)',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('json')) throw new Error('Nominatim non-json');
    const data = (await resp.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        suburb?: string;
        county?: string;
        state?: string;
        country?: string;
        country_code?: string;
      };
      name?: string;
    };
    const addr = data.address ?? {};
    const cityName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      data.name;
    if (!cityName) throw new Error('Nominatim empty');
    return {
      id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
      name: cityName,
      admin1: addr.state || addr.county,
      country: addr.country,
      countryCode: addr.country_code?.toUpperCase(),
      latitude: lat,
      longitude: lon,
    };
  };

  try {
    const location = await Promise.any([fromBigDataCloud(), fromNominatim()]);
    setCached(reverseCache, cacheKey, location, 30 * 60 * 1000);
    res.json({ location });
    return;
  } catch {
    res.json({
      location: {
        id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
        name: `Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        latitude: lat,
        longitude: lon,
      } satisfies WeatherLocation,
    });
  }
});

// Live weather forecast proxy (Open-Meteo Forecast API)
app.get('/api/weather', async (req: Request, res: Response) => {
  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lon = parseCoordinate(req.query.lon, -180, 180);

  if (lat === null || lon === null) {
    res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    return;
  }

  const name = sanitizeText(req.query.name, 100);
  const admin1 = sanitizeText(req.query.admin1, 100);
  const country = sanitizeText(req.query.country, 100);
  const countryCode = sanitizeText(req.query.countryCode, 10);
  const forceRefresh = req.query.refresh === '1';

  const weatherCacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!forceRefresh) {
    const cachedWeather = getCached(weatherCache, weatherCacheKey);
    if (cachedWeather) {
      res.json({
        ...cachedWeather,
        location: {
          ...cachedWeather.location,
          id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
          name:
            name && name !== 'Current Location'
              ? name
              : cachedWeather.location.name,
          admin1: admin1 ?? cachedWeather.location.admin1,
          country: country ?? cachedWeather.location.country,
          countryCode: countryCode ?? cachedWeather.location.countryCode,
        },
      });
      return;
    }
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
    );
    url.searchParams.set(
      'hourly',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'weather_code',
        'pressure_msl',
        'visibility',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'uv_index',
        'is_day',
      ].join(','),
    );
    url.searchParams.set(
      'daily',
      [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'uv_index_max',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
      ].join(','),
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('precipitation_unit', 'mm');

    const upstream = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      res.status(502).json({
        error: `Open-Meteo weather request failed (HTTP ${upstream.status}). ${detail.slice(0, 120)}`,
      });
      return;
    }

    const raw = (await upstream.json()) as {
      latitude: number;
      longitude: number;
      elevation: number;
      timezone: string;
      timezone_abbreviation: string;
      utc_offset_seconds: number;
      current: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        is_day: number;
        precipitation: number;
        rain: number;
        showers: number;
        snowfall: number;
        weather_code: number;
        cloud_cover: number;
        pressure_msl: number;
        surface_pressure: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        wind_gusts_10m: number;
      };
      hourly: {
        time: string[];
        temperature_2m: number[];
        relative_humidity_2m: number[];
        apparent_temperature: number[];
        precipitation_probability: number[];
        precipitation: number[];
        weather_code: number[];
        pressure_msl: number[];
        visibility: number[];
        wind_speed_10m: number[];
        wind_direction_10m: number[];
        wind_gusts_10m: number[];
        uv_index: number[];
        is_day: number[];
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        apparent_temperature_max: number[];
        apparent_temperature_min: number[];
        sunrise: string[];
        sunset: string[];
        uv_index_max: number[];
        precipitation_sum: number[];
        precipitation_probability_max: number[];
        wind_speed_10m_max: number[];
        wind_gusts_10m_max: number[];
      };
    };

    const currentHourPrefix = raw.current.time.slice(0, 13);
    const startIdxRaw = raw.hourly.time.findIndex((t) => t.startsWith(currentHourPrefix));
    const startIdx = startIdxRaw >= 0 ? startIdxRaw : 0;

    const currentVisibilityMeters = raw.hourly.visibility[startIdx] ?? 10000;
    const currentUv = raw.hourly.uv_index[startIdx] ?? 0;

    const current: CurrentWeatherData = {
      time: raw.current.time,
      temperature: raw.current.temperature_2m,
      apparentTemperature: raw.current.apparent_temperature,
      humidity: raw.current.relative_humidity_2m,
      isDay: raw.current.is_day === 1,
      precipitation: raw.current.precipitation,
      rain: raw.current.rain,
      showers: raw.current.showers,
      snowfall: raw.current.snowfall,
      weatherCode: raw.current.weather_code,
      cloudCover: raw.current.cloud_cover,
      pressureMsl: raw.current.pressure_msl,
      surfacePressure: raw.current.surface_pressure,
      windSpeed: raw.current.wind_speed_10m,
      windDirection: raw.current.wind_direction_10m,
      windGusts: raw.current.wind_gusts_10m,
      visibilityKm: Math.round((currentVisibilityMeters / 1000) * 10) / 10,
      uvIndex: Math.round(currentUv * 10) / 10,
    };

    const hourly: HourlyForecastItem[] = raw.hourly.time
      .slice(startIdx, startIdx + 24)
      .map((time, offset) => {
        const i = startIdx + offset;
        return {
          time,
          temperature: raw.hourly.temperature_2m[i],
          apparentTemperature: raw.hourly.apparent_temperature[i],
          humidity: raw.hourly.relative_humidity_2m[i],
          precipitationProbability: raw.hourly.precipitation_probability[i] ?? 0,
          precipitation: raw.hourly.precipitation[i] ?? 0,
          weatherCode: raw.hourly.weather_code[i],
          pressureMsl: raw.hourly.pressure_msl[i],
          visibilityKm: Math.round(((raw.hourly.visibility[i] ?? 10000) / 1000) * 10) / 10,
          windSpeed: raw.hourly.wind_speed_10m[i],
          windDirection: raw.hourly.wind_direction_10m[i],
          windGusts: raw.hourly.wind_gusts_10m[i] ?? raw.hourly.wind_speed_10m[i],
          uvIndex: Math.round((raw.hourly.uv_index[i] ?? 0) * 10) / 10,
          isDay: raw.hourly.is_day[i] === 1,
        };
      });

    const daily: DailyForecastItem[] = raw.daily.time.map((date, i) => ({
      date,
      weatherCode: raw.daily.weather_code[i],
      temperatureMax: raw.daily.temperature_2m_max[i],
      temperatureMin: raw.daily.temperature_2m_min[i],
      apparentTemperatureMax: raw.daily.apparent_temperature_max[i],
      apparentTemperatureMin: raw.daily.apparent_temperature_min[i],
      sunrise: raw.daily.sunrise[i],
      sunset: raw.daily.sunset[i],
      uvIndexMax: Math.round((raw.daily.uv_index_max[i] ?? 0) * 10) / 10,
      precipitationSum: Math.round((raw.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      precipitationProbabilityMax: raw.daily.precipitation_probability_max[i] ?? 0,
      windSpeedMax: raw.daily.wind_speed_10m_max[i],
      windGustsMax: raw.daily.wind_gusts_10m_max[i],
    }));

    const alerts = computeSmartAlerts(current, hourly, daily);

    const payload: WeatherResponse = {
      location: {
        id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
        name:
          (name && name !== 'Current Location' ? name : undefined) ||
          raw.timezone.split('/').pop()?.replace(/_/g, ' ') ||
          'Current Location',
        admin1,
        country,
        countryCode,
        latitude: raw.latitude,
        longitude: raw.longitude,
        timezone: raw.timezone,
        elevation: raw.elevation,
      },
      timezone: raw.timezone,
      timezoneAbbreviation: raw.timezone_abbreviation,
      utcOffsetSeconds: raw.utc_offset_seconds,
      elevation: raw.elevation,
      fetchedAt: new Date().toISOString(),
      current,
      hourly,
      daily,
      alerts,
    };

    setCached(weatherCache, weatherCacheKey, payload, 3 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to fetch weather forecast.';
    res.status(502).json({ error: `Weather data error: ${message}` });
  }
});

// Gemini AI Weather Insights endpoint (strictly grounded in provided Open-Meteo data)
app.post('/api/insights', async (req: Request, res: Response) => {
  const body = req.body as {
    weather?: WeatherResponse;
    unit?: TemperatureUnit;
  };

  if (!body?.weather || !body.weather.current || !Array.isArray(body.weather.hourly) || !Array.isArray(body.weather.daily)) {
    res.status(400).json({ error: 'Valid weather payload is required to generate insights.' });
    return;
  }

  const unit: TemperatureUnit = body.unit === 'F' ? 'F' : 'C';
  const w = body.weather;

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch {
    res.status(503).json({
      error: 'Gemini AI insights are unavailable because GEMINI_API_KEY is not configured in Settings > Secrets.',
    });
    return;
  }

  const formatT = (c: number) =>
    unit === 'F' ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
  const formatW = (kmh: number) =>
    unit === 'F' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`;

  const groundedContext = {
    location: `${w.location.name}${w.location.admin1 ? `, ${w.location.admin1}` : ''}${w.location.country ? `, ${w.location.country}` : ''}`,
    timezone: w.timezone,
    localObservationTime: w.current.time,
    preferredDisplayUnit: unit === 'F' ? 'Fahrenheit & mph' : 'Celsius & km/h',
    current: {
      temperature: formatT(w.current.temperature),
      feelsLike: formatT(w.current.apparentTemperature),
      weatherCode: w.current.weatherCode,
      humidityPercent: w.current.humidity,
      windSpeed: formatW(w.current.windSpeed),
      windDirectionDegrees: w.current.windDirection,
      windGusts: formatW(w.current.windGusts),
      pressureHpa: w.current.pressureMsl,
      visibilityKm: w.current.visibilityKm,
      uvIndex: w.current.uvIndex,
      cloudCoverPercent: w.current.cloudCover,
      isDay: w.current.isDay,
    },
    next24HoursSample: w.hourly.filter((_, idx) => idx % 3 === 0).map((h) => ({
      localTime: h.time,
      temp: formatT(h.temperature),
      feelsLike: formatT(h.apparentTemperature),
      precipProbPercent: h.precipitationProbability,
      precipMm: h.precipitation,
      wind: formatW(h.windSpeed),
      uv: h.uvIndex,
      weatherCode: h.weatherCode,
    })),
    next3Days: w.daily.slice(0, 3).map((d) => ({
      date: d.date,
      high: formatT(d.temperatureMax),
      low: formatT(d.temperatureMin),
      precipProbMaxPercent: d.precipitationProbabilityMax,
      precipSumMm: d.precipitationSum,
      uvMax: d.uvIndexMax,
      windMax: formatW(d.windSpeedMax),
    })),
    activeForecastAlerts: w.alerts.map((a) => `${a.title} (${a.metricLabel})`),
  };

  const force = Boolean((body as { force?: boolean }).force);
  const insightsCacheKey = `${w.location.latitude.toFixed(2)},${w.location.longitude.toFixed(2)},${unit},${w.current.time}`;
  if (!force) {
    const cachedInsights = getCached(insightsCache, insightsCacheKey);
    if (cachedInsights) {
      res.json(cachedInsights);
      return;
    }
  }

  const schemaConfig = {
    type: Type.OBJECT,
    properties: {
      conditionSummary: {
        type: Type.STRING,
        description:
          '2-3 sentences explaining current conditions (why it feels the way it does given temperature, humidity, wind, pressure) and key changes over the next 24 hours.',
      },
      clothingSuggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          '3 concise, specific wardrobe or gear recommendations grounded in the observed temperature, wind, UV index, and rain probability.',
      },
      outdoorActivity: {
        type: Type.OBJECT,
        properties: {
          verdict: {
            type: Type.STRING,
            description: 'Must be exactly one of: "Ideal", "Favorable", "Use Caution", "Not Recommended".',
          },
          bestWindow: {
            type: Type.STRING,
            description: 'Short recommended time window from the 24-hour forecast, e.g. "Late afternoon (3 PM – 6 PM)" or "Early morning before rain".',
          },
          explanation: {
            type: Type.STRING,
            description: '1-2 sentences explaining outdoor suitability using actual wind, rain probability, temperature, and UV values.',
          },
        },
        required: ['verdict', 'bestWindow', 'explanation'],
      },
      comfortNotes: {
        type: Type.STRING,
        description: '1 concise sentence noting visibility, humidity comfort, UV timing, or the upcoming 3-day shift.',
      },
    },
    required: ['conditionSummary', 'clothingSuggestions', 'outdoorActivity', 'comfortNotes'],
  };

  const promptText = `Analyze this verified Open-Meteo weather snapshot and produce practical, concise weather insights in ${unit === 'F' ? 'Fahrenheit/mph' : 'Celsius/km/h'} units:\n\n${JSON.stringify(groundedContext, null, 2)}`;
  const sysInstr =
    'You are an expert meteorologist for Atmos Weather. Strictly interpret ONLY the weather measurements and forecast values provided in the JSON payload. NEVER invent temperatures, rain amounts, UV levels, alerts, or events not present in the input. Keep prose crisp, practical, and direct—no filler, no hype, and no markdown formatting inside JSON string fields.';

  const modelPlans: Array<{ model: string; thinkingLevel: ThinkingLevel; timeoutMs: number }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 8000 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 10000 },
  ];

  try {
    let response;
    let usedModel = modelPlans[0].model;
    let lastErr: unknown;

    for (const plan of modelPlans) {
      try {
        response = await ai.models.generateContent({
          model: plan.model,
          contents: promptText,
          config: {
            abortSignal: AbortSignal.timeout(plan.timeoutMs),
            thinkingConfig: { thinkingLevel: plan.thinkingLevel },
            systemInstruction: sysInstr,
            responseMimeType: 'application/json',
            responseSchema: schemaConfig,
          },
        });
        usedModel = plan.model;
        lastErr = undefined;
        break;
      } catch (attemptErr) {
        lastErr = attemptErr;
        const errText = attemptErr instanceof Error ? attemptErr.message : '';
        if (
          errText.includes('403') ||
          errText.includes('PERMISSION_DENIED') ||
          errText.includes('API_KEY_INVALID') ||
          errText.includes('429') ||
          errText.includes('RESOURCE_EXHAUSTED')
        ) {
          throw attemptErr;
        }
      }
    }

    if (lastErr) {
      throw lastErr;
    }

    const rawText = (response?.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
      return;
    }

    const parsed = JSON.parse(rawText) as Omit<WeatherInsightsResponse, 'generatedAt' | 'model'>;
    const validVerdicts = new Set(['Ideal', 'Favorable', 'Use Caution', 'Not Recommended']);
    const verdict = validVerdicts.has(parsed.outdoorActivity?.verdict)
      ? parsed.outdoorActivity.verdict
      : 'Favorable';

    const result: WeatherInsightsResponse = {
      conditionSummary: parsed.conditionSummary,
      clothingSuggestions: Array.isArray(parsed.clothingSuggestions) ? parsed.clothingSuggestions.slice(0, 4) : [],
      outdoorActivity: {
        verdict,
        bestWindow: parsed.outdoorActivity?.bestWindow || 'Daytime hours',
        explanation: parsed.outdoorActivity?.explanation || '',
      },
      comfortNotes: parsed.comfortNotes,
      generatedAt: new Date().toISOString(),
      model: usedModel,
    };

    setCached(insightsCache, insightsCacheKey, result, 15 * 60 * 1000);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate weather insights.';
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      res.status(403).json({
        error: 'Gemini API key permission denied or invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error: 'Gemini API rate limit reached. Please wait a moment and click Retry.',
      });
      return;
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
      res.status(503).json({
        error: 'Gemini AI service is temporarily experiencing high demand. Click Retry in a few seconds.',
      });
      return;
    }
    if (msg.includes('TimeoutError') || msg.includes('aborted')) {
      res.status(504).json({
        error: 'Weather insights request timed out. Please click Retry.',
      });
      return;
    }
    res.status(502).json({ error: 'Unable to generate AI weather insights right now. Please click Retry.' });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*path}', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atmos Weather server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Atmos Weather server:', err);
  process.exit(1);
});

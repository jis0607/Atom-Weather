import type {
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  SmartWeatherAlert,
  TemperatureUnit,
  WeatherInsightsResponse,
  WeatherLocation,
  WeatherResponse,
} from '../types/weather.ts';

async function safeJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

export function computeClientSmartAlerts(
  current: CurrentWeatherData,
  hourly24: HourlyForecastItem[],
  daily: DailyForecastItem[],
): SmartWeatherAlert[] {
  const alerts: SmartWeatherAlert[] = [];

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

export async function searchCities(query: string, signal?: AbortSignal): Promise<WeatherLocation[]> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
    const data = await safeJson<{ results?: WeatherLocation[]; error?: string }>(res);
    if (res.ok && data && Array.isArray(data.results)) {
      return data.results;
    }
    if (!res.ok && data?.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
  }

  // Fallback directly to Open-Meteo Geocoding CORS API if backend proxy is unavailable
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const directRes = await fetch(url.toString(), { signal });
  if (!directRes.ok) {
    throw new Error(`City search failed (HTTP ${directRes.status}).`);
  }
  const directData = (await directRes.json()) as {
    results?: Array<{
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
  return (directData.results ?? []).map((item) => ({
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
}

export async function reverseGeocodeCoords(lat: number, lon: number): Promise<WeatherLocation> {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLon = Math.round(lon * 10000) / 10000;
  const id = `${roundedLat.toFixed(4)},${roundedLon.toFixed(4)}`;

  try {
    const res = await fetch(`/api/reverse-geocode?lat=${roundedLat}&lon=${roundedLon}`);
    const data = await safeJson<{ location?: WeatherLocation }>(res);
    if (res.ok && data?.location?.name) {
      return data.location;
    }
  } catch {
    // Fall through to direct BigDataCloud lookup
  }

  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLon}&localityLanguage=en`,
    );
    if (bdcRes.ok) {
      const bdc = (await bdcRes.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      };
      const name = bdc.city || bdc.locality || bdc.principalSubdivision;
      if (name) {
        return {
          id,
          name,
          admin1: bdc.principalSubdivision,
          country: bdc.countryName,
          countryCode: bdc.countryCode,
          latitude: roundedLat,
          longitude: roundedLon,
        };
      }
    }
  } catch {
    // Fall through to coordinate fallback
  }

  return {
    id,
    name: 'Current Location',
    latitude: roundedLat,
    longitude: roundedLon,
  };
}

export async function fetchWeatherForLocation(
  loc: WeatherLocation,
  options?: { signal?: AbortSignal; forceRefresh?: boolean },
): Promise<WeatherResponse> {
  try {
    const params = new URLSearchParams({
      lat: String(loc.latitude),
      lon: String(loc.longitude),
      name: loc.name,
    });
    if (loc.admin1) params.set('admin1', loc.admin1);
    if (loc.country) params.set('country', loc.country);
    if (loc.countryCode) params.set('countryCode', loc.countryCode);
    if (options?.forceRefresh) params.set('refresh', '1');

    const res = await fetch(`/api/weather?${params.toString()}`, { signal: options?.signal });
    const data = await safeJson<WeatherResponse & { error?: string }>(res);
    if (res.ok && data && data.current && Array.isArray(data.hourly) && Array.isArray(data.daily)) {
      return data;
    }
    if (res.status === 400 && data?.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
  }

  // Direct CORS-enabled Open-Meteo fallback so weather never breaks if backend proxy blips
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(loc.latitude));
  url.searchParams.set('longitude', String(loc.longitude));
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

  const directRes = await fetch(url.toString(), { signal: options?.signal });
  if (!directRes.ok) {
    throw new Error(`Unable to fetch weather forecast (HTTP ${directRes.status}).`);
  }

  const raw = (await directRes.json()) as {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
    timezone_abbreviation: string;
    utc_offset_seconds: number;
    current: Record<string, number | string> & { time: string };
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

  const current: CurrentWeatherData = {
    time: raw.current.time,
    temperature: Number(raw.current.temperature_2m),
    apparentTemperature: Number(raw.current.apparent_temperature),
    humidity: Number(raw.current.relative_humidity_2m),
    isDay: Number(raw.current.is_day) === 1,
    precipitation: Number(raw.current.precipitation),
    rain: Number(raw.current.rain),
    showers: Number(raw.current.showers),
    snowfall: Number(raw.current.snowfall),
    weatherCode: Number(raw.current.weather_code),
    cloudCover: Number(raw.current.cloud_cover),
    pressureMsl: Number(raw.current.pressure_msl),
    surfacePressure: Number(raw.current.surface_pressure),
    windSpeed: Number(raw.current.wind_speed_10m),
    windDirection: Number(raw.current.wind_direction_10m),
    windGusts: Number(raw.current.wind_gusts_10m),
    visibilityKm: Math.round(((raw.hourly.visibility[startIdx] ?? 10000) / 1000) * 10) / 10,
    uvIndex: Math.round((raw.hourly.uv_index[startIdx] ?? 0) * 10) / 10,
  };

  const hourly: HourlyForecastItem[] = raw.hourly.time.slice(startIdx, startIdx + 24).map((time, offset) => {
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

  const alerts = computeClientSmartAlerts(current, hourly, daily);
  const resolvedName =
    loc.name && loc.name !== 'Current Location'
      ? loc.name
      : raw.timezone.split('/').pop()?.replace(/_/g, ' ') || 'Current Location';

  return {
    location: {
      ...loc,
      name: resolvedName,
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
}

export async function fetchGeminiInsights(
  weather: WeatherResponse,
  unit: TemperatureUnit,
  options?: { signal?: AbortSignal; force?: boolean },
): Promise<WeatherInsightsResponse> {
  const res = await fetch('/api/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weather, unit, force: Boolean(options?.force) }),
    signal: options?.signal,
  });

  const data = await safeJson<WeatherInsightsResponse & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error || `Unable to generate AI weather insights (HTTP ${res.status}).`);
  }
  if (!data || !data.conditionSummary) {
    throw new Error('Weather insights service returned an unexpected response.');
  }
  return data;
}

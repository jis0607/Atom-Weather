export type TemperatureUnit = 'C' | 'F';
export type ThemeMode = 'dark' | 'light';

export type WeatherCategory =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm';

export interface WeatherLocation {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  elevation?: number;
}

export interface CurrentWeatherData {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  isDay: boolean;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressureMsl: number;
  surfacePressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  visibilityKm: number;
  uvIndex: number;
}

export interface HourlyForecastItem {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  pressureMsl: number;
  visibilityKm: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  isDay: boolean;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  apparentTemperatureMax: number;
  apparentTemperatureMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
}

export type AlertSeverity = 'advisory' | 'warning';
export type AlertCategory = 'heat' | 'cold' | 'rain' | 'wind' | 'uv' | 'storm';

export interface SmartWeatherAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricLabel: string;
  timeframe: string;
  source: 'forecast-derived';
}

export interface WeatherResponse {
  location: WeatherLocation;
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
  elevation: number;
  fetchedAt: string;
  current: CurrentWeatherData;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  alerts: SmartWeatherAlert[];
}

export interface WeatherInsightsResponse {
  conditionSummary: string;
  clothingSuggestions: string[];
  outdoorActivity: {
    verdict: 'Ideal' | 'Favorable' | 'Use Caution' | 'Not Recommended';
    bestWindow: string;
    explanation: string;
  };
  comfortNotes: string;
  generatedAt: string;
  model: string;
}

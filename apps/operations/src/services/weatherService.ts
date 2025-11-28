/**
 * Weather Service for capturing weather conditions at incident locations
 * Uses Google Weather API to fetch weather data based on coordinates and date/time
 */

export interface WeatherData {
  captured_at: string;
  temperature_c: number | null;
  feels_like_c: number | null;
  humidity_percent: number | null;
  conditions: string | null;
  conditions_code: string | null;
  wind_speed_kmh: number | null;
  wind_direction: string | null;
  wind_gust_kmh: number | null;
  precipitation_mm: number | null;
  uv_index: number | null;
  visibility_km: number | null;
  pressure_hpa: number | null;
  cloud_cover_percent: number | null;
  source: string;
  location: {
    latitude: number;
    longitude: number;
    timezone?: string;
  };
  incident_date?: string;
  incident_time?: string;
  is_historical?: boolean;
}

interface GoogleWeatherResponse {
  currentConditions?: {
    temperature?: { value: number; units: string };
    feelsLike?: { value: number; units: string };
    humidity?: { value: number };
    weatherCondition?: { description: { text: string }; type: string };
    wind?: { 
      speed?: { value: number; units: string };
      direction?: { cardinal: string; degrees: number };
      gust?: { value: number; units: string };
    };
    precipitation?: { value: number; units: string };
    uvIndex?: { value: number };
    visibility?: { value: number; units: string };
    pressure?: { value: number; units: string };
    cloudCover?: { value: number };
  };
  forecastHourly?: Array<{
    forecastStart: string;
    temperature?: { value: number };
    humidity?: { value: number };
    weatherCondition?: { description: { text: string }; type: string };
    wind?: { speed?: { value: number }; direction?: { cardinal: string } };
    precipitation?: { value: number };
  }>;
}

const GOOGLE_WEATHER_API_URL = 'https://weather.googleapis.com/v1/currentConditions:lookup';
const GOOGLE_WEATHER_FORECAST_URL = 'https://weather.googleapis.com/v1/forecast:lookup';

/**
 * Fetch current weather conditions for a location
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google API key not found. Weather data will not be captured.');
    return null;
  }

  try {
    const response = await fetch(
      `${GOOGLE_WEATHER_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude,
            longitude,
          },
          languageCode: 'en-AU',
          unitsSystem: 'METRIC',
        }),
      }
    );

    if (!response.ok) {
      console.error('Weather API error:', response.status, await response.text());
      return null;
    }

    const data: GoogleWeatherResponse = await response.json();
    
    if (!data.currentConditions) {
      console.warn('No current conditions in weather response');
      return null;
    }

    const current = data.currentConditions;

    return {
      captured_at: new Date().toISOString(),
      temperature_c: current.temperature?.value ?? null,
      feels_like_c: current.feelsLike?.value ?? null,
      humidity_percent: current.humidity?.value ?? null,
      conditions: current.weatherCondition?.description?.text ?? null,
      conditions_code: current.weatherCondition?.type ?? null,
      wind_speed_kmh: current.wind?.speed?.value ?? null,
      wind_direction: current.wind?.direction?.cardinal ?? null,
      wind_gust_kmh: current.wind?.gust?.value ?? null,
      precipitation_mm: current.precipitation?.value ?? null,
      uv_index: current.uvIndex?.value ?? null,
      visibility_km: current.visibility?.value ?? null,
      pressure_hpa: current.pressure?.value ?? null,
      cloud_cover_percent: current.cloudCover?.value ?? null,
      source: 'google_weather_api',
      location: {
        latitude,
        longitude,
      },
      is_historical: false,
    };
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return null;
  }
}

/**
 * Fetch weather for a specific incident date/time
 * If the incident is from today, uses current conditions
 * For recent past (within forecast range), attempts to use forecast data
 * For historical dates, marks the data as unavailable
 */
export async function fetchWeatherForIncident(
  latitude: number,
  longitude: number,
  incidentDate: string,
  incidentTime?: string
): Promise<WeatherData | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google API key not found. Weather data will not be captured.');
    return null;
  }

  // Parse incident date/time
  const incidentDateTime = incidentTime 
    ? new Date(`${incidentDate}T${incidentTime}`)
    : new Date(incidentDate);
  
  const now = new Date();
  const hoursDiff = (now.getTime() - incidentDateTime.getTime()) / (1000 * 60 * 60);

  // If incident is within the last 24 hours, use current weather as approximation
  // Google Weather API doesn't provide true historical data, but this is better than nothing
  if (hoursDiff < 24 && hoursDiff >= 0) {
    const weather = await fetchCurrentWeather(latitude, longitude);
    if (weather) {
      weather.incident_date = incidentDate;
      weather.incident_time = incidentTime || undefined;
      weather.is_historical = hoursDiff > 1; // Mark as potentially not exact if > 1 hour ago
    }
    return weather;
  }

  // For future dates (shouldn't happen but handle gracefully)
  if (hoursDiff < 0) {
    const weather = await fetchCurrentWeather(latitude, longitude);
    if (weather) {
      weather.incident_date = incidentDate;
      weather.incident_time = incidentTime || undefined;
      weather.is_historical = true;
    }
    return weather;
  }

  // For older incidents, try to fetch hourly forecast and note it's historical
  // The Google Weather API may have limited historical support
  try {
    const response = await fetch(
      `${GOOGLE_WEATHER_FORECAST_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude,
            longitude,
          },
          languageCode: 'en-AU',
          unitsSystem: 'METRIC',
          days: 1, // Request minimal forecast
        }),
      }
    );

    if (!response.ok) {
      // Forecast API failed, try current as fallback
      console.warn('Forecast API unavailable, using current conditions as reference');
      const weather = await fetchCurrentWeather(latitude, longitude);
      if (weather) {
        weather.incident_date = incidentDate;
        weather.incident_time = incidentTime || undefined;
        weather.is_historical = true;
      }
      return weather;
    }

    const data: GoogleWeatherResponse = await response.json();
    
    // Try to find the closest hourly forecast
    if (data.forecastHourly && data.forecastHourly.length > 0) {
      const closest = data.forecastHourly[0];
      return {
        captured_at: new Date().toISOString(),
        temperature_c: closest.temperature?.value ?? null,
        feels_like_c: null,
        humidity_percent: closest.humidity?.value ?? null,
        conditions: closest.weatherCondition?.description?.text ?? null,
        conditions_code: closest.weatherCondition?.type ?? null,
        wind_speed_kmh: closest.wind?.speed?.value ?? null,
        wind_direction: closest.wind?.direction?.cardinal ?? null,
        wind_gust_kmh: null,
        precipitation_mm: closest.precipitation?.value ?? null,
        uv_index: null,
        visibility_km: null,
        pressure_hpa: null,
        cloud_cover_percent: null,
        source: 'google_weather_api_forecast',
        location: {
          latitude,
          longitude,
        },
        incident_date: incidentDate,
        incident_time: incidentTime || undefined,
        is_historical: true,
      };
    }
  } catch (error) {
    console.error('Failed to fetch forecast weather data:', error);
  }

  // Final fallback - return current conditions with historical flag
  const weather = await fetchCurrentWeather(latitude, longitude);
  if (weather) {
    weather.incident_date = incidentDate;
    weather.incident_time = incidentTime || undefined;
    weather.is_historical = true;
  }
  return weather;
}

/**
 * Format weather data for display
 */
export function formatWeatherSummary(weather: WeatherData | null): string {
  if (!weather) return 'Weather data not available';

  const parts: string[] = [];
  
  if (weather.conditions) {
    parts.push(weather.conditions);
  }
  
  if (weather.temperature_c !== null) {
    parts.push(`${weather.temperature_c}°C`);
  }
  
  if (weather.humidity_percent !== null) {
    parts.push(`${weather.humidity_percent}% humidity`);
  }
  
  if (weather.wind_speed_kmh !== null) {
    const windStr = weather.wind_direction 
      ? `${weather.wind_speed_kmh} km/h ${weather.wind_direction}`
      : `${weather.wind_speed_kmh} km/h wind`;
    parts.push(windStr);
  }

  if (weather.is_historical) {
    parts.push('(approximate)');
  }

  return parts.join(', ') || 'Weather data not available';
}

export default {
  fetchCurrentWeather,
  fetchWeatherForIncident,
  formatWeatherSummary,
};


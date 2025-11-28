import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Thermometer, 
  Eye, 
  Sun,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  AlertTriangle
} from "lucide-react";
import type { WeatherData } from "@/services/weatherService";

interface WeatherDisplayProps {
  weatherData: WeatherData | null;
  className?: string;
  compact?: boolean;
}

// Map weather conditions to icons
function getWeatherIcon(conditionsCode: string | null) {
  if (!conditionsCode) return Cloud;
  
  const code = conditionsCode.toLowerCase();
  if (code.includes('rain') || code.includes('shower')) return CloudRain;
  if (code.includes('snow') || code.includes('sleet')) return CloudSnow;
  if (code.includes('fog') || code.includes('mist')) return CloudFog;
  if (code.includes('thunder') || code.includes('storm')) return CloudLightning;
  if (code.includes('clear') || code.includes('sunny')) return Sun;
  return Cloud;
}

export function WeatherDisplay({ weatherData, className, compact = false }: WeatherDisplayProps) {
  if (!weatherData) {
    return null;
  }

  const WeatherIcon = getWeatherIcon(weatherData.conditions_code);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <WeatherIcon className="h-4 w-4" />
        <span>
          {weatherData.conditions && `${weatherData.conditions}, `}
          {weatherData.temperature_c !== null && `${weatherData.temperature_c}°C`}
          {weatherData.is_historical && ' (approx)'}
        </span>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <WeatherIcon className="h-5 w-5" />
          Weather Conditions
          {weatherData.is_historical && (
            <Badge variant="outline" className="ml-2 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Approximate
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Temperature */}
          {weatherData.temperature_c !== null && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-lg font-semibold">{weatherData.temperature_c}°C</div>
                {weatherData.feels_like_c !== null && (
                  <div className="text-xs text-muted-foreground">
                    Feels like {weatherData.feels_like_c}°C
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conditions */}
          {weatherData.conditions && (
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">{weatherData.conditions}</div>
                {weatherData.cloud_cover_percent !== null && (
                  <div className="text-xs text-muted-foreground">
                    {weatherData.cloud_cover_percent}% cloud cover
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Humidity */}
          {weatherData.humidity_percent !== null && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-500" />
              <div>
                <div className="font-medium">{weatherData.humidity_percent}%</div>
                <div className="text-xs text-muted-foreground">Humidity</div>
              </div>
            </div>
          )}

          {/* Wind */}
          {weatherData.wind_speed_kmh !== null && (
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">
                  {weatherData.wind_speed_kmh} km/h
                  {weatherData.wind_direction && ` ${weatherData.wind_direction}`}
                </div>
                {weatherData.wind_gust_kmh !== null && (
                  <div className="text-xs text-muted-foreground">
                    Gusts {weatherData.wind_gust_kmh} km/h
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UV Index */}
          {weatherData.uv_index !== null && (
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="font-medium">UV {weatherData.uv_index}</div>
                <div className="text-xs text-muted-foreground">
                  {weatherData.uv_index <= 2 ? 'Low' : 
                   weatherData.uv_index <= 5 ? 'Moderate' :
                   weatherData.uv_index <= 7 ? 'High' :
                   weatherData.uv_index <= 10 ? 'Very High' : 'Extreme'}
                </div>
              </div>
            </div>
          )}

          {/* Visibility */}
          {weatherData.visibility_km !== null && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <div>
                <div className="font-medium">{weatherData.visibility_km} km</div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </div>
          )}

          {/* Precipitation */}
          {weatherData.precipitation_mm !== null && weatherData.precipitation_mm > 0 && (
            <div className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">{weatherData.precipitation_mm} mm</div>
                <div className="text-xs text-muted-foreground">Precipitation</div>
              </div>
            </div>
          )}
        </div>

        {/* Source and timestamp */}
        <div className="mt-4 pt-2 border-t text-xs text-muted-foreground">
          <span>Data source: {weatherData.source.replace(/_/g, ' ')}</span>
          {weatherData.captured_at && (
            <span className="ml-2">
              • Captured: {new Date(weatherData.captured_at).toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherDisplay;


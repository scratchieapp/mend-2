import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map as MapIcon, Navigation, Phone, Cloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSitesMap, SiteLocation } from "@/components/maps/GoogleSitesMap";
import { WeatherDisplay } from "@/components/incidents/WeatherDisplay";
import { fetchCurrentWeather, WeatherData } from "@/services/weatherService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Component to lazily load weather data
const LazyWeatherDisplay = ({ lat, lng, address }: { lat?: number; lng?: number; address?: string }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadWeather = async () => {
    if (loaded || loading || !lat || !lng) return;
    
    setLoading(true);
    try {
      const data = await fetchCurrentWeather(lat, lng);
      setWeather(data);
      setLoaded(true);
    } catch (error) {
      console.error("Failed to load weather", error);
    } finally {
      setLoading(false);
    }
  };

  if (!lat || !lng) return null;

  return (
    <div 
      onMouseEnter={loadWeather}
      className="mt-2 min-h-[24px]"
    >
      {!loaded && !loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary">
          <Cloud className="h-4 w-4" />
          <span>Hover to check weather</span>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Cloud className="h-4 w-4" />
          <span>Loading weather...</span>
        </div>
      )}

      {weather && (
        <WeatherDisplay weatherData={weather} compact={true} className="p-0 border-0 shadow-none" />
      )}
    </div>
  );
};

export default function PublicDashboard() {
  const navigate = useNavigate();
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  // Get employer_id from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const employerIdParam = searchParams.get('employer_id');
  const employerId = employerIdParam ? parseInt(employerIdParam) : null;

  // Fetch public sites
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['public-sites', employerId],
    queryFn: async () => {
      let query = supabase
        .from('sites')
        .select('id, name, street_address, city, state, post_code, latitude, longitude')
        .eq('is_active', true);
      
      if (employerId) {
        query = query.eq('employer_id', employerId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Map to SiteLocation interface
      return (data || []).map(site => ({
        site_id: site.id,
        site_name: site.name, // Changed from site_name to name based on schema
        street_address: site.street_address,
        city: site.city,
        state: site.state,
        post_code: site.post_code,
        latitude: site.latitude,
        longitude: site.longitude,
        status: 'working' // Default to working since we filter by is_active
      })) as SiteLocation[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleLogin = () => {
    navigate('/auth/login');
  };

  const handleRegister = () => {
    // Assuming there's a registration page or redirect to login
    navigate('/auth/signup'); 
  };

  const handleReportIncident = (siteId: number) => {
    // Redirect to login with site context (could be query param)
    navigate(`/auth/login?redirect=/incident-report&site_id=${siteId}`);
  };

  const handleSiteClick = (site: SiteLocation) => {
    setSelectedSiteId(site.site_id);
    // Scroll site into view in the list
    const element = document.getElementById(`site-card-${site.site_id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="flex-none flex justify-between items-center p-4 bg-white shadow-sm z-20 border-b relative">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xl">
            M
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">Mend Platform</h1>
            <p className="text-xs text-muted-foreground mt-1">Safety & Injury Management Portal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Phone className="h-4 w-4" />
            <span>Emergency: 1800 555 000</span>
          </div>
          
          <Button variant="outline" onClick={handleRegister} className="hidden sm:flex">
            Register
          </Button>
          <Button onClick={handleLogin}>
            Worker Login
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: Site List */}
        <div className="w-full md:w-1/3 lg:w-[400px] bg-white border-r flex flex-col z-10 shadow-xl md:shadow-none absolute md:relative h-full transform transition-transform duration-300 ease-in-out md:translate-x-0 overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h2 className="text-lg font-semibold mb-1">Active Sites</h2>
            <p className="text-sm text-muted-foreground">
              Select a site for details or to report an incident.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading && (
              <div className="text-center p-8 text-muted-foreground">
                Loading sites...
              </div>
            )}

            {/* Error State - gracefully degrade to empty state for public view */}
            {error && (
              <div className="text-center p-8 space-y-4">
                 <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Unable to load sites</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    We couldn't retrieve the site list at this moment. 
                  </p>
                </div>
                <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded-md inline-block">
                  <p className="font-medium flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    Need to report an incident?
                  </p>
                  <p className="mt-1">Call 1800 555 000 for assistance.</p>
                </div>
              </div>
            )}

            {!isLoading && !error && sites?.length === 0 && (
              <div className="text-center p-8 space-y-4">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <MapIcon className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">No active sites found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    This builder may just be getting started or has no currently active sites publicly listed.
                  </p>
                </div>
                <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded-md inline-block">
                  <p className="font-medium flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    Need to report an incident?
                  </p>
                  <p className="mt-1">Call 1800 555 000 for assistance.</p>
                </div>
              </div>
            )}

            {sites?.map(site => (
              <Card 
                key={site.site_id} 
                id={`site-card-${site.site_id}`}
                className={`transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 ${selectedSiteId === site.site_id ? 'border-l-primary ring-1 ring-primary/20' : 'border-l-transparent'}`}
                onClick={() => handleSiteClick(site)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base">{site.site_name}</h3>
                    {site.status && (
                      <Badge variant="outline" className="capitalize text-[10px] h-5">
                        {site.status}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3 flex items-start gap-1.5">
                    <MapIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {site.street_address && <>{site.street_address},<br/></>}
                      {site.city}, {site.state} {site.post_code}
                    </span>
                  </p>
                  
                  <LazyWeatherDisplay 
                    lat={site.latitude} 
                    lng={site.longitude} 
                    address={`${site.street_address}, ${site.city}`}
                  />

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://maps.google.com/?q=${encodeURIComponent((site.street_address ? site.street_address + ', ' : '') + site.city + ', ' + site.state)}`, '_blank');
                      }}
                    >
                      <Navigation className="h-3 w-3 mr-1.5" />
                      Directions
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportIncident(site.site_id);
                      }}
                    >
                      Report Incident
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Links */}
          <div className="p-4 border-t bg-slate-50 text-xs text-muted-foreground flex gap-4 justify-center">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Safety Handbook</a>
            <a href="#" className="hover:underline">Support</a>
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 relative bg-slate-100">
          <GoogleSitesMap 
            sites={error ? [] : (sites || [])} 
            mode="public" 
            height="100%" 
            className="h-full w-full border-0 rounded-none"
            onSiteClick={handleSiteClick}
          />
        </div>
      </div>
    </div>
  );
}

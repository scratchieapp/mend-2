import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Map as MapIcon, 
  Navigation, 
  Phone, 
  Cloud, 
  AlertTriangle, 
  Sun, 
  Thermometer, 
  Wind, 
  FileText, 
  Shield, 
  Clock,
  HelpCircle,
  X,
  ChevronRight,
  Mic
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSitesMap, SiteLocation } from "@/components/maps/GoogleSitesMap";
import { WeatherDisplay } from "@/components/incidents/WeatherDisplay";
import { fetchCurrentWeather, WeatherData } from "@/services/weatherService";
import { useAuth } from "@/lib/auth/AuthContext";

// Emergency phone number - 24/7 incident reporting line
const EMERGENCY_PHONE = "02 9136 2358";
const EMERGENCY_PHONE_LINK = "tel:+61291362358";

// Weather component that loads automatically when site is selected
const SiteWeather = ({ lat, lng, siteName }: { lat?: number; lng?: number; siteName: string }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;
    
    setLoading(true);
    setError(false);
    
    fetchCurrentWeather(lat, lng)
      .then(data => {
        setWeather(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load weather", err);
        setError(true);
        setLoading(false);
      });
  }, [lat, lng]);

  if (!lat || !lng) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
      <h4 className="font-medium text-sm text-blue-800 mb-2 flex items-center gap-2">
        <Cloud className="h-4 w-4" />
        Current Weather at {siteName}
      </h4>
      
      {loading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse">
          <Sun className="h-4 w-4" />
          <span>Loading weather...</span>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-blue-600">Weather data unavailable</p>
      )}

      {weather && !loading && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{Math.round(weather.temperature)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <span>{weather.description}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-500" />
            <span>{Math.round(weather.windSpeed)} km/h</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Lazy weather for list items
const LazyWeatherDisplay = ({ lat, lng }: { lat?: number; lng?: number }) => {
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-primary">
          <Cloud className="h-3.5 w-3.5" />
          <span>Hover for weather</span>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Cloud className="h-3.5 w-3.5" />
          <span>Loading...</span>
        </div>
      )}

      {weather && (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3 w-3 text-orange-500" />
            {Math.round(weather.temperature)}°C
          </span>
          <span className="text-muted-foreground">{weather.description}</span>
        </div>
      )}
    </div>
  );
};

export default function PublicDashboard() {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState<SiteLocation | null>(null);
  const { isAuthenticated, userData } = useAuth();

  // Get employer_id from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const employerIdParam = searchParams.get('employer_id');
  
  const [employerId, setEmployerId] = useState<number | null>(
    employerIdParam ? parseInt(employerIdParam) : null
  );

  useEffect(() => {
    if (isAuthenticated && userData?.employer_id) {
      setEmployerId(parseInt(userData.employer_id));
    } else if (employerIdParam) {
      setEmployerId(parseInt(employerIdParam));
    }
  }, [isAuthenticated, userData, employerIdParam]);

  // Fetch sites using RBAC RPC
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['public-sites', employerId, userData?.role_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sites_rbac', { 
        p_employer_id: employerId,
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });
      
      if (error) {
        console.error('Error fetching sites:', error);
        throw error;
      }
      
      return (data || []).map(site => ({
        site_id: site.site_id,
        site_name: site.site_name,
        street_address: site.street_address,
        city: site.city,
        state: site.state,
        post_code: site.post_code,
        latitude: site.latitude,
        longitude: site.longitude,
        status: site.status,
        employer_name: site.employer_name,
        incident_count: site.incident_count
      })) as (SiteLocation & { employer_name?: string; incident_count?: number })[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!(userData?.role_id)
  });

  const handleLogin = () => navigate('/auth/login');
  const handleReportIncident = (siteId?: number) => {
    if (isAuthenticated) {
      navigate(siteId ? `/incident-report?site_id=${siteId}` : '/incident-report');
    } else {
      navigate(`/auth/login?redirect=/incident-report${siteId ? `&site_id=${siteId}` : ''}`);
    }
  };

  const handleSiteClick = (site: SiteLocation) => {
    setSelectedSite(site);
    // Scroll site into view in the list
    const element = document.getElementById(`site-card-${site.site_id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="flex-none flex justify-between items-center p-4 bg-white shadow-sm z-20 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xl">
            M
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">Mend Platform</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {userData?.employer_name || 'Safety & Injury Management'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Emergency Call Button */}
          <a 
            href={EMERGENCY_PHONE_LINK}
            className="hidden md:flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{EMERGENCY_PHONE}</span>
            <Badge variant="secondary" className="text-[10px] ml-1">24/7</Badge>
          </a>
          
          {/* Mobile emergency button */}
          <a 
            href={EMERGENCY_PHONE_LINK}
            className="md:hidden flex items-center justify-center h-10 w-10 bg-red-50 text-red-700 rounded-full hover:bg-red-100"
          >
            <Phone className="h-5 w-5" />
          </a>
          
          {!isAuthenticated && (
            <Button onClick={handleLogin}>
              Login
            </Button>
          )}
          {isAuthenticated && (
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: Site List + Info */}
        <div className="w-full md:w-[420px] bg-white border-r flex flex-col z-10 shadow-xl md:shadow-none absolute md:relative h-full">
          
          {/* Quick Actions Header */}
          <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => handleReportIncident()}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Report Incident</span>
              </Button>
              <a href={EMERGENCY_PHONE_LINK} className="contents">
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1 bg-white">
                  <Phone className="h-5 w-5 text-red-500" />
                  <span className="text-xs">Call Mend</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Site List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b bg-slate-50/50 sticky top-0 z-10">
              <h3 className="font-medium flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Your Work Sites
                {sites && <Badge variant="secondary" className="ml-auto">{sites.length}</Badge>}
              </h3>
            </div>
            
            <div className="p-3 space-y-3">
              {isLoading && (
                <div className="text-center p-8 text-muted-foreground">
                  Loading sites...
                </div>
              )}

              {error && (
                <div className="text-center p-6 space-y-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <div>
                    <p className="font-medium">Unable to load sites</p>
                    <p className="text-sm text-muted-foreground">Please try refreshing</p>
                  </div>
                  <a href={EMERGENCY_PHONE_LINK} className="block">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />
                      Call {EMERGENCY_PHONE}
                    </Button>
                  </a>
                </div>
              )}

              {!isLoading && !error && sites?.length === 0 && (
                <div className="text-center p-6 space-y-3">
                  <MapIcon className="h-8 w-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="font-medium">No sites found</p>
                    <p className="text-sm text-muted-foreground">Contact your supervisor if this is unexpected</p>
                  </div>
                </div>
              )}

              {sites?.map(site => (
                <Card 
                  key={site.site_id} 
                  id={`site-card-${site.site_id}`}
                  className={`transition-all duration-200 cursor-pointer border-l-4 ${
                    selectedSite?.site_id === site.site_id 
                      ? 'border-l-primary ring-2 ring-primary/20 shadow-md' 
                      : 'border-l-transparent hover:shadow-md hover:border-l-primary/50'
                  }`}
                  onClick={() => handleSiteClick(site)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">{site.site_name}</h4>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1">
                      <MapIcon className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{site.city}, {site.state}</span>
                    </p>
                    
                    <LazyWeatherDisplay lat={site.latitude} lng={site.longitude} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Helpful Resources Footer */}
          <div className="border-t bg-slate-50 p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Resources</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <a href="#" className="p-2 rounded hover:bg-white text-xs flex flex-col items-center gap-1 transition-colors">
                <Shield className="h-4 w-4 text-primary" />
                <span>Safety</span>
              </a>
              <a href="#" className="p-2 rounded hover:bg-white text-xs flex flex-col items-center gap-1 transition-colors">
                <FileText className="h-4 w-4 text-primary" />
                <span>Forms</span>
              </a>
              <a href="#" className="p-2 rounded hover:bg-white text-xs flex flex-col items-center gap-1 transition-colors">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Help</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Panel: Map + Selected Site Detail */}
        <div className="flex-1 relative bg-slate-100 flex flex-col">
          {/* Map */}
          <div className="flex-1 relative">
            <GoogleSitesMap 
              sites={error ? [] : (sites || [])} 
              mode="public" 
              height="100%" 
              className="h-full w-full border-0 rounded-none"
              onSiteClick={handleSiteClick}
            />
          </div>

          {/* Selected Site Detail Panel */}
          {selectedSite && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10 animate-in slide-in-from-bottom duration-300">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedSite.site_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedSite.street_address && `${selectedSite.street_address}, `}
                      {selectedSite.city}, {selectedSite.state} {selectedSite.post_code}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedSite(null)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Weather for selected site */}
                <SiteWeather 
                  lat={selectedSite.latitude} 
                  lng={selectedSite.longitude} 
                  siteName={selectedSite.site_name}
                />

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          (selectedSite.street_address ? selectedSite.street_address + ', ' : '') + 
                          selectedSite.city + ', ' + selectedSite.state
                        )}`, 
                        '_blank'
                      );
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleReportIncident(selectedSite.site_id)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Incident
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

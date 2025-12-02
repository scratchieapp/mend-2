import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Mic,
  ClipboardList,
  User,
  Calendar,
  ArrowRight,
  Building2,
  TrendingUp,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSitesMap, SiteLocation, HeadOffice } from "@/components/maps/GoogleSitesMap";
import { WeatherDisplay } from "@/components/incidents/WeatherDisplay";
import { fetchCurrentWeather, WeatherData } from "@/services/weatherService";
import { useAuth } from "@/lib/auth/AuthContext";
import { format } from "date-fns";
import { RetellVoiceCall } from "@/components/voice/RetellVoiceCall";

// Emergency phone number - 24/7 incident reporting line
const EMERGENCY_PHONE = "02 9136 2358";
const EMERGENCY_PHONE_LINK = "tel:+61291362358";

// Employer sort preference persistence key
const EMPLOYER_SORT_KEY = 'mend-employer-sort-preference';

// Employer sort options
type EmployerSortOption = 'name' | 'most_ltis' | 'most_incidents' | 'most_sites' | 'most_recent';

interface EmployerStats {
  employer_id: number;
  employer_name: string;
  employer_address: string | null;
  employer_state: string | null;
  employer_post_code: string | null;
  site_count: number;
  incident_count: number;
  lti_count: number;
  mti_count: number;
  last_incident_date: string | null;
}

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
            <span className="font-medium">{Math.round(weather.temperature_c ?? 0)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <span>{weather.conditions || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-500" />
            <span>{Math.round(weather.wind_speed_kmh ?? 0)} km/h</span>
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
            {Math.round(weather.temperature_c ?? 0)}°C
          </span>
          <span className="text-muted-foreground">{weather.conditions || 'Unknown'}</span>
        </div>
      )}
    </div>
  );
};

// Classification badge helper with color coding
const getClassificationBadge = (classification?: string) => {
  const upperClass = classification?.toUpperCase();
  switch (upperClass) {
    case 'FAI':
    case 'FIRST AID':
    case 'FIRST AID INJURY':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">FAI</Badge>;
    case 'MTI':
    case 'MEDICAL TREATMENT':
    case 'MEDICAL TREATMENT INJURY':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">MTI</Badge>;
    case 'LTI':
    case 'LOST TIME':
    case 'LOST TIME INJURY':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">LTI</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Pending</Badge>;
  }
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

  // Check if user can see incidents (roles 1-8, not role 9 which is public)
  const userRoleId = userData?.role_id ? parseInt(userData.role_id) : null;
  const canViewIncidents = !!(isAuthenticated && userRoleId && userRoleId < 9);
  
  // Super Admin (roles 1-4) can view all incidents without a specific employer
  const isSuperAdmin = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);

  // Employer sort preference (persisted to localStorage)
  const [employerSort, setEmployerSort] = useState<EmployerSortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(EMPLOYER_SORT_KEY);
      if (saved && ['name', 'most_ltis', 'most_incidents', 'most_sites', 'most_recent'].includes(saved)) {
        return saved as EmployerSortOption;
      }
    }
    return 'most_ltis'; // Default to most LTIs for safety focus
  });

  // Update localStorage when sort preference changes
  const handleEmployerSortChange = (value: EmployerSortOption) => {
    setEmployerSort(value);
    localStorage.setItem(EMPLOYER_SORT_KEY, value);
  };

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

  // Fetch employer details for authenticated users (including head office location)
  const { data: employer } = useQuery({
    queryKey: ['employer-details', employerId],
    queryFn: async () => {
      if (!employerId) return null;
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name, employer_address, employer_state, employer_post_code')
        .eq('employer_id', employerId)
        .single();
      
      if (error) {
        console.error('Error fetching employer:', error);
        return null;
      }
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: isAuthenticated && !!employerId
  });

  // Fetch all employer statistics for Super Admin
  const { data: employerStats, isLoading: employersLoading } = useQuery({
    queryKey: ['employer-statistics', userRoleId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employer_statistics', {
        p_user_role_id: userRoleId
      });
      
      if (error) {
        console.error('Error fetching employer statistics:', error);
        return [];
      }
      return data as EmployerStats[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isSuperAdmin && !!userRoleId
  });

  // Sort employers based on selected option
  const sortedEmployers = employerStats ? [...employerStats].sort((a, b) => {
    switch (employerSort) {
      case 'most_ltis':
        return (b.lti_count || 0) - (a.lti_count || 0);
      case 'most_incidents':
        return (b.incident_count || 0) - (a.incident_count || 0);
      case 'most_sites':
        return (b.site_count || 0) - (a.site_count || 0);
      case 'most_recent':
        if (!b.last_incident_date) return -1;
        if (!a.last_incident_date) return 1;
        return new Date(b.last_incident_date).getTime() - new Date(a.last_incident_date).getTime();
      case 'name':
      default:
        return (a.employer_name || '').localeCompare(b.employer_name || '');
    }
  }) : [];

  // Create head office data for the map
  // For Super Admin, show all employer head offices as red squares
  const headOffices: HeadOffice[] = isSuperAdmin && sortedEmployers.length > 0
    ? sortedEmployers.map(e => ({
        employer_id: e.employer_id,
        employer_name: e.employer_name,
        employer_address: e.employer_address || undefined,
        employer_state: e.employer_state || undefined,
        employer_post_code: e.employer_post_code || undefined,
      }))
    : employer ? [{
        employer_id: employer.employer_id,
        employer_name: employer.employer_name,
        employer_address: employer.employer_address || undefined,
        employer_state: employer.employer_state || undefined,
        employer_post_code: employer.employer_post_code || undefined,
      }] : [];

  // Get employer name from query or from first site as fallback
  const employerName = employer?.employer_name || sites?.[0]?.employer_name;

  // Fetch recent incidents (only for authorized users)
  // Uses get_dashboard_data which properly filters archived/deleted incidents
  const { data: recentIncidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['recent-incidents', isSuperAdmin ? 'all' : employerId, userData?.role_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        page_size: 5,
        page_offset: 0,
        filter_employer_id: employerId,
        filter_worker_id: null,
        filter_start_date: null,
        filter_end_date: null,
        user_role_id: userRoleId,
        user_employer_id: employerId,
        filter_archive_status: 'active' // Only show active incidents, not deleted/archived
      });
      
      if (error) {
        console.error('Error fetching incidents:', error);
        return [];
      }
      
      const incidents = data?.incidents || [];
      
      // Fetch call summaries from voice_logs for these incidents
      // The call_summary from the voice agent provides the best incident summary
      if (incidents.length > 0) {
        const incidentIds = incidents.map((i: any) => i.incident_id);
        
        const { data: voiceLogs, error: voiceError } = await supabase
          .from('voice_logs')
          .select('incident_id, call_summary')
          .in('incident_id', incidentIds)
          .not('call_summary', 'is', null)
          .order('created_at', { ascending: false });
        
        if (!voiceError && voiceLogs) {
          // Create a map of incident_id -> call_summary (use first/most recent summary)
          const summaryMap = new Map<number, string>();
          voiceLogs.forEach((log: any) => {
            if (!summaryMap.has(log.incident_id) && log.call_summary) {
              summaryMap.set(log.incident_id, log.call_summary);
            }
          });
          
          // Enrich incidents with call summaries
          incidents.forEach((incident: any) => {
            const summary = summaryMap.get(incident.incident_id);
            if (summary) {
              incident.call_summary = summary;
            }
          });
        }
      }
      
      return incidents;
    },
    staleTime: 60 * 1000, // 1 minute
    // Super Admin can query without employerId (will see all incidents)
    // Other roles need a specific employerId
    enabled: canViewIncidents && (isSuperAdmin || employerId !== null)
  });

  const handleReportIncident = (siteId?: number) => {
    navigate(siteId ? `/incident-report?site_id=${siteId}` : '/incident-report');
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
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-slate-50">
      {/* Main Content - Vertical Scrolling Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">

          {/* Quick Actions Bar - Two clear options */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            {/* Option 1: Report directly by typing */}
            <Button 
              size="lg"
              className="gap-2"
              onClick={() => handleReportIncident()}
            >
              <ClipboardList className="h-5 w-5" />
              Report Incident
            </Button>
            
            {/* Option 2: Call Mend to report by voice */}
            {isAuthenticated ? (
              <RetellVoiceCall 
                buttonText={`Call Mend - ${EMERGENCY_PHONE}`}
                buttonVariant="outline"
                phoneNumber={EMERGENCY_PHONE}
                showPhoneOption={true}
                className="h-11 text-base"
                userContext={{
                  employer_id: userData?.employer_id || undefined,
                  employer_name: employerName || undefined,
                  caller_name: userData?.display_name || userData?.custom_display_name || undefined,
                  caller_role: userData?.role?.role_name || undefined,
                  caller_position: userData?.role?.role_label || userData?.role?.role_name || undefined,
                  caller_phone: userData?.mobile_number || undefined,
                  is_authenticated: true,
                }}
              />
            ) : (
              <a href={EMERGENCY_PHONE_LINK}>
                <Button variant="outline" size="lg" className="gap-2">
                  <Phone className="h-5 w-5" />
                  Call Mend - {EMERGENCY_PHONE}
                </Button>
              </a>
            )}
          </div>

          {/* 1. RECENT INCIDENTS SECTION (only for authorized users) */}
          {canViewIncidents && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Recent Incidents</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-primary"
                    onClick={() => navigate('/incidents')}
                  >
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Latest 5 incidents reported</CardDescription>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading incidents...
                  </div>
                ) : recentIncidents && recentIncidents.length > 0 ? (
                  <div className="space-y-3">
                    {recentIncidents.map((incident: any) => {
                      // Get border color based on classification
                      const getBorderColor = (classification?: string) => {
                        const upper = classification?.toUpperCase();
                        if (upper === 'LTI' || upper === 'LOST TIME INJURY') return 'border-l-red-500';
                        if (upper === 'MTI' || upper === 'MEDICAL TREATMENT INJURY') return 'border-l-amber-500';
                        if (upper === 'FAI' || upper === 'FIRST AID INJURY') return 'border-l-green-500';
                        return 'border-l-slate-300';
                      };
                      
                      return (
                        <div 
                          key={incident.incident_id}
                          className={`flex items-start gap-4 p-4 rounded-lg border border-l-4 ${getBorderColor(incident.classification)} bg-white hover:bg-slate-50 cursor-pointer transition-all hover:shadow-sm`}
                          onClick={() => navigate(`/incident/${incident.incident_id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            {/* Header row: incident number, classification, date */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900">
                                  {incident.incident_number || `INC-${incident.incident_id}`}
                                </span>
                                {getClassificationBadge(incident.classification)}
                              </div>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {incident.date_of_injury 
                                  ? format(new Date(incident.date_of_injury), 'dd MMM yyyy')
                                  : 'No date'}
                              </span>
                            </div>
                            
                            {/* Summary description - prefer call_summary from voice agent */}
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                              {incident.call_summary || 
                                incident.injury_description || 
                                (incident.injury_type && incident.injury_type !== 'Not specified' 
                                  ? `${incident.injury_type} injury reported`
                                  : 'No description available')}
                            </p>
                            
                            {/* Footer: worker and site info */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-slate-100">
                              <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span className="font-medium">{incident.worker_name || 'Unknown Worker'}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapIcon className="h-3.5 w-3.5" />
                                {incident.site_name || 'Unknown Site'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-muted-foreground">No incidents reported yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. MAP SECTION */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{isSuperAdmin ? 'All Site Locations' : 'Site Locations'}</CardTitle>
                {sites && <Badge variant="secondary" className="ml-2">{sites.length} sites</Badge>}
                {isSuperAdmin && headOffices.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-red-600 border-red-200">
                    {headOffices.length} head offices
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative" style={{ height: '400px' }}>
                <GoogleSitesMap 
                  sites={error ? [] : (sites || [])} 
                  headOffices={headOffices}
                  mode="public" 
                  height="100%" 
                  className="rounded-b-lg border-0"
                  onSiteClick={handleSiteClick}
                  showLegend={headOffices.length > 0}
                />

                {/* Selected Site Detail Overlay */}
                {selectedSite && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t shadow-lg z-10 animate-in slide-in-from-bottom duration-300">
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
            </CardContent>
          </Card>

          {/* 3. EMPLOYERS SECTION (Super Admin only) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Employers</CardTitle>
                    {sortedEmployers.length > 0 && (
                      <Badge variant="secondary">{sortedEmployers.length} clients</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <Select value={employerSort} onValueChange={(v) => handleEmployerSortChange(v as EmployerSortOption)}>
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="most_ltis">Most LTIs</SelectItem>
                        <SelectItem value="most_incidents">Most Incidents</SelectItem>
                        <SelectItem value="most_sites">Most Sites</SelectItem>
                        <SelectItem value="most_recent">Most Recent</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>Click on an employer to view their details</CardDescription>
              </CardHeader>
              <CardContent>
                {employersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading employers...
                  </div>
                ) : sortedEmployers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedEmployers.map(emp => (
                      <Card 
                        key={emp.employer_id}
                        className="transition-all duration-200 cursor-pointer hover:shadow-md border-l-4 border-l-red-500 hover:border-l-red-600"
                        onClick={() => navigate(`/admin/employer-management?employer_id=${emp.employer_id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm">{emp.employer_name}</h4>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1">
                            <MapIcon className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{emp.employer_address ? `${emp.employer_address}, ` : ''}{emp.employer_state || 'No address'}</span>
                          </p>
                          
                          {/* Statistics row */}
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1" title="Lost Time Injuries">
                              <div className={`w-2 h-2 rounded-full ${emp.lti_count > 0 ? 'bg-red-500' : 'bg-slate-300'}`} />
                              <span className={emp.lti_count > 0 ? 'font-semibold text-red-600' : 'text-muted-foreground'}>
                                {emp.lti_count} LTI
                              </span>
                            </div>
                            <div className="flex items-center gap-1" title="Total Incidents">
                              <Activity className="h-3 w-3 text-amber-500" />
                              <span className="text-muted-foreground">{emp.incident_count}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Sites">
                              <MapIcon className="h-3 w-3 text-blue-500" />
                              <span className="text-muted-foreground">{emp.site_count}</span>
                            </div>
                          </div>
                          
                          {/* Last incident date */}
                          {emp.last_incident_date && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last incident: {format(new Date(emp.last_incident_date), 'dd MMM yyyy')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-muted-foreground">No employers found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. SITES LIST SECTION */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{isSuperAdmin ? 'All Work Sites' : 'Your Work Sites'}</CardTitle>
              </div>
              <CardDescription>Click on a site to view on map</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading sites...
                </div>
              ) : error ? (
                <div className="text-center py-8 space-y-3">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                  <div>
                    <p className="font-medium">Unable to load sites</p>
                    <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
                  </div>
                </div>
              ) : sites && sites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sites.map(site => (
                    <Card 
                      key={site.site_id}
                      className={`transition-all duration-200 cursor-pointer border-l-4 hover:shadow-md ${
                        selectedSite?.site_id === site.site_id 
                          ? 'border-l-primary ring-2 ring-primary/20 shadow-md' 
                          : 'border-l-transparent hover:border-l-primary/50'
                      }`}
                      onClick={() => handleSiteClick(site)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{site.site_name}</h4>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{site.city}, {site.state}</span>
                        </p>
                        <LazyWeatherDisplay lat={site.latitude} lng={site.longitude} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium">No sites found</p>
                  <p className="text-sm text-muted-foreground">Contact your supervisor if this is unexpected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resources Footer */}
          <div className="flex justify-center gap-6 py-4 text-sm">
            <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <Shield className="h-4 w-4" />
              Safety Guidelines
            </a>
            <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <FileText className="h-4 w-4" />
              Forms
            </a>
            <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

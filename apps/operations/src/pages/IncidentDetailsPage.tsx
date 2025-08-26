import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuBar } from "@/components/MenuBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, MapPin, User, AlertCircle, FileText, Calendar, Phone, Stethoscope, Activity, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Tables } from "@/integrations/supabase/types";
import { geocodeAndUpdateSite, geocodeCityFallback, updateSiteCoordinates } from "@/lib/mapbox/geocoding";
import { useEffect, useState } from "react";
import { BodyInjuryViewer } from "@/components/incident-report/BodyInjuryViewer";
import IncidentCostEstimate from "@/components/incident-report/cost/IncidentCostEstimate";

// Type for the incident with all joined relations
type IncidentWithRelations = Tables<'incidents'> & {
  site?: Partial<Tables<'sites'>> & {
    longitude?: number;
    latitude?: number;
  };
  worker?: Partial<Tables<'workers'>>;
  department?: Partial<Tables<'departments'>>;
  body_part?: Partial<Tables<'body_parts'>>;
};

// Helper function to map body part names to SVG regions
const getBodyRegionsFromIncident = (incident: IncidentWithRelations | null | undefined): string[] => {
  if (!incident?.body_part?.body_part_name) return [];
  
  const bodyPart = incident.body_part.body_part_name.toLowerCase();
  const regions: string[] = [];
  
  // Map body part names to SVG region IDs
  if (bodyPart.includes('chest')) {
    regions.push('front-chest');
  } else if (bodyPart.includes('head')) {
    regions.push('front-head');
  } else if (bodyPart.includes('neck')) {
    regions.push('front-neck');
  } else if (bodyPart.includes('shoulder')) {
    if (bodyPart.includes('left')) {
      regions.push('front-shoulder-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-shoulder-right');
    } else {
      regions.push('front-shoulder-left', 'front-shoulder-right');
    }
  } else if (bodyPart.includes('arm')) {
    if (bodyPart.includes('left')) {
      regions.push('front-upperarm-left', 'front-forearmhand-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-upperarm-right', 'front-forearmhand-right');
    } else {
      regions.push('front-upperarm-left', 'front-upperarm-right');
    }
  } else if (bodyPart.includes('back')) {
    if (bodyPart.includes('lower')) {
      regions.push('back-lowerback');
    } else if (bodyPart.includes('upper')) {
      regions.push('back-upperback');
    } else {
      regions.push('back-upperback', 'back-lowerback');
    }
  } else if (bodyPart.includes('abdomen') || bodyPart.includes('stomach')) {
    regions.push('front-abdomen');
  } else if (bodyPart.includes('leg') || bodyPart.includes('thigh')) {
    if (bodyPart.includes('left')) {
      regions.push('front-thigh-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-thigh-right');
    } else {
      regions.push('front-thigh-left', 'front-thigh-right');
    }
  } else if (bodyPart.includes('knee')) {
    if (bodyPart.includes('left')) {
      regions.push('front-knee-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-knee-right');
    } else {
      regions.push('front-knee-left', 'front-knee-right');
    }
  } else if (bodyPart.includes('foot') || bodyPart.includes('ankle')) {
    if (bodyPart.includes('left')) {
      regions.push('front-foot-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-foot-right');
    } else {
      regions.push('front-foot-left', 'front-foot-right');
    }
  } else if (bodyPart.includes('hand') || bodyPart.includes('wrist')) {
    if (bodyPart.includes('left')) {
      regions.push('front-forearmhand-left');
    } else if (bodyPart.includes('right')) {
      regions.push('front-forearmhand-right');
    } else {
      regions.push('front-forearmhand-left', 'front-forearmhand-right');
    }
  }
  
  // Default to chest if no specific region found
  if (regions.length === 0) {
    regions.push('front-chest');
  }
  
  return regions;
};

const IncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coordinates, setCoordinates] = useState<{ longitude: number; latitude: number } | null>(null);

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          site:sites(
            site_id, 
            site_name,
            street_address,
            city,
            post_code,
            state,
            longitude,
            latitude
          ),
          worker:workers(worker_id, given_name, family_name, occupation),
          department:departments(department_name),
          body_part:body_parts(body_part_name)
        `)
        .eq('incident_id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Incident not found');
      return data;
    },
    enabled: !!id
  });

  // Geocode the site if coordinates are missing
  useEffect(() => {
    const geocodeSite = async () => {
      if (!incident?.site) return;
      
      const site = incident.site;
      
      // Check if site already has coordinates
      if (site.longitude && site.latitude) {
        setCoordinates({ longitude: site.longitude, latitude: site.latitude });
        return;
      }

      // Try to geocode the full address first
      if (site.street_address && site.city && site.state) {
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
        if (token) {
          try {
            // Build full address string
            const addressParts = [
              site.street_address,
              site.city,
              site.state,
              site.post_code,
              'Australia'
            ].filter(Boolean).join(', ');
            
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressParts)}.json?` +
              `access_token=${token}&` +
              `country=AU&` +
              `types=address,locality&` +
              `limit=1`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.features?.[0]) {
                const [lng, lat] = data.features[0].center;
                setCoordinates({ longitude: lng, latitude: lat });
                
                // Update site in database with coordinates
                if (site.site_id) {
                  await updateSiteCoordinates(site.site_id, { lng, lat });
                }
                return;
              }
            }
          } catch (error) {
            console.error('Error geocoding full address:', error);
          }
        }
      }

      // Fallback to city-level geocoding (especially for Newtown)
      if (site.city && site.state) {
        const result = await geocodeCityFallback(site.city, site.state);
        if (result) {
          setCoordinates({ longitude: result.lng, latitude: result.lat });
          return;
        }
      }

      // Default to Sydney if all else fails
      setCoordinates({ longitude: 151.2093, latitude: -33.8688 });
    };

    geocodeSite();
  }, [incident]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Incident</h1>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate(-1);
  };

  const formatTime = (time: string | null) => {
    if (!time) return "Not specified";
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  };

  const getClassificationColor = (classification: string | null) => {
    switch (classification?.toUpperCase()) {
      case 'MTI':
        return 'bg-amber-500 text-amber-50';
      case 'LTI':
        return 'bg-red-500 text-red-50';
      case 'FAI':
        return 'bg-blue-500 text-blue-50';
      default:
        return 'bg-gray-500 text-gray-50';
    }
  };

  const getClassificationBorder = (classification: string | null) => {
    switch (classification?.toUpperCase()) {
      case 'MTI':
        return 'border-l-amber-500';
      case 'LTI':
        return 'border-l-red-500';
      case 'FAI':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Type for the site data from the query
  type SiteData = Partial<Tables<'sites'>> & {
    longitude?: number;
    latitude?: number;
  } | null | undefined;

  // Helper function to get coordinates for the site
  const getSiteCoordinates = (siteData: SiteData) => {
    // Default to Sydney coordinates
    let longitude = 151.2093;
    let latitude = -33.8688;

    // Enhanced logic: try to match city/state to approximate coordinates
    if (siteData?.city && siteData?.state) {
      const cityState = `${siteData.city.toLowerCase()}, ${siteData.state.toLowerCase()}`;
      
      // Basic Australian city coordinates mapping
      const cityCoordinates: Record<string, { longitude: number; latitude: number }> = {
        'sydney, nsw': { longitude: 151.2093, latitude: -33.8688 },
        'sydney, new south wales': { longitude: 151.2093, latitude: -33.8688 },
        'melbourne, vic': { longitude: 144.9631, latitude: -37.8136 },
        'melbourne, victoria': { longitude: 144.9631, latitude: -37.8136 },
        'brisbane, qld': { longitude: 153.0260, latitude: -27.4698 },
        'brisbane, queensland': { longitude: 153.0260, latitude: -27.4698 },
        'perth, wa': { longitude: 115.8605, latitude: -31.9505 },
        'perth, western australia': { longitude: 115.8605, latitude: -31.9505 },
        'adelaide, sa': { longitude: 138.6007, latitude: -34.9285 },
        'adelaide, south australia': { longitude: 138.6007, latitude: -34.9285 },
        'darwin, nt': { longitude: 130.8456, latitude: -12.4634 },
        'darwin, northern territory': { longitude: 130.8456, latitude: -12.4634 },
        'hobart, tas': { longitude: 147.3272, latitude: -42.8821 },
        'hobart, tasmania': { longitude: 147.3272, latitude: -42.8821 },
        'canberra, act': { longitude: 149.1300, latitude: -35.2809 },
        'canberra, australian capital territory': { longitude: 149.1300, latitude: -35.2809 },
      };

      const coordinates = cityCoordinates[cityState];
      if (coordinates) {
        longitude = coordinates.longitude;
        latitude = coordinates.latitude;
      }
    }

    return { longitude, latitude };
  };

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Incident Details</h1>
              <Badge className={`${getClassificationColor(incident?.classification)} text-sm font-semibold px-3 py-1`}>
                {incident?.classification || 'Unclassified'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Incident {incident?.incident_number}</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className={`border-l-4 ${getClassificationBorder(incident?.classification)}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Injury</p>
                  <p className="font-semibold">{incident?.date_of_injury ? format(new Date(incident.date_of_injury), 'MMM dd, yyyy') : 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Lost</p>
                  <p className="font-semibold">{incident?.total_days_lost ? `${incident.total_days_lost} days` : 'No lost time'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Site Location</p>
                  <p className="font-semibold">{incident?.site?.site_name || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Work Status</p>
                  <p className="font-semibold">{incident?.returned_to_work ? 'Returned to Work' : 'Off Work'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Estimate */}
          <div className="lg:col-span-3">
            <IncidentCostEstimate
              incidentId={incident?.incident_id}
              classification={incident?.classification}
              daysLost={incident?.total_days_lost || 0}
              bodyPartId={incident?.body_part_id}
              isFatality={incident?.fatality}
              readOnly={true}
            />
          </div>

          {/* Worker Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Worker Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="font-semibold">{incident?.worker?.given_name} {incident?.worker?.family_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                  <p className="font-semibold">{incident?.worker?.occupation || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employer</p>
                  <p className="font-semibold">{incident?.workers_employer || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incident Location */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
                Incident Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Site</p>
                  <p className="font-semibold">{incident?.site?.site_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="font-semibold">{incident?.department?.department_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shift Arrangement</p>
                  <p className="font-semibold">{incident?.shift_arrangement || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treatment Information */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5 text-green-600" />
                Treatment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Treatment Provided</p>
                  <p className="text-sm leading-relaxed">{incident?.treatment_provided || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medical Professional</p>
                  <p className="font-semibold">{incident?.medical_professional_id ? 'Assigned' : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referral</p>
                  <p className="font-semibold">{incident?.referral || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incident Details - Full Width */}
        <div className="mt-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                    <p className="font-semibold">
                      {incident?.date_of_injury ? format(new Date(incident.date_of_injury), 'PPP') : 'Not specified'}
                      {incident?.time_of_injury && ` at ${formatTime(incident.time_of_injury)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Body Part Affected</p>
                    <p className="font-semibold">{incident?.body_part?.body_part_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Injury Type</p>
                    <p className="font-semibold">{incident?.injury_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Witness</p>
                    <p className="font-semibold">{incident?.witness || 'None reported'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {incident?.injury_description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map and Body Diagram - Side by Side with Equal Heights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Site Location Map */}
          <Card className="border-l-4 border-l-blue-500 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapIcon className="h-5 w-5 text-blue-600" />
                Site Location Map
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 relative min-h-[500px]">
                <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-border">
                  <Map
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN}
                    initialViewState={{
                      longitude: coordinates?.longitude || 151.2093,
                      latitude: coordinates?.latitude || -33.8688,
                      zoom: 15
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                  >
                    {coordinates && (
                      <Marker
                        longitude={coordinates.longitude}
                        latitude={coordinates.latitude}
                        anchor="bottom"
                      >
                      <div className="bg-red-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                        <MapPin className="h-4 w-4" />
                      </div>
                      </Marker>
                    )}
                  </Map>
                </div>
                
                {/* Map Overlay with Site Info */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-xs">
                  <h4 className="font-semibold text-sm mb-1">
                    {incident?.site?.site_name || 'Site Location'}
                  </h4>
                  
                  {/* Address Information */}
                  {(incident?.site?.street_address || incident?.site?.city || incident?.site?.state) && (
                    <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                      {incident?.site?.street_address && (
                        <div>{incident.site.street_address}</div>
                      )}
                      <div>
                        {[incident?.site?.city, incident?.site?.state, incident?.site?.post_code]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {incident?.date_of_injury 
                      ? `Incident on ${format(new Date(incident.date_of_injury), 'MMM dd, yyyy')}` 
                      : 'Incident location'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-muted-foreground font-medium">Incident Site</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Body Injury Diagram */}
          <BodyInjuryViewer 
            selectedRegions={getBodyRegionsFromIncident(incident)}
            injuryType={incident?.injury_type}
            injuryDescription={incident?.injury_description}
          />
        </div>

        {/* Case Notes & Reporting Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Case Notes */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-amber-600" />
                Case Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {incident?.case_notes || 'No case notes available'}
                </p>
              </div>
              {incident?.doctor_notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Medical Notes</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-green-800">
                      {incident.doctor_notes}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reporting Information */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-indigo-600" />
                Reporting Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reported to Site</p>
                    <p className="font-semibold">{incident?.date_reported_to_site ? format(new Date(incident.date_reported_to_site), 'PPP') : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time Reported</p>
                    <p className="font-semibold">{formatTime(incident?.time_reported_to_site)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notifying Person</p>
                    <p className="font-semibold">{incident?.notifying_person_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p className="font-semibold">{incident?.notifying_person_position || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="font-semibold">{incident?.notifying_person_telephone || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsPage;
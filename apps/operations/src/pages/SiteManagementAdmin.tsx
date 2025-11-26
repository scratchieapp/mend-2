import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Building2,
  Phone,
  User,
  Map as MapIcon,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Site {
  site_id: number;
  site_name: string;
  street_address: string;
  city: string;
  state: string;
  post_code: string;
  employer_id: number;
  supervisor_name?: string;
  supervisor_telephone?: string;
  project_type?: string;
  created_at: string;
  updated_at: string;
  employer_name?: string;
  incident_count?: number;
  latitude?: number;
  longitude?: number;
  status?: 'working' | 'paused' | 'finished';
}

interface SiteFormData {
  site_name: string;
  street_address: string;
  city: string;
  state: string;
  post_code: string;
  employer_id: string;
  supervisor_name: string;
  supervisor_telephone: string;
  project_type: string;
}

// Australian city coordinates for geocoding fallback
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'brisbane': { lat: -27.4698, lng: 153.0260 },
  'perth': { lat: -31.9505, lng: 115.8605 },
  'adelaide': { lat: -34.9285, lng: 138.6007 },
  'darwin': { lat: -12.4634, lng: 130.8456 },
  'hobart': { lat: -42.8821, lng: 147.3272 },
  'canberra': { lat: -35.2809, lng: 149.1300 },
  'gold coast': { lat: -28.0167, lng: 153.4000 },
  'newcastle': { lat: -32.9283, lng: 151.7817 },
  'wollongong': { lat: -34.4278, lng: 150.8931 },
  'geelong': { lat: -38.1499, lng: 144.3617 },
  'townsville': { lat: -19.2576, lng: 146.8237 },
  'cairns': { lat: -16.9186, lng: 145.7781 },
};

// Get coordinates from city name
const getCoordinatesFromCity = (city?: string): { lat: number; lng: number } | null => {
  if (!city) return null;
  const cityLower = city.toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    if (cityLower.includes(name) || name.includes(cityLower)) {
      // Add slight random offset to prevent markers from overlapping
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.1,
        lng: coords.lng + (Math.random() - 0.5) * 0.1
      };
    }
  }
  return null;
};

export default function SiteManagementAdmin() {
  // Auth state - wait for auth to be ready before fetching
  const { isAuthenticated, isLoading: authLoading, userData } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: "",
    street_address: "",
    city: "",
    state: "",
    post_code: "",
    employer_id: "",
    supervisor_name: "",
    supervisor_telephone: "",
    project_type: "",
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug auth state
  useEffect(() => {
    console.log('Site Management - Auth state:', { 
      isAuthenticated, 
      authLoading, 
      userData: userData ? {
        email: userData.email,
        role_id: userData.role_id,
        role_name: userData.role?.role_name
      } : null 
    });
  }, [isAuthenticated, authLoading, userData]);

  // Fetch employers for dropdown - wait for auth
  const { data: employers = [] } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      console.log('Fetching employers...');
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      if (error) {
        console.error('Employers fetch error:', error);
        throw error;
      }
      console.log('Employers fetched:', data?.length || 0);
      return data;
    },
    enabled: isAuthenticated && !authLoading
  });

  // Fetch sites with related data
  const { data: sites, isLoading, error: sitesError } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      console.log('Fetching sites...');
      
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select(`
          *,
          employers:employer_id(employer_name)
        `)
        .order('site_name');

      console.log('Sites query result:', { sitesData, sitesError });

      if (sitesError) {
        console.error('Sites fetch error:', sitesError);
        throw sitesError;
      }

      if (!sitesData || sitesData.length === 0) {
        console.log('No sites found in database');
        return [];
      }

      // Get latest status for each site
      const { data: statusHistory, error: statusError } = await supabase
        .from('site_status_history')
        .select('site_id, status, month')
        .order('month', { ascending: false });
      
      if (statusError) {
        console.warn('Status history fetch warning:', statusError);
      }

      // Create a map of latest status per site
      const statusMap = new Map<number, string>();
      statusHistory?.forEach(item => {
        if (!statusMap.has(item.site_id)) {
          statusMap.set(item.site_id, item.status);
        }
      });

      // Fetch incident counts for each site
      const sitesWithCounts = await Promise.all(
        sitesData.map(async (site) => {
          const { count: incidentCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', site.site_id);

          // Check if site has been inactive for more than 12 months
          const status = statusMap.get(site.site_id) || 'working';
          
          return {
            ...site,
            employer_name: site.employers?.employer_name || 'Unknown',
            incident_count: incidentCount || 0,
            status: status as 'working' | 'paused' | 'finished',
          };
        })
      );

      return sitesWithCounts;
    },
    enabled: isAuthenticated && !authLoading
  });

  // Load Google Maps script - must be before any early returns
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return;
    }

    // Check if Google Maps is already loaded and has Marker (not just AdvancedMarker)
    if (window.google?.maps?.Map && window.google?.maps?.Marker) {
      console.log('Google Maps already loaded');
      setMapLoaded(true);
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google?.maps?.Map && window.google?.maps?.Marker) {
          console.log('Google Maps API ready');
          setMapLoaded(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create a callback function name
    const callbackName = `initGoogleMaps_${Date.now()}`;
    
    // Set up the callback on window
    (window as any)[callbackName] = () => {
      console.log('Google Maps API callback fired');
      // Double-check that API is ready
      const checkReady = () => {
        if (window.google?.maps?.Map && window.google?.maps?.Marker) {
          console.log('Google Maps API fully ready');
          setMapLoaded(true);
          // Clean up callback
          delete (window as any)[callbackName];
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    // Load fresh script with proper callback
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps');
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map with all sites
  const initializeMap = useCallback(() => {
    if (!mapLoaded || !mapRef.current || !sites) {
      console.log('Map initialization skipped:', { mapLoaded, hasMapRef: !!mapRef.current, sitesCount: sites?.length });
      return;
    }

    // Safety check for Google Maps API
    if (!window.google?.maps?.Map || !window.google?.maps?.Marker) {
      console.error('Google Maps API not fully loaded');
      return;
    }

    // Check if map container is visible (but don't be too strict - tab might be switching)
    const isVisible = mapRef.current.offsetWidth > 0 || mapRef.current.offsetHeight > 0 || mapRef.current.offsetParent !== null;
    if (!isVisible) {
      console.log('Map container may not be visible yet');
      // Don't retry here - let the useEffect handle retries when tab changes
    }

    console.log('Initializing map with', sites.length, 'sites');

    try {
    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }

    // Reuse existing map if available, otherwise create new one
    let map = googleMapRef.current;
    if (!map) {
      // Initialize map centered on Australia
      // Use a mapId to enable AdvancedMarkerElement
      map = new google.maps.Map(mapRef.current, {
        center: { lat: -25.2744, lng: 133.7751 }, // Center of Australia
        zoom: 4,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      googleMapRef.current = map;
    }

    // Create a single info window to reuse
    const infoWindow = new google.maps.InfoWindow();
    
    // Add markers for each site using standard Marker
    sites.forEach(site => {
      const coords = site.latitude && site.longitude 
        ? { lat: Number(site.latitude), lng: Number(site.longitude) }
        : getCoordinatesFromCity(site.city);

      if (!coords) return;

      // Determine marker color based on status
      let markerColor = '#22c55e'; // Green for active (working)
      let markerIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
      if (site.status === 'paused') {
        markerColor = '#f59e0b'; // Amber for paused
        markerIcon = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      } else if (site.status === 'finished') {
        markerColor = '#6b7280'; // Grey for finished
        markerIcon = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
      }

      // Create marker
      const marker = new google.maps.Marker({
        map,
        position: coords,
        title: site.site_name,
        icon: markerIcon,
      });

      // Add click listener for info window
      marker.addListener('click', () => {
        const content = `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">${site.site_name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${site.employer_name}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;">${site.street_address || ''}</p>
            <p style="margin: 0 0 8px 0; font-size: 12px;">${site.city}, ${site.state} ${site.post_code}</p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="
                background: ${markerColor};
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
              ">${site.status || 'Active'}</span>
              <span style="font-size: 11px; color: #666;">${site.incident_count} incidents</span>
            </div>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    console.log('Map initialized with', markersRef.current.length, 'markers');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [mapLoaded, sites]);

  useEffect(() => {
    if (activeTab === 'map') {
      // Small delay to ensure DOM is ready when switching tabs
      const timer = setTimeout(() => {
        if (mapRef.current && mapLoaded && sites) {
          initializeMap();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, initializeMap, mapLoaded, sites]);

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      const { data: newSite, error } = await supabase
        .from('sites')
        .insert([{
          ...data,
          employer_id: parseInt(data.employer_id),
        }])
        .select()
        .single();

      if (error) throw error;
      return newSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({
        title: "Success",
        description: "Site has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create site: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SiteFormData }) => {
      const { data: updatedSite, error } = await supabase
        .from('sites')
        .update({
          ...data,
          employer_id: parseInt(data.employer_id),
        })
        .eq('site_id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({
        title: "Success",
        description: "Site has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedSite(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update site: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete site mutation
  const deleteSiteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', id);

      if (incidentCount && incidentCount > 0) {
        throw new Error(`Cannot delete site with ${incidentCount} incidents`);
      }

      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('site_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({
        title: "Success",
        description: "Site has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Early returns AFTER all hooks are called
  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Show auth required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access Site Management. Please sign in to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      site_name: "",
      street_address: "",
      city: "",
      state: "",
      post_code: "",
      employer_id: "",
      supervisor_name: "",
      supervisor_telephone: "",
      project_type: "",
    });
  };

  const handleEdit = (site: Site) => {
    setSelectedSite(site);
    setFormData({
      site_name: site.site_name,
      street_address: site.street_address || "",
      city: site.city || "",
      state: site.state || "",
      post_code: site.post_code || "",
      employer_id: site.employer_id?.toString() || "",
      supervisor_name: site.supervisor_name || "",
      supervisor_telephone: site.supervisor_telephone || "",
      project_type: site.project_type || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSite) {
      updateSiteMutation.mutate({ 
        id: selectedSite.site_id, 
        data: formData 
      });
    } else {
      createSiteMutation.mutate(formData);
    }
  };

  const filteredSites = sites?.filter(site =>
    site.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.employer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeSites = filteredSites.filter(s => s.status === 'working' || !s.status);
  const inactiveSites = filteredSites.filter(s => s.status === 'paused' || s.status === 'finished');

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Site Management' }
  ];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500">Paused</Badge>;
      case 'finished':
        return <Badge variant="secondary">Finished</Badge>;
      default:
        return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Site Management"
        description="Manage all MEND construction sites across Australia"
        breadcrumbItems={breadcrumbItems}
        customActions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {activeSites.length} Active
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
              {inactiveSites.length} Inactive
            </Badge>
          </div>
        }
      />

      <div className="container mx-auto py-8 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                List View
              </TabsTrigger>
            </TabsList>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Site
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Site</DialogTitle>
                  <DialogDescription>
                    Add a new construction site to the MEND system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="site_name">Site Name *</Label>
                      <Input
                        id="site_name"
                        value={formData.site_name}
                        onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="employer_id">Builder/Employer *</Label>
                      <Select
                        value={formData.employer_id}
                        onValueChange={(value) => setFormData({ ...formData, employer_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employers.map((employer) => (
                            <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>
                              {employer.employer_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="street_address">Street Address</Label>
                      <Input
                        id="street_address"
                        value={formData.street_address}
                        onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NSW">NSW</SelectItem>
                          <SelectItem value="VIC">VIC</SelectItem>
                          <SelectItem value="QLD">QLD</SelectItem>
                          <SelectItem value="WA">WA</SelectItem>
                          <SelectItem value="SA">SA</SelectItem>
                          <SelectItem value="TAS">TAS</SelectItem>
                          <SelectItem value="NT">NT</SelectItem>
                          <SelectItem value="ACT">ACT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="post_code">Post Code</Label>
                      <Input
                        id="post_code"
                        value={formData.post_code}
                        onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project_type">Project Type</Label>
                      <Input
                        id="project_type"
                        value={formData.project_type}
                        onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                        placeholder="e.g., Commercial, Residential"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supervisor_name">Site Supervisor</Label>
                      <Input
                        id="supervisor_name"
                        value={formData.supervisor_name}
                        onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supervisor_telephone">Supervisor Phone</Label>
                      <Input
                        id="supervisor_telephone"
                        value={formData.supervisor_telephone}
                        onChange={(e) => setFormData({ ...formData, supervisor_telephone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Site</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapIcon className="h-5 w-5" />
                  MEND Sites Across Australia
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Active Sites ({activeSites.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    Paused Sites
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    Finished Sites ({inactiveSites.length})
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sitesError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">Error loading sites</p>
                    <p className="text-sm text-red-600">{(sitesError as Error).message}</p>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                    <span className="ml-2">Loading sites...</span>
                  </div>
                )}
                
                {!isLoading && !sitesError && sites?.length === 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 font-medium">No sites found</p>
                    <p className="text-sm text-amber-600">
                      There are no sites in the database yet. Click "Add New Site" to create one.
                    </p>
                  </div>
                )}
                
                {apiKey ? (
                  <div 
                    ref={mapRef} 
                    className="w-full rounded-lg border bg-slate-100"
                    style={{ height: '600px' }}
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border">
                    <div className="text-center p-8">
                      <MapIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Map requires Google Maps API key</h3>
                      <p className="text-sm text-muted-foreground">
                        See GOOGLE_MAPS_SETUP.md for instructions on adding your API key.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Add VITE_GOOGLE_MAPS_API_KEY to your .env file
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      placeholder="Search by site name, city, or employer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {sitesError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">Error loading sites</p>
                    <p className="text-sm text-red-600">{(sitesError as Error).message}</p>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                    <span className="ml-2">Loading sites...</span>
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No sites found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery 
                        ? `No sites match "${searchQuery}"`
                        : "There are no sites in the database yet."}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Site
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Incidents</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSites.map((site) => (
                        <TableRow key={site.site_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{site.site_name}</div>
                              {site.project_type && (
                                <div className="text-sm text-muted-foreground">{site.project_type}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{site.employer_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{site.city}, {site.state}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {site.supervisor_name ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {site.supervisor_name}
                                </div>
                                {site.supervisor_telephone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    {site.supervisor_telephone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(site.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {site.incident_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(site)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${site.site_name}?`)) {
                                    deleteSiteMutation.mutate(site.site_id);
                                  }
                                }}
                                disabled={site.incident_count > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Site</DialogTitle>
              <DialogDescription>
                Update the site's information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_site_name">Site Name *</Label>
                  <Input
                    id="edit_site_name"
                    value={formData.site_name}
                    onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_employer_id">Builder/Employer *</Label>
                  <Select
                    value={formData.employer_id}
                    onValueChange={(value) => setFormData({ ...formData, employer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employers.map((employer) => (
                        <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>
                          {employer.employer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_street_address">Street Address</Label>
                  <Input
                    id="edit_street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_city">City *</Label>
                  <Input
                    id="edit_city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_post_code">Post Code</Label>
                  <Input
                    id="edit_post_code"
                    value={formData.post_code}
                    onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_project_type">Project Type</Label>
                  <Input
                    id="edit_project_type"
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_supervisor_name">Site Supervisor</Label>
                  <Input
                    id="edit_supervisor_name"
                    value={formData.supervisor_name}
                    onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_supervisor_telephone">Supervisor Phone</Label>
                  <Input
                    id="edit_supervisor_telephone"
                    value={formData.supervisor_telephone}
                    onChange={(e) => setFormData({ ...formData, supervisor_telephone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Add type declaration for google maps
declare global {
  interface Window {
    google: typeof google;
  }
}


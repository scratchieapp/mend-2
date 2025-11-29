import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
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
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleSitesMap, SiteLocation, HeadOffice } from "@/components/maps/GoogleSitesMap";

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
  aliases?: string[];
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
  aliases: string;
  latitude?: number;
  longitude?: number;
}

interface Employer {
  employer_id: number;
  employer_name: string;
  employer_address?: string;
  employer_state?: string;
  employer_post_code?: string;
}

export default function SiteManagementAdmin() {
  const { isAuthenticated, isLoading: authLoading, userData } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showMap, setShowMap] = useState(true);
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
    aliases: "",
    latitude: undefined,
    longitude: undefined,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch employers for dropdown and head office markers
  const { data: employers = [] } = useQuery<Employer[]>({
    queryKey: ['employers-with-address'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name, employer_address, employer_state, employer_post_code')
        .order('employer_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated && !authLoading
  });

  // Fetch sites with related data
  const { data: sites, isLoading, error: sitesError } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select(`
          *,
          employers:employer_id(employer_name)
        `)
        .order('site_name');

      if (sitesError) throw sitesError;
      if (!sitesData || sitesData.length === 0) return [];

      // Get latest status for each site
      const { data: statusHistory } = await supabase
        .from('site_status_history')
        .select('site_id, status, month')
        .order('month', { ascending: false });

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

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];
      
      const { data: newSite, error } = await supabase
        .from('sites')
        .insert([{
          site_name: data.site_name,
          street_address: data.street_address,
          city: data.city,
          state: data.state,
          post_code: data.post_code,
          supervisor_name: data.supervisor_name,
          supervisor_telephone: data.supervisor_telephone,
          project_type: data.project_type,
          latitude: data.latitude,
          longitude: data.longitude,
          employer_id: parseInt(data.employer_id),
          aliases: aliasesArray,
        }])
        .select()
        .single();

      if (error) throw error;
      return newSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({ title: "Success", description: "Site has been created successfully." });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create site: ${error.message}`, variant: "destructive" });
    }
  });

  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SiteFormData }) => {
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];
      
      const { data: updatedSite, error } = await supabase
        .from('sites')
        .update({
          site_name: data.site_name,
          street_address: data.street_address,
          city: data.city,
          state: data.state,
          post_code: data.post_code,
          supervisor_name: data.supervisor_name,
          supervisor_telephone: data.supervisor_telephone,
          project_type: data.project_type,
          latitude: data.latitude,
          longitude: data.longitude,
          employer_id: parseInt(data.employer_id),
          aliases: aliasesArray,
        })
        .eq('site_id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({ title: "Success", description: "Site has been updated successfully." });
      setIsEditDialogOpen(false);
      setSelectedSite(null);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update site: ${error.message}`, variant: "destructive" });
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

      const { error } = await supabase.from('sites').delete().eq('site_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      toast({ title: "Success", description: "Site has been deleted successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Loading/Auth states
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access Site Management.
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
      aliases: "",
      latitude: undefined,
      longitude: undefined,
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
      aliases: site.aliases?.join(', ') || "",
      latitude: site.latitude,
      longitude: site.longitude,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSite) {
      updateSiteMutation.mutate({ id: selectedSite.site_id, data: formData });
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
      case 'working': return <Badge className="bg-green-500">Active</Badge>;
      case 'paused': return <Badge className="bg-amber-500">Paused</Badge>;
      case 'finished': return <Badge variant="secondary">Finished</Badge>;
      default: return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  // Transform sites for map component
  const mapSites: SiteLocation[] = (sites || []).map(site => ({
    site_id: site.site_id,
    site_name: site.site_name,
    employer_name: site.employer_name,
    employer_id: site.employer_id,
    street_address: site.street_address,
    city: site.city,
    state: site.state,
    post_code: site.post_code,
    latitude: site.latitude,
    longitude: site.longitude,
    status: site.status,
    incident_count: site.incident_count,
  }));

  // Transform employers for head office markers
  const headOffices: HeadOffice[] = employers.map(emp => ({
    employer_id: emp.employer_id,
    employer_name: emp.employer_name,
    employer_address: emp.employer_address,
    employer_state: emp.employer_state,
    employer_post_code: emp.employer_post_code,
  }));

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

      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2"
          >
            {showMap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Site</DialogTitle>
                <DialogDescription>Add a new construction site to the MEND system.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="site_name">Site Name *</Label>
                    <Input id="site_name" value={formData.site_name} onChange={(e) => setFormData({ ...formData, site_name: e.target.value })} required />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="employer_id">Builder/Employer *</Label>
                    <Select value={formData.employer_id} onValueChange={(value) => setFormData({ ...formData, employer_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Select employer..." /></SelectTrigger>
                      <SelectContent>
                        {employers.map((employer) => (
                          <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>{employer.employer_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street_address">Street Address</Label>
                    <AddressAutocomplete
                      id="street_address"
                      value={formData.street_address}
                      onChange={(value) => setFormData({ ...formData, street_address: value })}
                      onAddressChange={(address) => {
                        setFormData(prev => ({
                          ...prev,
                          street_address: address.streetAddress,
                          city: address.city,
                          state: address.state,
                          post_code: address.postCode,
                          latitude: address.latitude,
                          longitude: address.longitude,
                        }));
                      }}
                      placeholder="Start typing an address..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                      <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                      <SelectContent>
                        {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post_code">Post Code</Label>
                    <Input id="post_code" value={formData.post_code} onChange={(e) => setFormData({ ...formData, post_code: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project_type">Project Type</Label>
                    <Input id="project_type" value={formData.project_type} onChange={(e) => setFormData({ ...formData, project_type: e.target.value })} placeholder="e.g., Commercial, Residential" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor_name">Site Supervisor</Label>
                    <Input id="supervisor_name" value={formData.supervisor_name} onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor_telephone">Supervisor Phone</Label>
                    <Input id="supervisor_telephone" value={formData.supervisor_telephone} onChange={(e) => setFormData({ ...formData, supervisor_telephone: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="aliases">Voice Agent Aliases</Label>
                    <Input id="aliases" value={formData.aliases} onChange={(e) => setFormData({ ...formData, aliases: e.target.value })} placeholder="e.g., Curry Curry, Kerry Kerry (comma-separated)" />
                    <p className="text-xs text-muted-foreground">Alternative names/phonetic spellings for voice agent recognition</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Site</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Map Section */}
        {showMap && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                MEND Sites Across Australia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {sitesError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">Error loading sites</p>
                  <p className="text-sm text-red-600">{(sitesError as Error).message}</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                  <span className="ml-2">Loading sites...</span>
                </div>
              ) : (
                <GoogleSitesMap 
                  sites={mapSites} 
                  headOffices={headOffices}
                  height="500px"
                  showLegend={true}
                  onSiteClick={(site) => {
                    const fullSite = sites?.find(s => s.site_id === site.site_id);
                    if (fullSite) handleEdit(fullSite);
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Sites List Section */}
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

            {sitesError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">Error loading sites</p>
                <p className="text-sm text-red-600">{(sitesError as Error).message}</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                <span className="ml-2">Loading sites...</span>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sites found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? `No sites match "${searchQuery}"` : "There are no sites in the database yet."}
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
                          {site.project_type && <div className="text-sm text-muted-foreground">{site.project_type}</div>}
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
                      <TableCell>{getStatusBadge(site.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{site.incident_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(site)}>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Site</DialogTitle>
              <DialogDescription>Update the site's information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_site_name">Site Name *</Label>
                  <Input id="edit_site_name" value={formData.site_name} onChange={(e) => setFormData({ ...formData, site_name: e.target.value })} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_employer_id">Builder/Employer *</Label>
                  <Select value={formData.employer_id} onValueChange={(value) => setFormData({ ...formData, employer_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select employer..." /></SelectTrigger>
                    <SelectContent>
                      {employers.map((employer) => (
                        <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>{employer.employer_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_street_address">Street Address</Label>
                  <AddressAutocomplete
                    id="edit_street_address"
                    value={formData.street_address}
                    onChange={(value) => setFormData({ ...formData, street_address: value })}
                    onAddressChange={(address) => {
                      setFormData(prev => ({
                        ...prev,
                        street_address: address.streetAddress,
                        city: address.city,
                        state: address.state,
                        post_code: address.postCode,
                        latitude: address.latitude,
                        longitude: address.longitude,
                      }));
                    }}
                    placeholder="Start typing an address..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_city">City *</Label>
                  <Input id="edit_city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_state">State *</Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                    <SelectContent>
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_post_code">Post Code</Label>
                  <Input id="edit_post_code" value={formData.post_code} onChange={(e) => setFormData({ ...formData, post_code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_project_type">Project Type</Label>
                  <Input id="edit_project_type" value={formData.project_type} onChange={(e) => setFormData({ ...formData, project_type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_supervisor_name">Site Supervisor</Label>
                  <Input id="edit_supervisor_name" value={formData.supervisor_name} onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_supervisor_telephone">Supervisor Phone</Label>
                  <Input id="edit_supervisor_telephone" value={formData.supervisor_telephone} onChange={(e) => setFormData({ ...formData, supervisor_telephone: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_aliases">Voice Agent Aliases</Label>
                  <Input id="edit_aliases" value={formData.aliases} onChange={(e) => setFormData({ ...formData, aliases: e.target.value })} placeholder="e.g., Curry Curry, Kerry Kerry (comma-separated)" />
                  <p className="text-xs text-muted-foreground">Alternative names/phonetic spellings for voice agent recognition</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    google: typeof google;
  }
}

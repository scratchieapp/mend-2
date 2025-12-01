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
  Building2,
  Phone,
  User,
  Map as MapIcon,
  AlertCircle,
  Eye,
  EyeOff,
  Stethoscope,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Archive,
  Filter,
  PauseCircle,
  Trash2,
  Edit
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
  supervisor_id?: number;
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

interface SupervisorWorker {
  worker_id: number;
  given_name: string;
  family_name: string;
  full_name: string;
  occupation: string;
  mobile_number: string;
  phone_number: string;
  email: string;
}

interface MedicalCenter {
  id: string;
  name: string;
  phone_number: string;
  address: string;
  suburb: string;
  postcode: string;
  state: string;
  active: boolean;
  mend_prepared: boolean;
  mend_prepared_at: string | null;
  mend_prepared_by: string | null;
}

interface SiteMedicalCenterSelection {
  medical_center_id: string;
  priority: number; // 1=primary, 2=backup1, 3=backup2
  notes?: string;
}

interface SiteFormData {
  site_name: string;
  street_address: string;
  city: string;
  state: string;
  post_code: string;
  supervisor_id?: number;
  supervisor_name: string;
  supervisor_telephone: string;
  project_type: string;
  aliases: string;
  latitude?: number;
  longitude?: number;
}

// Format phone to Australian format
const formatAustralianPhone = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Mobile (04xx)
  if (digits.startsWith('04') || digits.startsWith('614')) {
    const mobile = digits.startsWith('614') ? '0' + digits.slice(2) : digits;
    if (mobile.length === 10) {
      return `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7)}`;
    }
  }
  
  // Landline (02, 03, 07, 08)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  
  return phone;
};

export default function BuilderSiteManagement() {
  const { isAuthenticated, isLoading: authLoading, userData } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewSupervisorDialogOpen, setIsNewSupervisorDialogOpen] = useState(false);
  const [isNewMedicalCenterDialogOpen, setIsNewMedicalCenterDialogOpen] = useState(false);
  const [pendingMedicalCenterPriority, setPendingMedicalCenterPriority] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [newMedicalCenterData, setNewMedicalCenterData] = useState({
    name: "",
    phone_number: "",
    address: "",
    suburb: "",
    postcode: "",
    state: "",
  });
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: "",
    street_address: "",
    city: "",
    state: "",
    post_code: "",
    supervisor_id: undefined,
    supervisor_name: "",
    supervisor_telephone: "",
    project_type: "",
    aliases: "",
    latitude: undefined,
    longitude: undefined,
  });
  const [newSupervisorData, setNewSupervisorData] = useState({
    given_name: "",
    family_name: "",
    mobile_number: "",
    occupation: "Site Supervisor",
  });
  const [medicalCenterSelections, setMedicalCenterSelections] = useState<SiteMedicalCenterSelection[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get employer info from user data
  const userEmployerId = userData?.employer_id ? parseInt(userData.employer_id) : null;
  const userEmployerName = userData?.employer_name || "Your Company";

  // Fetch employer for head office marker
  const { data: employer } = useQuery({
    queryKey: ['employer-details', userEmployerId],
    queryFn: async () => {
      if (!userEmployerId) return null;
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name, employer_address, employer_state, employer_post_code')
        .eq('employer_id', userEmployerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userEmployerId && isAuthenticated && !authLoading
  });

  // Fetch supervisor workers (managers, supervisors, foremen, etc.)
  const { data: supervisorWorkers, refetch: refetchSupervisors } = useQuery({
    queryKey: ['supervisor-workers', userEmployerId],
    queryFn: async () => {
      if (!userEmployerId) return [];
      const { data, error } = await supabase.rpc('get_supervisor_workers', {
        p_employer_id: userEmployerId,
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId
      });
      if (error) {
        console.error('Error fetching supervisor workers:', error);
        return [];
      }
      return (data || []) as SupervisorWorker[];
    },
    enabled: !!userEmployerId && isAuthenticated && !authLoading
  });

  // Fetch all active medical centers
  const { data: medicalCenters = [] } = useQuery({
    queryKey: ['medical-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_centers')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as MedicalCenter[];
    },
    enabled: isAuthenticated && !authLoading
  });

  // Fetch sites for this employer
  const { data: sites, isLoading, error: sitesError } = useQuery({
    queryKey: ['builder-sites', userEmployerId],
    queryFn: async () => {
      if (!userEmployerId) return [];
      
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('employer_id', userEmployerId)
        .order('site_name');

      if (sitesError) throw sitesError;
      if (!sitesData || sitesData.length === 0) return [];

      // Get latest status for each site
      const { data: statusHistory } = await supabase
        .from('site_status_history')
        .select('site_id, status, month')
        .in('site_id', sitesData.map(s => s.site_id))
        .order('month', { ascending: false });

      const statusMap = new Map<number, string>();
      statusHistory?.forEach(item => {
        if (!statusMap.has(item.site_id)) {
          statusMap.set(item.site_id, item.status);
        }
      });

      // Fetch incident counts
      const sitesWithCounts = await Promise.all(
        sitesData.map(async (site) => {
          const { count: incidentCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', site.site_id);

          return {
            ...site,
            employer_name: userEmployerName,
            incident_count: incidentCount || 0,
            status: (statusMap.get(site.site_id) || 'working') as 'working' | 'paused' | 'finished',
          };
        })
      );

      return sitesWithCounts;
    },
    enabled: !!userEmployerId && isAuthenticated && !authLoading
  });

  // Create new supervisor mutation
  const createSupervisorMutation = useMutation({
    mutationFn: async (data: typeof newSupervisorData) => {
      const { data: result, error } = await supabase.rpc('add_worker_rbac', {
        p_given_name: data.given_name,
        p_family_name: data.family_name,
        p_mobile_number: data.mobile_number,
        p_occupation: data.occupation,
        p_employer_id: userEmployerId,
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId
      });
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to create supervisor');
      return result;
    },
    onSuccess: async (result) => {
      await refetchSupervisors();
      // Set the new supervisor as selected
      if (result.worker_id) {
        const newSupervisor = supervisorWorkers?.find(s => s.worker_id === result.worker_id);
        setFormData(prev => ({
          ...prev,
          supervisor_id: result.worker_id,
          supervisor_name: `${newSupervisorData.given_name} ${newSupervisorData.family_name}`,
          supervisor_telephone: newSupervisorData.mobile_number,
        }));
      }
      toast({ title: "Success", description: "New supervisor added successfully." });
      setIsNewSupervisorDialogOpen(false);
      setNewSupervisorData({ given_name: "", family_name: "", mobile_number: "", occupation: "Site Supervisor" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create supervisor: ${error.message}`, variant: "destructive" });
    }
  });

  // Create site mutation - uses RBAC function to bypass RLS securely
  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : null;
      
      const { data: result, error } = await supabase.rpc('add_site_rbac', {
        p_site_name: data.site_name,
        p_employer_id: userEmployerId,
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId,
        p_street_address: data.street_address || null,
        p_city: data.city || null,
        p_state: data.state || null,
        p_post_code: data.post_code || null,
        p_supervisor_id: data.supervisor_id || null,
        p_supervisor_name: data.supervisor_name || null,
        p_supervisor_telephone: data.supervisor_telephone || null,
        p_project_type: data.project_type || null,
        p_latitude: data.latitude || null,
        p_longitude: data.longitude || null,
        p_aliases: aliasesArray,
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to create site');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-sites', userEmployerId] });
      toast({ title: "Success", description: "Site has been created successfully." });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create site: ${error.message}`, variant: "destructive" });
    }
  });

  // Update site mutation - uses RBAC function to bypass RLS securely
  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SiteFormData }) => {
      const aliasesArray = data.aliases
        ? data.aliases.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : null;
      
      const { data: result, error } = await supabase.rpc('update_site_rbac', {
        p_site_id: id,
        p_site_name: data.site_name,
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId,
        p_street_address: data.street_address || null,
        p_city: data.city || null,
        p_state: data.state || null,
        p_post_code: data.post_code || null,
        p_supervisor_id: data.supervisor_id || null,
        p_supervisor_name: data.supervisor_name || null,
        p_supervisor_telephone: data.supervisor_telephone || null,
        p_project_type: data.project_type || null,
        p_latitude: data.latitude || null,
        p_longitude: data.longitude || null,
        p_aliases: aliasesArray,
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to update site');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-sites', userEmployerId] });
      toast({ title: "Success", description: "Site has been updated successfully." });
      setIsEditDialogOpen(false);
      setSelectedSite(null);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update site: ${error.message}`, variant: "destructive" });
    }
  });

  // Delete site mutation - uses RBAC function to bypass RLS securely
  const deleteSiteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data: result, error } = await supabase.rpc('delete_site_rbac', {
        p_site_id: id,
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId,
      });
        
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to delete site');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-sites', userEmployerId] });
      toast({ title: "Success", description: "Site has been deleted successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Save site medical centers mutation
  const saveSiteMedicalCentersMutation = useMutation({
    mutationFn: async ({ siteId, selections }: { siteId: number; selections: SiteMedicalCenterSelection[] }) => {
      const { data: result, error } = await supabase.rpc('set_site_medical_centers', {
        p_site_id: siteId,
        p_medical_centers: selections.filter(s => s.medical_center_id),
        p_user_role_id: userData?.role_id ? parseInt(userData.role_id) : null,
        p_user_employer_id: userEmployerId,
        p_created_by: userData?.display_name || userData?.email || 'system'
      });
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to save medical centers');
      return result;
    },
    onError: (error) => {
      console.error('Error saving medical centers:', error);
    }
  });

  // Fetch site medical centers when editing
  const fetchSiteMedicalCenters = async (siteId: number) => {
    const { data, error } = await supabase.rpc('get_site_medical_centers', {
      p_site_id: siteId
    });
    if (error) {
      console.error('Error fetching site medical centers:', error);
      return [];
    }
    return (data || []).map((mc: any) => ({
      medical_center_id: mc.id,
      priority: mc.priority,
      notes: mc.notes
    }));
  };

  // Create new medical center mutation
  const createMedicalCenterMutation = useMutation({
    mutationFn: async (data: typeof newMedicalCenterData) => {
      const { data: result, error } = await supabase
        .from('medical_centers')
        .insert({
          name: data.name,
          phone_number: data.phone_number,
          address: data.address,
          suburb: data.suburb,
          postcode: data.postcode,
          state: data.state,
          active: true,
          mend_prepared: false,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['medical-centers'] });
      toast({ title: "Success", description: "Medical center added successfully." });
      setIsNewMedicalCenterDialogOpen(false);
      // Auto-select the new medical center in the dropdown that triggered the creation
      if (result?.id && pendingMedicalCenterPriority) {
        updateMedicalCenterSelection(pendingMedicalCenterPriority, result.id);
        setPendingMedicalCenterPriority(null);
      }
      setNewMedicalCenterData({ name: "", phone_number: "", address: "", suburb: "", postcode: "", state: "" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create medical center: ${error.message}`, variant: "destructive" });
    }
  });

  // Update site status mutation
  const updateSiteStatusMutation = useMutation({
    mutationFn: async ({ siteId, status }: { siteId: number; status: 'working' | 'paused' | 'finished' }) => {
      const { error } = await supabase
        .from('site_status_history')
        .insert({
          site_id: siteId,
          status: status,
          month: new Date().toISOString().slice(0, 7) + '-01', // First of current month
        });
      if (error) throw error;
      return { siteId, status };
    },
    onSuccess: ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ['builder-sites', userEmployerId] });
      const statusLabels = { working: 'Active', paused: 'Paused', finished: 'Finished' };
      toast({ title: "Status Updated", description: `Site is now ${statusLabels[status]}.` });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
    }
  });

  // Loading/Auth states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
          <AlertDescription>You must be logged in to access Site Management.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userEmployerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Employer Assigned</AlertTitle>
          <AlertDescription>Your account is not associated with an employer. Please contact support.</AlertDescription>
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
      supervisor_id: undefined,
      supervisor_name: "",
      supervisor_telephone: "",
      project_type: "",
      aliases: "",
      latitude: undefined,
      longitude: undefined,
    });
    setMedicalCenterSelections([]);
  };

  const handleEdit = async (site: Site) => {
    setSelectedSite(site);
    setFormData({
      site_name: site.site_name,
      street_address: site.street_address || "",
      city: site.city || "",
      state: site.state || "",
      post_code: site.post_code || "",
      supervisor_id: site.supervisor_id,
      supervisor_name: site.supervisor_name || "",
      supervisor_telephone: site.supervisor_telephone || "",
      project_type: site.project_type || "",
      aliases: site.aliases?.join(', ') || "",
      latitude: site.latitude,
      longitude: site.longitude,
    });
    // Fetch existing medical center assignments
    const existingMedicalCenters = await fetchSiteMedicalCenters(site.site_id);
    setMedicalCenterSelections(existingMedicalCenters);
    setIsEditDialogOpen(true);
  };

  // Handle supervisor selection from dropdown
  const handleSupervisorSelect = (value: string) => {
    if (value === 'new') {
      setIsNewSupervisorDialogOpen(true);
      return;
    }
    
    const workerId = parseInt(value);
    const supervisor = supervisorWorkers?.find(s => s.worker_id === workerId);
    
    if (supervisor) {
      setFormData(prev => ({
        ...prev,
        supervisor_id: workerId,
        supervisor_name: supervisor.full_name,
        supervisor_telephone: formatAustralianPhone(supervisor.mobile_number || supervisor.phone_number || ''),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSite) {
      updateSiteMutation.mutate({ id: selectedSite.site_id, data: formData }, {
        onSuccess: () => {
          // Save medical centers after site update
          if (medicalCenterSelections.length > 0) {
            saveSiteMedicalCentersMutation.mutate({
              siteId: selectedSite.site_id,
              selections: medicalCenterSelections
            });
          }
        }
      });
    } else {
      createSiteMutation.mutate(formData, {
        onSuccess: (result: any) => {
          // Save medical centers after site creation
          if (result?.site?.site_id && medicalCenterSelections.length > 0) {
            saveSiteMedicalCentersMutation.mutate({
              siteId: result.site.site_id,
              selections: medicalCenterSelections
            });
          }
        }
      });
    }
  };

  // Helper to update medical center selection
  const updateMedicalCenterSelection = (priority: number, medicalCenterId: string) => {
    setMedicalCenterSelections(prev => {
      const filtered = prev.filter(s => s.priority !== priority);
      // "none" is our placeholder for clearing the selection
      if (medicalCenterId && medicalCenterId !== 'none') {
        return [...filtered, { medical_center_id: medicalCenterId, priority }].sort((a, b) => a.priority - b.priority);
      }
      return filtered;
    });
  };

  // Get selected medical center for a priority level
  const getSelectedMedicalCenter = (priority: number): string => {
    const selection = medicalCenterSelections.find(s => s.priority === priority)?.medical_center_id;
    return selection || 'none';
  };

  // Filter sites by search and status
  const filteredSites = sites?.filter(site => {
    const matchesSearch = site.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const siteStatus = site.status || 'working';
    if (statusFilter === 'active') return siteStatus === 'working';
    if (statusFilter === 'inactive') return siteStatus === 'paused' || siteStatus === 'finished';
    return true; // 'all'
  }) || [];

  const activeSites = (sites || []).filter(s => s.status === 'working' || !s.status);
  const inactiveSites = (sites || []).filter(s => s.status === 'paused' || s.status === 'finished');

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/builder' },
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

  // Head office marker
  const headOffices: HeadOffice[] = employer ? [{
    employer_id: employer.employer_id,
    employer_name: employer.employer_name,
    employer_address: employer.employer_address,
    employer_state: employer.employer_state,
    employer_post_code: employer.employer_post_code,
  }] : [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Site Management"
        description={`Manage construction sites for ${userEmployerName}`}
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
                <DialogDescription>Add a new construction site for {userEmployerName}.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="site_name">Site Name *</Label>
                    <Input id="site_name" value={formData.site_name} onChange={(e) => setFormData({ ...formData, site_name: e.target.value })} required />
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
                          street_address: address.streetAddress || address.formattedAddress,
                          city: address.city,
                          state: address.state,
                          post_code: address.postCode,
                          latitude: address.latitude,
                          longitude: address.longitude,
                        }));
                      }}
                      searchType="all"
                      placeholder="Start typing a location or address..."
                    />
                    <p className="text-xs text-muted-foreground">Search for addresses, roads, or locations</p>
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
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="supervisor_id">Site Supervisor</Label>
                    <Select 
                      value={formData.supervisor_id?.toString() || ''} 
                      onValueChange={handleSupervisorSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supervisor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisorWorkers && supervisorWorkers.length > 0 ? (
                          <>
                            {supervisorWorkers.map(worker => (
                              <SelectItem key={worker.worker_id} value={worker.worker_id.toString()}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{worker.full_name}</span>
                                  {worker.occupation && (
                                    <span className="text-xs text-muted-foreground">({worker.occupation})</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                            <SelectItem value="new" className="text-primary font-medium">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                <span>Add New Supervisor...</span>
                              </div>
                            </SelectItem>
                          </>
                        ) : (
                          <SelectItem value="new" className="text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Add New Supervisor...</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formData.supervisor_id && formData.supervisor_telephone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {formData.supervisor_telephone}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="aliases">Voice Agent Aliases</Label>
                    <Input id="aliases" value={formData.aliases} onChange={(e) => setFormData({ ...formData, aliases: e.target.value })} placeholder="e.g., Curry Curry, Kerry Kerry (comma-separated)" />
                    <p className="text-xs text-muted-foreground">Alternative names/phonetic spellings for voice agent recognition</p>
                  </div>

                  {/* Medical Center Assignment Section */}
                  <div className="col-span-2 space-y-4 border-t pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-muted-foreground" />
                      <Label className="text-base font-medium">Preferred Medical Centers</Label>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-2">
                      Select medical centers for AI voice agent to use when booking appointments for injured workers at this site.
                    </p>
                    
                    {/* Primary Medical Center */}
                    <div className="space-y-2">
                      <Label htmlFor="primary_medical_center" className="text-sm">
                        Primary Medical Center
                        <Badge variant="outline" className="ml-2 text-xs">Required for AI booking</Badge>
                      </Label>
                      <Select
                        value={getSelectedMedicalCenter(1)}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setPendingMedicalCenterPriority(1);
                            setIsNewMedicalCenterDialogOpen(true);
                          } else {
                            updateMedicalCenterSelection(1, value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary medical center..." />
                        </SelectTrigger>
                        <SelectContent>
                          {medicalCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              <div className="flex items-center gap-2">
                                <span>{center.name}</span>
                                <span className="text-xs text-muted-foreground">({center.suburb}, {center.state})</span>
                                {center.mend_prepared ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Add New Medical Center...</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getSelectedMedicalCenter(1) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {medicalCenters.find(c => c.id === getSelectedMedicalCenter(1))?.mend_prepared ? (
                            <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                          ) : (
                            <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Backup 1 Medical Center */}
                    <div className="space-y-2">
                      <Label htmlFor="backup1_medical_center" className="text-sm">Backup Medical Center 1 (Optional)</Label>
                      <Select
                        value={getSelectedMedicalCenter(2)}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setPendingMedicalCenterPriority(2);
                            setIsNewMedicalCenterDialogOpen(true);
                          } else {
                            updateMedicalCenterSelection(2, value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select backup medical center..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {medicalCenters
                            .filter(c => c.id !== getSelectedMedicalCenter(1))
                            .map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                <div className="flex items-center gap-2">
                                  <span>{center.name}</span>
                                  <span className="text-xs text-muted-foreground">({center.suburb})</span>
                                  {center.mend_prepared ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          <SelectItem value="new" className="text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Add New Medical Center...</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getSelectedMedicalCenter(2) && getSelectedMedicalCenter(2) !== 'none' && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {medicalCenters.find(c => c.id === getSelectedMedicalCenter(2))?.mend_prepared ? (
                            <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                          ) : (
                            <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Backup 2 Medical Center */}
                    <div className="space-y-2">
                      <Label htmlFor="backup2_medical_center" className="text-sm">Backup Medical Center 2 (Optional)</Label>
                      <Select
                        value={getSelectedMedicalCenter(3)}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setPendingMedicalCenterPriority(3);
                            setIsNewMedicalCenterDialogOpen(true);
                          } else {
                            updateMedicalCenterSelection(3, value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select backup medical center..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {medicalCenters
                            .filter(c => c.id !== getSelectedMedicalCenter(1) && c.id !== getSelectedMedicalCenter(2))
                            .map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                <div className="flex items-center gap-2">
                                  <span>{center.name}</span>
                                  <span className="text-xs text-muted-foreground">({center.suburb})</span>
                                  {center.mend_prepared ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          <SelectItem value="new" className="text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Add New Medical Center...</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getSelectedMedicalCenter(3) && getSelectedMedicalCenter(3) !== 'none' && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {medicalCenters.find(c => c.id === getSelectedMedicalCenter(3))?.mend_prepared ? (
                            <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                          ) : (
                            <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                          )}
                        </div>
                      )}
                    </div>
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
                {userEmployerName} Sites
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
            <div className="mb-6 flex items-center gap-4">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by site name or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Sites</SelectItem>
                  <SelectItem value="inactive">Paused / Finished</SelectItem>
                  <SelectItem value="all">All Sites</SelectItem>
                </SelectContent>
              </Select>
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
                  {searchQuery ? `No sites match "${searchQuery}"` : "You haven't added any sites yet."}
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
                    <TableHead>Location</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Incidents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => (
                    <TableRow 
                      key={site.site_id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEdit(site)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{site.site_name}</div>
                          {site.project_type && <div className="text-sm text-muted-foreground">{site.project_type}</div>}
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
                  <Label htmlFor="edit_street_address">Street Address</Label>
                  <AddressAutocomplete
                    id="edit_street_address"
                    value={formData.street_address}
                    onChange={(value) => setFormData({ ...formData, street_address: value })}
                    onAddressChange={(address) => {
                      setFormData(prev => ({
                        ...prev,
                        street_address: address.streetAddress || address.formattedAddress,
                        city: address.city,
                        state: address.state,
                        post_code: address.postCode,
                        latitude: address.latitude,
                        longitude: address.longitude,
                      }));
                    }}
                    searchType="all"
                    placeholder="Start typing a location or address..."
                  />
                  <p className="text-xs text-muted-foreground">Search for addresses, roads, or locations</p>
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
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_supervisor_id">Site Supervisor</Label>
                  <Select 
                    value={formData.supervisor_id?.toString() || ''} 
                    onValueChange={handleSupervisorSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.supervisor_name || "Select a supervisor..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisorWorkers && supervisorWorkers.length > 0 ? (
                        <>
                          {supervisorWorkers.map(worker => (
                            <SelectItem key={worker.worker_id} value={worker.worker_id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{worker.full_name}</span>
                                {worker.occupation && (
                                  <span className="text-xs text-muted-foreground">({worker.occupation})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="text-primary font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Add New Supervisor...</span>
                            </div>
                          </SelectItem>
                        </>
                      ) : (
                        <SelectItem value="new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Add New Supervisor...</span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formData.supervisor_telephone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {formData.supervisor_telephone}
                    </p>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_aliases">Voice Agent Aliases</Label>
                  <Input id="edit_aliases" value={formData.aliases} onChange={(e) => setFormData({ ...formData, aliases: e.target.value })} placeholder="e.g., Curry Curry, Kerry Kerry (comma-separated)" />
                  <p className="text-xs text-muted-foreground">Alternative names/phonetic spellings for voice agent recognition</p>
                </div>

                {/* Medical Center Assignment Section */}
                <div className="col-span-2 space-y-4 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Preferred Medical Centers</Label>
                  </div>
                  <p className="text-sm text-muted-foreground -mt-2">
                    Select medical centers for AI voice agent to use when booking appointments for injured workers at this site.
                  </p>
                  
                  {/* Primary Medical Center */}
                  <div className="space-y-2">
                    <Label htmlFor="edit_primary_medical_center" className="text-sm">
                      Primary Medical Center
                      <Badge variant="outline" className="ml-2 text-xs">Required for AI booking</Badge>
                    </Label>
                    <Select
                      value={getSelectedMedicalCenter(1)}
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setPendingMedicalCenterPriority(1);
                          setIsNewMedicalCenterDialogOpen(true);
                        } else {
                          updateMedicalCenterSelection(1, value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary medical center..." />
                      </SelectTrigger>
                      <SelectContent>
                        {medicalCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            <div className="flex items-center gap-2">
                              <span>{center.name}</span>
                              <span className="text-xs text-muted-foreground">({center.suburb}, {center.state})</span>
                              {center.mend_prepared ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Add New Medical Center...</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getSelectedMedicalCenter(1) && getSelectedMedicalCenter(1) !== 'none' && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {medicalCenters.find(c => c.id === getSelectedMedicalCenter(1))?.mend_prepared ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                        ) : (
                          <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Backup 1 Medical Center */}
                  <div className="space-y-2">
                    <Label htmlFor="edit_backup1_medical_center" className="text-sm">Backup Medical Center 1 (Optional)</Label>
                    <Select
                      value={getSelectedMedicalCenter(2)}
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setPendingMedicalCenterPriority(2);
                          setIsNewMedicalCenterDialogOpen(true);
                        } else {
                          updateMedicalCenterSelection(2, value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select backup medical center..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {medicalCenters
                          .filter(c => c.id !== getSelectedMedicalCenter(1))
                          .map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              <div className="flex items-center gap-2">
                                <span>{center.name}</span>
                                <span className="text-xs text-muted-foreground">({center.suburb})</span>
                                {center.mend_prepared ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        <SelectItem value="new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Add New Medical Center...</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getSelectedMedicalCenter(2) && getSelectedMedicalCenter(2) !== 'none' && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {medicalCenters.find(c => c.id === getSelectedMedicalCenter(2))?.mend_prepared ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                        ) : (
                          <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Backup 2 Medical Center */}
                  <div className="space-y-2">
                    <Label htmlFor="edit_backup2_medical_center" className="text-sm">Backup Medical Center 2 (Optional)</Label>
                    <Select
                      value={getSelectedMedicalCenter(3)}
                      onValueChange={(value) => {
                        if (value === 'new') {
                          setPendingMedicalCenterPriority(3);
                          setIsNewMedicalCenterDialogOpen(true);
                        } else {
                          updateMedicalCenterSelection(3, value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select backup medical center..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {medicalCenters
                          .filter(c => c.id !== getSelectedMedicalCenter(1) && c.id !== getSelectedMedicalCenter(2))
                          .map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              <div className="flex items-center gap-2">
                                <span>{center.name}</span>
                                <span className="text-xs text-muted-foreground">({center.suburb})</span>
                                {center.mend_prepared ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        <SelectItem value="new" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Add New Medical Center...</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getSelectedMedicalCenter(3) && getSelectedMedicalCenter(3) !== 'none' && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {medicalCenters.find(c => c.id === getSelectedMedicalCenter(3))?.mend_prepared ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Prepared for AI calls</>
                        ) : (
                          <><Clock className="h-3 w-3 text-amber-500" /> Needs briefing before AI calls</>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Site Status Management */}
                <div className="col-span-2 space-y-4 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Site Status</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSite && (
                      <>
                        {(selectedSite.status === 'paused' || selectedSite.status === 'finished') && (
                          <Button 
                            type="button" 
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              updateSiteStatusMutation.mutate({ siteId: selectedSite.site_id, status: 'working' });
                              setIsEditDialogOpen(false);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Reactivate Site
                          </Button>
                        )}
                        {(!selectedSite.status || selectedSite.status === 'working') && (
                          <>
                            <Button 
                              type="button" 
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                updateSiteStatusMutation.mutate({ siteId: selectedSite.site_id, status: 'paused' });
                                setIsEditDialogOpen(false);
                              }}
                            >
                              <PauseCircle className="h-4 w-4 text-amber-500" />
                              Pause Site
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                updateSiteStatusMutation.mutate({ siteId: selectedSite.site_id, status: 'finished' });
                                setIsEditDialogOpen(false);
                              }}
                            >
                              <Archive className="h-4 w-4 text-gray-500" />
                              Mark Finished
                            </Button>
                          </>
                        )}
                        {selectedSite.status === 'paused' && (
                          <Button 
                            type="button" 
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              updateSiteStatusMutation.mutate({ siteId: selectedSite.site_id, status: 'finished' });
                              setIsEditDialogOpen(false);
                            }}
                          >
                            <Archive className="h-4 w-4 text-gray-500" />
                            Mark Finished
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paused sites temporarily stop AI booking workflows. Finished sites are archived but retain all incident history.
                  </p>
                </div>

                {/* Delete Site */}
                {selectedSite && selectedSite.incident_count === 0 && (
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <Button 
                      type="button" 
                      variant="destructive"
                      className="gap-2"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${selectedSite.site_name}? This action cannot be undone.`)) {
                          deleteSiteMutation.mutate(selectedSite.site_id);
                          setIsEditDialogOpen(false);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Site
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Only sites with no incidents can be deleted.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Supervisor Dialog */}
        <Dialog open={isNewSupervisorDialogOpen} onOpenChange={setIsNewSupervisorDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Supervisor</DialogTitle>
              <DialogDescription>Create a new supervisor/manager for your sites.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_given_name">First Name *</Label>
                  <Input 
                    id="new_given_name" 
                    value={newSupervisorData.given_name} 
                    onChange={(e) => setNewSupervisorData(prev => ({ ...prev, given_name: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_family_name">Last Name *</Label>
                  <Input 
                    id="new_family_name" 
                    value={newSupervisorData.family_name} 
                    onChange={(e) => setNewSupervisorData(prev => ({ ...prev, family_name: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_mobile">Mobile Number *</Label>
                <Input 
                  id="new_mobile" 
                  type="tel"
                  value={newSupervisorData.mobile_number} 
                  onChange={(e) => {
                    // Format as user types
                    const input = e.target.value.replace(/\D/g, '');
                    let formatted = input;
                    if (input.length > 4) {
                      formatted = `${input.slice(0, 4)} ${input.slice(4, 7)} ${input.slice(7, 10)}`;
                    }
                    setNewSupervisorData(prev => ({ ...prev, mobile_number: formatted.trim() }));
                  }}
                  placeholder="0412 345 678"
                  maxLength={12}
                  required 
                />
                <p className="text-xs text-muted-foreground">Australian mobile format: 04XX XXX XXX</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_occupation">Role/Occupation</Label>
                <Select 
                  value={newSupervisorData.occupation} 
                  onValueChange={(value) => setNewSupervisorData(prev => ({ ...prev, occupation: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site Supervisor">Site Supervisor</SelectItem>
                    <SelectItem value="Site Manager">Site Manager</SelectItem>
                    <SelectItem value="Foreman">Foreman</SelectItem>
                    <SelectItem value="Project Manager">Project Manager</SelectItem>
                    <SelectItem value="Construction Manager">Construction Manager</SelectItem>
                    <SelectItem value="Project Coordinator">Project Coordinator</SelectItem>
                    <SelectItem value="Safety Manager">Safety Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewSupervisorDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createSupervisorMutation.mutate(newSupervisorData)}
                disabled={!newSupervisorData.given_name || !newSupervisorData.family_name || !newSupervisorData.mobile_number || createSupervisorMutation.isPending}
              >
                {createSupervisorMutation.isPending ? 'Adding...' : 'Add Supervisor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Medical Center Dialog */}
        <Dialog open={isNewMedicalCenterDialogOpen} onOpenChange={setIsNewMedicalCenterDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Medical Center</DialogTitle>
              <DialogDescription>Add a medical center to the global registry. It will be available for all sites.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mc_name">Medical Center Name *</Label>
                <Input 
                  id="mc_name" 
                  value={newMedicalCenterData.name} 
                  onChange={(e) => setNewMedicalCenterData(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g., Sydney Medical Clinic"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc_phone">Phone Number *</Label>
                <Input 
                  id="mc_phone" 
                  type="tel"
                  value={newMedicalCenterData.phone_number} 
                  onChange={(e) => setNewMedicalCenterData(prev => ({ ...prev, phone_number: e.target.value }))} 
                  placeholder="02 1234 5678"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc_address">Address *</Label>
                <AddressAutocomplete
                  id="mc_address"
                  value={newMedicalCenterData.address}
                  onChange={(value) => setNewMedicalCenterData(prev => ({ ...prev, address: value }))}
                  onAddressChange={(address) => {
                    setNewMedicalCenterData(prev => ({
                      ...prev,
                      address: address.streetAddress || address.formattedAddress,
                      suburb: address.city || prev.suburb,
                      postcode: address.postCode || prev.postcode,
                      state: address.state || prev.state,
                    }));
                  }}
                  searchType="all"
                  placeholder="Start typing address..."
                />
                <p className="text-xs text-muted-foreground">Search for the medical center's address</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mc_suburb">Suburb *</Label>
                  <Input 
                    id="mc_suburb" 
                    value={newMedicalCenterData.suburb} 
                    onChange={(e) => setNewMedicalCenterData(prev => ({ ...prev, suburb: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mc_state">State *</Label>
                  <Select 
                    value={newMedicalCenterData.state} 
                    onValueChange={(value) => setNewMedicalCenterData(prev => ({ ...prev, state: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mc_postcode">Postcode</Label>
                  <Input 
                    id="mc_postcode" 
                    value={newMedicalCenterData.postcode} 
                    onChange={(e) => setNewMedicalCenterData(prev => ({ ...prev, postcode: e.target.value }))} 
                    maxLength={4}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                After adding, you'll need to brief this medical center on Mend's approach before AI calls can be made.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewMedicalCenterDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMedicalCenterMutation.mutate(newMedicalCenterData)}
                disabled={!newMedicalCenterData.name || !newMedicalCenterData.phone_number || !newMedicalCenterData.suburb || !newMedicalCenterData.state || createMedicalCenterMutation.isPending}
              >
                {createMedicalCenterMutation.isPending ? 'Adding...' : 'Add Medical Center'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, Clock, MapPin, User, AlertCircle, FileText, Calendar, 
  Phone, Stethoscope, Activity, Pencil, History, MessageSquare,
  PhoneCall, CalendarCheck, Bot, Plus
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { BodyInjuryViewer } from "@/components/incident-report/BodyInjuryViewer";
import IncidentCostEstimate from "@/components/incident-report/cost/IncidentCostEstimate";
import { SiteLocationMap } from "@/components/incidents/SiteLocationMap";
import { IncidentActivityLog, type ActivityLogEntry } from "@/components/incidents/IncidentActivityLog";
import { useAuth } from "@/lib/auth/AuthContext";

// Type for the incident with all joined relations
type IncidentWithRelations = Tables<'incidents'> & {
  site?: Partial<Tables<'sites'>> & {
    longitude?: number;
    latitude?: number;
  };
  worker?: Partial<Tables<'workers'>>;
  department?: Partial<Tables<'departments'>>;
  body_part?: Partial<Tables<'body_parts'>>;
  body_regions?: string[];
};

// Mapping from body_part_name to relevant SVG region IDs (same as InjuryDetailsSection)
const BODY_PART_TO_REGIONS: Record<string, string[]> = {
  'Head': ['front-head', 'back-head'],
  'Neck': ['front-neck', 'back-neck'],
  'Chest': ['front-chest'],
  'Abdomen': ['front-abdomen'],
  'Upper Back': ['back-upperback'],
  'Lower Back': ['back-lowerback'],
  'Pelvis': ['front-pelvis'],
  'Groin': ['front-pelvis'],
  'Glutes': ['back-glutes'],
  'Shoulder': ['front-shoulder-left', 'front-shoulder-right', 'back-shoulder-left', 'back-shoulder-right'],
  'Left Shoulder': ['front-shoulder-left', 'back-shoulder-left'],
  'Right Shoulder': ['front-shoulder-right', 'back-shoulder-right'],
  'Upper Arm': ['front-upperarm-left', 'front-upperarm-right', 'back-upperarm-left', 'back-upperarm-right'],
  'Left Upper Arm': ['front-upperarm-left', 'back-upperarm-left'],
  'Right Upper Arm': ['front-upperarm-right', 'back-upperarm-right'],
  'Forearm': ['front-forearmhand-left', 'front-forearmhand-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Left Forearm': ['front-forearmhand-left', 'back-forearmhand-left'],
  'Right Forearm': ['front-forearmhand-right', 'back-forearmhand-right'],
  'Hand': ['front-forearmhand-left', 'front-forearmhand-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Left Hand': ['front-forearmhand-left', 'back-forearmhand-left'],
  'Right Hand': ['front-forearmhand-right', 'back-forearmhand-right'],
  'Thigh': ['front-thigh-left', 'front-thigh-right', 'back-thigh-left', 'back-thigh-right'],
  'Left Thigh': ['front-thigh-left', 'back-thigh-left'],
  'Right Thigh': ['front-thigh-right', 'back-thigh-right'],
  'Knee': ['front-knee-left', 'front-knee-right'],
  'Left Knee': ['front-knee-left'],
  'Right Knee': ['front-knee-right'],
  'Shin': ['front-shin-left', 'front-shin-right'],
  'Left Shin': ['front-shin-left'],
  'Right Shin': ['front-shin-right'],
  'Calf': ['back-calf-left', 'back-calf-right'],
  'Left Calf': ['back-calf-left'],
  'Right Calf': ['back-calf-right'],
  'Foot': ['front-foot-left', 'front-foot-right', 'back-foot-left', 'back-foot-right'],
  'Left Foot': ['front-foot-left', 'back-foot-left'],
  'Right Foot': ['front-foot-right', 'back-foot-right'],
  'Ankle': ['front-foot-left', 'front-foot-right', 'back-foot-left', 'back-foot-right'],
  'Left Ankle': ['front-foot-left', 'back-foot-left'],
  'Right Ankle': ['front-foot-right', 'back-foot-right'],
  'Arm': ['front-upperarm-left', 'front-upperarm-right', 'front-forearmhand-left', 'front-forearmhand-right', 'back-upperarm-left', 'back-upperarm-right', 'back-forearmhand-left', 'back-forearmhand-right'],
  'Leg': ['front-thigh-left', 'front-thigh-right', 'front-knee-left', 'front-knee-right', 'front-shin-left', 'front-shin-right', 'front-foot-left', 'front-foot-right', 'back-thigh-left', 'back-thigh-right', 'back-calf-left', 'back-calf-right', 'back-foot-left', 'back-foot-right'],
  'Back': ['back-upperback', 'back-lowerback'],
  'Trunk': ['front-chest', 'front-abdomen', 'back-upperback', 'back-lowerback'],
};

// Helper function to get body regions from incident data
const getBodyRegionsFromIncident = (incident: IncidentWithRelations | null | undefined): string[] => {
  // First, check if body_regions is stored directly on the incident
  if (incident?.body_regions && Array.isArray(incident.body_regions) && incident.body_regions.length > 0) {
    return incident.body_regions;
  }
  
  // Fall back to mapping from body_part_name
  if (!incident?.body_part?.body_part_name) return [];
  
  const bodyPartName = incident.body_part.body_part_name;
  
  // Try exact match first
  if (BODY_PART_TO_REGIONS[bodyPartName]) {
    return BODY_PART_TO_REGIONS[bodyPartName];
  }
  
  // Try partial match
  const lowerBodyPart = bodyPartName.toLowerCase();
  for (const [name, regions] of Object.entries(BODY_PART_TO_REGIONS)) {
    if (lowerBodyPart.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerBodyPart)) {
      return regions;
    }
  }
  
  return [];
};

const IncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'note' as 'call' | 'appointment' | 'note' | 'voice_agent' | 'edit',
    title: '',
    description: '',
    metadata: {} as Record<string, string>
  });

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ['incident', id, userData?.role_id],
    queryFn: async () => {
      if (!id) throw new Error('No incident ID provided');
      
      // Use dedicated RPC to fetch full incident details with RBAC
      const { data: incidentFromRpc, error: rpcError } = await supabase.rpc('get_incident_details', {
        p_incident_id: parseInt(id),
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });

      if (rpcError) {
        console.error('RPC error fetching incident:', rpcError);
        throw rpcError;
      }

      if (!incidentFromRpc) {
        throw new Error('Incident not found or access denied');
      }

      console.log('Raw incident data from RPC:', incidentFromRpc);

      // Fetch worker details
      let workerData = null;
      if (incidentFromRpc.worker_id) {
        const { data } = await supabase
          .from('workers')
          .select('worker_id, given_name, family_name, phone_number, mobile_number, occupation, employer_id')
          .eq('worker_id', incidentFromRpc.worker_id)
          .maybeSingle();
        workerData = data;
      }

      // Fetch site details (including coordinates for map)
      let siteDetails = null;
      if (incidentFromRpc.site_id) {
        const { data: siteData } = await supabase
          .from('sites')
          .select('site_id, site_name, street_address, city, post_code, state, longitude, latitude')
          .eq('site_id', incidentFromRpc.site_id)
          .maybeSingle();
        siteDetails = siteData;
      }

      // Fetch body part details if available
      let bodyPartDetails = null;
      if (incidentFromRpc.body_part_id) {
        const { data: bodyPartData } = await supabase
          .from('body_parts')
          .select('body_part_id, body_part_name')
          .eq('body_part_id', incidentFromRpc.body_part_id)
          .maybeSingle();
        bodyPartDetails = bodyPartData;
      }

      // Fetch department details if available
      let departmentDetails = null;
      if (incidentFromRpc.department_id) {
        const { data: deptData } = await supabase
          .from('departments')
          .select('department_id, department_name')
          .eq('department_id', incidentFromRpc.department_id)
          .maybeSingle();
        departmentDetails = deptData;
      }

      // Fetch employer name if we have workers_employer field or employer_id
      let employerName = incidentFromRpc.workers_employer;
      if (!employerName && incidentFromRpc.employer_id) {
        const { data: employerData } = await supabase
          .from('employers')
          .select('employer_name')
          .eq('employer_id', incidentFromRpc.employer_id)
          .maybeSingle();
        employerName = employerData?.employer_name;
      }
      
      return {
        ...incidentFromRpc,
        site: siteDetails,
        worker: workerData,
        department: departmentDetails,
        body_part: bodyPartDetails,
        workers_employer: employerName,
        // Ensure body_regions is an array (might be stored in DB)
        body_regions: Array.isArray(incidentFromRpc.body_regions) ? incidentFromRpc.body_regions : [],
      } as IncidentWithRelations;
    },
    enabled: !!id && !!userData
  });

  // Fetch activity log for this incident from database
  const { data: activityLog = [] } = useQuery({
    queryKey: ['incident-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_activity_log')
        .select('*')
        .eq('incident_id', Number(id))
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching activity log:', error);
        // Return a default entry if no activities exist or table doesn't exist yet
        return [{
          id: 'initial',
          incident_id: Number(id),
          type: 'edit' as const,
          title: 'Incident Created',
          description: 'Initial incident report submitted',
          created_at: incident?.created_at || new Date().toISOString(),
          created_by: 'System',
        }] as ActivityLogEntry[];
      }
      
      // Map database results to ActivityLogEntry format
      const activities: ActivityLogEntry[] = data.map(item => ({
        id: item.id.toString(),
        incident_id: item.incident_id,
        type: (item.action_type || 'edit') as ActivityLogEntry['type'],
        title: item.summary || 'Activity',
        description: item.details || undefined,
        created_at: item.created_at,
        created_by: item.actor_name || 'System',
        metadata: item.metadata as Record<string, string> | undefined,
      }));
      
      // If no activities, add the initial creation entry
      if (activities.length === 0) {
        activities.push({
          id: 'initial',
          incident_id: Number(id),
          type: 'edit',
          title: 'Incident Created',
          description: 'Initial incident report submitted',
          created_at: incident?.created_at || new Date().toISOString(),
          created_by: 'System',
        });
      }
      
      return activities;
    },
    enabled: !!id && !!incident
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async (activity: typeof newActivity) => {
      const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
      
      const { error } = await supabase
        .from('incident_activity_log')
        .insert({
          incident_id: Number(id),
          action_type: activity.type,
          summary: activity.title,
          details: activity.description || null,
          actor_name: userName,
          actor_id: userData?.user_id || null,
          metadata: Object.keys(activity.metadata).length > 0 ? activity.metadata : null,
        });
      
      if (error) {
        console.error('Error adding activity:', error);
        throw error;
      }
      
      return activity;
    },
    onSuccess: () => {
      toast({
        title: "Activity Added",
        description: "The activity has been logged successfully.",
      });
      setIsAddActivityOpen(false);
      setNewActivity({
        type: 'note',
        title: '',
        description: '',
        metadata: {}
      });
      queryClient.invalidateQueries({ queryKey: ['incident-activity', id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add activity. Please try again.",
        variant: "destructive",
      });
    }
  });

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
        return 'bg-amber-500 text-white';
      case 'LTI':
        return 'bg-red-500 text-white';
      case 'FAI':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Clean Header Section */}
        <div className="mb-8">
          {/* Top row: Back button and Edit button */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
            
            <Link to={`/incident/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit Incident
              </Button>
            </Link>
          </div>
          
          {/* Title row: Clean incident title with classification */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">
                  Incident {incident?.incident_number}
                </h1>
                <Badge className={`${getClassificationColor(incident?.classification)} text-xs font-medium px-2.5 py-0.5`}>
                  {incident?.classification || 'Unclassified'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {incident?.date_of_injury ? format(new Date(incident.date_of_injury), 'EEEE, MMMM d, yyyy') : 'Date not specified'}
                {incident?.site?.site_name && ` • ${incident.site.site_name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Key Info Cards - Compact Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Date of Injury</p>
                  <p className="text-sm font-medium">{incident?.date_of_injury ? format(new Date(incident.date_of_injury), 'MMM dd, yyyy') : 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Days Lost</p>
                  <p className="text-sm font-medium">{incident?.total_days_lost ? `${incident.total_days_lost} days` : 'No lost time'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Site Location</p>
                  <p className="text-sm font-medium">{incident?.site?.site_name || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Work Status</p>
                  <p className="text-sm font-medium">{incident?.returned_to_work ? 'Returned to Work' : 'Off Work'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Worker & Treatment Info (Primary) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-blue-600" />
                  Worker Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
                    <p className="text-sm font-medium mt-1">{incident?.worker?.given_name} {incident?.worker?.family_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Occupation</p>
                    <p className="text-sm font-medium mt-1">{incident?.worker?.occupation || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employer</p>
                    <p className="text-sm font-medium mt-1">{incident?.workers_employer || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
                    <p className="text-sm font-medium mt-1">{incident?.department?.department_name || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Injury Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Injury Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body Part Affected</p>
                    <p className="text-sm font-medium mt-1">{incident?.body_part?.body_part_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Injury Type</p>
                    <p className="text-sm font-medium mt-1">{incident?.injury_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time of Injury</p>
                    <p className="text-sm font-medium mt-1">{formatTime(incident?.time_of_injury)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Witness</p>
                    <p className="text-sm font-medium mt-1">{incident?.witness || 'None reported'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {incident?.injury_description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Treatment Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4 text-green-600" />
                  Treatment & Medical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Treatment Provided</p>
                    <p className="text-sm mt-1">{incident?.treatment_provided || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Referral</p>
                    <p className="text-sm font-medium mt-1">{incident?.referral || 'None'}</p>
                  </div>
                </div>
                {incident?.doctor_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Medical Notes</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-green-800">
                        {incident.doctor_notes}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location & Body Diagram Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Site Location Map */}
              <SiteLocationMap 
                site={incident?.site}
                incidentDate={incident?.date_of_injury}
              />

              {/* Body Injury Diagram */}
              <BodyInjuryViewer 
                selectedRegions={getBodyRegionsFromIncident(incident)}
                injuryType={incident?.injury_type}
                injuryDescription={incident?.injury_description}
              />
            </div>

            {/* Case Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-amber-600" />
                  Case Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {incident?.case_notes || 'No case notes available'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Cost & Activity Log */}
          <div className="space-y-6">
            {/* Cost Estimate - Compact */}
            <IncidentCostEstimate
              incidentId={incident?.incident_id}
              classification={incident?.classification}
              daysLost={incident?.total_days_lost || 0}
              bodyPartId={incident?.body_part_id}
              isFatality={incident?.fatality}
              readOnly={true}
            />

            {/* Reporting Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-indigo-600" />
                  Reporting Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reported to Site</p>
                  <p className="text-sm font-medium mt-1">{incident?.date_reported_to_site ? format(new Date(incident.date_reported_to_site), 'PPP') : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notifying Person</p>
                  <p className="text-sm font-medium mt-1">{incident?.notifying_person_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</p>
                  <p className="text-sm font-medium mt-1">{incident?.notifying_person_position || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-violet-600" />
                    Activity Log
                  </CardTitle>
                  <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Activity</DialogTitle>
                        <DialogDescription>
                          Log a call, appointment, or note for this incident.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Activity Type</Label>
                          <Select 
                            value={newActivity.type} 
                            onValueChange={(value: 'call' | 'appointment' | 'note' | 'voice_agent') => 
                              setNewActivity(prev => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">
                                <div className="flex items-center gap-2">
                                  <PhoneCall className="h-4 w-4" />
                                  Phone Call
                                </div>
                              </SelectItem>
                              <SelectItem value="appointment">
                                <div className="flex items-center gap-2">
                                  <CalendarCheck className="h-4 w-4" />
                                  Appointment
                                </div>
                              </SelectItem>
                              <SelectItem value="note">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Note
                                </div>
                              </SelectItem>
                              <SelectItem value="voice_agent">
                                <div className="flex items-center gap-2">
                                  <Bot className="h-4 w-4" />
                                  Voice Agent
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input 
                            placeholder="Brief title for this activity"
                            value={newActivity.title}
                            onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea 
                            placeholder="Details about what happened..."
                            value={newActivity.description}
                            onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                          />
                        </div>
                        {newActivity.type === 'appointment' && (
                          <div className="space-y-2">
                            <Label>Appointment Date</Label>
                            <Input 
                              type="datetime-local"
                              onChange={(e) => setNewActivity(prev => ({ 
                                ...prev, 
                                metadata: { ...prev.metadata, appointmentDate: e.target.value }
                              }))}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddActivityOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => addActivityMutation.mutate(newActivity)}
                          disabled={!newActivity.title}
                        >
                          Add Activity
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <IncidentActivityLog activities={activityLog} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsPage;

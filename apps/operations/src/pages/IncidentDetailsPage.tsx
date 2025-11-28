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
      // Use RPC to fetch incident with RBAC context
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_data', {
        page_size: 1000,
        page_offset: 0,
        filter_employer_id: null,
        filter_worker_id: null,
        filter_start_date: null,
        filter_end_date: null,
        user_role_id: userData?.role_id || null,
        user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });

      if (rpcError) {
        console.error('RPC error fetching incident:', rpcError);
        throw rpcError;
      }

      // Find the specific incident from the RBAC-filtered results
      const incidentFromRpc = rpcData?.incidents?.find(
        (inc: { incident_id: number }) => inc.incident_id === Number(id)
      );

      if (!incidentFromRpc) {
        throw new Error('Incident not found');
      }

      // Fetch additional site details (longitude/latitude) for the map
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
          .select('body_part_name')
          .eq('body_part_id', incidentFromRpc.body_part_id)
          .maybeSingle();
        bodyPartDetails = bodyPartData;
      }

      // Map RPC data to the expected format
      const [givenName, ...familyNameParts] = (incidentFromRpc.worker_name || '').split(' ');
      
      return {
        ...incidentFromRpc,
        incident_id: incidentFromRpc.incident_id,
        incident_number: incidentFromRpc.incident_number,
        date_of_injury: incidentFromRpc.date_of_injury,
        time_of_injury: incidentFromRpc.time_of_injury,
        injury_type: incidentFromRpc.injury_type,
        classification: incidentFromRpc.classification,
        status: incidentFromRpc.incident_status,
        injury_description: incidentFromRpc.injury_description,
        fatality: incidentFromRpc.fatality,
        returned_to_work: incidentFromRpc.returned_to_work,
        total_days_lost: incidentFromRpc.total_days_lost,
        created_at: incidentFromRpc.created_at,
        updated_at: incidentFromRpc.updated_at,
        employer_id: incidentFromRpc.employer_id,
        site: siteDetails || {
          site_id: incidentFromRpc.site_id,
          site_name: incidentFromRpc.site_name
        },
        worker: incidentFromRpc.worker_id ? {
          worker_id: incidentFromRpc.worker_id,
          given_name: givenName || '',
          family_name: familyNameParts.join(' ') || '',
          occupation: incidentFromRpc.worker_occupation
        } : null,
        department: incidentFromRpc.department_id ? {
          department_name: incidentFromRpc.department_name
        } : null,
        body_part: bodyPartDetails
      };
    },
    enabled: !!id && !!userData
  });

  // Fetch activity log for this incident from database
  const { data: activityLog = [] } = useQuery({
    queryKey: ['incident-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_activities')
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
        type: item.type as ActivityLogEntry['type'],
        title: item.title,
        description: item.description || undefined,
        created_at: item.created_at,
        created_by: item.created_by,
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
        .from('incident_activities')
        .insert({
          incident_id: Number(id),
          type: activity.type,
          title: activity.title,
          description: activity.description || null,
          created_by: userName,
          created_by_user_id: userData?.user_id || null,
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

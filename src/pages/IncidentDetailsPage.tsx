import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuBar } from "@/components/MenuBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, MapPin, User, AlertCircle, FileText, Calendar, Phone, Stethoscope, Activity } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const IncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          site:sites(site_id, site_name),
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
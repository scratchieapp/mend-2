import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuBar } from "@/components/MenuBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
          body_part:body_parts(body_part_name),
          doctor:medical_professionals(first_name, last_name)
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
        return 'bg-yellow-500';
      case 'LTI':
        return 'bg-red-500';
      case 'FAI':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Incident Details</h1>
            <p className="text-sm text-muted-foreground">Incident #{incident?.incident_number}</p>
          </div>
          <Badge className={getClassificationColor(incident?.classification)}>
            {incident?.classification || 'Unclassified'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Worker Information</h2>
            <Separator />
            <div className="space-y-2">
              <p><span className="font-medium">Name:</span> {incident?.worker?.given_name} {incident?.worker?.family_name}</p>
              <p><span className="font-medium">Occupation:</span> {incident?.worker?.occupation || 'Not specified'}</p>
              <p><span className="font-medium">Employer:</span> {incident?.workers_employer || 'Not specified'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Incident Location</h2>
            <Separator />
            <div className="space-y-2">
              <p><span className="font-medium">Site:</span> {incident?.site?.site_name}</p>
              <p><span className="font-medium">Department:</span> {incident?.department?.department_name || 'Not specified'}</p>
              <p><span className="font-medium">Shift Arrangement:</span> {incident?.shift_arrangement || 'Not specified'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Incident Details</h2>
            <Separator />
            <div className="space-y-2">
              <p><span className="font-medium">Date of Injury:</span> {incident?.date_of_injury ? format(new Date(incident.date_of_injury), 'PPP') : 'Not specified'}</p>
              <p><span className="font-medium">Time of Injury:</span> {formatTime(incident?.time_of_injury)}</p>
              <p><span className="font-medium">Body Part:</span> {incident?.body_part?.body_part_name || 'Not specified'}</p>
              <p><span className="font-medium">Injury Type:</span> {incident?.injury_type || 'Not specified'}</p>
              <p><span className="font-medium">Description:</span></p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident?.injury_description || 'No description provided'}</p>
              <p><span className="font-medium">Witness:</span> {incident?.witness || 'None reported'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Treatment Information</h2>
            <Separator />
            <div className="space-y-2">
              <p><span className="font-medium">Treatment Provided:</span> {incident?.treatment_provided || 'Not specified'}</p>
              <p><span className="font-medium">Doctor:</span> {incident?.doctor ? `Dr. ${incident.doctor.first_name} ${incident.doctor.last_name}` : 'Not specified'}</p>
              <p><span className="font-medium">Doctor Notes:</span></p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident?.doctor_notes || 'No notes available'}</p>
              <p><span className="font-medium">Referral:</span> {incident?.referral || 'None'}</p>
              <p><span className="font-medium">Days Lost:</span> {incident?.total_days_lost ? `${incident.total_days_lost} days` : 'No lost time'}</p>
              <p><span className="font-medium">Returned to Work:</span> {incident?.returned_to_work ? 'Yes' : 'No'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4 col-span-full">
            <h2 className="text-lg font-semibold">Case Notes</h2>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident?.case_notes || 'No case notes available'}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4 col-span-full">
            <h2 className="text-lg font-semibold">Reporting Information</h2>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p><span className="font-medium">Reported to Site:</span> {incident?.date_reported_to_site ? format(new Date(incident.date_reported_to_site), 'PPP') : 'Not specified'}</p>
                <p><span className="font-medium">Time Reported:</span> {formatTime(incident?.time_reported_to_site)}</p>
                <p><span className="font-medium">Report Received:</span> {incident?.date_report_received ? format(new Date(incident.date_report_received), 'PPP') : 'Not specified'}</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-medium">Notifying Person:</span> {incident?.notifying_person_name || 'Not specified'}</p>
                <p><span className="font-medium">Position:</span> {incident?.notifying_person_position || 'Not specified'}</p>
                <p><span className="font-medium">Contact:</span> {incident?.notifying_person_telephone || 'Not specified'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsPage;
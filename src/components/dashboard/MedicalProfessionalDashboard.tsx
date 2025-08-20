import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Worker {
  given_name: string;
  family_name: string;
}

interface Incident {
  incident_id: number;
  incident_number: string;
  date_of_injury: string;
  injury_description: string;
  treatment_provided: string;
  doctor_notes: string;
  case_notes: string;
  doctor_details: string;
  referral: string;
  worker: Worker;
}

interface SupabaseIncidentResult {
  incident_id: number;
  incident_number: string;
  date_of_injury: string;
  injury_description: string;
  treatment_provided: string;
  doctor_notes: string;
  case_notes: string;
  doctor_details: string;
  referral: string;
  worker: Worker[];
}

export function MedicalProfessionalDashboard() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { toast } = useToast();

  const { data: assignedIncidents, isLoading } = useQuery({
    queryKey: ['assignedIncidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          incident_number,
          date_of_injury,
          injury_description,
          treatment_provided,
          doctor_notes,
          case_notes,
          doctor_details,
          referral,
          worker:workers!incidents_worker_id_fkey (
            given_name,
            family_name
          )
        `)
        .eq('doctor_id', 1) // TODO: Replace with actual logged-in doctor's ID
        .order('date_of_injury', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match the Incident interface
      return (data as SupabaseIncidentResult[]).map(incident => ({
        ...incident,
        worker: {
          given_name: incident.worker[0]?.given_name || '',
          family_name: incident.worker[0]?.family_name || ''
        }
      })) as Incident[];
    }
  });

  const updateNotes = async (field: 'doctor_notes' | 'case_notes', value: string) => {
    if (!selectedIncident) return;

    const { error } = await supabase
      .from('incidents')
      .update({ [field]: value })
      .eq('incident_id', selectedIncident.incident_id);

    if (error) {
      toast({
        title: "Error updating notes",
        description: "Please try again later",
        variant: "destructive"
      });
      return;
    }

    setSelectedIncident({ ...selectedIncident, [field]: value });
    toast({
      title: "Notes updated",
      description: "Your changes have been saved"
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assigned Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">Cases List</h3>
              <div className="space-y-2">
                {assignedIncidents?.map((incident) => (
                  <Button
                    key={incident.incident_id}
                    variant={selectedIncident?.incident_id === incident.incident_id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{incident.incident_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {incident.worker.given_name} {incident.worker.family_name}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedIncident && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Case Details</h3>
                  <div className="text-sm space-y-2">
                    <p><strong>Date of Injury:</strong> {new Date(selectedIncident.date_of_injury).toLocaleDateString()}</p>
                    <p><strong>Injury Description:</strong> {selectedIncident.injury_description}</p>
                    <p><strong>Treatment Provided:</strong> {selectedIncident.treatment_provided}</p>
                  </div>
                </div>

                <Tabs defaultValue="notes" className="w-full">
                  <TabsList>
                    <TabsTrigger value="notes">Medical Notes</TabsTrigger>
                    <TabsTrigger value="case">Case Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notes">
                    <Textarea
                      className="min-h-[200px]"
                      placeholder="Enter medical notes..."
                      value={selectedIncident.doctor_notes || ""}
                      onChange={(e) => updateNotes("doctor_notes", e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="case">
                    <Textarea
                      className="min-h-[200px]"
                      placeholder="Enter case notes..."
                      value={selectedIncident.case_notes || ""}
                      onChange={(e) => updateNotes("case_notes", e.target.value)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
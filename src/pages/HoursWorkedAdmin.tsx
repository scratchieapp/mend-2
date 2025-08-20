import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuBar } from "@/components/MenuBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { EmployerSelector } from "@/components/builder/EmployerSelector";

interface Site {
  location_id: number;
  location_name: string;
  employer_id: number;
}

interface HoursEntry {
  employer_hours: number;
  subcontractor_hours: number;
}

const HoursWorkedAdmin = () => {
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoursData, setHoursData] = useState<Record<number, HoursEntry>>({});

  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];
      
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('employer_id', selectedEmployerId);
      
      if (error) throw error;
      return data as Site[];
    },
    enabled: !!selectedEmployerId,
  });

  const handleHoursChange = (siteId: number, field: keyof HoursEntry, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setHoursData(prev => ({
      ...prev,
      [siteId]: {
        ...prev[siteId] || { employer_hours: 0, subcontractor_hours: 0 },
        [field]: numValue
      }
    }));
  };

  const handleSubmit = async () => {
    if (!selectedEmployerId) {
      toast.error("Please select an employer first");
      return;
    }

    setIsSubmitting(true);
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    try {
      const entries = Object.entries(hoursData).map(([siteId, hours]) => ({
        site_id: Number(siteId),
        employer_id: selectedEmployerId,
        month: firstDayOfMonth.toISOString(),
        employer_hours: hours.employer_hours,
        subcontractor_hours: hours.subcontractor_hours
      }));

      const { error } = await supabase
        .from('hours_worked')
        .upsert(entries, {
          onConflict: 'site_id,employer_id,month'
        });

      if (error) throw error;
      toast.success("Hours updated successfully");
      setHoursData({});
    } catch (error) {
      console.error('Error saving hours:', error);
      toast.error("Failed to update hours");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Hours Worked Management</h1>
            <EmployerSelector
              employers={[]}
              selectedEmployerId={selectedEmployerId}
              onSelect={setSelectedEmployerId}
              isLoading={false}
            />
          </div>

          {!selectedEmployerId ? (
            <Card className="p-6">
              <p className="text-center text-gray-500">
                Please select an employer to manage hours worked
              </p>
            </Card>
          ) : isLoadingSites ? (
            <Card className="p-6">
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </Card>
          ) : sites.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-gray-500">
                No sites found for this employer
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-6">
                {sites.map((site) => (
                  <Card key={site.location_id} className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{site.location_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Employer Hours
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={hoursData[site.location_id]?.employer_hours || ''}
                            onChange={(e) => handleHoursChange(site.location_id, 'employer_hours', e.target.value)}
                            placeholder="Enter employer hours"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Subcontractor Hours
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={hoursData[site.location_id]?.subcontractor_hours || ''}
                            onChange={(e) => handleHoursChange(site.location_id, 'subcontractor_hours', e.target.value)}
                            placeholder="Enter subcontractor hours"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Saving..." : "Save Hours"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoursWorkedAdmin;
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Phone } from "lucide-react";
import { MonthlyHoursInputs } from "./MonthlyHoursInputs";
import { Site, MonthlyHours, HoursEntry } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SiteHoursListProps {
  sites: Site[];
  months: string[];
  hoursData: MonthlyHours;
  setHoursData: (data: MonthlyHours) => void;
  filteredSites: Site[];
}

export const SiteHoursList = ({ 
  sites, 
  months, 
  hoursData, 
  setHoursData,
  filteredSites 
}: SiteHoursListProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSites, setExpandedSites] = useState<string[]>([]);

  const handleInputChange = (month: string, siteId: number, field: keyof HoursEntry, value: string | boolean) => {
    setHoursData({
      ...hoursData,
      [month]: {
        ...hoursData[month],
        [siteId]: {
          ...hoursData[month]?.[siteId],
          [field]: value
        }
      }
    });
  };

  const handleSubmit = async (month: string, siteId: number) => {
    setIsSubmitting(true);
    try {
      // First, get the employer_id for this site
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('employer_id')
        .eq('site_id', siteId)
        .single();

      if (siteError) throw siteError;
      if (!siteData?.employer_id) {
        throw new Error(`Site ${siteId} has no employer_id`);
      }

      const { error } = await supabase
        .from('hours_worked')
        .upsert({
          site_id: siteId,
          employer_id: siteData.employer_id,
          month: `${month}-01`,
          employer_hours: Number(hoursData[month]?.[siteId]?.employer_hours || 0),
          subcontractor_hours: Number(hoursData[month]?.[siteId]?.subcontractor_hours || 0),
          is_estimated: hoursData[month]?.[siteId]?.is_estimated || false,
          data_source: 'Manual Input',
        }, {
          onConflict: 'site_id,employer_id,month'
        });

      if (error) throw error;
      toast.success(`Hours updated for ${month}`);
    } catch (error) {
      console.error('Error saving hours:', error);
      toast.error("Failed to update hours");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Take only the last 3 months
  const lastThreeMonths = months.slice(-3);

  return (
    <div className="space-y-4">
      {filteredSites.map((site) => (
        <Card key={site.site_id} className="p-4">
          <Accordion
            type="single"
            collapsible
            value={expandedSites.includes(site.site_id.toString()) ? site.site_id.toString() : ""}
            onValueChange={(value) => {
              if (value) {
                setExpandedSites([...expandedSites, value]);
              } else {
                setExpandedSites(expandedSites.filter(id => id !== site.site_id.toString()));
              }
            }}
          >
            <AccordionItem value={site.site_id.toString()} className="border-none">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-col items-start w-full text-left">
                  <h3 className="text-lg font-semibold">{site.site_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {site.city}
                    {site.state && site.city && `, `}
                    {site.state}
                    {site.project_type && ` • ${site.project_type}`}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 grid grid-cols-3 gap-4 border rounded-lg p-4">
                      {lastThreeMonths.map((month) => (
                        <MonthlyHoursInputs
                          key={month}
                          month={month}
                          hours={hoursData[month]?.[site.site_id] || { employer_hours: '', subcontractor_hours: '' }}
                          onChange={(month, field, value) => handleInputChange(month, site.site_id, field, value)}
                        />
                      ))}
                      <div className="col-span-3 flex justify-end mt-4">
                        <Button
                          onClick={() => Promise.all(lastThreeMonths.map(month => handleSubmit(month, site.site_id)))}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Hours
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Site Supervisor</h4>
                      <p className="text-sm">{site.supervisor_name || 'Not assigned'}</p>
                      {site.supervisor_telephone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4" />
                          <a 
                            href={`tel:${site.supervisor_telephone}`}
                            className="text-primary hover:underline"
                          >
                            {site.supervisor_telephone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ))}
    </div>
  );
};
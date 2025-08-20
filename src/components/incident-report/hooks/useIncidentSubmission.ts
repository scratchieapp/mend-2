import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { submitIncident } from "../services/incidentSubmissionService";
import { errorLogger } from "@/lib/monitoring/errorLogger";
import type { IncidentFormData } from "../services/submission/validation";

export const useIncidentSubmission = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: IncidentFormData) => {
    setLoading(true);
    try {
      const result = await submitIncident(data);
      
      if (result.success) {
        toast({
          title: "Incident Reported",
          description: `Incident has been successfully recorded. ID: ${result.incidentId || 'N/A'}`
        });
        
        // Log successful submission
        errorLogger.info('Incident submitted successfully', { 
          incidentId: result.incidentId,
          formSections: Object.keys(data).length 
        });
        
        navigate("/dashboard");
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log the error
      errorLogger.error('Incident submission failed', error instanceof Error ? error : new Error(errorMessage), {
        form: 'incident-report',
        dataKeys: Object.keys(data),
      });
      
      toast({
        title: "Submission Failed",
        description: "Failed to submit incident report. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleSubmit, loading };
};
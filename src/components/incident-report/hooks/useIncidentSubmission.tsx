import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { submitIncident } from "../services/incidentSubmissionService";
import { errorLogger } from "@/lib/monitoring/errorLogger";
import type { IncidentFormData } from "../services/submission/validation";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, ArrowLeft } from "lucide-react";

export const useIncidentSubmission = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<number | null>(null);

  const handleSubmit = async (data: IncidentFormData) => {
    setLoading(true);
    try {
      const result = await submitIncident(data);
      
      if (result.success) {
        setSubmittedIncidentId(result.incidentId || null);
        setShowSuccessDialog(true);
        
        // Log successful submission
        errorLogger.info('Incident submitted successfully', { 
          incidentId: result.incidentId,
          formSections: Object.keys(data).length 
        });
        
        // Auto-redirect after 3 seconds if user doesn't interact
        setTimeout(() => {
          if (showSuccessDialog) {
            setShowSuccessDialog(false);
            navigate("/dashboard", { 
              state: { 
                justSubmittedIncident: true, 
                incidentId: result.incidentId 
              }
            });
          }
        }, 3000);
        
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

  const handleViewReport = () => {
    setShowSuccessDialog(false);
    if (submittedIncidentId) {
      navigate(`/incident/${submittedIncidentId}`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackToDashboard = () => {
    setShowSuccessDialog(false);
    navigate("/dashboard", { 
      state: { 
        justSubmittedIncident: true, 
        incidentId: submittedIncidentId 
      }
    });
  };

  const SuccessDialog = () => (
    <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <AlertDialogTitle className="text-xl">
            Incident Report Submitted Successfully!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your incident report has been recorded and is now being processed.
            {submittedIncidentId && (
              <div className="mt-2 p-2 bg-muted rounded">
                <span className="font-medium">Report ID: #{submittedIncidentId}</span>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleBackToDashboard}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          {submittedIncidentId && (
            <Button 
              onClick={handleViewReport}
              className="w-full sm:w-auto"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Report
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { 
    handleSubmit, 
    loading, 
    SuccessDialog,
    showSuccessDialog 
  };
};
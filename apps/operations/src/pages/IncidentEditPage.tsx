import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, Save, CheckCircle, Archive, Trash2, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";

// Form sections
import { NotificationSection } from "@/components/incident-report/NotificationSection";
import { WorkerDetailsSection } from "@/components/incident-report/WorkerDetailsSection";
import { EmploymentSection } from "@/components/incident-report/EmploymentSection";
import { InjuryDetailsSection } from "@/components/incident-report/InjuryDetailsSection";
import { TreatmentDetailsSection } from "@/components/incident-report/TreatmentDetailsSection";
import { ActionsTakenSection } from "@/components/incident-report/ActionsTakenSection";
import { CaseNotesSection } from "@/components/incident-report/CaseNotesSection";
import { DocumentsSection } from "@/components/incident-report/DocumentsSection";
import IncidentCostEstimate from "@/components/incident-report/cost/IncidentCostEstimate";

// Hooks and validation
import { incidentEditSchema, type IncidentEditFormData } from "@/lib/validations/incident";
import { logValidationError } from "@/lib/monitoring/errorLogger";
import { supabase } from "@/integrations/supabase/client";

// Helper functions to extract call transcript from case_notes
// Call transcripts are stored with markers like "Transcript:\n" in case_notes
function extractCallTranscript(caseNotes: string): string {
  if (!caseNotes) return "";
  
  // Look for transcript section in case notes
  const transcriptMatch = caseNotes.match(/Transcript:\s*([\s\S]*?)(?:$|\n\n(?=[A-Z]))/i);
  if (transcriptMatch) {
    return transcriptMatch[1].trim();
  }
  
  // Also check for "Call ID:" pattern which indicates voice agent data
  if (caseNotes.includes('Call ID:') || caseNotes.includes('voice agent')) {
    // Return the whole thing as it's likely all transcript-related
    const lines = caseNotes.split('\n');
    const transcriptStart = lines.findIndex(line => 
      line.toLowerCase().includes('transcript') || 
      line.toLowerCase().includes('user:') ||
      line.toLowerCase().includes('agent:')
    );
    if (transcriptStart >= 0) {
      return lines.slice(transcriptStart).join('\n').trim();
    }
  }
  
  return "";
}

function extractCaseNotesWithoutTranscript(caseNotes: string): string {
  if (!caseNotes) return "";
  
  // Remove transcript section from case notes
  const withoutTranscript = caseNotes.replace(/Transcript:\s*[\s\S]*?(?:$|\n\n(?=[A-Z]))/i, '').trim();
  
  // If the entire content was transcript-related, return empty
  if (caseNotes.includes('Call ID:') && !withoutTranscript) {
    // Extract just the summary/header part before transcript
    const lines = caseNotes.split('\n');
    const transcriptStart = lines.findIndex(line => 
      line.toLowerCase().includes('transcript')
    );
    if (transcriptStart > 0) {
      return lines.slice(0, transcriptStart).join('\n').trim();
    }
  }
  
  return withoutTranscript || caseNotes;
}

// Summarize injury description from transcript if it's too long
function summarizeInjuryDescription(description: string): string {
  if (!description) return "";
  
  // If description looks like a full transcript (contains agent/user dialogue)
  if (description.includes('Agent:') || description.includes('User:')) {
    // Extract just the injury-related parts
    const lines = description.split('\n');
    const injuryLines = lines.filter(line => 
      line.toLowerCase().includes('injur') ||
      line.toLowerCase().includes('hurt') ||
      line.toLowerCase().includes('pain') ||
      line.toLowerCase().includes('accident') ||
      line.toLowerCase().includes('incident')
    );
    if (injuryLines.length > 0) {
      return injuryLines.slice(0, 3).join(' ').substring(0, 500);
    }
  }
  
  // If it's already a reasonable length, return as-is
  if (description.length <= 500) return description;
  
  // Truncate long descriptions
  return description.substring(0, 497) + '...';
}

// Combine case notes and call transcripts back into a single field for storage
function combineNotesAndTranscripts(caseNotes: string, callTranscripts: string): string {
  const parts: string[] = [];
  
  if (caseNotes && caseNotes.trim()) {
    parts.push(caseNotes.trim());
  }
  
  if (callTranscripts && callTranscripts.trim()) {
    parts.push(`\n\nTranscript:\n${callTranscripts.trim()}`);
  }
  
  return parts.join('');
}

// Mapping from body_part_name to relevant SVG region IDs (for deriving body_regions from body_part_id)
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

// Helper function to get body regions from body part name and body side
// body_side_id: 1=Left, 2=Right, 5=Both, others=show all
const getBodyRegionsFromBodyPartName = (bodyPartName: string, bodySideId?: number | string): string[] => {
  if (!bodyPartName) return [];
  
  let regions: string[] = [];
  
  // Try exact match first
  if (BODY_PART_TO_REGIONS[bodyPartName]) {
    regions = BODY_PART_TO_REGIONS[bodyPartName];
  } else {
    // Try partial match
    const lowerBodyPart = bodyPartName.toLowerCase();
    for (const [name, partRegions] of Object.entries(BODY_PART_TO_REGIONS)) {
      if (lowerBodyPart.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerBodyPart)) {
        regions = partRegions;
        break;
      }
    }
  }
  
  // Filter regions based on body side
  const sideId = typeof bodySideId === 'string' ? parseInt(bodySideId) : bodySideId;
  
  if (sideId === 1) {
    // Left side only - filter to regions ending with '-left'
    regions = regions.filter(r => r.endsWith('-left') || (!r.endsWith('-right') && !r.endsWith('-left')));
  } else if (sideId === 2) {
    // Right side only - filter to regions ending with '-right'
    regions = regions.filter(r => r.endsWith('-right') || (!r.endsWith('-right') && !r.endsWith('-left')));
  }
  // For body_side_id 5 (Both) or others, return all regions
  
  return regions;
};

// Field labels for human-readable change descriptions
const fieldLabels: Record<string, string> = {
  notifying_person_name: 'Notifying Person Name',
  notifying_person_position: 'Notifying Person Position',
  notifying_person_telephone: 'Notifying Person Phone',
  worker_id: 'Worker',
  site_id: 'Site',
  date_of_injury: 'Date of Injury',
  time_of_injury: 'Time of Injury',
  injury_type: 'Injury Type',
  body_part_id: 'Body Part',
  body_side_id: 'Body Side',
  injury_description: 'Injury Description',
  witness: 'Witness',
  treatment_provided: 'Treatment Provided',
  referral: 'Referral',
  doctor_details: 'Doctor Details',
  actions: 'Actions Taken',
  case_notes: 'Case Notes',
};

const IncidentEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("notification");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const originalDataRef = useRef<Record<string, unknown> | null>(null);

  // Fetch existing incident data using RBAC-aware approach
  const { data: incidentData, isLoading, error } = useQuery({
    queryKey: ['incident-edit', id, userData?.role_id],
    queryFn: async () => {
      if (!id) throw new Error('No incident ID provided');
      
      // Use enhanced RPC that returns ALL joined data in a single call
      const { data: incidentFromRpc, error: rpcError } = await supabase.rpc('get_incident_details', {
        p_incident_id: parseInt(id),
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });

      if (rpcError) {
        console.error('RPC error fetching incident details:', rpcError);
        throw rpcError;
      }

      if (!incidentFromRpc) {
        throw new Error('Incident not found or access denied');
      }

      console.log('Full incident data from RPC:', incidentFromRpc);

      // The RPC now returns all joined data directly
      // Map to the expected format for the form
      const fullIncidentData = {
        ...incidentFromRpc,
        incident_id: incidentFromRpc.incident_id,
        // Map nested objects to match expected property names
        workers: incidentFromRpc.worker,
        employers: incidentFromRpc.employer,
        sites: incidentFromRpc.site,
      };
      
      console.log('Mapped incident data for form:', fullIncidentData);
      return fullIncidentData;
    },
    enabled: !!id && !!userData,
  });

  const form = useForm<IncidentEditFormData>({
    resolver: zodResolver(incidentEditSchema),
    mode: 'onBlur',
    defaultValues: {
      mend_client: "",
      notifying_person_name: "",
      notifying_person_position: "",
      notifying_person_telephone: "",
      worker_id: "",
      employer_name: "",
      location_site: "",
      supervisor_contact: "",
      supervisor_phone: "",
      employment_type: "full_time",
      date_of_injury: "",
      time_of_injury: "",
      injury_type: "",
      classification: "Unclassified",
      severity: "Moderate",
      body_part: "",
      body_side: "not_applicable",
      body_regions: [],
      injury_description: "",
      witness: "",
      mechanism_of_injury: "",
      bodily_location_detail: "",
      cost_worker_role: "",
      cost_state: "",
      type_of_first_aid: "",
      referred_to: "none",
      doctor_details: "",
      selected_medical_professional: "",
      actions_taken: [],
      case_notes: "",
      call_transcripts: "",
      documents: [],
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (!incidentData) return;
    
    console.log('Raw incident data received:', incidentData);
    
    // Store original data for change tracking (only once)
    if (!originalDataRef.current) {
      originalDataRef.current = {
        notifying_person_name: incidentData.notifying_person_name || '',
        notifying_person_position: incidentData.notifying_person_position || '',
        notifying_person_telephone: incidentData.notifying_person_telephone || '',
        worker_id: incidentData.worker_id,
        site_id: incidentData.site_id,
        date_of_injury: incidentData.date_of_injury || '',
        time_of_injury: incidentData.time_of_injury || '',
        injury_type: incidentData.injury_type || '',
        body_part_id: incidentData.body_part_id,
        body_side_id: incidentData.body_side_id,
        injury_description: incidentData.injury_description || '',
        witness: incidentData.witness || '',
        treatment_provided: incidentData.treatment_provided || '',
        referral: incidentData.referral || '',
        doctor_details: incidentData.doctor_details || incidentData.doctor_notes || '',
        actions: incidentData.actions || '',
        case_notes: incidentData.case_notes || '',
      };
    }
    
    // Get body part name from joined data to derive body_regions for the diagram
    // Also use body_side_id to filter to only left or right side as appropriate
    let bodyPartName = '';
    let derivedBodyRegions: string[] = [];
    if (incidentData.body_part?.body_part_name) {
      bodyPartName = incidentData.body_part.body_part_name;
      derivedBodyRegions = getBodyRegionsFromBodyPartName(bodyPartName, incidentData.body_side_id);
    }
    
    // Map database fields to form fields properly
    const formData = {
      // Notification section - use employer_id for mend_client dropdown
      mend_client: incidentData.employer_id?.toString() || "",
      notifying_person_name: incidentData.notifying_person_name || "",
      notifying_person_position: incidentData.notifying_person_position || "",
      notifying_person_telephone: incidentData.notifying_person_telephone || "",
      
      // Worker details - use worker_id and populate from joined worker data
      worker_id: incidentData.worker_id?.toString() || "",
      worker_name: incidentData.worker 
        ? `${incidentData.worker.given_name || ''} ${incidentData.worker.family_name || ''}`.trim() 
        : "",
      worker_phone: incidentData.worker?.phone_number || incidentData.worker?.mobile_number || "",
      worker_address: incidentData.worker?.residential_address || "",
      worker_dob: incidentData.worker?.date_of_birth || "",
      worker_gender: (incidentData.worker?.gender as 'Male' | 'Female' | 'Other' | undefined) || undefined,
      
      // Employment section - use joined data
      employer_name: incidentData.workers_employer || incidentData.employers?.employer_name || incidentData.employer?.employer_name || "",
      location_site: incidentData.site_id?.toString() || "",
      supervisor_contact: incidentData.sites?.supervisor_name || incidentData.site?.supervisor_name || "",
      supervisor_phone: incidentData.sites?.supervisor_telephone || incidentData.site?.supervisor_telephone || "",
      employment_type: (incidentData.workers?.basis_of_employment || incidentData.worker?.basis_of_employment) === "Full Time" ? "full_time" :
                      (incidentData.workers?.basis_of_employment || incidentData.worker?.basis_of_employment) === "Part Time" ? "part_time" :
                      (incidentData.workers?.basis_of_employment || incidentData.worker?.basis_of_employment) === "Casual" ? "casual" :
                      (incidentData.workers?.basis_of_employment || incidentData.worker?.basis_of_employment) === "Contract" ? "contractor" :
                      "full_time" as const,
      
      // Injury details
      date_of_injury: incidentData.date_of_injury || "",
      time_of_injury: incidentData.time_of_injury ? 
        incidentData.time_of_injury.substring(0, 5) : "", // Extract HH:MM from time
      injury_type: incidentData.injury_type || "",
      classification: (incidentData.classification as 'LTI' | 'MTI' | 'FAI' | 'Unclassified') || "Unclassified",
      severity: (incidentData.severity as 'Minor' | 'Moderate' | 'Severe') || "Moderate",
      body_part: incidentData.body_part_id?.toString() || "", // Use body_part_id
      // Cost estimation override fields - use worker occupation and site state as defaults
      cost_worker_role: incidentData.workers?.occupation || incidentData.worker?.occupation || "",
      cost_state: incidentData.sites?.state || incidentData.site?.state || "",
      body_side: incidentData.body_side_id?.toString() || "", // Store as ID string for dropdown
      body_regions: derivedBodyRegions, // Derived from body_part_name
      injury_description: incidentData.injury_description || "",
      witness: incidentData.witness || "",
      // Extended injury fields - store as ID strings
      mechanism_of_injury: incidentData.moi_code_id?.toString() || "",
      bodily_location_detail: incidentData.bl_code_id?.toString() || "",
      
      // Treatment details - map from available fields
      type_of_first_aid: incidentData.treatment_provided || "", // Use treatment_provided as first aid
      referred_to: (incidentData.referral?.toLowerCase() || "none") as "none" | "hospital" | "gp" | "specialist" | "physio",
      doctor_details: incidentData.doctor_details || incidentData.doctor_notes || "",
      selected_medical_professional: incidentData.doctor_id?.toString() || "",
      
      // Actions taken
      actions_taken: incidentData.actions ? 
        incidentData.actions.split(';').map((action: string) => action.trim()).filter(Boolean) : [], // Split string into array
      
      // Case notes - separate call transcripts from general notes
      case_notes: extractCaseNotesWithoutTranscript(incidentData.case_notes || ""),
      call_transcripts: extractCallTranscript(incidentData.case_notes || ""),
      
      // Documents will be loaded separately
      documents: [],
    };
    
    console.log('Mapped form data:', formData);
    console.log('Worker ID for form:', incidentData.worker_id, '-> form value:', formData.worker_id);
    console.log('Site ID for form:', incidentData.site_id, '-> form value:', formData.location_site);
    console.log('Derived body regions from body part:', bodyPartName, derivedBodyRegions);
    console.log('Current form values before reset:', form.getValues());
    
    // Use setTimeout to ensure the form is ready before resetting
    setTimeout(() => {
      form.reset(formData);
      console.log('Form values after reset:', form.getValues());
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: IncidentEditFormData) => {
      if (!id) throw new Error('No incident ID provided');

      // Parse worker_id (allow null for incidents without workers)
      const workerId = data.worker_id ? parseInt(data.worker_id) : null;
      if (data.worker_id && isNaN(workerId as number)) {
        throw new Error('Invalid worker ID');
      }

      // Get site_id from location_site (allow null)
      const siteId = data.location_site ? parseInt(data.location_site) : null;
      if (data.location_site && isNaN(siteId as number)) {
        throw new Error('Invalid site ID');
      }

      // Prepare new values for comparison
      const newValues: Record<string, unknown> = {
        notifying_person_name: data.notifying_person_name,
        notifying_person_position: data.notifying_person_position,
        notifying_person_telephone: data.notifying_person_telephone,
        worker_id: workerId,
        site_id: siteId,
        date_of_injury: data.date_of_injury,
        time_of_injury: data.time_of_injury,
        injury_type: data.injury_type,
        body_part_id: parseInt(data.body_part) || null,
        injury_description: data.injury_description,
        witness: data.witness,
        treatment_provided: data.type_of_first_aid,
        referral: data.referred_to !== 'none' ? data.referred_to : null,
        doctor_details: data.doctor_details,
        actions: data.actions_taken.join('; '),
        case_notes: data.case_notes,
      };

      // Calculate changes
      const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
      if (originalDataRef.current) {
        for (const [key, newValue] of Object.entries(newValues)) {
          const oldValue = originalDataRef.current[key];
          // Compare values (stringify for deep comparison)
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: key,
              oldValue: oldValue ?? '',
              newValue: newValue ?? '',
            });
          }
        }
      }

      // Update incident record with correct database field mapping
      // Only include fields that have values (to avoid overwriting with empty strings)
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      // If this is a Voice Agent incident being edited by a human, change status to "In Review"
      if (incidentData?.incident_status === 'Voice Agent') {
        updateData.incident_status = 'In Review';
      }
      
      // Only update fields that have actual values
      if (data.mend_client) updateData.employer_id = parseInt(data.mend_client) || null;
      if (data.notifying_person_name) updateData.notifying_person_name = data.notifying_person_name;
      if (data.notifying_person_position) updateData.notifying_person_position = data.notifying_person_position;
      if (data.notifying_person_telephone) updateData.notifying_person_telephone = data.notifying_person_telephone;
      if (workerId !== null) updateData.worker_id = workerId;
      if (siteId !== null) updateData.site_id = siteId;
      if (data.date_of_injury) updateData.date_of_injury = data.date_of_injury;
      if (data.time_of_injury) updateData.time_of_injury = data.time_of_injury;
      if (data.injury_type) updateData.injury_type = data.injury_type;
      if (data.classification) updateData.classification = data.classification;
      if (data.severity) updateData.severity = data.severity;
      if (data.body_part) updateData.body_part_id = parseInt(data.body_part) || null;
      // Body side is now stored as ID directly
      if (data.body_side) updateData.body_side_id = parseInt(data.body_side) || null;
      // Note: body_regions is UI-only state derived from body_part_id, not stored in DB
      if (data.injury_description) updateData.injury_description = data.injury_description;
      if (data.witness !== undefined) updateData.witness = data.witness || null;
      // Extended injury fields
      if (data.mechanism_of_injury) updateData.moi_code_id = parseInt(data.mechanism_of_injury) || null;
      if (data.bodily_location_detail) updateData.bl_code_id = parseInt(data.bodily_location_detail) || null;
      if (data.type_of_first_aid) updateData.treatment_provided = data.type_of_first_aid;
      if (data.referred_to && data.referred_to !== 'none') updateData.referral = data.referred_to;
      if (data.doctor_details !== undefined) updateData.doctor_details = data.doctor_details || null;
      if (data.selected_medical_professional) updateData.doctor_id = parseInt(data.selected_medical_professional) || null;
      if (data.actions_taken && data.actions_taken.length > 0) updateData.actions = data.actions_taken.join('; ');
      // Combine case_notes and call_transcripts back into case_notes field
      const combinedNotes = combineNotesAndTranscripts(data.case_notes || '', data.call_transcripts || '');
      if (combinedNotes) updateData.case_notes = combinedNotes;

      // Use RBAC-aware RPC for updating
      const { data: updateResult, error: updateError } = await supabase.rpc('update_incident_rbac', {
        p_incident_id: parseInt(id),
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null,
        p_update_data: updateData
      });

      if (updateError) throw updateError;
      if (!updateResult?.success) {
        throw new Error(updateResult?.error || 'Failed to update incident');
      }

      // Log activity if there were changes
      if (changes.length > 0) {
        const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
        const userRole = userData?.role?.role_label || userData?.role?.role_name || 'User';
        const changeDescriptions = changes.map(c => {
          const label = fieldLabels[c.field] || c.field;
          return `${label}`;
        });
        
        const description = `Updated: ${changeDescriptions.join(', ')}`;
        
        // Insert activity log entry using correct table name and columns
        const { error: activityError } = await supabase
          .from('incident_activity_log')
          .insert({
            incident_id: parseInt(id),
            action_type: 'edit',
            summary: 'Incident Updated',
            details: description,
            actor_name: userName,
            actor_role: userRole,
            actor_id: userData?.user_id || null,
            metadata: {
              changes: changes.map(c => ({
                field: c.field,
                fieldLabel: fieldLabels[c.field] || c.field,
                oldValue: c.oldValue,
                newValue: c.newValue,
              })),
            },
          });

        if (activityError) {
          console.error('Failed to log activity:', activityError);
          // Don't fail the update if activity logging fails
        }
      }

      return { incidentId: id };
    },
    onSuccess: (data) => {
      toast.success('Incident updated successfully');
      setShowSuccessDialog(true);
      setTimeout(() => {
        navigate('/incidents', { 
          state: { 
            justUpdatedIncident: true, 
            incidentId: data.incidentId 
          } 
        });
      }, 1000); // Navigate back after 1 second
    },
    onError: (error) => {
      console.error('Failed to update incident:', error);
      toast.error('Failed to update incident. Please try again.');
    },
  });

  const { handleSubmit, formState: { errors, isValid, isDirty } } = form;

  const tabOrder = [
    { id: "notification", title: "Notification", required: true },
    { id: "worker", title: "Worker Details", required: true },
    { id: "employment", title: "Employment", required: true },
    { id: "injury", title: "Injury Details", required: true },
    { id: "treatment", title: "Treatment", required: true },
    { id: "actions", title: "Actions Taken", required: true },
    { id: "notes", title: "Case Notes", required: false },
    { id: "cost", title: "Cost Estimate", required: false },
    { id: "documents", title: "Documents", required: false },
  ];

  const currentTabIndex = tabOrder.findIndex(tab => tab.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabOrder.length - 1;

  // Silent save for auto-save on tab navigation
  const silentSave = async () => {
    try {
      const formData = form.getValues();
      // Direct database update without triggering onSuccess redirect
      if (!id) return;

      const workerId = formData.worker_id ? parseInt(formData.worker_id) : null;
      const siteId = formData.location_site ? parseInt(formData.location_site) : null;

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (formData.mend_client) updateData.employer_id = parseInt(formData.mend_client) || null;
      if (formData.notifying_person_name) updateData.notifying_person_name = formData.notifying_person_name;
      if (formData.notifying_person_position) updateData.notifying_person_position = formData.notifying_person_position;
      if (formData.notifying_person_telephone) updateData.notifying_person_telephone = formData.notifying_person_telephone;
      if (workerId !== null) updateData.worker_id = workerId;
      if (siteId !== null) updateData.site_id = siteId;
      if (formData.date_of_injury) updateData.date_of_injury = formData.date_of_injury;
      if (formData.time_of_injury) updateData.time_of_injury = formData.time_of_injury;
      if (formData.injury_type) updateData.injury_type = formData.injury_type;
      if (formData.classification) updateData.classification = formData.classification;
      if (formData.body_part) updateData.body_part_id = parseInt(formData.body_part) || null;
      // Body side is now stored as ID directly
      if (formData.body_side) updateData.body_side_id = parseInt(formData.body_side) || null;
      // Note: body_regions is UI-only state derived from body_part_id, not stored in DB
      if (formData.injury_description) updateData.injury_description = formData.injury_description;
      if (formData.witness !== undefined) updateData.witness = formData.witness || null;
      // Extended injury fields
      if (formData.mechanism_of_injury) updateData.moi_code_id = parseInt(formData.mechanism_of_injury) || null;
      if (formData.bodily_location_detail) updateData.bl_code_id = parseInt(formData.bodily_location_detail) || null;
      if (formData.type_of_first_aid) updateData.treatment_provided = formData.type_of_first_aid;
      if (formData.referred_to && formData.referred_to !== 'none') updateData.referral = formData.referred_to;
      if (formData.doctor_details !== undefined) updateData.doctor_details = formData.doctor_details || null;
      if (formData.selected_medical_professional) updateData.doctor_id = parseInt(formData.selected_medical_professional) || null;
      if (formData.actions_taken && formData.actions_taken.length > 0) updateData.actions = formData.actions_taken.join('; ');
      // Combine case_notes and call_transcripts back into case_notes field
      const combinedNotes = combineNotesAndTranscripts(formData.case_notes || '', formData.call_transcripts || '');
      if (combinedNotes) updateData.case_notes = combinedNotes;

      await supabase.rpc('update_incident_rbac', {
        p_incident_id: parseInt(id),
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null,
        p_update_data: updateData
      });
      
      // Reset form dirty state after save
      form.reset(form.getValues(), { keepValues: true });
    } catch (error) {
      console.warn('Silent save failed:', error);
    }
  };

  // Archive incident mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
      const { error } = await supabase.rpc('archive_incident', {
        p_incident_id: Number(id),
        p_user_name: userName
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all incident-related queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['recent-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents-chart'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Incident archived successfully');
      navigate('/incidents');
    },
    onError: () => {
      toast.error('Failed to archive incident');
    }
  });

  // Restore incident mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('restore_incident', {
        p_incident_id: Number(id)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch the current incident
      queryClient.invalidateQueries({ queryKey: ['incident-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['recent-incidents'] });
      toast.success('Incident restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore incident');
    }
  });

  // Delete incident mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
      const { error } = await supabase.rpc('soft_delete_incident', {
        p_incident_id: Number(id),
        p_user_name: userName
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all incident-related queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['recent-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents-chart'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('Incident deleted successfully');
      navigate('/incidents');
    },
    onError: () => {
      toast.error('Failed to delete incident');
    }
  });

  // Auto-save when navigating between tabs (silent save - no toast)
  const handleNextTab = async () => {
    if (!isLastTab) {
      // Auto-save current changes if form is dirty (silently)
      if (isDirty) {
        await silentSave();
      }
      setActiveTab(tabOrder[currentTabIndex + 1].id);
    }
  };

  const handlePrevTab = async () => {
    if (!isFirstTab) {
      // Auto-save current changes if form is dirty (silently)
      if (isDirty) {
        await silentSave();
      }
      setActiveTab(tabOrder[currentTabIndex - 1].id);
    }
  };

  const onSubmit = async (data: IncidentEditFormData) => {
    try {
      await updateMutation.mutateAsync(data);
    } catch (error) {
      logValidationError('incident-edit', errors);
    }
  };

  // Debug: Log validation errors when they change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors);
    }
  }, [errors]);

  if (isLoading) {
    return <LoadingState message="Loading incident data..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load incident data. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          onClick={() => navigate('/incidents')}
        >
          Return to Incidents
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DataErrorBoundary errorTitle="Failed to load incident edit form">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                Edit Incident Report #{incidentData?.incident_number}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Archive/Restore button */}
                {(incidentData as any)?.archived_at ? (
                  <Button 
                    onClick={() => restoreMutation.mutate()}
                    size="sm" 
                    variant="outline"
                    className="gap-2"
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive Incident?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will hide the incident from the default view. You can restore it later from the archived incidents list.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => archiveMutation.mutate()}>
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {/* Delete button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Incident?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the incident from view. This action requires admin access to undo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/incidents')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Incidents
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-5 lg:grid-cols-9 mb-6">
                    {tabOrder.map((tab, index) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-xs"
                      >
                        <span className="hidden sm:inline">{tab.title}</span>
                        <span className="sm:hidden">{index + 1}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="notification">
                    <NotificationSection form={form} />
                  </TabsContent>

                  <TabsContent value="worker">
                    <WorkerDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="employment">
                    <EmploymentSection form={form} />
                  </TabsContent>

                  <TabsContent value="injury">
                    <InjuryDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="treatment">
                    <TreatmentDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="actions">
                    <ActionsTakenSection form={form} />
                  </TabsContent>

                  <TabsContent value="notes">
                    <CaseNotesSection form={form} />
                  </TabsContent>

                  <TabsContent value="cost">
                    <IncidentCostEstimate
                      incidentId={parseInt(id || '0')}
                      classification={incidentData?.classification}
                      daysLost={incidentData?.total_days_lost || 0}
                      bodyPartId={incidentData?.body_part_id}
                      bodyPartName={incidentData?.body_part?.body_part_name || undefined}
                      injuryType={incidentData?.injury_type || form.watch('injury_type') || undefined}
                      severity={form.watch('severity') || incidentData?.severity || 'Moderate'}
                      state={form.watch('cost_state') || incidentData?.sites?.state || undefined}
                      workerRole={form.watch('cost_worker_role') || incidentData?.workers?.occupation || incidentData?.worker?.occupation || undefined}
                      isFatality={incidentData?.fatality || false}
                      readOnly={false}
                      onSeverityChange={(value) => form.setValue('severity', value as 'Minor' | 'Moderate' | 'Severe')}
                      onWorkerRoleChange={(value) => form.setValue('cost_worker_role', value)}
                      onStateChange={(value) => form.setValue('cost_state', value)}
                    />
                  </TabsContent>

                  <TabsContent value="documents">
                    <DocumentsSection form={form} />
                  </TabsContent>
                </Tabs>

                {/* Navigation and Submit buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevTab}
                    disabled={isFirstTab}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {!isLastTab && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleNextTab}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="min-w-[120px]"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Form validation errors */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div>Please correct the errors in the form before submitting:</div>
                      <ul className="mt-2 text-xs list-disc list-inside">
                        {Object.entries(errors).map(([field, error]) => (
                          <li key={field}>
                            <strong>{field}</strong>: {(error as any)?.message || 'Invalid value'}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        {showSuccessDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Update Successful!</h3>
                    <p className="text-muted-foreground mt-2">
                      Incident report has been updated successfully.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DataErrorBoundary>
    </div>
  );
};

export default IncidentEditPage;
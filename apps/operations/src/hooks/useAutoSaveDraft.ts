import { useEffect, useRef, useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

interface AutoSaveDraftOptions {
  form: UseFormReturn<any>;
  draftKey: string; // Unique key for localStorage
  autoSaveInterval?: number; // milliseconds, default 30000 (30 seconds)
  onSaveToServer?: boolean; // Whether to also save to Supabase
}

interface DraftData {
  formData: any;
  lastSaved: string;
  currentTab?: string;
  draftId?: number; // Supabase incident_id if saved to server
}

export function useAutoSaveDraft({
  form,
  draftKey,
  autoSaveInterval = 30000,
  onSaveToServer = true,
}: AutoSaveDraftOptions) {
  const { userData } = useAuth();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDraft = useRef(false);

  // Save to localStorage
  const saveToLocalStorage = useCallback((currentTab?: string) => {
    const formData = form.getValues();
    const draft: DraftData = {
      formData,
      lastSaved: new Date().toISOString(),
      currentTab,
      draftId: draftId || undefined,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    return draft;
  }, [form, draftKey, draftId]);

  // Save to Supabase as Draft status
  const saveToServer = useCallback(async (formData: any) => {
    if (!onSaveToServer || !userData) return null;

    setIsSaving(true);
    try {
      // Prepare minimal incident data for draft
      const incidentData: any = {
        incident_status: 'Draft',
        // Notification
        notifying_person_name: formData.notifying_person_name || null,
        notifying_person_position: formData.notifying_person_position || null,
        notifying_person_telephone: formData.notifying_person_telephone || null,
        // Worker
        worker_id: formData.worker_id ? parseInt(formData.worker_id) : null,
        // Employer
        employer_id: formData.mend_client ? parseInt(formData.mend_client) : null,
        // Site
        site_id: formData.location_site ? parseInt(formData.location_site) : null,
        // Injury details
        date_of_injury: formData.date_of_injury || null,
        time_of_injury: formData.time_of_injury || null,
        injury_type: formData.injury_type || null,
        injury_description: formData.injury_description || null,
        // Treatment
        treatment_provided: formData.type_of_first_aid || null,
        referral: formData.referred_to !== 'none' ? formData.referred_to : null,
        doctor_details: formData.doctor_details || null,
        // Actions and notes
        actions: formData.actions_taken?.join('; ') || null,
        case_notes: formData.case_notes || null,
        // Metadata
        recorded_by: userData.user_id ? parseInt(userData.user_id) : null,
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from('incidents')
          .update({ ...incidentData, updated_at: new Date().toISOString() })
          .eq('incident_id', draftId);

        if (error) throw error;
        return draftId;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('incidents')
          .insert(incidentData)
          .select('incident_id')
          .single();

        if (error) throw error;
        if (data) {
          setDraftId(data.incident_id);
          // Update localStorage with the new draft ID
          const localDraft = localStorage.getItem(draftKey);
          if (localDraft) {
            const parsed = JSON.parse(localDraft);
            parsed.draftId = data.incident_id;
            localStorage.setItem(draftKey, JSON.stringify(parsed));
          }
          return data.incident_id;
        }
      }
    } catch (error) {
      console.error('Failed to save draft to server:', error);
      // Don't show error toast for draft saves - just log it
    } finally {
      setIsSaving(false);
    }
    return null;
  }, [onSaveToServer, userData, draftId, draftKey]);

  // Main save function
  const saveDraft = useCallback(async (currentTab?: string, showToast = false) => {
    const draft = saveToLocalStorage(currentTab);
    
    // Only save to server if form has been modified
    if (form.formState.isDirty) {
      await saveToServer(draft.formData);
    }
    
    if (showToast) {
      toast.success('Draft saved', { duration: 2000 });
    }
  }, [saveToLocalStorage, saveToServer, form.formState.isDirty]);

  // Load draft from localStorage
  const loadDraft = useCallback((): DraftData | null => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, [draftKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setDraftId(null);
    setLastSaved(null);
  }, [draftKey]);

  // Discard draft (also delete from server)
  const discardDraft = useCallback(async () => {
    if (draftId) {
      try {
        await supabase
          .from('incidents')
          .delete()
          .eq('incident_id', draftId)
          .eq('incident_status', 'Draft'); // Only delete if still a draft
      } catch (error) {
        console.error('Failed to delete draft from server:', error);
      }
    }
    clearDraft();
  }, [draftId, clearDraft]);

  // Initialize - load existing draft
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    
    const existingDraft = loadDraft();
    if (existingDraft) {
      // Restore form data
      form.reset(existingDraft.formData);
      setLastSaved(new Date(existingDraft.lastSaved));
      if (existingDraft.draftId) {
        setDraftId(existingDraft.draftId);
      }
      hasLoadedDraft.current = true;
      toast.info('Draft restored', { duration: 3000 });
    }
  }, [loadDraft, form]);

  // Set up auto-save interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (form.formState.isDirty) {
        saveDraft(undefined, false);
      }
    }, autoSaveInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSaveInterval, saveDraft, form.formState.isDirty]);

  // Save on tab change (will be called from parent)
  const onTabChange = useCallback((newTab: string) => {
    saveDraft(newTab, false);
  }, [saveDraft]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (form.formState.isDirty) {
        saveToLocalStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty, saveToLocalStorage]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    discardDraft,
    onTabChange,
    lastSaved,
    isSaving,
    draftId,
    hasDraft: !!loadDraft(),
  };
}


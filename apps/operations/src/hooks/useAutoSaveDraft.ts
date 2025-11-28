import { useEffect, useRef, useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import { transformFormDataToDatabase } from '../components/incident-report/services/submission/transformation';

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
      // Transform data using the service that handles lookups/creation
      const transformedData = await transformFormDataToDatabase(formData);
      
      // Ensure status is Draft
      const incidentData = {
        ...transformedData,
        incident_status: 'Draft',
        recorded_by: userData.user_id ? parseInt(userData.user_id) : null,
      };

      if (draftId) {
        // Update existing draft using RBAC-safe RPC
        const { error } = await supabase
          .rpc('update_incident_rbac', {
            p_incident_id: draftId,
            p_user_role_id: userData.role_id,
            p_user_employer_id: userData.employer_id ? parseInt(userData.employer_id) : null,
            p_update_data: incidentData
          });

        if (error) throw error;
        return draftId;
      } else {
        // Create new draft using RLS-bypassing RPC
        const { data: result, error } = await supabase
          .rpc('create_incident_bypassing_rls', {
            p_incident_data: incidentData
          });

        if (error) throw error;
        
        // Parse result from RPC
        const rpcResult = result as { success: boolean; incident_id?: number; error?: string };
        
        if (rpcResult.success && rpcResult.incident_id) {
          setDraftId(rpcResult.incident_id);
          // Update localStorage with the new draft ID
          const localDraft = localStorage.getItem(draftKey);
          if (localDraft) {
            const parsed = JSON.parse(localDraft);
            parsed.draftId = rpcResult.incident_id;
            localStorage.setItem(draftKey, JSON.stringify(parsed));
          }
          return rpcResult.incident_id;
        } else {
            throw new Error(rpcResult.error || 'Failed to create draft');
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

  // Clear draft (call this after successful submission)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setDraftId(null);
    setLastSaved(null);
    hasLoadedDraft.current = true; // Prevent reloading draft
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


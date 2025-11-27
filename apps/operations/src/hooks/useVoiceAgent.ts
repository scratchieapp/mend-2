/**
 * useVoiceAgent Hook
 *
 * Manages voice agent interactions via Retell AI
 * Provides methods to trigger voice tasks and track their status
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  CreateVoiceTaskRequest,
  CreateVoiceTaskResponse,
  VoiceTask,
  VoiceLog,
  VoiceTaskType,
} from '@/types/voice';

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '/functions/v1') || '';

/**
 * Hook for creating and managing voice agent tasks
 */
export function useVoiceAgent() {
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  /**
   * Create a voice task (triggers outbound call via Retell)
   */
  const createVoiceTaskMutation = useMutation({
    mutationFn: async (request: CreateVoiceTaskRequest): Promise<CreateVoiceTaskResponse> => {
      setError(null);

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call Edge Function
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-voice-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create voice task');
      }

      const data: CreateVoiceTaskResponse = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['voice-tasks', variables.incident_id] });
      queryClient.invalidateQueries({ queryKey: ['incident-activities', variables.incident_id] });
    },
    onError: (err: Error) => {
      setError(err);
      console.error('Voice task creation error:', err);
    },
  });

  return {
    createVoiceTask: createVoiceTaskMutation.mutateAsync,
    isCreating: createVoiceTaskMutation.isPending,
    error: error || createVoiceTaskMutation.error,
  };
}

/**
 * Hook for fetching voice tasks for an incident
 */
export function useVoiceTasks(incidentId: number | null) {
  return useQuery({
    queryKey: ['voice-tasks', incidentId],
    queryFn: async (): Promise<VoiceTask[]> => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('voice_tasks')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice tasks:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!incidentId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching voice logs for an incident
 */
export function useVoiceLogs(incidentId: number | null) {
  return useQuery({
    queryKey: ['voice-logs', incidentId],
    queryFn: async (): Promise<VoiceLog[]> => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('voice_logs')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice logs:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!incidentId,
    staleTime: 30000,
  });
}

/**
 * Hook for triggering specific voice task types
 */
export function useVoiceTaskTriggers(incidentId: number) {
  const { createVoiceTask, isCreating, error } = useVoiceAgent();

  const triggerBooking = useCallback(
    async (medicalCenterId: string, priority: number = 5) => {
      return createVoiceTask({
        incident_id: incidentId,
        task_type: 'booking',
        medical_center_id: medicalCenterId,
        priority,
      });
    },
    [incidentId, createVoiceTask]
  );

  const triggerCheckIn = useCallback(
    async (targetPhone?: string) => {
      return createVoiceTask({
        incident_id: incidentId,
        task_type: 'check_in',
        target_phone: targetPhone,
      });
    },
    [incidentId, createVoiceTask]
  );

  const triggerReminder = useCallback(
    async (appointmentId: string, targetPhone?: string) => {
      return createVoiceTask({
        incident_id: incidentId,
        task_type: 'reminder',
        appointment_id: appointmentId,
        target_phone: targetPhone,
      });
    },
    [incidentId, createVoiceTask]
  );

  const triggerSurvey = useCallback(
    async (targetPhone?: string) => {
      return createVoiceTask({
        incident_id: incidentId,
        task_type: 'survey',
        target_phone: targetPhone,
      });
    },
    [incidentId, createVoiceTask]
  );

  return {
    triggerBooking,
    triggerCheckIn,
    triggerReminder,
    triggerSurvey,
    isCreating,
    error,
  };
}

/**
 * Hook for getting voice task statistics
 */
export function useVoiceTaskStats(incidentId: number | null) {
  const { data: tasks, isLoading } = useVoiceTasks(incidentId);

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    failed: tasks?.filter(t => t.status === 'failed').length || 0,
    by_type: tasks?.reduce((acc, task) => {
      acc[task.task_type] = (acc[task.task_type] || 0) + 1;
      return acc;
    }, {} as Record<VoiceTaskType, number>),
  };

  return {
    stats,
    isLoading,
  };
}

/**
 * Hook for real-time voice task updates
 */
export function useVoiceTaskRealtime(incidentId: number | null) {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useState(() => {
    if (!incidentId) return;

    const channel = supabase
      .channel(`voice_tasks:${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_tasks',
          filter: `incident_id=eq.${incidentId}`,
        },
        (payload) => {
          console.log('Voice task update:', payload);
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['voice-tasks', incidentId] });
          queryClient.invalidateQueries({ queryKey: ['incident-activities', incidentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });
}

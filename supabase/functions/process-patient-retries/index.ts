/**
 * Process Patient Retries Edge Function
 * 
 * This function checks for booking workflows that are awaiting patient retry
 * and initiates calls if within calling hours (7am-9:30pm AEST).
 * 
 * Should be called by a cron job every 5-10 minutes.
 * 
 * Endpoint: POST /functions/v1/process-patient-retries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper function to format Australian phone numbers
// Handles: spaces, dashes, parentheses, with/without country code
function formatAustralianPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const hasPlus = phone.startsWith('+');
  let cleaned = phone.replace(/[^\d]/g, '');
  
  // If already has +61, return formatted
  if (hasPlus && cleaned.startsWith('61')) {
    return '+' + cleaned;
  }
  
  // If starts with 61 (without +), add +
  if (cleaned.startsWith('61') && cleaned.length >= 11) {
    return '+' + cleaned;
  }
  
  // If starts with 0, replace with +61
  if (cleaned.startsWith('0')) {
    return '+61' + cleaned.substring(1);
  }
  
  // Otherwise assume it's a local number, add +61
  return '+61' + cleaned;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    const retellPhoneNumber = Deno.env.get('RETELL_PHONE_NUMBER') || '+61299999999';
    const bookingAgentId = Deno.env.get('RETELL_BOOKING_AGENT_ID');

    if (!retellApiKey || !bookingAgentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Retell configuration' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if within calling hours first
    const { data: withinHours } = await supabase.rpc('is_within_calling_hours', { 
      p_timezone: 'Australia/Sydney' 
    });

    if (!withinHours) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Outside calling hours (7am-9:30pm AEST)', 
          calls_initiated: 0 
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get workflows pending patient retry
    const { data: pendingWorkflows, error: fetchError } = await supabase
      .rpc('get_workflows_pending_patient_retry');

    if (fetchError) {
      console.error('Error fetching pending workflows:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pending workflows' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingWorkflows || pendingWorkflows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending patient retries', calls_initiated: 0 }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingWorkflows.length} workflows pending patient retry`);

    let callsInitiated = 0;
    const results: any[] = [];

    for (const workflow of pendingWorkflows) {
      try {
        // Get incident and worker details
        const { data: incident } = await supabase
          .from('incidents')
          .select(`
            *,
            workers (
              worker_id,
              given_name,
              family_name,
              mobile_number,
              phone_number,
              date_of_birth
            )
          `)
          .eq('incident_id', workflow.incident_id)
          .single();

        if (!incident) {
          console.error(`Incident not found for workflow ${workflow.id}`);
          continue;
        }

        // Get medical center
        const { data: medicalCenter } = await supabase
          .from('medical_centers')
          .select('*')
          .eq('id', workflow.medical_center_id)
          .single();

        // Get worker phone
        const workerPhone = incident.workers?.mobile_number || incident.workers?.phone_number;
        const workerName = incident.workers
          ? `${incident.workers.given_name} ${incident.workers.family_name}`.trim()
          : 'the patient';

        if (!workerPhone) {
          console.error(`No phone number for worker in workflow ${workflow.id}`);
          await supabase.rpc('update_booking_workflow_v2', {
            p_workflow_id: workflow.id,
            p_status: 'failed',
            p_failure_reason: 'No patient phone number available',
          });
          continue;
        }

        // Format Australian phone number - handle spaces, dashes, parentheses
        const targetPhone = formatAustralianPhone(workerPhone);

        // Build dynamic variables
        const availableTimesFormatted = (workflow.available_times || [])
          .map((t: any, i: number) => `${i + 1}. ${t.datetime || t.time}${t.doctor_name ? ` with ${t.doctor_name}` : ''}`)
          .join('\n');

        const dynamicVariables = {
          workflow_id: workflow.id,
          call_type: 'patient_confirm',
          worker_name: workerName,
          worker_first_name: incident.workers?.given_name || '',
          worker_dob: incident.workers?.date_of_birth || '',
          injury_type: incident.nature_of_injury || 'workplace injury',
          injury_description: incident.how_incident_occurred || '',
          body_part: incident.body_parts_affected || '',
          date_of_injury: incident.date_of_injury || '',
          medical_center_name: medicalCenter?.name || '',
          medical_center_address: medicalCenter?.address || '',
          doctor_preference: workflow.doctor_preference || 'any_doctor',
          preferred_doctor_name: workflow.patient_preferred_doctor || '',
          urgency: workflow.urgency || 'normal',
          available_times_summary: availableTimesFormatted,
          available_times_json: JSON.stringify(workflow.available_times || []),
          additional_notes: `Retry attempt ${(workflow.patient_call_attempts || 0) + 1} of 3`,
        };

        // Get next call sequence
        const { data: existingTasks } = await supabase
          .from('voice_tasks')
          .select('id')
          .eq('booking_workflow_id', workflow.id);

        const callSequence = (existingTasks?.length || 0) + 1;

        // Create voice task
        const { data: voiceTask, error: taskError } = await supabase
          .from('voice_tasks')
          .insert({
            incident_id: workflow.incident_id,
            task_type: 'booking_patient_confirm',
            priority: workflow.urgency === 'urgent' ? 9 : 5,
            target_phone: targetPhone,
            target_name: workerName,
            booking_workflow_id: workflow.id,
            context_data: {
              workflow_id: workflow.id,
              medical_center_id: workflow.medical_center_id,
              worker_name: workerName,
              available_times: workflow.available_times,
              call_sequence: callSequence,
              retry_attempt: (workflow.patient_call_attempts || 0) + 1,
            },
            status: 'pending',
            scheduled_at: new Date().toISOString(),
            created_by: 'ai_booking_agent_retry',
          })
          .select()
          .single();

        if (taskError) {
          console.error(`Error creating voice task for workflow ${workflow.id}:`, taskError);
          continue;
        }

        // Create Retell call
        const retellResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_number: retellPhoneNumber,
            to_number: targetPhone,
            override_agent_id: bookingAgentId,
            retell_llm_dynamic_variables: dynamicVariables,
            metadata: {
              task_id: voiceTask.id,
              workflow_id: workflow.id,
              incident_id: workflow.incident_id,
              task_type: 'booking_patient_confirm',
              call_sequence: callSequence,
              is_retry: true,
              retry_attempt: (workflow.patient_call_attempts || 0) + 1,
            },
          }),
        });

        if (!retellResponse.ok) {
          const errorText = await retellResponse.text();
          console.error(`Retell API error for workflow ${workflow.id}:`, errorText);
          await supabase.from('voice_tasks').update({
            status: 'failed',
            failure_reason: `Retell API error: ${errorText}`,
          }).eq('id', voiceTask.id);
          continue;
        }

        const retellData = await retellResponse.json();
        console.log(`Patient retry call created: ${retellData.call_id} for workflow ${workflow.id}`);

        // Update task and workflow
        await supabase.from('voice_tasks').update({
          retell_call_id: retellData.call_id,
          status: 'in_progress',
        }).eq('id', voiceTask.id);

        await supabase.rpc('update_booking_workflow_v2', {
          p_workflow_id: workflow.id,
          p_status: 'calling_patient',
          p_current_call_id: retellData.call_id,
          p_last_call_type: 'patient',
        });

        // Record call start
        await supabase.rpc('record_booking_call_start', {
          p_workflow_id: workflow.id,
          p_retell_call_id: retellData.call_id,
          p_call_target: 'patient',
          p_target_phone: targetPhone,
          p_target_name: workerName,
          p_task_type: 'booking_patient_confirm',
          p_voice_task_id: voiceTask.id,
        });

        // Log activity
        await supabase.from('incident_activity_log').insert({
          incident_id: workflow.incident_id,
          action_type: 'voice_agent',
          summary: `Retry call to ${workerName} (attempt ${(workflow.patient_call_attempts || 0) + 1} of 3)`,
          details: `AI agent calling ${workerName} at ${targetPhone} to confirm appointment time`,
          actor_name: 'AI Booking Agent',
          metadata: {
            workflow_id: workflow.id,
            call_id: retellData.call_id,
            task_type: 'booking_patient_confirm',
            call_sequence: callSequence,
            retry_attempt: (workflow.patient_call_attempts || 0) + 1,
          },
        });

        callsInitiated++;
        results.push({
          workflow_id: workflow.id,
          call_id: retellData.call_id,
          patient_name: workerName,
          attempt: (workflow.patient_call_attempts || 0) + 1,
        });

      } catch (workflowError) {
        console.error(`Error processing workflow ${workflow.id}:`, workflowError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingWorkflows.length} pending workflows`,
        calls_initiated: callsInitiated,
        results,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-patient-retries error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


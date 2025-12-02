/**
 * Process Booking Retries Edge Function
 * 
 * This function handles retry logic for both:
 * 1. Medical center calls (voicemail, no answer, busy) - up to 5 attempts, 5 min apart
 * 2. Patient confirmation calls (no answer, voicemail) - up to 3 attempts, 30 min apart
 * 
 * Should be called by a cron job every 5 minutes.
 * 
 * Endpoint: POST /functions/v1/process-booking-retries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_MEDICAL_CENTER_ATTEMPTS = 5;
const MAX_PATIENT_ATTEMPTS = 3;

// Helper function to format Australian phone numbers
function formatAustralianPhone(phone: string): string {
  const hasPlus = phone.startsWith('+');
  let cleaned = phone.replace(/[^\d]/g, '');
  
  if (hasPlus && cleaned.startsWith('61')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('61') && cleaned.length >= 11) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '+61' + cleaned.substring(1);
  }
  return '+61' + cleaned;
}

serve(async (req: Request) => {
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

    // Check if within calling hours (7am-9:30pm AEST)
    const { data: withinHours } = await supabase.rpc('is_within_calling_hours', { 
      p_timezone: 'Australia/Sydney' 
    });

    if (!withinHours) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Outside calling hours (7am-9:30pm AEST)', 
          medical_center_calls: 0,
          patient_calls: 0 
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      medical_center_calls: 0,
      patient_calls: 0,
      details: [] as any[],
    };

    // ============================================
    // 1. Process Medical Center Retries
    // ============================================
    const { data: mcRetries } = await supabase
      .from('booking_workflows')
      .select('*')
      .eq('status', 'awaiting_medical_center_retry')
      .lte('retry_scheduled_at', new Date().toISOString())
      .lt('retry_attempt', MAX_MEDICAL_CENTER_ATTEMPTS);

    if (mcRetries && mcRetries.length > 0) {
      console.log(`Processing ${mcRetries.length} medical center retries`);
      
      for (const workflow of mcRetries) {
        try {
          const result = await processMedicalCenterRetry(
            supabase,
            workflow,
            retellApiKey,
            retellPhoneNumber,
            bookingAgentId
          );
          if (result.success) {
            results.medical_center_calls++;
            results.details.push(result);
          }
        } catch (error) {
          console.error(`Error processing MC retry for workflow ${workflow.id}:`, error);
        }
      }
    }

    // ============================================
    // 2. Process Patient Retries
    // ============================================
    const { data: patientRetries } = await supabase.rpc('get_workflows_pending_patient_retry');

    if (patientRetries && patientRetries.length > 0) {
      console.log(`Processing ${patientRetries.length} patient retries`);
      
      for (const workflow of patientRetries) {
        try {
          const result = await processPatientRetry(
            supabase,
            workflow,
            retellApiKey,
            retellPhoneNumber,
            bookingAgentId
          );
          if (result.success) {
            results.patient_calls++;
            results.details.push(result);
          }
        } catch (error) {
          console.error(`Error processing patient retry for workflow ${workflow.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed retries: ${results.medical_center_calls} medical center, ${results.patient_calls} patient`,
        ...results,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-booking-retries error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

async function processMedicalCenterRetry(
  supabase: any,
  workflow: any,
  retellApiKey: string,
  retellPhoneNumber: string,
  bookingAgentId: string
) {
  // Get medical center
  const { data: medicalCenter } = await supabase
    .from('medical_centers')
    .select('*')
    .eq('id', workflow.medical_center_id)
    .single();

  if (!medicalCenter || !medicalCenter.phone_number) {
    console.error(`No phone number for medical center in workflow ${workflow.id}`);
    return { success: false, error: 'No medical center phone' };
  }

  // Get incident details
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

  const workerName = incident?.workers
    ? `${incident.workers.given_name} ${incident.workers.family_name}`.trim()
    : 'the patient';

  const targetPhone = formatAustralianPhone(medicalCenter.phone_number);
  const attemptNumber = (workflow.retry_attempt || 0) + 1;

  // Build dynamic variables
  const dynamicVariables = {
    workflow_id: workflow.id,
    call_type: 'get_times',
    worker_name: workerName,
    worker_first_name: incident?.workers?.given_name || '',
    medical_center_name: medicalCenter.name || '',
    medical_center_address: medicalCenter.address || '',
    doctor_preference: workflow.doctor_preference || 'any_doctor',
    urgency: workflow.urgency || 'normal',
    additional_notes: `Retry attempt ${attemptNumber} of ${MAX_MEDICAL_CENTER_ATTEMPTS}. Previous call went to voicemail.`,
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
      task_type: 'booking_get_times',
      priority: workflow.urgency === 'urgent' ? 9 : 5,
      target_phone: targetPhone,
      target_name: medicalCenter.name,
      booking_workflow_id: workflow.id,
      context_data: {
        workflow_id: workflow.id,
        medical_center_id: workflow.medical_center_id,
        worker_name: workerName,
        call_sequence: callSequence,
        retry_attempt: attemptNumber,
      },
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      created_by: 'ai_booking_agent_retry',
    })
    .select()
    .single();

  if (taskError) {
    console.error(`Error creating voice task:`, taskError);
    return { success: false, error: 'Failed to create voice task' };
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
        task_type: 'booking_get_times',
        call_sequence: callSequence,
        is_retry: true,
        retry_attempt: attemptNumber,
      },
    }),
  });

  if (!retellResponse.ok) {
    const errorText = await retellResponse.text();
    console.error(`Retell API error:`, errorText);
    await supabase.from('voice_tasks').update({
      status: 'failed',
      failure_reason: `Retell API error: ${errorText}`,
    }).eq('id', voiceTask.id);
    return { success: false, error: 'Retell API error' };
  }

  const retellData = await retellResponse.json();
  console.log(`Medical center retry call created: ${retellData.call_id}`);

  // Update task and workflow
  await supabase.from('voice_tasks').update({
    retell_call_id: retellData.call_id,
    status: 'in_progress',
  }).eq('id', voiceTask.id);

  await supabase.rpc('update_booking_workflow_v2', {
    p_workflow_id: workflow.id,
    p_status: 'calling_medical_center',
    p_current_call_id: retellData.call_id,
    p_last_call_type: 'medical_center',
    p_retry_attempt: attemptNumber,
  });

  // Record call start
  await supabase.rpc('record_booking_call_start', {
    p_workflow_id: workflow.id,
    p_retell_call_id: retellData.call_id,
    p_call_target: 'medical_center',
    p_target_phone: targetPhone,
    p_target_name: medicalCenter.name,
    p_task_type: 'booking_get_times',
    p_voice_task_id: voiceTask.id,
  });

  // Log activity
  await supabase.from('incident_activity_log').insert({
    incident_id: workflow.incident_id,
    action_type: 'voice_agent',
    summary: `Retry call to ${medicalCenter.name} (attempt ${attemptNumber} of ${MAX_MEDICAL_CENTER_ATTEMPTS})`,
    details: `AI agent calling ${medicalCenter.name} at ${targetPhone} to get available appointment times`,
    actor_name: 'AI Booking Agent',
    metadata: {
      workflow_id: workflow.id,
      call_id: retellData.call_id,
      task_type: 'booking_get_times',
      call_sequence: callSequence,
      retry_attempt: attemptNumber,
    },
  });

  return {
    success: true,
    type: 'medical_center',
    workflow_id: workflow.id,
    call_id: retellData.call_id,
    target: medicalCenter.name,
    attempt: attemptNumber,
  };
}

async function processPatientRetry(
  supabase: any,
  workflow: any,
  retellApiKey: string,
  retellPhoneNumber: string,
  bookingAgentId: string
) {
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
    return { success: false, error: 'Incident not found' };
  }

  // Get medical center
  const { data: medicalCenter } = await supabase
    .from('medical_centers')
    .select('*')
    .eq('id', workflow.medical_center_id)
    .single();

  const workerPhone = incident.workers?.mobile_number || incident.workers?.phone_number;
  const workerName = incident.workers
    ? `${incident.workers.given_name} ${incident.workers.family_name}`.trim()
    : 'the patient';

  if (!workerPhone) {
    await supabase.rpc('update_booking_workflow_v2', {
      p_workflow_id: workflow.id,
      p_status: 'failed',
      p_failure_reason: 'No patient phone number available',
    });
    return { success: false, error: 'No patient phone' };
  }

  const targetPhone = formatAustralianPhone(workerPhone);
  const attemptNumber = (workflow.patient_call_attempts || 0) + 1;

  // Build dynamic variables
  const availableTimesFormatted = (workflow.available_times || [])
    .map((t: any, i: number) => `${i + 1}. ${t}`)
    .join('\n');

  const dynamicVariables = {
    workflow_id: workflow.id,
    call_type: 'patient_confirm',
    worker_name: workerName,
    worker_first_name: incident.workers?.given_name || '',
    medical_center_name: medicalCenter?.name || '',
    doctor_preference: workflow.doctor_preference || 'any_doctor',
    urgency: workflow.urgency || 'normal',
    available_times_summary: availableTimesFormatted,
    available_times_json: JSON.stringify(workflow.available_times || []),
    additional_notes: `Retry attempt ${attemptNumber} of ${MAX_PATIENT_ATTEMPTS}`,
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
        retry_attempt: attemptNumber,
      },
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      created_by: 'ai_booking_agent_retry',
    })
    .select()
    .single();

  if (taskError) {
    return { success: false, error: 'Failed to create voice task' };
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
        retry_attempt: attemptNumber,
      },
    }),
  });

  if (!retellResponse.ok) {
    const errorText = await retellResponse.text();
    await supabase.from('voice_tasks').update({
      status: 'failed',
      failure_reason: `Retell API error: ${errorText}`,
    }).eq('id', voiceTask.id);
    return { success: false, error: 'Retell API error' };
  }

  const retellData = await retellResponse.json();
  console.log(`Patient retry call created: ${retellData.call_id}`);

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
    summary: `Retry call to ${workerName} (attempt ${attemptNumber} of ${MAX_PATIENT_ATTEMPTS})`,
    details: `AI agent calling ${workerName} at ${targetPhone} to confirm appointment time`,
    actor_name: 'AI Booking Agent',
    metadata: {
      workflow_id: workflow.id,
      call_id: retellData.call_id,
      task_type: 'booking_patient_confirm',
      call_sequence: callSequence,
      retry_attempt: attemptNumber,
    },
  });

  return {
    success: true,
    type: 'patient',
    workflow_id: workflow.id,
    call_id: retellData.call_id,
    target: workerName,
    attempt: attemptNumber,
  };
}


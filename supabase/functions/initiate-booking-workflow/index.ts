/**
 * Initiate Booking Workflow Edge Function
 * 
 * Orchestrates multi-call medical appointment booking:
 *   1. Call medical center → Get available appointment times
 *   2. Call patient → Confirm preferred time
 *   3. Call medical center → Confirm final booking
 * 
 * Request body:
 * {
 *   incident_id: number;
 *   medical_center_id: string;           // UUID of medical center
 *   doctor_preference: 'any_doctor' | 'specific_doctor';
 *   preferred_doctor_id?: number;        // Required if doctor_preference is 'specific_doctor'
 *   urgency?: 'urgent' | 'normal' | 'low';
 *   requested_by?: string;
 *   requested_by_user_id?: string;
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Types
interface InitiateBookingRequest {
  incident_id: number;
  medical_center_id: string;
  doctor_preference: 'any_doctor' | 'specific_doctor';
  preferred_doctor_id?: number;
  urgency?: 'urgent' | 'normal' | 'low';
  requested_by?: string;
  requested_by_user_id?: string;
}

interface RetellCreateCallRequest {
  from_number: string;
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, string>;
  metadata?: Record<string, any>;
  override_agent_id?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
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
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const retellApiKey = Deno.env.get('RETELL_API_KEY')!;
    const retellPhoneNumber = Deno.env.get('RETELL_PHONE_NUMBER') || '+61299999999';
    const bookingAgentId = Deno.env.get('RETELL_BOOKING_AGENT_ID');

    if (!bookingAgentId) {
      return new Response(
        JSON.stringify({ error: 'RETELL_BOOKING_AGENT_ID not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const requestData: InitiateBookingRequest = await req.json();
    const {
      incident_id,
      medical_center_id,
      doctor_preference = 'any_doctor',
      preferred_doctor_id,
      urgency = 'normal',
      requested_by = 'system',
      requested_by_user_id,
    } = requestData;

    // Validate
    if (!incident_id || !medical_center_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id and medical_center_id are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (doctor_preference === 'specific_doctor' && !preferred_doctor_id) {
      return new Response(
        JSON.stringify({ error: 'preferred_doctor_id required when doctor_preference is specific_doctor' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Create booking workflow using RPC
    const { data: workflowResult, error: workflowError } = await supabase
      .rpc('initiate_booking_workflow', {
        p_incident_id: incident_id,
        p_medical_center_id: medical_center_id,
        p_doctor_preference: doctor_preference,
        p_preferred_doctor_id: preferred_doctor_id || null,
        p_urgency: urgency,
        p_requested_by: requested_by,
        p_requested_by_user_id: requested_by_user_id || null,
      });

    if (workflowError || !workflowResult?.success) {
      console.error('Workflow creation error:', workflowError || workflowResult?.error);
      return new Response(
        JSON.stringify({ 
          error: workflowResult?.error || workflowError?.message || 'Failed to create workflow' 
        }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const workflowId = workflowResult.workflow_id;
    console.log(`Booking workflow created: ${workflowId}`);

    // 2. Get full incident details for the agent
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select(`
        *,
        workers (
          worker_id,
          given_name,
          family_name,
          mobile_number,
          phone_number,
          email,
          date_of_birth
        ),
        employers (
          employer_id,
          employer_name
        )
      `)
      .eq('incident_id', incident_id)
      .single();

    if (incidentError || !incident) {
      console.error('Incident query error:', incidentError);
      // Cancel the workflow
      await supabase.rpc('update_booking_workflow', {
        p_workflow_id: workflowId,
        p_status: 'failed',
        p_failure_reason: 'Incident not found',
      });
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get medical center details
    const { data: medicalCenter, error: mcError } = await supabase
      .from('medical_centers')
      .select('*')
      .eq('id', medical_center_id)
      .single();

    if (mcError || !medicalCenter) {
      console.error('Medical center query error:', mcError);
      await supabase.rpc('update_booking_workflow', {
        p_workflow_id: workflowId,
        p_status: 'failed',
        p_failure_reason: 'Medical center not found',
      });
      return new Response(
        JSON.stringify({ error: 'Medical center not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get preferred doctor details if specified
    let preferredDoctor = null;
    if (preferred_doctor_id) {
      const { data: doctor } = await supabase
        .from('medical_professionals')
        .select('*')
        .eq('doctor_id', preferred_doctor_id)
        .single();
      preferredDoctor = doctor;
    }

    // 5. Prepare phone number (E.164 format) - handles spaces, dashes, etc.
    const phoneNumber = formatAustralianPhone(medicalCenter.phone_number);

    // 6. Build dynamic variables for Retell agent
    const workerName = `${incident.workers?.given_name || ''} ${incident.workers?.family_name || ''}`.trim();
    const workerDOB = incident.workers?.date_of_birth 
      ? new Date(incident.workers.date_of_birth).toLocaleDateString('en-AU')
      : '';
    
    const dynamicVariables: Record<string, string> = {
      // Worker details
      worker_name: workerName,
      worker_first_name: incident.workers?.given_name || '',
      worker_last_name: incident.workers?.family_name || '',
      worker_dob: workerDOB,
      
      // Injury details
      injury_type: incident.injury_type || 'workplace injury',
      injury_description: incident.injury_description || '',
      body_part: incident.body_part || '',
      date_of_injury: incident.date_of_injury 
        ? new Date(incident.date_of_injury).toLocaleDateString('en-AU')
        : '',
      
      // Medical center
      medical_center_name: medicalCenter.name || '',
      medical_center_address: [
        medicalCenter.address,
        medicalCenter.suburb,
        medicalCenter.postcode
      ].filter(Boolean).join(', '),
      
      // Doctor preference
      doctor_preference: doctor_preference,
      preferred_doctor_name: preferredDoctor 
        ? `Dr ${preferredDoctor.first_name} ${preferredDoctor.last_name}`
        : '',
      
      // Employer
      employer_name: incident.employers?.employer_name || '',
      
      // Workflow tracking
      workflow_id: workflowId,
      call_type: 'get_times',  // First call: get available times
      
      // Urgency
      urgency: urgency,
      urgency_context: urgency === 'urgent' 
        ? 'This is an urgent case, please try to get the earliest available appointment.'
        : '',
    };

    // Add IVR instructions if available
    if (medicalCenter.ivr_instructions) {
      dynamicVariables.ivr_instructions = medicalCenter.ivr_instructions;
    }

    // 7. Create voice task record
    const { data: voiceTask, error: taskError } = await supabase
      .from('voice_tasks')
      .insert({
        incident_id,
        task_type: 'booking_get_times',
        priority: urgency === 'urgent' ? 9 : urgency === 'low' ? 3 : 5,
        target_phone: phoneNumber,
        target_name: medicalCenter.name,
        booking_workflow_id: workflowId,
        context_data: {
          workflow_id: workflowId,
          medical_center_id,
          doctor_preference,
          preferred_doctor_id,
          worker_name: workerName,
          call_sequence: 1,  // First call in the sequence
        },
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        created_by: requested_by,
      })
      .select()
      .single();

    if (taskError) {
      console.error('Voice task creation error:', taskError);
      await supabase.rpc('update_booking_workflow', {
        p_workflow_id: workflowId,
        p_status: 'failed',
        p_failure_reason: 'Failed to create voice task',
      });
      throw taskError;
    }

    console.log(`Voice task created: ${voiceTask.id}`);

    // 8. Create Retell call
    const retellRequest: RetellCreateCallRequest = {
      from_number: retellPhoneNumber,
      to_number: phoneNumber,
      override_agent_id: bookingAgentId,
      retell_llm_dynamic_variables: dynamicVariables,
      metadata: {
        task_id: voiceTask.id,
        workflow_id: workflowId,
        incident_id,
        task_type: 'booking_get_times',
        call_sequence: 1,
      },
    };

    console.log('Creating Retell call:', { 
      to_number: phoneNumber, 
      agent_id: bookingAgentId,
      workflow_id: workflowId 
    });

    const retellResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retellRequest),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('Retell API error:', errorText);

      // Update task and workflow status to failed
      await supabase
        .from('voice_tasks')
        .update({
          status: 'failed',
          failure_reason: `Retell API error: ${errorText}`,
        })
        .eq('id', voiceTask.id);

      await supabase.rpc('update_booking_workflow', {
        p_workflow_id: workflowId,
        p_status: 'failed',
        p_failure_reason: `Retell API error: ${errorText}`,
      });

      throw new Error(`Retell API error: ${errorText}`);
    }

    const retellData = await retellResponse.json();
    console.log('Retell call created:', retellData.call_id);

    // 9. Update task and workflow with call ID
    await supabase
      .from('voice_tasks')
      .update({
        retell_call_id: retellData.call_id,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', voiceTask.id);

    await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflowId,
      p_status: 'calling_medical_center',
      p_current_call_id: retellData.call_id,
      p_last_call_type: 'medical_center',
    });

    // 10. Log activity
    await supabase
      .from('incident_activity_log')
      .insert({
        incident_id,
        action_type: 'voice_agent',
        summary: 'Medical booking call started',
        details: `AI agent calling ${medicalCenter.name} to get available appointment times for ${workerName}`,
        actor_name: requested_by,
        actor_id: requested_by_user_id || null,
        metadata: {
          workflow_id: workflowId,
          call_id: retellData.call_id,
          task_id: voiceTask.id,
          medical_center_name: medicalCenter.name,
          doctor_preference,
          call_sequence: 1,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        workflow_id: workflowId,
        task_id: voiceTask.id,
        call_id: retellData.call_id,
        call_status: retellData.call_status,
        message: `Booking workflow initiated. Calling ${medicalCenter.name} to get available times.`,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Initiate booking workflow error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});


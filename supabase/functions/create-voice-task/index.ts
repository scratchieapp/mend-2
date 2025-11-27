/**
 * Create Voice Task Edge Function
 *
 * Triggers outbound calls via Retell AI.
 * Creates voice_task record and initiates phone call.
 *
 * Request body:
 * {
 *   incident_id: number;
 *   task_type: 'booking' | 'check_in' | 'reminder' | 'survey';
 *   target_phone?: string;  // Optional - will use worker phone if not provided
 *   medical_center_id?: string;  // Required for booking tasks
 *   priority?: number;  // 1-10, default 5
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Types
interface CreateVoiceTaskRequest {
  incident_id: number;
  task_type: 'booking' | 'check_in' | 'reminder' | 'survey' | 'follow_up';
  target_phone?: string;
  medical_center_id?: string;
  appointment_id?: string;
  priority?: number;
  execute_after?: string; // ISO timestamp
}

interface RetellCreateCallRequest {
  from_number: string;
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, string>;
  metadata?: Record<string, any>;
  override_agent_id?: string;
}

interface RetellCreateCallResponse {
  call_id: string;
  call_status: string;
}

// Retell Agent IDs (to be configured in Retell dashboard)
const RETELL_AGENTS = {
  booking: Deno.env.get('RETELL_BOOKING_AGENT_ID') || '',
  check_in: Deno.env.get('RETELL_CHECKIN_AGENT_ID') || '',
  reminder: Deno.env.get('RETELL_REMINDER_AGENT_ID') || '',
  survey: Deno.env.get('RETELL_SURVEY_AGENT_ID') || '',
  follow_up: Deno.env.get('RETELL_CHECKIN_AGENT_ID') || '', // Reuse check-in agent
};

serve(async (req: Request) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const retellApiKey = Deno.env.get('RETELL_API_KEY')!;
    const retellPhoneNumber = Deno.env.get('RETELL_PHONE_NUMBER') || '+61299999999'; // Default AU number

    // Parse request
    const requestData: CreateVoiceTaskRequest = await req.json();
    const {
      incident_id,
      task_type,
      target_phone,
      medical_center_id,
      appointment_id,
      priority = 5,
      execute_after,
    } = requestData;

    // Validate required fields
    if (!incident_id || !task_type) {
      return new Response(
        JSON.stringify({ error: 'incident_id and task_type are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (task_type === 'booking' && !medical_center_id) {
      return new Response(
        JSON.stringify({ error: 'medical_center_id required for booking tasks' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch incident details
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
          email
        )
      `)
      .eq('incident_id', incident_id)
      .single();

    if (incidentError || !incident) {
      console.error('Incident query error:', incidentError);
      return new Response(
        JSON.stringify({ error: 'Incident not found', details: incidentError?.message }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine target phone number
    let phoneNumber = target_phone;
    let targetName = '';

    if (task_type === 'booking') {
      // For booking, call the medical center
      const { data: medicalCenter } = await supabase
        .from('medical_centers')
        .select('*')
        .eq('id', medical_center_id)
        .single();

      if (!medicalCenter) {
        return new Response(
          JSON.stringify({ error: 'Medical center not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      phoneNumber = medicalCenter.phone_number;
      targetName = medicalCenter.name;
    } else {
      // For other tasks, call the worker
      phoneNumber = target_phone || incident.workers.mobile_number || incident.workers.phone_number;
      targetName = `${incident.workers.given_name} ${incident.workers.family_name}`;
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'No phone number available for call' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert Australian phone numbers to E.164 format
    // e.g., 0412345678 -> +61412345678
    if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
      phoneNumber = '+61' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      // If no country code and doesn't start with 0, assume Australian and add +61
      phoneNumber = '+61' + phoneNumber;
    }

    // Build context data for the voice agent
    const workerName = `${incident.workers.given_name} ${incident.workers.family_name}`;
    const contextData: Record<string, any> = {
      incident_id: incident.incident_id,
      incident_number: incident.incident_number,
      worker_name: workerName,
      worker_phone: incident.workers.mobile_number || incident.workers.phone_number,
      injury_type: incident.injury_type,
      injury_description: incident.injury_description,
      date_of_injury: incident.date_of_injury,
      body_part: incident.body_part,
    };

    // Add task-specific context
    if (task_type === 'booking' && medical_center_id) {
      const { data: medicalCenter } = await supabase
        .from('medical_centers')
        .select('*')
        .eq('id', medical_center_id)
        .single();

      contextData.medical_center = {
        id: medical_center_id,
        name: medicalCenter?.name,
        phone: medicalCenter?.phone_number,
        address: `${medicalCenter?.address}, ${medicalCenter?.suburb} ${medicalCenter?.postcode}`,
        ivr_instructions: medicalCenter?.ivr_instructions,
      };
    }

    if (task_type === 'reminder' && appointment_id) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .single();

      contextData.appointment = {
        id: appointment_id,
        scheduled_date: appointment?.scheduled_date,
        location: appointment?.location_address,
        type: appointment?.appointment_type,
      };
    }

    // Create voice task record
    const { data: voiceTask, error: taskError } = await supabase
      .from('voice_tasks')
      .insert({
        incident_id,
        task_type,
        priority,
        target_phone: phoneNumber,
        target_name: targetName,
        context_data: contextData,
        status: 'pending',
        scheduled_at: execute_after || new Date().toISOString(),
        execute_after: execute_after || null,
        appointment_id: appointment_id || null,
        created_by: 'system',
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating voice task:', taskError);
      throw taskError;
    }

    console.log(`Voice task created: ${voiceTask.id}`);

    // Prepare dynamic variables for Retell agent
    const dynamicVariables: Record<string, string> = {
      worker_name: workerName,
      injury_type: incident.injury_type || 'workplace injury',
      injury_description: incident.injury_description || '',
      date_of_injury: incident.date_of_injury || '',
      incident_number: incident.incident_number || '',
    };

    if (task_type === 'booking') {
      dynamicVariables.medical_center_name = contextData.medical_center?.name || '';
      dynamicVariables.medical_center_address = contextData.medical_center?.address || '';
    }

    if (task_type === 'reminder' && contextData.appointment) {
      dynamicVariables.appointment_date = contextData.appointment.scheduled_date || '';
      dynamicVariables.appointment_location = contextData.appointment.location || '';
    }

    // Create Retell API call
    const retellAgentId = RETELL_AGENTS[task_type];
    if (!retellAgentId) {
      return new Response(
        JSON.stringify({ error: `No Retell agent configured for task type: ${task_type}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const retellRequest: RetellCreateCallRequest = {
      from_number: retellPhoneNumber,
      to_number: phoneNumber,
      override_agent_id: retellAgentId,
      retell_llm_dynamic_variables: dynamicVariables,
      metadata: {
        task_id: voiceTask.id,
        incident_id,
        task_type,
      },
    };

    console.log('Creating Retell call:', { to_number: phoneNumber, agent_id: retellAgentId });

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

      // Update task status to failed
      await supabase
        .from('voice_tasks')
        .update({
          status: 'failed',
          failure_reason: `Retell API error: ${errorText}`,
        })
        .eq('id', voiceTask.id);

      throw new Error(`Retell API error: ${errorText}`);
    }

    const retellData: RetellCreateCallResponse = await retellResponse.json();
    console.log('Retell call created:', retellData.call_id);

    // Update task with Retell call ID
    await supabase
      .from('voice_tasks')
      .update({
        retell_call_id: retellData.call_id,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', voiceTask.id);

    // Create incident activity
    await supabase.from('incident_activities').insert({
      incident_id,
      type: 'voice_agent',
      title: `AI ${task_type} call initiated`,
      description: `Voice agent calling ${targetName} at ${phoneNumber}`,
      created_by: 'ai_agent',
      metadata: {
        task_id: voiceTask.id,
        call_id: retellData.call_id,
        task_type,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        task_id: voiceTask.id,
        call_id: retellData.call_id,
        call_status: retellData.call_status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Create voice task error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Booking Patient Reschedule Edge Function
 * 
 * Called when patient cannot make any of the offered appointment times.
 * Marks workflow to get new times from clinic.
 * 
 * Endpoint: POST /functions/v1/booking-patient-reschedule
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PatientRescheduleRequest {
  patient_availability_notes?: string;
  reason?: string;
  args?: {
    patient_availability_notes?: string;
    reason?: string;
  };
  call?: {
    call_id?: string;
    metadata?: {
      workflow_id?: string;
      incident_id?: number;
    };
  };
  workflow_id?: string;
}

interface PatientRescheduleResponse {
  success: boolean;
  message: string;
  next_step?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawData: PatientRescheduleRequest = await req.json();
    console.log('booking-patient-reschedule received:', JSON.stringify(rawData));

    let patient_availability_notes = rawData.patient_availability_notes || rawData.args?.patient_availability_notes;
    let reason = rawData.reason || rawData.args?.reason;
    let workflow_id = rawData.workflow_id || rawData.call?.metadata?.workflow_id;

    if (!workflow_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No problem. I'll find some alternative times and get back to you.",
          next_step: 'end_call',
        } as PatientRescheduleResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Reset workflow to get new times
    // Clear the available_times and set status back to 'initiated' so system will call clinic again
    await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflow_id,
      p_status: 'initiated',
      p_available_times: [], // Clear old times
    });

    // Get workflow to log activity
    const { data: workflowResult } = await supabase.rpc('get_booking_workflow', {
      p_workflow_id: workflow_id,
    });

    if (workflowResult?.found) {
      const workflow = workflowResult.workflow;
      
      await supabase.from('incident_activity_log').insert({
        incident_id: workflow.incident_id,
        action_type: 'voice_agent',
        summary: 'Patient requested different appointment times',
        details: `Reason: ${reason || 'Times not suitable'}. Availability: ${patient_availability_notes || 'Not specified'}`,
        actor_name: 'AI Booking Agent',
        metadata: {
          workflow_id,
          patient_availability_notes,
          reason,
          action: 'reschedule_requested',
        },
      });
    }

    console.log(`Workflow ${workflow_id}: Patient needs reschedule. Notes: ${patient_availability_notes}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "No problem at all. I'll contact the clinic to find some alternative times that work better for you. We'll be in touch soon.",
        next_step: 'get_new_times',
      } as PatientRescheduleResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('booking-patient-reschedule error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I understand. We'll find some alternative times and get back to you.",
        next_step: 'end_call',
      } as PatientRescheduleResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


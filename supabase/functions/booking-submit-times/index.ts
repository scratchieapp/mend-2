/**
 * Booking Submit Times Edge Function
 * 
 * Called by the booking agent when medical center provides available appointment times.
 * Updates the booking workflow with collected times.
 * 
 * Endpoint: POST /functions/v1/booking-submit-times
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface AvailableTime {
  datetime: string;
  doctor_name?: string;
  notes?: string;
}

interface SubmitTimesRequest {
  // Direct args
  available_times?: AvailableTime[];
  clinic_notes?: string;
  // Nested formats from Retell
  args?: {
    available_times?: AvailableTime[];
    clinic_notes?: string;
  };
  // Call metadata from Retell
  call?: {
    call_id?: string;
    metadata?: {
      workflow_id?: string;
      incident_id?: number;
    };
  };
  // Or workflow_id passed directly
  workflow_id?: string;
}

interface SubmitTimesResponse {
  success: boolean;
  message: string;
  times_count?: number;
  next_step?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request - handle various Retell payload formats
    const rawData: SubmitTimesRequest = await req.json();
    console.log('booking-submit-times received:', JSON.stringify(rawData));

    // Extract args from various possible locations
    let available_times = rawData.available_times || rawData.args?.available_times;
    let clinic_notes = rawData.clinic_notes || rawData.args?.clinic_notes;
    let workflow_id = rawData.workflow_id || rawData.call?.metadata?.workflow_id;

    // Validate
    if (!available_times || available_times.length === 0) {
      console.log('No available times provided');
      return new Response(
        JSON.stringify({
          success: false,
          message: "I wasn't able to get any available times. Please try again or ask for different dates.",
          next_step: 'retry_or_fail',
        } as SubmitTimesResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow_id) {
      console.error('No workflow_id provided');
      return new Response(
        JSON.stringify({
          success: false,
          message: "I've noted those times. Thank you for your help.",
          next_step: 'end_call',
        } as SubmitTimesResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Update booking workflow with available times
    const { data: updateResult, error: updateError } = await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflow_id,
      p_status: 'times_collected',
      p_available_times: available_times,
    });

    if (updateError) {
      console.error('Error updating workflow:', updateError);
    }

    // Get workflow to log activity
    const { data: workflowResult } = await supabase.rpc('get_booking_workflow', {
      p_workflow_id: workflow_id,
    });

    if (workflowResult?.found) {
      const workflow = workflowResult.workflow;
      
      // Log activity
      await supabase.from('incident_activity_log').insert({
        incident_id: workflow.incident_id,
        action_type: 'voice_agent',
        summary: `Collected ${available_times.length} available appointment times`,
        details: clinic_notes || `Times: ${available_times.map((t: AvailableTime) => t.datetime).join(', ')}`,
        actor_name: 'AI Booking Agent',
        metadata: {
          workflow_id,
          available_times,
          clinic_notes,
        },
      });
    }

    console.log(`Workflow ${workflow_id} updated with ${available_times.length} available times`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Got it, I have ${available_times.length} available times. I'll check with the patient now.`,
        times_count: available_times.length,
        next_step: 'call_patient',
      } as SubmitTimesResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('booking-submit-times error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Thank you, I've noted those times.",
        next_step: 'end_call',
      } as SubmitTimesResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


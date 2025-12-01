/**
 * Booking Failed Edge Function
 * 
 * Called when the booking attempt fails for any reason.
 * Updates the workflow status to failed.
 * 
 * Endpoint: POST /functions/v1/booking-failed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface BookingFailedRequest {
  failure_reason?: string;
  should_retry?: boolean;
  notes?: string;
  args?: {
    failure_reason?: string;
    should_retry?: boolean;
    notes?: string;
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

interface BookingFailedResponse {
  success: boolean;
  message: string;
  should_retry?: boolean;
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

    const rawData: BookingFailedRequest = await req.json();
    console.log('booking-failed received:', JSON.stringify(rawData));

    let failure_reason = rawData.failure_reason || rawData.args?.failure_reason || 'Booking could not be completed';
    let should_retry = rawData.should_retry ?? rawData.args?.should_retry ?? false;
    let notes = rawData.notes || rawData.args?.notes;
    let workflow_id = rawData.workflow_id || rawData.call?.metadata?.workflow_id;

    if (!workflow_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "I understand. Thank you for your time. We'll follow up through other means.",
          should_retry: false,
          next_step: 'end_call',
        } as BookingFailedResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get workflow to log activity
    const { data: workflowResult } = await supabase.rpc('get_booking_workflow', {
      p_workflow_id: workflow_id,
    });

    // Update workflow to failed (or leave open if should_retry)
    await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflow_id,
      p_status: should_retry ? 'initiated' : 'failed',
      p_failure_reason: failure_reason,
    });

    if (workflowResult?.found) {
      const workflow = workflowResult.workflow;
      
      await supabase.from('incident_activity_log').insert({
        incident_id: workflow.incident_id,
        action_type: 'voice_agent',
        summary: should_retry ? 'Booking attempt needs retry' : 'Medical booking failed',
        details: `Reason: ${failure_reason}${notes ? `. Notes: ${notes}` : ''}`,
        actor_name: 'AI Booking Agent',
        metadata: {
          workflow_id,
          failure_reason,
          should_retry,
          notes,
        },
      });
    }

    console.log(`Workflow ${workflow_id} marked as ${should_retry ? 'retry needed' : 'failed'}. Reason: ${failure_reason}`);

    const responseMessage = should_retry
      ? "I understand. I'll try again later. Thank you for your time."
      : "I understand. Thank you for your time. Our team will follow up through other means.";

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        should_retry,
        next_step: 'end_call',
      } as BookingFailedResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('booking-failed error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Thank you for your time. We'll follow up separately.",
        should_retry: false,
        next_step: 'end_call',
      } as BookingFailedResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


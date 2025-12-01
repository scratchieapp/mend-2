/**
 * Booking Patient Confirm Edge Function
 * 
 * Called by the booking agent when patient confirms their preferred appointment time.
 * Updates the booking workflow with patient's selection.
 * 
 * Endpoint: POST /functions/v1/booking-patient-confirm
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PatientConfirmRequest {
  // Direct args
  patient_confirmed_time?: string;
  patient_preferred_doctor?: string;
  patient_notes?: string;
  // Nested formats from Retell
  args?: {
    patient_confirmed_time?: string;
    patient_preferred_doctor?: string;
    patient_notes?: string;
  };
  // Call metadata
  call?: {
    call_id?: string;
    metadata?: {
      workflow_id?: string;
      incident_id?: number;
    };
  };
  workflow_id?: string;
}

interface PatientConfirmResponse {
  success: boolean;
  message: string;
  confirmed_time?: string;
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

    const rawData: PatientConfirmRequest = await req.json();
    console.log('booking-patient-confirm received:', JSON.stringify(rawData));

    // Extract args
    let patient_confirmed_time = rawData.patient_confirmed_time || rawData.args?.patient_confirmed_time;
    let patient_preferred_doctor = rawData.patient_preferred_doctor || rawData.args?.patient_preferred_doctor;
    let patient_notes = rawData.patient_notes || rawData.args?.patient_notes;
    let workflow_id = rawData.workflow_id || rawData.call?.metadata?.workflow_id;

    if (!patient_confirmed_time) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I didn't catch which time you preferred. Could you please confirm which appointment time works for you?",
          next_step: 'ask_again',
        } as PatientConfirmResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow_id) {
      console.error('No workflow_id provided');
      return new Response(
        JSON.stringify({
          success: true,
          message: "I've noted your preference. We'll confirm with the clinic and send you the details.",
          confirmed_time: patient_confirmed_time,
          next_step: 'end_call',
        } as PatientConfirmResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Update workflow with patient's confirmed time
    const { error: updateError } = await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflow_id,
      p_status: 'patient_confirmed',
      p_patient_preferred_time: patient_confirmed_time,
      p_patient_preferred_doctor: patient_preferred_doctor || null,
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
      
      await supabase.from('incident_activity_log').insert({
        incident_id: workflow.incident_id,
        action_type: 'voice_agent',
        summary: 'Patient confirmed appointment time',
        details: `Confirmed: ${patient_confirmed_time}${patient_preferred_doctor ? ` with ${patient_preferred_doctor}` : ''}${patient_notes ? `. Notes: ${patient_notes}` : ''}`,
        actor_name: 'AI Booking Agent',
        metadata: {
          workflow_id,
          patient_confirmed_time,
          patient_preferred_doctor,
          patient_notes,
        },
      });
    }

    console.log(`Workflow ${workflow_id}: Patient confirmed time ${patient_confirmed_time}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `I've confirmed ${patient_confirmed_time}. I'll call the clinic now to lock in that appointment.`,
        confirmed_time: patient_confirmed_time,
        next_step: 'confirm_with_clinic',
      } as PatientConfirmResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('booking-patient-confirm error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Thank you for confirming. We'll be in touch with the appointment details.",
        next_step: 'end_call',
      } as PatientConfirmResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


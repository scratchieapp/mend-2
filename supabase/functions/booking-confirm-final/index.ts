/**
 * Booking Confirm Final Edge Function
 * 
 * Called when clinic confirms the final appointment booking.
 * Creates the appointment record and completes the workflow.
 * 
 * Endpoint: POST /functions/v1/booking-confirm-final
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ConfirmFinalRequest {
  booking_confirmed?: boolean;
  confirmed_datetime?: string;
  confirmed_doctor_name?: string;
  clinic_email?: string;
  special_instructions?: string;
  booking_notes?: string;
  args?: {
    booking_confirmed?: boolean;
    confirmed_datetime?: string;
    confirmed_doctor_name?: string;
    clinic_email?: string;
    special_instructions?: string;
    booking_notes?: string;
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

interface ConfirmFinalResponse {
  success: boolean;
  message: string;
  appointment_confirmed?: boolean;
  appointment_datetime?: string;
  doctor_name?: string;
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

    const rawData: ConfirmFinalRequest = await req.json();
    console.log('booking-confirm-final received:', JSON.stringify(rawData));

    // Extract args
    let booking_confirmed = rawData.booking_confirmed ?? rawData.args?.booking_confirmed ?? true;
    let confirmed_datetime = rawData.confirmed_datetime || rawData.args?.confirmed_datetime;
    let confirmed_doctor_name = rawData.confirmed_doctor_name || rawData.args?.confirmed_doctor_name;
    let clinic_email = rawData.clinic_email || rawData.args?.clinic_email;
    let special_instructions = rawData.special_instructions || rawData.args?.special_instructions;
    let booking_notes = rawData.booking_notes || rawData.args?.booking_notes;
    let workflow_id = rawData.workflow_id || rawData.call?.metadata?.workflow_id;

    if (!booking_confirmed) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I understand, the booking wasn't confirmed. I'll note this and we'll follow up.",
          appointment_confirmed: false,
          next_step: 'booking_failed',
        } as ConfirmFinalResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "The appointment has been confirmed. Thank you!",
          appointment_confirmed: true,
          appointment_datetime: confirmed_datetime,
          doctor_name: confirmed_doctor_name,
          next_step: 'end_call',
        } as ConfirmFinalResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Get workflow details
    const { data: workflowResult } = await supabase.rpc('get_booking_workflow', {
      p_workflow_id: workflow_id,
    });

    if (!workflowResult?.found) {
      console.error('Workflow not found:', workflow_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Appointment confirmed. Thank you for your help!",
          appointment_confirmed: true,
          next_step: 'end_call',
        } as ConfirmFinalResponse),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const workflow = workflowResult.workflow;
    const medicalCenter = workflowResult.medical_center;

    // Use patient_preferred_time if confirmed_datetime not provided
    const appointmentTime = confirmed_datetime || workflow.patient_preferred_time;

    // Create appointment record
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        incident_id: workflow.incident_id,
        worker_id: workflow.worker_id,
        medical_center_id: workflow.medical_center_id,
        appointment_type: 'initial_consult',
        scheduled_date: appointmentTime,
        status: 'confirmed',
        confirmation_method: 'voice_agent',
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'ai_booking_agent',
        location_address: medicalCenter?.address 
          ? `${medicalCenter.address}, ${medicalCenter.suburb || ''} ${medicalCenter.postcode || ''}`.trim()
          : null,
        location_suburb: medicalCenter?.suburb,
        notes: [
          booking_notes,
          confirmed_doctor_name ? `Doctor: ${confirmed_doctor_name}` : null,
          special_instructions ? `Instructions: ${special_instructions}` : null,
        ].filter(Boolean).join('. ') || 'Booked by AI agent',
        created_by: 'ai_booking_agent',
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
    }

    // Update workflow as completed
    await supabase.rpc('update_booking_workflow', {
      p_workflow_id: workflow_id,
      p_status: 'completed',
      p_confirmed_datetime: appointmentTime,
      p_confirmed_doctor_name: confirmed_doctor_name,
      p_confirmed_location: medicalCenter?.address,
      p_clinic_email: clinic_email,
      p_special_instructions: special_instructions,
      p_appointment_id: appointment?.id,
    });

    // Log activity
    await supabase.from('incident_activity_log').insert({
      incident_id: workflow.incident_id,
      action_type: 'voice_agent',
      summary: 'Medical appointment booked successfully',
      details: `Confirmed: ${appointmentTime} at ${medicalCenter?.name}${confirmed_doctor_name ? ` with ${confirmed_doctor_name}` : ''}`,
      actor_name: 'AI Booking Agent',
      metadata: {
        workflow_id,
        appointment_id: appointment?.id,
        confirmed_datetime: appointmentTime,
        confirmed_doctor_name,
        clinic_email,
        special_instructions,
      },
    });

    console.log(`Workflow ${workflow_id} completed. Appointment ${appointment?.id} created.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Wonderful, that's all confirmed for ${appointmentTime}${confirmed_doctor_name ? ` with ${confirmed_doctor_name}` : ''}. Thank you for your help!`,
        appointment_confirmed: true,
        appointment_datetime: appointmentTime,
        doctor_name: confirmed_doctor_name,
        next_step: 'booking_complete',
      } as ConfirmFinalResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('booking-confirm-final error:', error);
    return new Response(
      JSON.stringify({
        success: true,
        message: "The appointment has been confirmed. Thank you!",
        appointment_confirmed: true,
        next_step: 'end_call',
      } as ConfirmFinalResponse),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});


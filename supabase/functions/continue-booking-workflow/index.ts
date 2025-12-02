/**
 * Continue Booking Workflow
 * Initiates the next call in a booking workflow (patient confirm or final confirm)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

  try {
    const { workflow_id, task_type } = await req.json();

    if (!workflow_id || !task_type) {
      return new Response(JSON.stringify({ error: 'workflow_id and task_type required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const retellApiKey = Deno.env.get('RETELL_API_KEY')!;
    const retellPhoneNumber = Deno.env.get('RETELL_PHONE_NUMBER') || '10284766';
    const bookingAgentId = Deno.env.get('RETELL_BOOKING_AGENT_ID')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get workflow with related data
    const { data: workflow } = await supabase
      .from('booking_workflows')
      .select(`
        *,
        workers:worker_id (
          worker_id, given_name, family_name, mobile_number, phone_number
        ),
        medical_centers:medical_center_id (
          id, name, phone_number, address, suburb
        )
      `)
      .eq('id', workflow_id)
      .single();

    if (!workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const worker = workflow.workers;
    const medicalCenter = workflow.medical_centers;
    const workerName = `${worker.given_name} ${worker.family_name}`.trim();

    // Determine target based on task type
    let targetPhone: string;
    let targetName: string;
    let callTarget: string;

    if (task_type === 'booking_patient_confirm') {
      targetPhone = worker.mobile_number || worker.phone_number;
      targetName = workerName;
      callTarget = 'patient';
    } else {
      targetPhone = medicalCenter.phone_number;
      targetName = medicalCenter.name;
      callTarget = 'medical_center';
    }

    targetPhone = formatAustralianPhone(targetPhone);

    // Build dynamic variables
    const dynamicVariables: Record<string, string> = {
      workflow_id,
      call_type: task_type.replace('booking_', ''),
      worker_name: workerName,
      worker_first_name: worker.given_name || '',
      medical_center_name: medicalCenter.name || '',
      doctor_preference: workflow.doctor_preference,
      urgency: workflow.urgency,
    };

    if (task_type === 'booking_patient_confirm' && workflow.available_times) {
      const times = workflow.available_times as string[];
      dynamicVariables.available_times_summary = times
        .map((t: string, i: number) => `Option ${i + 1}: ${t}`)
        .join('. ');
      dynamicVariables.available_times_json = JSON.stringify(times);
    }

    // Get call sequence
    const { data: existingCalls } = await supabase
      .from('booking_call_history')
      .select('id')
      .eq('workflow_id', workflow_id);
    
    const callSequence = (existingCalls?.length || 0) + 1;

    // Create voice task
    const { data: voiceTask } = await supabase
      .from('voice_tasks')
      .insert({
        incident_id: workflow.incident_id,
        task_type,
        priority: workflow.urgency === 'urgent' ? 9 : 5,
        target_phone: targetPhone,
        target_name: targetName,
        booking_workflow_id: workflow_id,
        context_data: {
          workflow_id,
          medical_center_id: workflow.medical_center_id,
          worker_name: workerName,
          available_times: workflow.available_times,
          call_sequence: callSequence,
        },
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        created_by: 'ai_booking_agent',
      })
      .select()
      .single();

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
          task_id: voiceTask?.id,
          workflow_id,
          incident_id: workflow.incident_id,
          task_type,
          call_sequence: callSequence,
        },
      }),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('Retell API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create call', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const retellData = await retellResponse.json();

    // Update voice task with call ID
    await supabase.from('voice_tasks').update({
      retell_call_id: retellData.call_id,
      status: 'in_progress',
    }).eq('id', voiceTask?.id);

    // Create call history entry
    await supabase.from('booking_call_history').insert({
      workflow_id,
      call_sequence: callSequence,
      call_target: callTarget,
      target_phone: targetPhone,
      target_name: targetName,
      task_type,
      retell_call_id: retellData.call_id,
      voice_task_id: voiceTask?.id,
      started_at: new Date().toISOString(),
      outcome: 'in_progress',
    });

    // Update workflow status
    const statusMap: Record<string, string> = {
      'booking_get_times': 'calling_medical_center',
      'booking_patient_confirm': 'calling_patient',
      'booking_final_confirm': 'confirming_booking',
    };

    await supabase.from('booking_workflows').update({
      status: statusMap[task_type],
      current_call_id: retellData.call_id,
      current_call_started_at: new Date().toISOString(),
      current_call_ended_at: null,
      last_call_type: callTarget,
      updated_at: new Date().toISOString(),
    }).eq('id', workflow_id);

    // Log activity
    await supabase.from('incident_activity_log').insert({
      incident_id: workflow.incident_id,
      action_type: 'voice_agent',
      summary: task_type === 'booking_patient_confirm' 
        ? `Calling ${workerName} to confirm appointment time`
        : 'Calling medical center',
      details: `AI agent calling ${targetName} at ${targetPhone}`,
      actor_name: 'AI Booking Agent',
      metadata: {
        workflow_id,
        call_id: retellData.call_id,
        task_type,
        call_sequence: callSequence,
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      call_id: retellData.call_id,
      target: targetName,
      target_phone: targetPhone,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});


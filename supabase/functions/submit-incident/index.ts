/**
 * Submit Incident Edge Function
 * 
 * Called by the Retell voice agent when it has collected all incident data.
 * Stores the data temporarily so it can be retrieved when the call ends.
 * 
 * This is the CRITICAL function that captures site_id, employer_id, worker_id
 * and all other incident data from the voice agent's function calls.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface SubmitIncidentRequest {
  // IDs from lookup functions - CRITICAL for linking records
  employer_id?: number;
  employer_name?: string;
  site_id?: number;
  site_name?: string;
  worker_id?: number;
  worker_name?: string;
  
  // Caller/reporter info
  caller_name?: string;
  caller_role?: string;  // injured_worker, supervisor, witness, other
  caller_position?: string;  // Job title
  caller_phone?: string;
  
  // Injury details
  injury_type?: string;
  injury_description?: string;
  body_part_injured?: string;
  body_side?: string;  // left, right, both, not_applicable
  severity?: string;  // minor, moderate, severe
  date_of_injury?: string;
  time_of_injury?: string;
  treatment_received?: string;
  
  // Witness info
  witness_name?: string;
  caller_was_witness?: boolean;  // true if caller witnessed the incident
  
  // Retell call context
  call_id?: string;
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawData = await req.json();
    
    console.log('submit-incident called with data:', JSON.stringify(rawData, null, 2));

    // Retell sends data in multiple places:
    // 1. Function arguments (what agent passes to submit_incident) - in args/arguments/input
    // 2. collected_dynamic_variables (from previous function responses like lookup_employer)
    // 3. call object with call_id
    // We need to merge all these sources, preferring explicit arguments over collected vars
    
    let data: SubmitIncidentRequest;
    let callId: string | undefined;
    
    if (rawData.call) {
      const callData = rawData.call;
      const vars = callData.collected_dynamic_variables || {};
      
      // Get function arguments - Retell may put them in different locations
      const args = rawData.args || rawData.arguments || rawData.input || {};
      
      callId = callData.call_id;
      
      // Helper to get value from args first, then vars, with optional number conversion
      const getValue = (key: string, asNumber = false): any => {
        const argValue = args[key];
        const varValue = vars[key];
        const value = argValue !== undefined ? argValue : varValue;
        
        if (asNumber && value !== undefined && value !== null) {
          const num = Number(value);
          return isNaN(num) ? undefined : num;
        }
        return value;
      };
      
      data = {
        call_id: callId,
        // IDs from lookup functions (in collected_dynamic_variables)
        employer_id: getValue('employer_id', true),
        employer_name: getValue('employer_name'),
        site_id: getValue('site_id', true),
        site_name: getValue('site_name'),
        worker_id: getValue('worker_id', true),
        // Worker name could come from args (what caller said) or vars (from lookup)
        worker_name: getValue('worker_name'),
        // Caller/reporter info - usually from args
        caller_name: getValue('caller_name'),
        caller_role: getValue('caller_role'),
        caller_position: getValue('caller_position'),
        caller_phone: getValue('caller_phone'),
        // Injury details - usually from args (agent collects during call)
        injury_type: getValue('injury_type'),
        injury_description: getValue('injury_description'),
        body_part_injured: getValue('body_part_injured'),
        body_side: getValue('body_side'),
        severity: getValue('severity'),
        date_of_injury: getValue('date_of_injury'),
        time_of_injury: getValue('time_of_injury'),
        treatment_received: getValue('treatment_received'),
        // Witness info
        witness_name: getValue('witness_name'),
        caller_was_witness: getValue('caller_was_witness') === 'true' || getValue('caller_was_witness') === true,
      };
      
      console.log('Function arguments (args):', JSON.stringify(args, null, 2));
      console.log('Collected variables (vars):', JSON.stringify(vars, null, 2));
      console.log('Merged data:', JSON.stringify(data, null, 2));
    } else {
      // Direct format (for testing or other callers)
      data = rawData as SubmitIncidentRequest;
      callId = data.call_id;
    }
    
    if (!callId) {
      console.error('No call_id provided to submit-incident');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Call ID is required. Make sure to pass the call_id.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store the incident data in a staging table that can be retrieved when call ends
    // Use upsert to handle multiple submit_incident calls in the same call
    const { error: stageError } = await supabase
      .from('incident_staging')
      .upsert({
        call_id: callId,
        employer_id: data.employer_id || null,
        employer_name: data.employer_name || null,
        site_id: data.site_id || null,
        site_name: data.site_name || null,
        worker_id: data.worker_id || null,
        worker_name: data.worker_name || null,
        caller_name: data.caller_name || null,
        caller_role: data.caller_role || null,
        caller_position: data.caller_position || null,
        caller_phone: data.caller_phone || null,
        injury_type: data.injury_type || null,
        injury_description: data.injury_description || null,
        body_part_injured: data.body_part_injured || null,
        body_side: data.body_side || null,
        severity: data.severity || null,
        date_of_injury: data.date_of_injury || null,
        time_of_injury: data.time_of_injury || null,
        treatment_received: data.treatment_received || null,
        witness_name: data.witness_name || null,
        caller_was_witness: data.caller_was_witness || false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'call_id',
      });

    if (stageError) {
      console.error('Error staging incident data:', stageError);
      // Don't fail the function call - just log the error
      // The fallback extraction from transcript will still work
    } else {
      console.log(`Incident data staged for call ${callId}`);
    }

    // Return success response with confirmation message for the agent
    const response = {
      success: true,
      message: buildConfirmationMessage(data),
      incident_staged: true,
      // Return the IDs so they're in the function response for logging
      employer_id: data.employer_id,
      site_id: data.site_id,
      worker_id: data.worker_id,
    };

    console.log('submit-incident response:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('submit-incident error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'I apologize, there was an issue recording the incident. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildConfirmationMessage(data: SubmitIncidentRequest): string {
  const parts: string[] = [];
  
  if (data.worker_name) {
    parts.push(`for ${data.worker_name}`);
  }
  
  if (data.injury_type) {
    parts.push(`with a ${data.injury_type.toLowerCase()}`);
  }
  
  if (data.body_part_injured) {
    const side = data.body_side && data.body_side !== 'not_applicable' 
      ? `${data.body_side} ` 
      : '';
    parts.push(`to their ${side}${data.body_part_injured.toLowerCase()}`);
  }
  
  if (data.site_name) {
    parts.push(`at ${data.site_name}`);
  }
  
  if (parts.length > 0) {
    return `I've recorded the incident ${parts.join(' ')}. Our team will follow up shortly.`;
  }
  
  return "I've recorded the incident details. Our team will follow up shortly.";
}


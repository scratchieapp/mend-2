/**
 * Process Inbound Incident Edge Function
 *
 * Processes inbound calls from workers reporting incidents.
 * Extracts incident details from Retell transcript and creates incident record.
 *
 * Triggered by Retell webhook when inbound incident report call completes.
 *
 * Expected extracted_data structure from Retell:
 * {
 *   worker_name: string;
 *   worker_phone: string;
 *   employer_name?: string;
 *   site_name?: string;
 *   injury_type: string;
 *   injury_description: string;
 *   body_part: string;
 *   date_of_injury: string;
 *   treatment_provided: string;
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ProcessInboundIncidentRequest {
  call_id: string;
  extracted_data: Record<string, any>;
  transcript: string;
}

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

    // Parse request
    const requestData: ProcessInboundIncidentRequest = await req.json();
    const { call_id, extracted_data, transcript } = requestData;

    if (!call_id || !extracted_data) {
      return new Response(
        JSON.stringify({ error: 'call_id and extracted_data are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing inbound incident from call:', call_id);
    console.log('Extracted data:', extracted_data);

    // Step 1: Find employer and site (if provided) - do this FIRST so we can link worker
    // Note: employer_id is REQUIRED because lti_rates trigger needs it
    let employerId: number | null = null;
    let siteId: number | null = null;

    if (extracted_data.employer_name) {
      const { data: employer } = await supabase
        .from('employers')
        .select('employer_id')
        .ilike('employer_name', `%${extracted_data.employer_name}%`)
        .limit(1)
        .single();

      if (employer) {
        employerId = employer.employer_id;
        console.log('Found employer:', employerId);
      }
    }

    // If no employer found, use default employer (employer_id = 1)
    // This is required because the lti_rates trigger requires an employer_id
    if (!employerId) {
      employerId = 1; // Default to first employer
      console.log('Using default employer_id:', employerId);
    }

    if (extracted_data.site_name && employerId) {
      const { data: site } = await supabase
        .from('sites')
        .select('site_id')
        .eq('employer_id', employerId)
        .ilike('site_name', `%${extracted_data.site_name}%`)
        .limit(1)
        .single();

      if (site) {
        siteId = site.site_id;
        console.log('Found site:', siteId);
      }
    }

    // Step 2: Find or create worker
    let workerId: number | null = null;

    if (extracted_data.worker_phone) {
      // Search for existing worker by phone
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('worker_id')
        .or(`mobile_number.eq.${extracted_data.worker_phone},phone_number.eq.${extracted_data.worker_phone}`)
        .limit(1)
        .single();

      if (existingWorker) {
        workerId = existingWorker.worker_id;
        console.log('Found existing worker:', workerId);
      }
    }

    // If worker not found and we have enough info, create new worker
    if (!workerId && extracted_data.worker_name) {
      // Note: In production, you may want to require manual verification before creating workers
      // Parse worker name into given_name and family_name
      const nameParts = extracted_data.worker_name.trim().split(/\s+/);
      const givenName = nameParts[0] || 'Unknown';
      const familyName = nameParts.slice(1).join(' ') || 'Unknown';

      const { data: newWorker, error: workerError } = await supabase
        .from('workers')
        .insert({
          given_name: givenName,
          family_name: familyName,
          mobile_number: extracted_data.worker_phone || null,
          phone_number: extracted_data.worker_phone || null,
          email: extracted_data.worker_email || null,
          employer_id: employerId, // Link to employer if found
        })
        .select('worker_id')
        .single();

      if (workerError) {
        console.error('Error creating worker:', workerError);
        // Don't fail the entire process - we can create incident without worker
      } else {
        workerId = newWorker.worker_id;
        console.log('Created new worker:', workerId);
      }
    }

    // Step 3: Generate incident number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const incidentNumber = `INC-${year}${month}${day}-${random}`;

    // Step 4: Create incident record
    // Note: Using only columns that exist in the incidents table
    // Caller info stored in case_notes since reported_by/created_by don't exist
    const callerInfo = extracted_data.caller_name
      ? `Reported by: ${extracted_data.caller_name} (${extracted_data.caller_role || 'unknown role'})`
      : `Reported by: ${extracted_data.worker_name || 'Unknown caller'}`;

    const incidentData = {
      incident_number: incidentNumber,
      worker_id: workerId,
      employer_id: employerId,
      site_id: siteId,
      date_of_injury: extracted_data.date_of_injury || now.toISOString().split('T')[0],
      injury_type: extracted_data.injury_type || 'Unknown',
      injury_description: extracted_data.injury_description || transcript || 'Reported via voice agent',
      treatment_provided: extracted_data.treatment_provided || null,
      incident_status: 'Open', // Standard status used in existing data
      case_notes: `${callerInfo}\n\nIncident reported via AI voice agent (Call ID: ${call_id}).\n\nTranscript:\n${transcript}`,
      notifying_person_name: extracted_data.caller_name || extracted_data.worker_name || null,
      notifying_person_telephone: extracted_data.worker_phone || null,
    };

    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert(incidentData)
      .select()
      .single();

    if (incidentError) {
      console.error('Error creating incident:', incidentError);
      throw incidentError;
    }

    console.log('Created incident:', incident.incident_id);

    // Note: incident_activities table doesn't exist yet, skipping activity creation
    // TODO: Create incident_activities table or use alternative logging

    // Step 5: Update voice_logs with incident_id
    await supabase
      .from('voice_logs')
      .update({ incident_id: incident.incident_id })
      .eq('retell_call_id', call_id);

    // Step 6: Create follow-up tasks
    // Automatically create a booking task for initial medical assessment
    if (workerId && incident.incident_id) {
      // Find nearest preferred medical center (simplified - in production, use geolocation)
      const { data: medicalCenter } = await supabase
        .from('medical_centers')
        .select('id')
        .eq('preferred_provider', true)
        .eq('active', true)
        .limit(1)
        .single();

      if (medicalCenter) {
        await supabase.from('voice_tasks').insert({
          incident_id: incident.incident_id,
          task_type: 'booking',
          priority: 2, // High priority for new incidents
          target_phone: medicalCenter.phone_number || '',
          target_name: medicalCenter.name || '',
          context_data: {
            incident_id: incident.incident_id,
            incident_number: incident.incident_number,
            worker_id: workerId,
            medical_center_id: medicalCenter.id,
          },
          scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
          created_by: 'ai_agent',
        });

        console.log('Created booking task for new incident');
      }
    }

    // Step 7: Send notifications to case managers
    // (In production, integrate with email/SMS service)
    console.log('TODO: Send notification to case managers about new incident');

    return new Response(
      JSON.stringify({
        success: true,
        incident_id: incident.incident_id,
        incident_number: incident.incident_number,
        worker_id: workerId,
        message: 'Incident created successfully from inbound call',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Process inbound incident error:', error);
    console.error('Error type:', typeof error);
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    let errorMessage = 'Unknown error';
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
      errorDetails = error;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

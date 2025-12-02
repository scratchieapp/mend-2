/**
 * Create Web Call Edge Function
 *
 * Creates a Retell web call for browser-based voice chat.
 * Returns an access token that the client uses to connect.
 *
 * This allows logged-in users to speak directly with the AI agent
 * without needing to use the phone network.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CreateWebCallRequest {
  agent_id?: string;
  metadata?: Record<string, any>;
  // User context for authenticated users - passed as dynamic variables
  user_context?: {
    employer_id?: string;
    employer_name?: string;
    site_id?: string;
    site_name?: string;
    caller_name?: string;       // Full name for greeting
    caller_role?: string;       // Role label (e.g., "Builder Admin")
    caller_position?: string;   // Position/title from user profile
    caller_phone?: string;
    is_authenticated?: boolean;
  };
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Get environment variables
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    const defaultAgentId = Deno.env.get('RETELL_INCIDENT_REPORTER_AGENT_ID');

    // Log configuration status (without exposing secrets)
    console.log('[create-web-call] Configuration check:', {
      hasRetellApiKey: !!retellApiKey,
      retellApiKeyPrefix: retellApiKey ? retellApiKey.substring(0, 10) + '...' : 'NOT SET',
      defaultAgentId: defaultAgentId || 'NOT SET',
    });

    if (!retellApiKey) {
      console.error('[create-web-call] RETELL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Voice calling is not configured',
          diagnostics: { issue: 'RETELL_API_KEY not set in environment' }
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request
    const requestData: CreateWebCallRequest = await req.json().catch(() => ({}));
    const agentId = requestData.agent_id || defaultAgentId;

    console.log('[create-web-call] Request:', {
      providedAgentId: requestData.agent_id || 'none (using default)',
      resolvedAgentId: agentId,
      hasUserContext: !!requestData.user_context,
      userContext: requestData.user_context ? {
        employer_name: requestData.user_context.employer_name,
        caller_name: requestData.user_context.caller_name,
      } : null,
    });

    if (!agentId) {
      console.error('[create-web-call] No agent ID available');
      return new Response(
        JSON.stringify({ 
          error: 'No agent configured for web calls',
          diagnostics: { issue: 'Neither agent_id provided nor RETELL_INCIDENT_REPORTER_AGENT_ID set' }
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[create-web-call] Creating web call for agent:', agentId);

    // Build dynamic variables from user context if provided
    const dynamicVariables: Record<string, string> = {};
    if (requestData.user_context) {
      const ctx = requestData.user_context;
      if (ctx.employer_name) dynamicVariables.employer_name = ctx.employer_name;
      if (ctx.employer_id) dynamicVariables.employer_id = ctx.employer_id;
      if (ctx.site_name) dynamicVariables.site_name = ctx.site_name;
      if (ctx.site_id) dynamicVariables.site_id = ctx.site_id;
      if (ctx.caller_name) dynamicVariables.caller_name = ctx.caller_name;
      if (ctx.caller_role) dynamicVariables.caller_role = ctx.caller_role;
      // Pass position/title for reporting info
      if (ctx.caller_position) dynamicVariables.caller_position = ctx.caller_position;
      if (ctx.caller_phone) dynamicVariables.caller_phone = ctx.caller_phone;
      if (ctx.is_authenticated) dynamicVariables.is_authenticated = 'true';
    }

    console.log('Dynamic variables for call:', dynamicVariables);

    // Create web call via Retell API
    const retellRequestBody = {
      agent_id: agentId,
      metadata: {
        ...requestData.metadata,
        source: 'web_portal',
        created_at: new Date().toISOString(),
      },
      // Pass user context as dynamic variables - agent can use these to skip questions
      retell_llm_dynamic_variables: Object.keys(dynamicVariables).length > 0 
        ? dynamicVariables 
        : undefined,
    };
    
    console.log('[create-web-call] Calling Retell API...');
    const retellStartTime = Date.now();
    
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retellRequestBody),
    });

    const retellElapsed = Date.now() - retellStartTime;
    console.log(`[create-web-call] Retell API response: ${response.status} (${retellElapsed}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { raw: errorText };
      }
      
      console.error('[create-web-call] Retell API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorJson,
        agentId,
      });
      
      // Provide specific error messages based on Retell error
      let errorMessage = 'Failed to create web call';
      if (response.status === 401) {
        errorMessage = 'Retell API authentication failed - check API key';
      } else if (response.status === 404) {
        errorMessage = `Agent not found: ${agentId}`;
      } else if (response.status === 400) {
        errorMessage = errorJson.message || errorJson.error || 'Invalid request to Retell';
      } else if (response.status === 429) {
        errorMessage = 'Rate limited - too many calls';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          diagnostics: {
            retellStatus: response.status,
            retellError: errorJson,
            agentId,
          }
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const totalElapsed = Date.now() - startTime;
    
    console.log('[create-web-call] Success:', {
      call_id: data.call_id,
      hasAccessToken: !!data.access_token,
      totalTime: `${totalElapsed}ms`,
    });

    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        call_id: data.call_id,
        diagnostics: {
          agentId,
          responseTime: `${totalElapsed}ms`,
        }
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error('[create-web-call] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: `${totalElapsed}ms`,
    });
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        diagnostics: {
          type: 'unexpected_error',
          responseTime: `${totalElapsed}ms`,
        }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});


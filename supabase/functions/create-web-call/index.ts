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
    caller_name?: string;
    caller_role?: string;
    caller_phone?: string;
    is_authenticated?: boolean;
  };
}

serve(async (req: Request) => {
  try {
    // CORS preflight
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
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    const defaultAgentId = Deno.env.get('RETELL_INCIDENT_REPORTER_AGENT_ID');

    if (!retellApiKey) {
      console.error('RETELL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Voice calling is not configured' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Parse request
    const requestData: CreateWebCallRequest = await req.json().catch(() => ({}));
    const agentId = requestData.agent_id || defaultAgentId;

    // Log the full request for debugging
    console.log('Full request data received:', JSON.stringify(requestData, null, 2));

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'No agent configured for web calls' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    console.log('Creating web call for agent:', agentId);

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
      if (ctx.caller_phone) dynamicVariables.caller_phone = ctx.caller_phone;
      if (ctx.is_authenticated) dynamicVariables.is_authenticated = 'true';
    }

    console.log('Dynamic variables for call:', dynamicVariables);

    // Create web call via Retell API
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create web call' }),
        { 
          status: response.status, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const data = await response.json();
    console.log('Web call created successfully:', data.call_id);

    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        call_id: data.call_id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Create web call error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});


/**
 * Manage Users Edge Function
 *
 * Handles user management operations that require service-level auth:
 * - createUser: Create a new user in Clerk
 * - updateUserRole: Update a user's role metadata in Clerk
 * - deleteUser: Delete a user from Clerk
 *
 * This is needed because Clerk operations require a secret key
 * that can't be exposed to the browser.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface UpdateRoleData {
  userId: string;
  role: string;
}

interface DeleteUserData {
  userId: string;
}

interface ManageUsersRequest {
  action: 'createUser' | 'updateUserRole' | 'deleteUser';
  data: CreateUserData | UpdateRoleData | DeleteUserData;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    
    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Clerk not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data }: ManageUsersRequest = await req.json();
    console.log('Manage users action:', action);

    switch (action) {
      case 'createUser': {
        const { email, password, firstName, lastName } = data as CreateUserData;
        
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Creating Clerk user for:', email);

        // Create user in Clerk
        const clerkResponse = await fetch('https://api.clerk.com/v1/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: [email],
            password: password,
            first_name: firstName || '',
            last_name: lastName || '',
            skip_password_checks: false,
            skip_password_requirement: false,
          }),
        });

        const clerkData = await clerkResponse.json();

        if (!clerkResponse.ok) {
          console.error('Clerk create user error:', clerkData);
          
          // Handle specific Clerk errors
          const errorMessage = clerkData.errors?.[0]?.message || 
                              clerkData.errors?.[0]?.long_message ||
                              'Failed to create user in Clerk';
          
          // Check for duplicate email
          if (errorMessage.includes('already exists') || 
              clerkData.errors?.[0]?.code === 'form_identifier_exists') {
            return new Response(
              JSON.stringify({ error: 'A user with this email already exists' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: clerkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Clerk user created:', clerkData.id);

        return new Response(
          JSON.stringify({ 
            id: clerkData.id,
            email: email,
            message: 'User created successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateUserRole': {
        const { userId, role } = data as UpdateRoleData;
        
        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: 'User ID and role are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Updating Clerk user role:', userId, 'to', role);

        // Update user metadata in Clerk
        const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              role: role,
            },
          }),
        });

        if (!clerkResponse.ok) {
          const errorData = await clerkResponse.json();
          console.error('Clerk update role error:', errorData);
          return new Response(
            JSON.stringify({ error: 'Failed to update user role in Clerk' }),
            { status: clerkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Clerk user role updated');

        return new Response(
          JSON.stringify({ message: 'User role updated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteUser': {
        const { userId } = data as DeleteUserData;
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Deleting Clerk user:', userId);

        // Delete user from Clerk
        const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
          },
        });

        if (!clerkResponse.ok && clerkResponse.status !== 404) {
          const errorData = await clerkResponse.json();
          console.error('Clerk delete user error:', errorData);
          return new Response(
            JSON.stringify({ error: 'Failed to delete user from Clerk' }),
            { status: clerkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Clerk user deleted (or already gone)');

        return new Response(
          JSON.stringify({ message: 'User deleted successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Manage users error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


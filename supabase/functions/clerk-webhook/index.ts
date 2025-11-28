// Clerk Webhook Handler for Supabase
// This function handles Clerk webhooks to sync users to Supabase
// Deploy: supabase functions deploy clerk-webhook --project-ref rkzcybthcszeusrohbtc

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// Clerk webhook event types we handle
type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
      id: string;
    }>;
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    created_at?: number;
    updated_at?: number;
  };
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the webhook payload
    const payload: ClerkWebhookEvent = await req.json();
    
    console.log("Received Clerk webhook:", payload.type);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different webhook events
    switch (payload.type) {
      case "user.created": {
        // New user created in Clerk - sync to Supabase
        const clerkUserId = payload.data.id;
        const primaryEmailId = payload.data.primary_email_address_id;
        const emailObj = payload.data.email_addresses?.find(e => e.id === primaryEmailId);
        const email = emailObj?.email_address;
        const firstName = payload.data.first_name || "";
        const lastName = payload.data.last_name || "";
        const displayName = `${firstName} ${lastName}`.trim() || email;

        if (!email) {
          console.error("No email found for user:", clerkUserId);
          return new Response(JSON.stringify({ error: "No email found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Creating/updating user:", email, clerkUserId);

        // Check if user already exists by email
        const { data: existingUser } = await supabase
          .from("users")
          .select("user_id, clerk_user_id")
          .eq("email", email)
          .single();

        if (existingUser) {
          // User exists - update their clerk_user_id
          const { error: updateError } = await supabase
            .from("users")
            .update({ 
              clerk_user_id: clerkUserId,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", existingUser.user_id);

          if (updateError) {
            console.error("Failed to update user:", updateError);
            return new Response(JSON.stringify({ error: updateError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          console.log("Updated existing user with Clerk ID:", email);
        } else {
          // Create new user in Supabase
          // Default to role_id 9 (Public User) for new signups
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              user_id: crypto.randomUUID(),
              email: email,
              display_name: displayName,
              clerk_user_id: clerkUserId,
              role_id: 9, // Public User - can be upgraded later
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Failed to create user:", insertError);
            return new Response(JSON.stringify({ error: insertError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          console.log("Created new user:", email);
        }

        break;
      }

      case "user.updated": {
        // User updated in Clerk - sync changes to Supabase
        const clerkUserId = payload.data.id;
        const primaryEmailId = payload.data.primary_email_address_id;
        const emailObj = payload.data.email_addresses?.find(e => e.id === primaryEmailId);
        const email = emailObj?.email_address;
        const firstName = payload.data.first_name || "";
        const lastName = payload.data.last_name || "";
        const displayName = `${firstName} ${lastName}`.trim();

        if (email) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ 
              email: email,
              display_name: displayName || undefined,
              updated_at: new Date().toISOString()
            })
            .eq("clerk_user_id", clerkUserId);

          if (updateError) {
            console.error("Failed to update user:", updateError);
          } else {
            console.log("Updated user:", email);
          }
        }

        break;
      }

      case "user.deleted": {
        // User deleted in Clerk - optionally handle in Supabase
        // For now, we just log it - you may want to soft-delete or archive
        const clerkUserId = payload.data.id;
        console.log("User deleted in Clerk:", clerkUserId);
        
        // Optional: Mark user as deleted/inactive
        // const { error } = await supabase
        //   .from("users")
        //   .update({ is_active: false, updated_at: new Date().toISOString() })
        //   .eq("clerk_user_id", clerkUserId);

        break;
      }

      default:
        console.log("Unhandled webhook event type:", payload.type);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


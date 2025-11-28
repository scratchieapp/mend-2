/**
 * Sync Supabase Users to Clerk
 * 
 * This script creates Clerk accounts for all existing Supabase users
 * who don't already have a clerk_user_id.
 * 
 * Prerequisites:
 * 1. Set CLERK_SECRET_KEY environment variable
 * 2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * 
 * Usage:
 *   npx ts-node scripts/sync-supabase-users-to-clerk.ts
 * 
 * Or with environment variables:
 *   CLERK_SECRET_KEY=sk_live_xxx SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/sync-supabase-users-to-clerk.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rkzcybthcszeusrohbtc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Default password for migrated users (they should reset this)
const DEFAULT_PASSWORD = 'MendSafety2025!';

if (!CLERK_SECRET_KEY) {
  console.error('Error: CLERK_SECRET_KEY environment variable is required');
  console.log('Get your secret key from: https://dashboard.clerk.com/');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SupabaseUser {
  user_id: string;
  email: string;
  display_name: string | null;
  clerk_user_id: string | null;
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
}

async function createClerkUser(email: string, displayName: string | null): Promise<string | null> {
  try {
    // Parse display name into first/last
    const nameParts = (displayName || email.split('@')[0]).split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const response = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName,
        last_name: lastName,
        password: DEFAULT_PASSWORD,
        skip_password_checks: true,
        skip_password_requirement: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if user already exists
      if (error.errors?.[0]?.code === 'form_identifier_exists') {
        console.log(`  User already exists in Clerk: ${email}`);
        // Try to get the existing user
        const existingUser = await getClerkUserByEmail(email);
        return existingUser?.id || null;
      }
      
      console.error(`  Failed to create Clerk user for ${email}:`, error);
      return null;
    }

    const clerkUser: ClerkUser = await response.json();
    console.log(`  Created Clerk user: ${email} -> ${clerkUser.id}`);
    return clerkUser.id;

  } catch (error) {
    console.error(`  Error creating Clerk user for ${email}:`, error);
    return null;
  }
}

async function getClerkUserByEmail(email: string): Promise<ClerkUser | null> {
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const users: ClerkUser[] = await response.json();
    return users[0] || null;

  } catch (error) {
    console.error(`  Error fetching Clerk user by email ${email}:`, error);
    return null;
  }
}

async function updateSupabaseUserClerkId(userId: string, clerkUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        clerk_user_id: clerkUserId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`  Failed to update Supabase user ${userId}:`, error);
      return false;
    }

    return true;

  } catch (error) {
    console.error(`  Error updating Supabase user ${userId}:`, error);
    return false;
  }
}

async function main() {
  console.log('===========================================');
  console.log('Syncing Supabase Users to Clerk');
  console.log('===========================================\n');

  // Fetch all users without clerk_user_id
  console.log('Fetching users from Supabase...');
  const { data: users, error } = await supabase
    .from('users')
    .select('user_id, email, display_name, clerk_user_id')
    .is('clerk_user_id', null)
    .not('email', 'is', null);

  if (error) {
    console.error('Failed to fetch users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users to sync - all users already have Clerk IDs!');
    return;
  }

  console.log(`Found ${users.length} users to sync\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users as SupabaseUser[]) {
    if (!user.email) {
      console.log(`Skipping user ${user.user_id} - no email`);
      skipped++;
      continue;
    }

    console.log(`Processing: ${user.email}`);

    // First check if user already exists in Clerk
    const existingClerkUser = await getClerkUserByEmail(user.email);
    
    let clerkUserId: string | null = null;
    
    if (existingClerkUser) {
      console.log(`  Found existing Clerk user: ${existingClerkUser.id}`);
      clerkUserId = existingClerkUser.id;
    } else {
      // Create new Clerk user
      clerkUserId = await createClerkUser(user.email, user.display_name);
    }

    if (clerkUserId) {
      // Update Supabase with Clerk ID
      const updated = await updateSupabaseUserClerkId(user.user_id, clerkUserId);
      if (updated) {
        console.log(`  ✓ Synced: ${user.email}`);
        created++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }

    // Rate limiting - Clerk has rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n===========================================');
  console.log('Sync Complete!');
  console.log('===========================================');
  console.log(`Created/Linked: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nNote: Users were created with password: ${DEFAULT_PASSWORD}`);
  console.log('They should reset their password on first login.');
}

main().catch(console.error);


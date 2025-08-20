#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Checking database schema for Clerk integration...\n');

  try {
    // Test if clerk_user_id column exists by trying to query it
    const { data, error } = await supabase
      .from('users')
      .select('clerk_user_id')
      .limit(1);

    if (error && error.message.includes('column')) {
      // Column doesn't exist
      console.log('❌ The clerk_user_id column does not exist in the users table.');
      console.log('\n📝 Please run the following SQL in your Supabase Dashboard:\n');
      console.log('========================================');
      console.log(`-- Add clerk_user_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- Add a comment to document the column
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user ID for authentication integration';`);
      console.log('========================================\n');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/sql/new');
      console.log('\n1. Click the link above');
      console.log('2. Paste the SQL code');
      console.log('3. Click "Run" button');
      console.log('\n✅ After running the migration, restart the dev server and login will work!');
    } else if (!error) {
      console.log('✅ The clerk_user_id column already exists in the users table!');
      console.log('\n🎉 Database is ready for Clerk integration.');
    } else {
      console.error('Unexpected error:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();
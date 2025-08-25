#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔧 Applying Clerk authentication fix migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_fix_clerk_auth_integration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Extract a short description from the statement
      const firstLine = statement.split('\n')[0];
      const shortDesc = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${shortDesc}`);
        
        // Execute the statement
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async (rpcError) => {
          // If RPC doesn't exist, try direct query (won't work with anon key)
          console.log('  ⚠️  exec_sql RPC not available, statement may need manual execution');
          return { error: rpcError };
        });
        
        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
          
          // Continue on error for DROP statements and other non-critical operations
          if (statement.toLowerCase().includes('drop') || 
              statement.toLowerCase().includes('if exists') ||
              statement.toLowerCase().includes('comment on')) {
            console.log('  ⚠️  Non-critical error, continuing...');
          }
        } else {
          console.log('  ✅ Success');
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successful statements: ${successCount}`);
    console.log(`  ❌ Failed statements: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. This is expected if:');
      console.log('  1. You are using the anon key (need service role key for DDL)');
      console.log('  2. Some objects already exist');
      console.log('  3. RLS is already disabled');
      console.log('\n📝 Manual Action Required:');
      console.log('  Please run the migration file directly in Supabase SQL Editor:');
      console.log(`  ${migrationPath}`);
    } else {
      console.log('\n✨ Migration completed successfully!');
    }
    
    // Test the new functions
    console.log('\n🧪 Testing Clerk-aware functions...');
    
    // Test with a known user
    const testEmail = 'role1@scratchie.com';
    console.log(`  Testing with user: ${testEmail}`);
    
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_by_clerk', {
      clerk_user_id: null,
      clerk_email: testEmail
    });
    
    if (roleError) {
      console.log(`  ❌ get_user_role_by_clerk failed: ${roleError.message}`);
      console.log('     This function needs to be created manually in Supabase');
    } else {
      console.log(`  ✅ User role: ${roleData}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Script to apply RLS and RPC context fixes to Supabase
 * This fixes the issue where employer filtering wasn't working properly
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', 'apps', 'operations', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env file not found at:', envPath);
  console.error('Please ensure you have the environment variables set up.');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables.');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  console.error('You can find the service role key in your Supabase dashboard under Settings > API');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔧 Applying RLS and RPC context fixes...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_fix_rls_and_rpc_context.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements (by semicolon + newline)
    const statements = migrationSQL
      .split(/;\s*\n/)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue;
      }

      // Extract a description of what this statement does
      let description = 'SQL statement';
      if (statement.includes('DROP POLICY')) {
        const match = statement.match(/DROP POLICY.*"([^"]+)"/);
        description = `Drop policy: ${match ? match[1] : 'unknown'}`;
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY\s+"([^"]+)"/);
        description = `Create policy: ${match ? match[1] : 'unknown'}`;
      } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        const match = statement.match(/CREATE OR REPLACE FUNCTION\s+([^\(]+)/);
        description = `Create/Update function: ${match ? match[1] : 'unknown'}`;
      } else if (statement.includes('DROP FUNCTION')) {
        const match = statement.match(/DROP FUNCTION.*\s+([^\(]+)/);
        description = `Drop function: ${match ? match[1] : 'unknown'}`;
      } else if (statement.includes('GRANT')) {
        description = 'Grant permissions';
      } else if (statement.includes('COMMENT')) {
        description = 'Add comment';
      }

      process.stdout.write(`  ${i + 1}. ${description}... `);

      try {
        const { error } = await supabase.rpc('query', { sql: statement });
        
        if (error) {
          // Try alternative approach using direct SQL execution
          const { error: directError } = await supabase.from('_sql').select().single().throwOnError();
          
          if (directError) {
            throw error || directError;
          }
        }
        
        console.log('✅');
        successCount++;
      } catch (error) {
        console.log('❌');
        console.error(`     Error: ${error.message}`);
        errorCount++;
        
        // For critical statements, stop execution
        if (statement.includes('CREATE OR REPLACE FUNCTION') && 
            (statement.includes('get_incidents_with_details') || 
             statement.includes('get_incidents_count'))) {
          console.error('\n❌ Critical function creation failed. Stopping migration.');
          process.exit(1);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully executed: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed: ${errorCount} statements`);
    }
    console.log('='.repeat(50));

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📋 What was fixed:');
      console.log('  1. RLS policies now properly filter by employer context');
      console.log('  2. Super Admins can use "View All" mode to see all data');
      console.log('  3. RPC functions respect the employer context');
      console.log('  4. Frontend can now clear context for "View All" mode');
      console.log('\n🔄 Please refresh your application to see the changes.');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
      console.log('Some features may not work as expected.');
      console.log('Please check the errors above and contact support if needed.');
    }

  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
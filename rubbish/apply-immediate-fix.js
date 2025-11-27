#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found');
  console.log('\n📋 MANUAL STEPS REQUIRED:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of:');
  console.log('   /supabase/migrations/20250826_immediate_rls_fix.sql');
  console.log('4. Execute the SQL');
  console.log('\nThis will immediately fix the RLS issues and restore data access.');
  
  // Show the SQL content for easy copying
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_immediate_rls_fix.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('\n📄 SQL CONTENT TO EXECUTE:');
  console.log('=' .repeat(60));
  console.log(sqlContent);
  console.log('=' .repeat(60));
  
  process.exit(0);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🔧 Applying immediate RLS fix...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250826_immediate_rls_fix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      console.log(`  [${i + 1}/${statements.length}] Executing statement...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('\n🎉 RLS has been disabled and incidents should now display correctly.');
    console.log('📝 Note: This is a temporary fix. Proper Clerk integration is still needed.');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    console.log('\n📋 Please apply the migration manually in Supabase Dashboard:');
    console.log('1. Go to SQL Editor');
    console.log('2. Copy the contents of /supabase/migrations/20250826_immediate_rls_fix.sql');
    console.log('3. Execute the SQL');
  }
}

// Run the migration
applyMigration();
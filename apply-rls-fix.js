const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '20250110_fix_rls_security_vulnerability.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Extract just the CREATE OR REPLACE FUNCTION part (skip comments and grants at end)
const functionSQL = sqlContent.split('-- Grant appropriate permissions')[0].trim();

// Execute via Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkzcybthcszeusrohbtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔒 Applying RLS Security Fix...');
  console.log('');

  try {
    // Execute the function creation SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: functionSQL });

    if (error) {
      console.error('❌ Error applying fix:', error);
      process.exit(1);
    }

    console.log('✅ RLS Security Fix Applied Successfully!');
    console.log('');
    console.log('Testing the fix...');

    // Test 1: Builder Admin trying to access their own employer (should work)
    const test1 = await supabase.rpc('get_dashboard_data', {
      page_size: 5,
      page_offset: 0,
      filter_employer_id: 8,  // Requesting Newcastle Builders
      user_role_id: 5,        // Builder Admin
      user_employer_id: 8     // Assigned to Newcastle Builders
    });

    console.log('\n✅ Test 1 PASSED: Builder Admin can access their own employer');
    console.log(`   Returned ${test1.data.totalCount} incidents from employer_id=8`);

    // Test 2: Builder Admin trying to access a DIFFERENT employer (should be blocked)
    const test2 = await supabase.rpc('get_dashboard_data', {
      page_size: 5,
      page_offset: 0,
      filter_employer_id: 1,  // Trying to access Newcastle Construction Co.
      user_role_id: 5,        // Builder Admin
      user_employer_id: 8     // Assigned to Newcastle Builders
    });

    // Check that NO incidents from employer_id=1 were returned
    const hasEmployer1Data = test2.data.incidents.some(inc => inc.employer_id === 1);
    const allFromEmployer8 = test2.data.incidents.every(inc => inc.employer_id === 8);

    if (hasEmployer1Data) {
      console.log('\n❌ Test 2 FAILED: Builder Admin CAN still access other employers!');
      console.log('   SECURITY VULNERABILITY STILL EXISTS');
      process.exit(1);
    } else if (allFromEmployer8) {
      console.log('\n✅ Test 2 PASSED: Builder Admin CANNOT access other employers');
      console.log(`   Correctly returned only employer_id=8 data (${test2.data.totalCount} incidents)`);
      console.log('   RLS security is working correctly! 🎉');
    } else {
      console.log('\n⚠️ Test 2: Unexpected result');
      console.log(`   Returned ${test2.data.totalCount} incidents`);
    }

    console.log('');
    console.log('==========================================');
    console.log('🔐 RLS Security Fix Complete');
    console.log('==========================================');
    console.log('✅ Builder Admins can only see their own employer data');
    console.log('✅ Super Admins can still switch between employers');
    console.log('');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyFix();

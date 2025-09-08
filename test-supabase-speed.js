// Test to see why Supabase RPC is taking 5+ seconds

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rkzcybthcszeusrohbtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0';

async function testRpcSpeed() {
  console.log('Testing Supabase RPC speed...\n');
  
  // Test 1: Using Supabase client
  console.log('Test 1: Supabase Client');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  });
  
  const start1 = Date.now();
  const { data: data1, error: error1 } = await supabase.rpc('get_dashboard_data', {
    page_size: 5,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time1 = Date.now() - start1;
  
  console.log(`  Time: ${time1}ms`);
  if (error1) console.log(`  Error: ${error1.message}`);
  else console.log(`  Success: ${data1?.incidents?.length || 0} incidents`);
  
  // Test 2: Direct fetch
  console.log('\nTest 2: Direct Fetch');
  const start2 = Date.now();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_dashboard_data`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      page_size: 5,
      page_offset: 0,
      filter_employer_id: null,
      filter_worker_id: null,
      filter_start_date: null,
      filter_end_date: null,
      user_role_id: 1,
      user_employer_id: null
    })
  });
  const time2 = Date.now() - start2;
  
  console.log(`  Time: ${time2}ms`);
  if (!response.ok) {
    console.log(`  Error: ${response.status} ${response.statusText}`);
  } else {
    const data2 = await response.json();
    console.log(`  Success: ${data2?.incidents?.length || 0} incidents`);
  }
  
  // Compare
  console.log('\n--- COMPARISON ---');
  console.log(`Supabase Client: ${time1}ms`);
  console.log(`Direct Fetch: ${time2}ms`);
  console.log(`Difference: ${Math.abs(time1 - time2)}ms`);
  
  if (time1 > 3000) {
    console.log('\n⚠️  PROBLEM: Supabase client is slow (>3 seconds)');
    console.log('This could be due to:');
    console.log('1. Supabase client initialization overhead');
    console.log('2. Connection pooling issues');
    console.log('3. Auth token validation delays');
  }
}

testRpcSpeed().catch(console.error);
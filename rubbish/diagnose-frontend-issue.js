// Quick diagnostic to find the frontend issue
// The database is fast (8-18ms) but frontend shows 35,519ms

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rkzcybthcszeusrohbtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRapidFire() {
  console.log('Testing if the frontend is making multiple rapid-fire requests...\n');
  
  let requestCount = 0;
  const startTime = Date.now();
  
  // Monitor for 5 seconds
  const monitorDuration = 5000;
  
  // Hook into the RPC calls
  const originalRpc = supabase.rpc.bind(supabase);
  supabase.rpc = function(...args) {
    requestCount++;
    const callTime = Date.now() - startTime;
    console.log(`[${callTime}ms] RPC Call #${requestCount}: ${args[0]}`);
    return originalRpc(...args);
  };
  
  // Simulate what the frontend does
  console.log('Simulating frontend behavior...\n');
  
  // Make a single call like the frontend should
  const result = await supabase.rpc('get_dashboard_data', {
    page_size: 25,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  
  console.log(`\n✅ Single call completed in ${Date.now() - startTime}ms`);
  console.log(`Total requests made: ${requestCount}`);
  
  if (requestCount > 1) {
    console.log('\n⚠️ PROBLEM: Multiple requests detected! The frontend is making duplicate calls.');
  }
  
  // Test if there's retry logic causing delays
  console.log('\n\nTesting with simulated error to check retry behavior...');
  requestCount = 0;
  const errorStart = Date.now();
  
  supabase.rpc = function(...args) {
    requestCount++;
    console.log(`[${Date.now() - errorStart}ms] Retry attempt #${requestCount}`);
    // Simulate an error
    return Promise.reject(new Error('Test error'));
  };
  
  try {
    await supabase.rpc('get_dashboard_data', {
      page_size: 1,
      page_offset: 0,
      user_role_id: 1
    });
  } catch (e) {
    console.log(`\nError test completed in ${Date.now() - errorStart}ms`);
    console.log(`Retry attempts: ${requestCount}`);
    
    if (requestCount > 1) {
      console.log('⚠️ PROBLEM: Retry logic is active and may be causing delays');
    }
  }
}

testRapidFire().catch(console.error);
// Test script to debug dashboard performance
// Run with: node test-dashboard-performance.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './apps/operations/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDashboardPerformance() {
  console.log('Testing Dashboard Performance...\n');

  // Test 1: get_dashboard_data (new combined function)
  console.log('1. Testing get_dashboard_data (combined function):');
  const start1 = Date.now();
  const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_dashboard_data', {
    page_size: 50,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time1 = Date.now() - start1;
  
  if (dashboardError) {
    console.error('Error:', dashboardError);
  } else {
    const result = dashboardData;
    console.log(`✓ Time: ${time1}ms`);
    console.log(`✓ Total incidents: ${result?.totalCount || 0}`);
    console.log(`✓ Incidents returned: ${result?.incidents?.length || 0}`);
  }

  console.log('\n2. Testing get_incidents_with_details_rbac (old function):');
  const start2 = Date.now();
  const { data: incidentsData, error: incidentsError } = await supabase.rpc('get_incidents_with_details_rbac', {
    page_size: 50,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time2 = Date.now() - start2;
  
  if (incidentsError) {
    console.error('Error:', incidentsError);
  } else {
    console.log(`✓ Time: ${time2}ms`);
    console.log(`✓ Incidents returned: ${incidentsData?.length || 0}`);
  }

  console.log('\n3. Testing get_incidents_count_rbac:');
  const start3 = Date.now();
  const { data: countData, error: countError } = await supabase.rpc('get_incidents_count_rbac', {
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time3 = Date.now() - start3;
  
  if (countError) {
    console.error('Error:', countError);
  } else {
    console.log(`✓ Time: ${time3}ms`);
    console.log(`✓ Count: ${countData}`);
  }

  // Test 4: Test employer filtering
  console.log('\n4. Testing employer filtering (employer_id = 8):');
  const start4 = Date.now();
  const { data: filteredData, error: filteredError } = await supabase.rpc('get_dashboard_data', {
    page_size: 50,
    page_offset: 0,
    filter_employer_id: 8,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time4 = Date.now() - start4;
  
  if (filteredError) {
    console.error('Error:', filteredError);
  } else {
    const result = filteredData;
    console.log(`✓ Time: ${time4}ms`);
    console.log(`✓ Total incidents for employer 8: ${result?.totalCount || 0}`);
    console.log(`✓ Incidents returned: ${result?.incidents?.length || 0}`);
  }

  // Test 5: Check if parallel queries are faster
  console.log('\n5. Testing parallel queries (old approach):');
  const start5 = Date.now();
  const [incidentsResult, countResult] = await Promise.all([
    supabase.rpc('get_incidents_with_details_rbac', {
      page_size: 50,
      page_offset: 0,
      filter_employer_id: null,
      filter_worker_id: null,
      filter_start_date: null,
      filter_end_date: null,
      user_role_id: 1,
      user_employer_id: null
    }),
    supabase.rpc('get_incidents_count_rbac', {
      filter_employer_id: null,
      filter_worker_id: null,
      filter_start_date: null,
      filter_end_date: null,
      user_role_id: 1,
      user_employer_id: null
    })
  ]);
  const time5 = Date.now() - start5;
  console.log(`✓ Time for parallel queries: ${time5}ms`);

  console.log('\n\nSummary:');
  console.log(`- Combined function (get_dashboard_data): ${time1}ms`);
  console.log(`- Separate incidents query: ${time2}ms`);
  console.log(`- Separate count query: ${time3}ms`);
  console.log(`- Parallel queries: ${time5}ms`);
  console.log(`- Sequential queries would take: ${time2 + time3}ms`);
  console.log(`\nImprovement: ${Math.round(((time2 + time3) - time1) / (time2 + time3) * 100)}% faster with combined function`);
}

testDashboardPerformance().catch(console.error);

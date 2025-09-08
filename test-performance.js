import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rkzcybthcszeusrohbtc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardPerformance() {
  console.log('Testing dashboard performance...\n');
  
  // Test 1: Full dashboard query (25 items)
  console.log('Test 1: Standard dashboard query (25 items)');
  const start1 = Date.now();
  const { data: data1, error: error1 } = await supabase.rpc('get_dashboard_data', {
    page_size: 25,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time1 = Date.now() - start1;
  
  if (error1) {
    console.error('Error:', error1);
  } else {
    console.log(`✅ Query completed in ${time1}ms`);
    console.log(`   Total incidents: ${data1.totalCount}`);
    console.log(`   Incidents returned: ${data1.incidents.length}`);
    console.log(`   Execution time from DB: ${data1.executionTime}ms\n`);
  }
  
  // Test 2: Filtered query (Newcastle Builders)
  console.log('Test 2: Filtered query (employer_id = 8)');
  const start2 = Date.now();
  const { data: data2, error: error2 } = await supabase.rpc('get_dashboard_data', {
    page_size: 25,
    page_offset: 0,
    filter_employer_id: 8,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 5,
    user_employer_id: 8
  });
  const time2 = Date.now() - start2;
  
  if (error2) {
    console.error('Error:', error2);
  } else {
    console.log(`✅ Query completed in ${time2}ms`);
    console.log(`   Total incidents: ${data2.totalCount}`);
    console.log(`   Incidents returned: ${data2.incidents.length}`);
    console.log(`   Execution time from DB: ${data2.executionTime}ms\n`);
  }
  
  // Test 3: Small page size
  console.log('Test 3: Small page query (5 items)');
  const start3 = Date.now();
  const { data: data3, error: error3 } = await supabase.rpc('get_dashboard_data', {
    page_size: 5,
    page_offset: 0,
    filter_employer_id: null,
    filter_worker_id: null,
    filter_start_date: null,
    filter_end_date: null,
    user_role_id: 1,
    user_employer_id: null
  });
  const time3 = Date.now() - start3;
  
  if (error3) {
    console.error('Error:', error3);
  } else {
    console.log(`✅ Query completed in ${time3}ms`);
    console.log(`   Incidents returned: ${data3.incidents.length}`);
    console.log(`   Execution time from DB: ${data3.executionTime}ms\n`);
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('Performance Summary:');
  console.log(`Test 1 (25 items, all): ${time1}ms ${time1 < 1000 ? '✅' : '❌'}`);
  console.log(`Test 2 (25 items, filtered): ${time2}ms ${time2 < 1000 ? '✅' : '❌'}`);
  console.log(`Test 3 (5 items, all): ${time3}ms ${time3 < 1000 ? '✅' : '❌'}`);
  console.log(`Average: ${Math.round((time1 + time2 + time3) / 3)}ms`);
  
  if (time1 < 1000 && time2 < 1000 && time3 < 1000) {
    console.log('\n🎉 SUCCESS: All queries executed in <1 second!');
    console.log(`Previous: 57,000ms → Now: ~${Math.round((time1 + time2 + time3) / 3)}ms`);
    console.log(`Improvement: ${Math.round(57000 / ((time1 + time2 + time3) / 3))}x faster!`);
  } else {
    console.log('\n⚠️  Some queries still taking >1 second. Check database indexes.');
  }
}

testDashboardPerformance().catch(console.error);
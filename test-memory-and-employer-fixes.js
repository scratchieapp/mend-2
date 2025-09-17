#!/usr/bin/env node

/**
 * Test script to verify memory leak and employer switching fixes
 * 
 * Run this script to test:
 * 1. Memory usage doesn't increase uncontrollably
 * 2. Employer switching properly refreshes data
 */

const puppeteer = require('puppeteer');

async function testMemoryLeak() {
  console.log('🧪 Testing Memory Leak Fix...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor memory usage
    const initialMetrics = await page.metrics();
    console.log('Initial memory:', Math.round(initialMetrics.JSHeapUsedSize / 1048576), 'MB');
    
    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    
    // Wait for page to stabilize
    await page.waitForTimeout(5000);
    
    // Check memory after 5 seconds
    const afterLoadMetrics = await page.metrics();
    console.log('After load memory:', Math.round(afterLoadMetrics.JSHeapUsedSize / 1048576), 'MB');
    
    // Monitor for 30 seconds to ensure memory doesn't keep growing
    console.log('Monitoring memory for 30 seconds...');
    let previousMemory = afterLoadMetrics.JSHeapUsedSize;
    let memoryIncreases = 0;
    
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      const currentMetrics = await page.metrics();
      const currentMemory = currentMetrics.JSHeapUsedSize;
      const memoryMB = Math.round(currentMemory / 1048576);
      
      console.log(`Memory at ${(i+1)*5}s: ${memoryMB} MB`);
      
      if (currentMemory > previousMemory * 1.1) { // More than 10% increase
        memoryIncreases++;
        console.warn('⚠️ Memory increased significantly');
      }
      
      previousMemory = currentMemory;
    }
    
    if (memoryIncreases <= 1) {
      console.log('✅ Memory leak fix verified - memory is stable');
    } else {
      console.log('❌ Possible memory leak detected - memory keeps increasing');
    }
    
  } finally {
    await browser.close();
  }
}

async function testEmployerSwitching() {
  console.log('\n🧪 Testing Employer Switching Fix...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('Employer selected') || msg.text().includes('Query execution time')) {
        console.log('Browser:', msg.text());
      }
    });
    
    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Look for employer selector
    const employerSelector = await page.$('select[aria-label*="employer"], [data-testid*="employer"], button[aria-label*="employer"]');
    
    if (employerSelector) {
      console.log('Found employer selector');
      
      // Click to open dropdown
      await employerSelector.click();
      await page.waitForTimeout(1000);
      
      // Try to select a different employer
      const options = await page.$$('[role="option"], option');
      
      if (options.length > 1) {
        console.log(`Found ${options.length} employers`);
        
        // Get initial incident count
        const initialIncidents = await page.$$('[data-testid*="incident"], .incident-row, tr[data-row-key]');
        console.log(`Initial incidents count: ${initialIncidents.length}`);
        
        // Click second employer option
        await options[1].click();
        
        // Wait for data to refresh (should be automatic now)
        await page.waitForTimeout(3000);
        
        // Check if data refreshed
        const newIncidents = await page.$$('[data-testid*="incident"], .incident-row, tr[data-row-key]');
        console.log(`New incidents count: ${newIncidents.length}`);
        
        // Check if any loading indicators appeared (indicating refresh)
        const loadingAppeared = await page.evaluate(() => {
          return window.performance.getEntriesByType('resource')
            .filter(e => e.name.includes('/rpc/'))
            .filter(e => e.startTime > performance.now() - 3000)
            .length > 0;
        });
        
        if (loadingAppeared || initialIncidents.length !== newIncidents.length) {
          console.log('✅ Employer switching properly triggers data refresh');
        } else {
          console.log('⚠️ Data may not have refreshed - verify manually');
        }
      } else {
        console.log('ℹ️ Not enough employers to test switching');
      }
    } else {
      console.log('ℹ️ No employer selector found - may not be role-1 user');
    }
    
  } finally {
    await browser.close();
  }
}

async function runTests() {
  console.log('🚀 Starting automated tests for memory leak and employer switching fixes\n');
  console.log('Prerequisites:');
  console.log('1. Make sure the app is running on http://localhost:5173');
  console.log('2. Make sure you are logged in as a role-1 user\n');
  
  try {
    await testMemoryLeak();
    await testEmployerSwitching();
    
    console.log('\n✅ All tests completed!');
    console.log('\nManual verification steps:');
    console.log('1. Open Chrome DevTools > Memory tab');
    console.log('2. Take a heap snapshot');
    console.log('3. Use the app normally for 2-3 minutes');
    console.log('4. Take another heap snapshot');
    console.log('5. Compare snapshots - memory should not grow significantly');
    console.log('\n6. As role-1 user, switch between employers');
    console.log('7. Data should refresh automatically without manual page refresh');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  runTests();
} catch (e) {
  console.log('Installing puppeteer...');
  require('child_process').execSync('npm install puppeteer', { stdio: 'inherit' });
  console.log('Please run the script again: node test-memory-and-employer-fixes.js');
}

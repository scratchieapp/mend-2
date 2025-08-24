/**
 * Authentication Redirect Loop Fix Test
 * 
 * This test simulates the problematic authentication flow to verify our fixes work.
 * 
 * EXPECTED BEHAVIOR AFTER FIXES:
 * 1. User logs in -> Redirected directly to role-specific dashboard (not homepage)
 * 2. "Go to dashboard" from marketing -> Direct to dashboard (no login loop)
 * 3. No redirect loops or homepage stops
 */

import { chromium } from 'playwright';

async function testAuthenticationFlow() {
  console.log('🧪 Testing Authentication Redirect Loop Fixes...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 2000 // Slow down for debugging
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging to see our debug messages
  page.on('console', msg => {
    if (msg.type() === 'log' && (
      msg.text().includes('🔍') || 
      msg.text().includes('🔄') || 
      msg.text().includes('AuthState') ||
      msg.text().includes('DashboardRouter') ||
      msg.text().includes('ClerkLogin') ||
      msg.text().includes('UserMenu')
    )) {
      console.log(`[BROWSER]: ${msg.text()}`);
    }
  });

  try {
    console.log('1️⃣ Testing: Direct login to operations app');
    console.log('   Expected: User should go directly to dashboard after login\n');
    
    // Navigate to operations login page
    await page.goto('http://localhost:5173/operations/sign-in');
    await page.waitForTimeout(3000);
    
    // Fill in demo account credentials (role5@scratchie.com - Builder Admin)
    console.log('   Entering login credentials...');
    await page.fill('input[name="identifier"]', 'role5@scratchie.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect and check URL
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log(`   Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/builder-senior')) {
      console.log('   ✅ SUCCESS: User redirected directly to role-specific dashboard!');
    } else if (currentUrl.includes('/sign-in') || currentUrl === 'http://localhost:5173/operations/' || currentUrl === 'http://localhost:5173/operations') {
      console.log('   ❌ FAIL: User stuck at homepage/login - redirect loop still exists');
    } else {
      console.log(`   ⚠️  UNEXPECTED: User at unexpected URL: ${currentUrl}`);
    }
    
    console.log('\n2️⃣ Testing: "Go to dashboard" from marketing site');
    console.log('   Expected: Should go directly to dashboard without login loop\n');
    
    // Navigate to marketing site
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(3000);
    
    // Look for user menu (should show if authenticated)
    const userMenu = await page.locator('button:has-text("User")').first();
    const isUserMenuVisible = await userMenu.isVisible();
    
    if (isUserMenuVisible) {
      console.log('   User menu found - user appears to be authenticated on marketing site');
      
      // Click user menu to open dropdown
      await userMenu.click();
      await page.waitForTimeout(1000);
      
      // Click "Go to Dashboard"
      await page.click('text="Go to Dashboard"');
      await page.waitForTimeout(5000);
      
      const finalUrl = page.url();
      console.log(`   Current URL after "Go to dashboard": ${finalUrl}`);
      
      if (finalUrl.includes('/builder-senior') || finalUrl.includes('/dashboard') || finalUrl.includes('/admin')) {
        console.log('   ✅ SUCCESS: "Go to dashboard" worked correctly!');
      } else if (finalUrl.includes('/sign-in')) {
        console.log('   ❌ FAIL: "Go to dashboard" triggered login loop');
      } else {
        console.log(`   ⚠️  UNEXPECTED: Ended up at: ${finalUrl}`);
      }
    } else {
      console.log('   ⚠️  User menu not found - authentication may not be shared between domains');
    }
    
    console.log('\n🧪 Test completed. Check browser console for detailed debug logs.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n📋 Browser left open for manual inspection. Close manually when done.');
    // await browser.close();
  }
}

// Run the test
testAuthenticationFlow().catch(console.error);
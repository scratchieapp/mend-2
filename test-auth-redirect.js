#!/usr/bin/env node

import { chromium } from 'playwright';

async function testAuthRedirect() {
  console.log('\n=== Testing Authentication Redirect Flow ===\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.text().includes('DashboardRouter') || 
        msg.text().includes('ClerkLogin') || 
        msg.text().includes('AuthStateHandler') ||
        msg.text().includes('UserMenu')) {
      console.log(`[PAGE LOG] ${msg.text()}`);
    }
  });
  
  try {
    // Test 1: Navigate to marketing site
    console.log('1. Navigating to marketing site...');
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Test 2: Click login button
    console.log('2. Clicking login button...');
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      console.log('   ✓ Navigated to login page');
      console.log('   Current URL:', page.url());
    }
    
    // Test 3: Fill in login credentials
    console.log('3. Entering login credentials...');
    
    // Wait for Clerk's sign-in form to be ready
    await page.waitForTimeout(2000);
    
    // Check if we're on the Clerk sign-in page
    const signInUrl = page.url();
    if (signInUrl.includes('sign-in') || signInUrl.includes('clerk')) {
      console.log('   ✓ On Clerk sign-in page');
      
      // Look for email/username field
      const emailField = await page.locator('input[name="identifier"], input[type="email"], input[name="email"]').first();
      if (await emailField.isVisible()) {
        await emailField.fill('role1@scratchie.com');
        console.log('   ✓ Entered email');
      }
      
      // Click continue/next if there's a two-step process
      const continueButton = await page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Enter password
      const passwordField = await page.locator('input[type="password"]').first();
      if (await passwordField.isVisible()) {
        await passwordField.fill('Scratchie!23');
        console.log('   ✓ Entered password');
      }
      
      // Click sign in
      const signInButton = await page.locator('button:has-text("Sign in"), button:has-text("Continue")').last();
      if (await signInButton.isVisible()) {
        console.log('4. Clicking sign in...');
        await signInButton.click();
        
        // Wait for navigation after login
        await page.waitForTimeout(5000);
        
        // Check where we ended up
        const finalUrl = page.url();
        console.log('\n=== RESULT ===');
        console.log('Final URL:', finalUrl);
        
        if (finalUrl.includes('/admin')) {
          console.log('✅ SUCCESS: Redirected to admin dashboard!');
        } else if (finalUrl.includes('/dashboard')) {
          console.log('✅ PARTIAL: Redirected to a dashboard');
        } else if (finalUrl.includes('localhost:5174') || !finalUrl.includes('/operations')) {
          console.log('❌ ISSUE: Redirected back to marketing homepage');
          console.log('This is the redirect loop issue!');
        } else {
          console.log('🤔 Unexpected location:', finalUrl);
        }
      }
    }
    
    // Test 4: Test "Go to dashboard" button if we're logged in
    console.log('\n5. Testing "Go to dashboard" button...');
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if user menu is visible (indicates logged in)
    const userButton = await page.locator('button:has-text("Go to dashboard"), [aria-label*="User menu"]').first();
    if (await userButton.isVisible()) {
      console.log('   User is logged in, clicking user menu...');
      await userButton.click();
      await page.waitForTimeout(500);
      
      const dashboardLink = await page.locator('text="Go to dashboard"').first();
      if (await dashboardLink.isVisible()) {
        console.log('   Clicking "Go to dashboard"...');
        await dashboardLink.click();
        await page.waitForTimeout(3000);
        
        const dashboardUrl = page.url();
        console.log('   Final URL after "Go to dashboard":', dashboardUrl);
        
        if (dashboardUrl.includes('/admin') || dashboardUrl.includes('/dashboard')) {
          console.log('   ✅ SUCCESS: Navigated to dashboard!');
        } else {
          console.log('   ❌ ISSUE: Did not navigate to dashboard');
        }
      }
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\n=== Test Complete ===');
    await browser.close();
  }
}

testAuthRedirect().catch(console.error);
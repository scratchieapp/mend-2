#!/usr/bin/env node

import { chromium } from 'playwright';

async function testIntegration() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Testing Marketing Site...');
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');
  
  // Check if the marketing page loads
  const title = await page.title();
  console.log('Marketing Site Title:', title);
  
  // Wait a bit for any async content to load
  await page.waitForTimeout(2000);
  
  // Check for login button using multiple selectors
  const selectors = [
    'button:has-text("Login")',
    'button:has-text("Sign In")',
    'text=Login',
    '[onClick*="handleLoginClick"]'
  ];
  
  let loginButton = null;
  for (const selector of selectors) {
    try {
      loginButton = await page.locator(selector).first();
      if (await loginButton.isVisible()) {
        console.log(`✓ Login button found with selector: ${selector}`);
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  if (loginButton && await loginButton.isVisible()) {
    // Click login to navigate to operations
    await loginButton.click();
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('After login click, URL:', currentUrl);
    
    if (currentUrl.includes('localhost:5173') || currentUrl.includes('/operations')) {
      console.log('✓ Successfully navigated to operations portal');
    } else if (currentUrl.includes('clerk')) {
      console.log('✓ Successfully navigated to Clerk authentication');
    } else {
      console.log('Current page URL:', currentUrl);
    }
  } else {
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'marketing-page.png' });
    console.log('⚠ Login button not found on marketing site');
    console.log('Screenshot saved as marketing-page.png');
    
    // Log the page content for debugging
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      const text = await buttons[i].textContent();
      console.log(`  Button ${i}: "${text}"`);
    }
  }
  
  await browser.close();
}

testIntegration().catch(console.error);
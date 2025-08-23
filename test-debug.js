#!/usr/bin/env node

import { chromium } from 'playwright';

async function testDebug() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('Page Error:', error.message);
  });
  
  console.log('Loading Marketing Site...');
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if React app is loaded
  const appDiv = await page.locator('#root').first();
  const hasContent = await appDiv.isVisible();
  console.log('Root div visible:', hasContent);
  
  if (hasContent) {
    const innerHTML = await appDiv.innerHTML();
    console.log('Root div has content:', innerHTML.length > 0 ? `Yes (${innerHTML.length} chars)` : 'No');
    
    if (innerHTML.length < 100) {
      console.log('Root content:', innerHTML);
    }
  }
  
  // Check for any error messages
  const errorMessages = await page.locator('.error, [class*="error"]').all();
  if (errorMessages.length > 0) {
    console.log('Found error elements:', errorMessages.length);
    for (const error of errorMessages) {
      const text = await error.textContent();
      console.log('  Error:', text);
    }
  }
  
  await page.screenshot({ path: 'debug-marketing.png' });
  console.log('Screenshot saved as debug-marketing.png');
  
  await browser.close();
}

testDebug().catch(console.error);
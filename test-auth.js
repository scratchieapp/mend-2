import { chromium } from 'playwright';

async function testAuthentication() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track network requests
  const requests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('users') || url.includes('auth') || url.includes('supabase')) {
      requests.push({
        url: url,
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Track console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  try {
    console.log('Navigating to http://localhost:8080/auth/clerk-login...');
    await page.goto('http://localhost:8080/auth/clerk-login', { waitUntil: 'networkidle' });
    
    console.log('Taking initial screenshot...');
    await page.screenshot({ path: 'initial-page.png' });

    // Wait for Clerk to fully load
    console.log('Waiting for Clerk to load...');
    await page.waitForTimeout(5000);
    
    // Wait for the Clerk form to be properly loaded
    try {
      await page.waitForSelector('form', { timeout: 10000 });
      console.log('Form found, waiting for inputs to be ready...');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Form not found, continuing with current state...');
    }
    
    // Get page title and current URL
    const title = await page.title();
    console.log('Page title:', title);
    console.log('Page URL:', page.url());
    
    // Check if we can find any common login selectors
    const emailInput = await page.$('input[type="email"]');
    const clerkSignIn = await page.$('[data-testid="sign-in-page"]');
    const loginForm = await page.$('form');
    
    console.log('Email input found:', !!emailInput);
    console.log('Clerk sign-in page found:', !!clerkSignIn);
    console.log('Any form found:', !!loginForm);
    
    // Try to find the Clerk sign-in button or email field
    let emailSelector = 'input[type="email"]';
    if (!emailInput) {
      // Try Clerk's specific selectors
      const clerkEmailInput = await page.$('input[name="identifier"]');
      const clerkEmailInput2 = await page.$('input[name="emailAddress"]');
      if (clerkEmailInput) emailSelector = 'input[name="identifier"]';
      else if (clerkEmailInput2) emailSelector = 'input[name="emailAddress"]';
      else {
        console.log('Could not find email input field. Taking screenshot for debugging...');
        await page.screenshot({ path: 'debug-no-email-input.png' });
        throw new Error('No email input field found');
      }
    }
    
    console.log('Using email selector:', emailSelector);
    
    console.log('Filling in credentials...');
    await page.fill(emailSelector, 'role1@scratchie.com');
    
    // Try to find password field
    let passwordSelector = 'input[type="password"]';
    const passwordInput = await page.$('input[type="password"]');
    if (!passwordInput) {
      const clerkPasswordInput = await page.$('input[name="password"]');
      if (clerkPasswordInput) passwordSelector = 'input[name="password"]';
    }
    
    await page.fill(passwordSelector, 'DemoUser123!');
    
    console.log('Looking for sign in button...');
    
    // Try different button selectors
    const submitBtn = await page.$('button[type="submit"]:visible');
    const signInBtn = await page.$('button:has-text("Sign in")');
    const continueBtn = await page.$('button:has-text("Continue")');
    const clerkBtn = await page.$('[data-testid="sign-in-submit"]');
    
    console.log('Submit button found:', !!submitBtn);
    console.log('Sign in button found:', !!signInBtn);
    console.log('Continue button found:', !!continueBtn);
    console.log('Clerk submit button found:', !!clerkBtn);
    
    // Take a screenshot before clicking
    await page.screenshot({ path: 'before-click.png' });
    
    // Try clicking the most likely button with better error handling
    let clickSuccess = false;
    
    if (signInBtn) {
      try {
        console.log('Clicking Sign in button...');
        await signInBtn.click({ timeout: 5000 });
        clickSuccess = true;
      } catch (error) {
        console.log('Sign in button click failed:', error.message);
      }
    } else if (continueBtn) {
      try {
        console.log('Clicking Continue button...');
        await continueBtn.click({ timeout: 5000 });
        clickSuccess = true;
      } catch (error) {
        console.log('Continue button click failed:', error.message);
      }
    } else if (clerkBtn) {
      try {
        console.log('Clicking Clerk submit button...');
        await clerkBtn.click({ timeout: 5000 });
        clickSuccess = true;
      } catch (error) {
        console.log('Clerk button click failed:', error.message);
      }
    }
    
    if (!clickSuccess) {
      // Try using keyboard as fallback
      console.log('Button click failed, trying keyboard Enter...');
      try {
        await page.press(passwordSelector, 'Enter');
        clickSuccess = true;
      } catch (error) {
        console.log('Keyboard Enter failed:', error.message);
        // Try force clicking any visible button
        console.log('Trying force click on any submit button...');
        try {
          await page.click('button[type="submit"]', { force: true, timeout: 2000 });
          clickSuccess = true;
        } catch (forceError) {
          console.log('Force click also failed:', forceError.message);
        }
      }
    }
    
    console.log('Click attempt result:', clickSuccess ? 'SUCCESS' : 'FAILED');
    
    // Wait for navigation or dashboard to load
    console.log('Waiting for authentication to complete...');
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to dashboard
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'after-login.png' });
    
    // Wait 15 seconds to monitor for infinite loops
    console.log('Monitoring for 15 seconds to detect any infinite loops...');
    const startTime = Date.now();
    const requestsBefore = requests.length;
    
    await page.waitForTimeout(15000);
    
    const requestsAfter = requests.length;
    const newRequests = requestsAfter - requestsBefore;
    
    console.log('\n=== TEST RESULTS ===');
    console.log('Login completed successfully:', !currentUrl.includes('sign-in'));
    console.log('Final URL:', currentUrl);
    console.log('Total network requests during test:', requests.length);
    console.log('New requests during 15-second monitoring period:', newRequests);
    
    // Count requests to users table specifically
    const userTableRequests = requests.filter(req => req.url.includes('users'));
    console.log('Requests to users table:', userTableRequests.length);
    
    // Show recent requests
    console.log('\nRecent network requests:');
    requests.slice(-10).forEach(req => {
      console.log(`${req.timestamp}: ${req.method} ${req.url}`);
    });
    
    // Show console errors
    const errors = consoleLogs.filter(log => log.type === 'error');
    console.log('\nConsole errors:', errors.length);
    errors.forEach(error => {
      console.log(`${error.timestamp}: ${error.text}`);
    });
    
    // Final screenshot
    await page.screenshot({ path: 'final-dashboard.png' });
    
    // Determine verdict
    const hasInfiniteLoop = newRequests > 5; // More than 5 requests in 15 seconds suggests a loop
    const hasErrors = errors.length > 0;
    const loginSuccessful = !currentUrl.includes('sign-in');
    
    console.log('\n=== VERDICT ===');
    if (loginSuccessful && !hasInfiniteLoop && !hasErrors) {
      console.log('RESULT: PASS ✅');
      console.log('- Login successful');
      console.log('- No infinite loop detected');
      console.log('- No console errors');
    } else {
      console.log('RESULT: FAIL ❌');
      if (!loginSuccessful) console.log('- Login failed');
      if (hasInfiniteLoop) console.log('- Infinite loop detected (too many requests)');
      if (hasErrors) console.log('- Console errors found');
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('RESULT: FAIL ❌ - Test execution error');
  } finally {
    await browser.close();
  }
}

testAuthentication();
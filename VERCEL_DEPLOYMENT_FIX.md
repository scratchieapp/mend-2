# 🚨 Vercel Deployment Fix Guide

## Problems Identified

1. **Missing Environment Variables** - Clerk keys not configured in Vercel
2. **Wrong Redirect URLs** - Clerk is redirecting to localhost instead of production URL
3. **Clerk Domain Configuration** - Clerk needs to be configured for production domain

## Step 1: Add Environment Variables to Vercel

Go to your Vercel project settings and add these environment variables:

### Required Environment Variables

```bash
# Supabase (already set, but verify)
VITE_SUPABASE_URL=https://rkzcybthcszeusrohbtc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0

# Clerk - IMPORTANT: These are development keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y3VycmVudC1wb3Jwb2lzZS00NC5jbGVyay5hY2NvdW50cy5kZXYk
```

### How to Add in Vercel:

1. Go to: https://vercel.com/jameskells-projects/mend-2/settings/environment-variables
2. Add each variable with the values above
3. Make sure they're available for "Production", "Preview", and "Development"
4. Click "Save"

## Step 2: Configure Clerk for Production

You need to update Clerk settings in the Clerk Dashboard:

### Clerk Dashboard Configuration

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Select your application**: current-porpoise-44
3. **Navigate to**: Paths > URLs & Redirects

### Update these settings:

#### Home URL
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app
```

#### Sign-in URL
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app/auth/clerk-login
```

#### Sign-up URL
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app/auth/clerk-login
```

#### After sign-in URL
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app/dashboard
```

#### After sign-up URL
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app/dashboard
```

### Add Allowed Origins (CORS)

In Clerk Dashboard > Configure > Allowed origins, add:
```
https://mend-2-38ifbbvav-jameskells-projects.vercel.app
https://*.vercel.app
http://localhost:8080
http://localhost:8082
```

## Step 3: Update Code for Dynamic URLs

We need to update the code to use dynamic URLs based on environment:

### Create a new file: `/src/lib/config.ts`

```typescript
// Get the base URL based on environment
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side or build time
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  
  if (import.meta.env.VERCEL_URL) {
    return `https://${import.meta.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:8080';
};

export const APP_URL = getBaseUrl();
```

### Update `/src/pages/auth/ClerkLogin.tsx`

Replace line 49:
```typescript
// OLD:
redirectUrl="/dashboard"

// NEW:
redirectUrl={`${window.location.origin}/dashboard`}
```

## Step 4: Add Production Clerk Instance (Optional but Recommended)

Currently you're using development Clerk keys (`pk_test_`). For production, you should:

1. Create a production instance in Clerk
2. Get production keys (they start with `pk_live_`)
3. Use different keys for production in Vercel

## Step 5: Redeploy

After making these changes:

1. Commit and push the code changes
2. Vercel will automatically redeploy
3. Test the authentication flow

## Quick Fix (Temporary)

If you need a quick fix while setting up properly:

1. In Clerk Dashboard, add `localhost:8080` to the redirect URLs
2. This is why it's redirecting to localhost - Clerk has that as the configured redirect

## Testing After Fix

1. Clear browser cookies/cache
2. Visit: https://mend-2-38ifbbvav-jameskells-projects.vercel.app/auth/clerk-login
3. Try logging in with demo credentials
4. Verify you stay on the production domain

## Environment Variable Reference

For production deployment, you may want to add:

```bash
# Optional: Explicitly set app URL
VITE_APP_URL=https://mend-2-38ifbbvav-jameskells-projects.vercel.app

# Optional: For custom domain (when you have one)
VITE_APP_URL=https://yourdomain.com
```

## Troubleshooting

If issues persist after these changes:

1. **Check Vercel Function Logs**: 
   - Go to Vercel Dashboard > Functions tab
   - Look for any error messages

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for CORS errors or missing environment variables

3. **Verify Environment Variables**:
   - In your app, add temporary debug code:
   ```javascript
   console.log('Clerk Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
   ```

4. **Clear Clerk Session**:
   - Go to: https://current-porpoise-44.clerk.accounts.dev/sign-out
   - Clear all cookies for the domain
   - Try again

## Summary

The main issues are:
1. ✅ Missing Clerk environment variables in Vercel
2. ✅ Clerk is configured only for localhost URLs
3. ✅ Need to update Clerk Dashboard with production URLs

Once you complete Steps 1 and 2, your authentication should work properly in production!
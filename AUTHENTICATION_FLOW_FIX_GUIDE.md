# Authentication Flow Fix Guide - Mend Platform

## Overview
This guide documents the fixes applied to the Mend Platform authentication flow to properly handle the monorepo architecture with Clerk authentication.

## Architecture Understanding

### Domain Structure
- **mendplatform.au** - Main domain serving BOTH marketing homepage AND operations dashboards
- **accounts.mendplatform.au** - CNAME managed by Clerk ONLY for authentication pages
  - This is NOT the operations app
  - This is ONLY for Clerk's sign-in/sign-up pages

### Application Structure
- **Marketing App** (`/apps/marketing/`)
  - Serves public homepage and marketing content
  - Shows at mendplatform.au when user is NOT authenticated
  - Has UserMenu for authenticated users to navigate to dashboards

- **Operations App** (`/apps/operations/`)
  - Serves all protected dashboards and role-based content
  - Shows at mendplatform.au/[dashboard-path] when user IS authenticated
  - Contains all business logic and admin interfaces

## Correct Authentication Flow

### 1. User Visits Homepage
- User goes to `mendplatform.au`
- Marketing app serves the public homepage
- Sign In/Sign Up buttons are visible

### 2. User Clicks Sign In
- Button redirects to `accounts.mendplatform.au/sign-in`
- Clerk handles the authentication
- After successful login, Clerk redirects back to `mendplatform.au`

### 3. Post-Authentication Redirect
- User lands at `mendplatform.au/` authenticated
- Operations app's DashboardRouter detects user role
- Automatically redirects to role-specific dashboard:
  - Role 1 (Super Admin) → `/admin`
  - Role 2 (Account Manager) → `/account-manager`
  - Role 3 (Data Entry) → `/dashboard`
  - Role 5 (Builder Admin) → `/builder-senior`
  - Role 6 (Site Admin) → `/site-admin`
  - Role 7 (Client) → `/worker-portal`
  - Etc.

### 4. Authenticated Navigation
- User stays on `mendplatform.au` for all operations
- All dashboards served from `mendplatform.au/[path]`
- Clerk session is maintained across the domain

## Key Fixes Applied

### 1. Root vercel.json
**Before:** Incorrectly routing accounts.mendplatform.au to operations app
**After:** Properly routing based on paths, not domains

```json
{
  "rewrites": [
    {
      "source": "/admin/(.*)",
      "destination": "/operations/admin/$1"
    },
    {
      "source": "/dashboard/(.*)",
      "destination": "/operations/dashboard/$1"
    },
    // ... other dashboard routes
    {
      "source": "/sign-in",
      "destination": "/operations/index.html"
    },
    {
      "source": "/(.*)",
      "destination": "/marketing/$1"
    }
  ]
}
```

### 2. Environment Configuration
**Before:** Operations URL pointing to accounts.mendplatform.au
**After:** Separate URLs for operations and Clerk auth

```typescript
// Marketing app environment.ts
production: {
  operationsUrl: 'https://mendplatform.au',
  marketingUrl: 'https://mendplatform.au',
  clerkAuthUrl: 'https://accounts.mendplatform.au',
}

// Operations app environment.ts
production: {
  operationsUrl: 'https://mendplatform.au',
  marketingUrl: 'https://mendplatform.au',
  clerkAuthUrl: 'https://accounts.mendplatform.au',
}
```

### 3. Authentication URLs
**Before:** Using operations URL for auth
**After:** Using Clerk auth URL with proper redirect

```typescript
export const getLoginUrl = (returnUrl?: string): string => {
  const config = getEnvironmentConfig();
  const baseUrl = config.clerkAuthUrl; // Use Clerk auth URL
  const path = config.authPaths.login;
  
  const fullUrl = `${baseUrl}${path}`;
  const url = new URL(fullUrl);
  url.searchParams.set('redirect_url', config.operationsUrl);
  return url.toString();
};
```

### 4. UserMenu Navigation
**Before:** Complex logic checking domains
**After:** Simple redirect to operations dashboard

```typescript
onClick={() => {
  const operationsUrl = getOperationsUrl();
  // Since operations is now on mendplatform.au
  window.location.href = operationsUrl + '/dashboard';
}}
```

## Environment Variables Required

### Production
```env
# Marketing App
VITE_OPERATIONS_URL=https://mendplatform.au
VITE_PUBLIC_URL=https://mendplatform.au
VITE_CLERK_AUTH_URL=https://accounts.mendplatform.au
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Operations App
VITE_PUBLIC_URL=https://mendplatform.au
VITE_MARKETING_URL=https://mendplatform.au
VITE_CLERK_AUTH_URL=https://accounts.mendplatform.au
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

### Development
```env
# Marketing App
VITE_OPERATIONS_URL=http://localhost:5173
VITE_PUBLIC_URL=http://localhost:5174
VITE_CLERK_AUTH_URL=http://localhost:5173
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Operations App
VITE_PUBLIC_URL=http://localhost:5173
VITE_MARKETING_URL=http://localhost:5174
VITE_CLERK_AUTH_URL=http://localhost:5173
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

## Vercel Deployment Configuration

### 1. Domain Setup
- Primary domain: `mendplatform.au`
- CNAME: `accounts.mendplatform.au` → Clerk's infrastructure

### 2. Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 3. Environment Variables in Vercel
Set the production environment variables listed above in:
- Vercel Dashboard → Project Settings → Environment Variables

## Testing the Flow

### 1. Local Development
```bash
# Terminal 1 - Operations app
cd apps/operations
npm run dev

# Terminal 2 - Marketing app
cd apps/marketing
npm run dev
```

### 2. Test Scenarios
1. **Not Logged In:**
   - Visit `localhost:5174` → See marketing homepage
   - Click Sign In → Redirected to `localhost:5173/sign-in`
   - After login → Redirected to `localhost:5173/dashboard`

2. **Already Logged In:**
   - Visit `localhost:5174` → See marketing homepage with UserMenu
   - Click "Go to Dashboard" → Redirected to `localhost:5173/dashboard`
   - Dashboard router → Redirects to role-specific dashboard

3. **Direct Dashboard Access:**
   - Visit `localhost:5173/admin` while logged in → Access granted (if role 1)
   - Visit `localhost:5173/admin` while logged out → Redirected to sign-in

### 3. Production Testing
Same flow but with production URLs:
- `mendplatform.au` → Marketing homepage
- `accounts.mendplatform.au/sign-in` → Clerk auth
- `mendplatform.au/dashboard` → Operations dashboards

## Troubleshooting

### Issue: Infinite redirect loop
**Solution:** Check that `clerkAuthUrl` is different from `operationsUrl`

### Issue: 404 on dashboard paths
**Solution:** Verify vercel.json rewrites include all dashboard paths

### Issue: Authentication not persisting
**Solution:** Ensure Clerk session cookies are set for `.mendplatform.au` domain

### Issue: Wrong dashboard after login
**Solution:** Check DashboardRouter role mappings match user roles

## Summary
The key insight is that `mendplatform.au` serves BOTH the marketing site AND the operations dashboards based on the path and authentication state. The `accounts.mendplatform.au` subdomain is ONLY for Clerk's authentication pages and should never serve application content.

This architecture provides:
- Clean URLs for users
- Proper separation of concerns
- Secure authentication flow
- Role-based access control
- Seamless user experience
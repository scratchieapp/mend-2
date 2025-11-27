# Mend Platform Deployment Guide

## Environment Variables Required

### Marketing Application (`/apps/marketing`)

Create a `.env.local` file with the following variables:

```env
# Clerk Authentication (shared with operations app)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# Google Analytics 4
# Get from Google Analytics Admin > Data Streams > Web > Measurement ID
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Operations App URL (for SSO navigation)
# Development
VITE_OPERATIONS_URL=http://localhost:5173
# Production
# VITE_OPERATIONS_URL=https://operations.mend.com.au

# Marketing Site URL
# Development
VITE_PUBLIC_URL=http://localhost:5174
# Production
# VITE_PUBLIC_URL=https://mend.com.au
```

### Operations Application (`/apps/operations`)

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Clerk Authentication (must be same as marketing app)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# Marketing Site URL (for navigation back)
# Development
VITE_MARKETING_URL=http://localhost:5174
# Production
# VITE_MARKETING_URL=https://mend.com.au

# Operations App URL
# Development
VITE_PUBLIC_URL=http://localhost:5173
# Production
# VITE_PUBLIC_URL=https://operations.mend.com.au
```

## User Flow

### 1. Landing Page → Login
- User lands on marketing site (https://mend.com.au)
- Clicks "Login" button in header or hero section
- Redirected to operations app login (https://operations.mend.com.au/auth/clerk-login)

### 2. Authentication → Dashboard
- User enters credentials via Clerk SignIn component
- Upon successful authentication:
  - **Super Admin** → `/admin` dashboard
  - **Account Manager** → `/account-manager` dashboard
  - **Builder Admin** → `/builder-senior` dashboard
  - **Site Admin** → `/site-admin` dashboard
  - **Medical Professional** → `/medical-dashboard`
  - **Worker/Public** → `/worker-portal`
  - **Others** → `/dashboard` (default)

### 3. Navigation Between Apps
- **Marketing → Operations**: Via login buttons or user menu "Go to Dashboard"
- **Operations → Marketing**: Via logout or back navigation
- **Shared Authentication**: Both apps use same Clerk instance for SSO

## Local Development

### Start Both Applications

```bash
# Terminal 1 - Marketing App
cd apps/marketing
npm install
npm run dev
# Runs on http://localhost:5174

# Terminal 2 - Operations App
cd apps/operations
npm install
npm run dev
# Runs on http://localhost:5173
```

### Test Authentication Flow
1. Open http://localhost:5174 (marketing site)
2. Click "Login" button
3. Should redirect to http://localhost:5173/auth/clerk-login
4. Use demo accounts:
   - `role1@scratchie.com` - Super Admin
   - `role2@scratchie.com` - Account Manager
   - `role5@scratchie.com` - Builder Admin
5. After login, verify role-based redirect works

## Production Deployment on Vercel

### 1. Configure Vercel Project

The repository includes a `vercel.json` configuration that:
- Builds both applications
- Routes `/operations/*` to operations app
- Routes `/` to marketing app

### 2. Set Environment Variables in Vercel

For each application, add the production environment variables in Vercel dashboard:

**Marketing App Variables:**
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_OPERATIONS_URL=https://operations.mend.com.au`
- `VITE_PUBLIC_URL=https://mend.com.au`

**Operations App Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_MARKETING_URL=https://mend.com.au`
- `VITE_PUBLIC_URL=https://operations.mend.com.au`

### 3. Deploy Command

```bash
# From root directory
npm run build
# This builds both applications

# Or deploy via Vercel CLI
vercel --prod
```

## Build Verification

### Test Production Build Locally

```bash
# From root directory
npm run build

# Preview marketing app
cd apps/marketing
npm run preview
# Opens on http://localhost:4173

# Preview operations app (in new terminal)
cd apps/operations
npm run preview
# Opens on http://localhost:4174
```

## Troubleshooting

### Common Issues

1. **Authentication Loop**
   - Ensure both apps use the same `VITE_CLERK_PUBLISHABLE_KEY`
   - Check Clerk dashboard for correct redirect URLs

2. **Supabase Connection Failed**
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
   - Check Supabase dashboard for API settings

3. **GA4 Not Tracking**
   - Verify `VITE_GA_MEASUREMENT_ID` is correct format (G-XXXXXXXXXX)
   - Check Google Analytics Real-time view
   - Ensure GA4 property is set up for the domain

4. **Role-based Redirects Not Working**
   - Check user's role in Clerk dashboard
   - Verify role mapping in `/apps/operations/src/components/auth/DashboardRouter.tsx`

## Security Checklist

- [ ] Environment variables are not committed to git
- [ ] Production uses HTTPS for all URLs
- [ ] Clerk production keys are different from development
- [ ] Supabase Row Level Security (RLS) is enabled
- [ ] CORS settings allow only your domains
- [ ] Rate limiting is configured

## Monitoring

### Google Analytics 4
- Track user flows from marketing to operations
- Monitor conversion rates on CTAs
- Analyze drop-off points in authentication

### Clerk Dashboard
- Monitor active users
- Track authentication methods
- Review security logs

### Supabase Dashboard
- Monitor database queries
- Check storage usage
- Review API logs

## Support

For issues or questions:
- Check error logs in browser console
- Review Vercel deployment logs
- Check Clerk and Supabase dashboards for service status
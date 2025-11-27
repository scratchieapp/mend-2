# Deployment Checklist - Mend Platform

## Pre-Deployment Verification

### 1. Code Review
- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] ESLint issues fixed (`npm run lint`)
- [ ] No `console.log` statements in production code
- [ ] All TODO comments addressed

### 2. Environment Variables
- [ ] Production environment variables set in Vercel dashboard
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_PUBLIC_URL=https://mendplatform.au`
  - [ ] `VITE_MARKETING_URL=https://mendplatform.au`
  - [ ] `VITE_CLERK_AUTH_URL=https://accounts.mendplatform.au`
  - [ ] `VITE_OPERATIONS_URL=https://mendplatform.au`

### 3. Clerk Configuration
- [ ] Production Clerk application created
- [ ] Allowed redirect URLs configured:
  - [ ] `https://mendplatform.au/*`
  - [ ] `https://accounts.mendplatform.au/*`
- [ ] Webhook endpoints configured (if needed)
- [ ] User roles properly mapped in Clerk dashboard

### 4. Supabase Configuration
- [ ] Production Supabase project created
- [ ] Database migrations applied
- [ ] Row Level Security (RLS) policies configured
- [ ] Storage buckets created and configured
- [ ] API keys secured

## Deployment Steps

### 1. Prepare the Codebase
```bash
# 1. Ensure you're on the main branch
git checkout main
git pull origin main

# 2. Run build locally to verify
npm run build

# 3. Test the production build
npm run preview
```

### 2. Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: Via Git Push
```bash
# Push to main branch (triggers automatic deployment)
git push origin main
```

#### Option C: Via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the Mend project
3. Click "Redeploy" → "Redeploy with existing Build Cache"

### 3. Post-Deployment Verification

#### Domain Configuration
- [ ] `mendplatform.au` resolves correctly
- [ ] `accounts.mendplatform.au` CNAME points to Clerk
- [ ] SSL certificates are active
- [ ] No mixed content warnings

#### Authentication Flow
- [ ] Homepage loads at `mendplatform.au`
- [ ] Sign In button redirects to `accounts.mendplatform.au/sign-in`
- [ ] After login, user redirected back to `mendplatform.au`
- [ ] User automatically redirected to role-specific dashboard
- [ ] Sign Out works correctly

#### Role-Based Access
Test with each role account:
- [ ] Role 1 (Super Admin) → `/admin` dashboard
- [ ] Role 2 (Account Manager) → `/account-manager` dashboard
- [ ] Role 3 (Data Entry) → `/dashboard`
- [ ] Role 5 (Builder Admin) → `/builder-senior`
- [ ] Role 6 (Site Admin) → `/site-admin`
- [ ] Role 7 (Client) → `/worker-portal`

#### Core Functionality
- [ ] Incident reporting form submits successfully
- [ ] File uploads work correctly
- [ ] Dashboard data loads properly
- [ ] Search and filter functions work
- [ ] Export/download features work

#### Performance & Security
- [ ] Page load time < 3 seconds
- [ ] No console errors in production
- [ ] Security headers present (check Network tab)
- [ ] HTTPS enforced on all pages

## Rollback Procedure

If issues are discovered:

### 1. Immediate Rollback
```bash
# Via Vercel Dashboard
# 1. Go to Deployments tab
# 2. Find the last working deployment
# 3. Click "..." menu → "Promote to Production"
```

### 2. Fix Issues
```bash
# Create a hotfix branch
git checkout -b hotfix/issue-name

# Make fixes
# Test locally
npm run dev

# Commit and push
git add .
git commit -m "fix: [description]"
git push origin hotfix/issue-name

# Create PR and merge to main
```

### 3. Re-deploy
```bash
git checkout main
git pull origin main
vercel --prod
```

## Monitoring Post-Deployment

### First 24 Hours
- [ ] Monitor Vercel Functions logs for errors
- [ ] Check Supabase logs for database issues
- [ ] Review Clerk dashboard for authentication issues
- [ ] Monitor user feedback channels

### Metrics to Track
- [ ] User sign-up rate
- [ ] Login success rate
- [ ] Page load times
- [ ] API response times
- [ ] Error rates

## Support Contacts

### Technical Issues
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Clerk Support**: [clerk.com/support](https://clerk.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)

### Internal Contacts
- **Project Lead**: [Contact info]
- **DevOps Team**: [Contact info]
- **On-call Engineer**: [Contact info]

## Notes

- Always deploy during low-traffic periods
- Have rollback plan ready before deployment
- Communicate deployment schedule to stakeholders
- Keep this checklist updated with lessons learned

## Deployment Log

| Date | Version | Deployed By | Notes |
|------|---------|-------------|-------|
| YYYY-MM-DD | v1.0.0 | Name | Initial deployment |
| | | | |
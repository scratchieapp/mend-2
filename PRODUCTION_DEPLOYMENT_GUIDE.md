# Production Deployment Guide - Authentication URLs

## Overview
This guide outlines the configuration changes required to deploy the Mend platform with proper authentication URL routing for production.

## Architecture
- **Marketing Site**: `https://mendplatform.au` (main domain)
- **Operations App**: `https://accounts.mendplatform.au` (subdomain for authentication)
- **Local Development**: Marketing on `localhost:5174`, Operations on `localhost:5173/operations`

## Environment Configuration

### Marketing App (.env.local)
```bash
# Production settings
VITE_OPERATIONS_URL=https://accounts.mendplatform.au
VITE_PUBLIC_URL=https://mendplatform.au
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_live_clerk_key_here
VITE_GA_MEASUREMENT_ID=G-your_production_ga_id
```

### Operations App (.env.local)
```bash
# Production settings
VITE_MARKETING_URL=https://mendplatform.au
VITE_PUBLIC_URL=https://accounts.mendplatform.au
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_live_clerk_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key_here
```

## Vercel Configuration

### Domain Setup
1. Add `accounts.mendplatform.au` as a custom domain to your Vercel project
2. Configure DNS records:
   - Main domain: `mendplatform.au` → Vercel project
   - Subdomain: `accounts.mendplatform.au` → Same Vercel project
3. Ensure SSL certificates are configured for both domains

### Environment Variables (Vercel Dashboard)
Set these in your Vercel project settings:
- `VITE_OPERATIONS_URL=https://accounts.mendplatform.au`
- `VITE_MARKETING_URL=https://mendplatform.au`
- `VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key_here`
- `VITE_GA_MEASUREMENT_ID=G-your_production_id`

## Clerk Configuration

### Dashboard Settings
1. **Allowed Origins**: Add the following URLs:
   - `https://mendplatform.au`
   - `https://accounts.mendplatform.au`
   - `http://localhost:5174` (for development)
   - `http://localhost:5173` (for development)

2. **Redirect URLs**: Configure these paths:
   - Sign-in redirect: `https://accounts.mendplatform.au/auth/clerk-login`
   - Sign-up redirect: `https://accounts.mendplatform.au/auth/clerk-signup`
   - After sign-in: `https://accounts.mendplatform.au/dashboard`
   - After sign-up: `https://accounts.mendplatform.au/dashboard`

3. **Domain Settings**:
   - Primary domain: `accounts.mendplatform.au`
   - Satellite domains: `mendplatform.au`

## Authentication Flow

### Production Flow
1. User visits `https://mendplatform.au` (marketing site)
2. User clicks "Login" or "Sign Up" button
3. Browser redirects to `https://accounts.mendplatform.au/auth/clerk-login`
4. Clerk handles authentication
5. After successful auth, user is redirected to `https://accounts.mendplatform.au/dashboard`

### Development Flow
1. User visits `http://localhost:5174` (marketing site)
2. User clicks "Login" or "Sign Up" button  
3. Browser redirects to `http://localhost:5173/operations/auth/clerk-login`
4. Clerk handles authentication
5. After successful auth, user is redirected to `http://localhost:5173/operations/dashboard`

## URL Routing Logic

The environment-aware URL configuration automatically handles:
- **Development**: Uses localhost URLs with correct ports
- **Production**: Uses production domains with subdomain routing
- **Environment Detection**: Automatically detects `import.meta.env.PROD`
- **Debugging**: Logs configuration in development mode only

## Testing Checklist

### Development Testing
- [ ] Marketing site loads on `http://localhost:5174`
- [ ] Operations app loads on `http://localhost:5173/operations`
- [ ] Login button redirects to correct operations URL
- [ ] Sign up button redirects to correct operations URL
- [ ] Environment configuration is logged in browser console
- [ ] Clerk authentication works with localhost URLs

### Production Testing  
- [ ] Marketing site loads on `https://mendplatform.au`
- [ ] Operations app loads on `https://accounts.mendplatform.au`
- [ ] Login button redirects to `https://accounts.mendplatform.au/auth/clerk-login`
- [ ] Sign up button redirects to `https://accounts.mendplatform.au/auth/clerk-signup`
- [ ] SSL certificates are valid for both domains
- [ ] Clerk authentication works with production URLs
- [ ] No console errors related to CORS or domain mismatch

## Deployment Steps

1. **Update Environment Variables**:
   - Comment out development URLs in `.env.local` files
   - Uncomment production URLs
   - Update with actual production values

2. **Deploy to Vercel**:
   ```bash
   # From project root
   npm run build
   npx vercel --prod
   ```

3. **Configure Domains**:
   - Add both domains to Vercel project
   - Update DNS records
   - Wait for SSL certificate provisioning

4. **Update Clerk Dashboard**:
   - Add production domains to allowed origins
   - Update redirect URLs
   - Switch to production Clerk keys

5. **Test Authentication Flow**:
   - Verify marketing site login/signup redirects
   - Test complete authentication workflow
   - Check for any CORS errors

## Troubleshooting

### Common Issues

**White Screen on localhost:5175**
- Fixed: Updated environment files to use correct port `5173`
- Check: `apps/operations/vite.config.ts` confirms port 5173

**CORS Errors**
- Solution: Ensure all domains are added to Clerk allowed origins
- Check: Clerk dashboard → Settings → Allowed Origins

**Redirect Loops**
- Solution: Verify Clerk redirect URLs match your actual routes
- Check: Ensure `/auth/clerk-login` routes exist in operations app

**Environment Variables Not Loading**
- Solution: Restart development servers after changing `.env.local`
- Check: Use `console.log()` to verify variables are loaded

### Debug Commands

```bash
# Check current environment configuration
# Open browser console on marketing site - should see environment config logs

# Verify Vercel environment variables
npx vercel env ls

# Test local authentication flow
npm run dev # in both apps/marketing and apps/operations
```

## Security Considerations

1. **HTTPS Only**: Production must use HTTPS for all authentication flows
2. **Domain Validation**: Clerk validates redirect URLs against allowed origins
3. **Environment Separation**: Use different Clerk keys for development and production
4. **CORS Policy**: Restrict origins to only necessary domains

## Files Modified

- `/apps/marketing/.env.local` - Updated production URLs and fixed port
- `/apps/marketing/.env.local.example` - Added production URL documentation
- `/apps/marketing/src/lib/config/environment.ts` - NEW: Environment-aware URL utility
- `/apps/marketing/src/pages/HomePage.tsx` - Updated to use environment utility
- `/apps/operations/.env.local` - Fixed port and added production URLs
- `/apps/operations/.env.local.example` - Added production URL documentation  
- `/vercel.json` - Added subdomain routing for accounts.mendplatform.au

## Next Steps

1. Test the development environment with the updated configuration
2. Deploy to Vercel with production environment variables
3. Configure DNS and domains in Vercel dashboard
4. Update Clerk dashboard with production settings
5. Test complete authentication flow in production

This configuration ensures seamless authentication URL routing for both development and production environments while maintaining security best practices.
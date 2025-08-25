# Environment Variable Fallback System

This document describes the environment variable fallback mechanism implemented for the Mend-2 monorepo, which allows apps to share environment variables while maintaining the ability for app-specific overrides.

## Overview

The Mend-2 monorepo now includes an environment variable fallback system that:

1. **Apps first check their local .env files** (e.g., `/apps/operations/.env.local`)
2. **If a variable is not found, fall back to the root .env file** at `/mend-2/.env`
3. **App-specific overrides take precedence** over shared values
4. **Works in both development and production builds**

## File Structure

```
/mend-2/
├── .env                           # Shared environment variables (fallback)
├── .env.local                     # Shared local overrides (fallback)
├── apps/
│   ├── operations/
│   │   ├── .env.local             # Operations-specific variables (priority)
│   │   └── .env                   # Operations-specific variables (priority)
│   └── marketing/
│       ├── .env.local             # Marketing-specific variables (priority)
│       └── .env                   # Marketing-specific variables (priority)
└── packages/
    └── shared-utils/
        └── src/
            └── env.ts             # Environment fallback utilities
```

## Priority Order (High to Low)

1. **App .env.local** - Highest priority, app-specific local overrides
2. **App .env** - App-specific environment variables
3. **Root .env.local** - Shared local overrides (fallback)
4. **Root .env** - Shared environment variables (fallback)

## Implementation Details

### Shared Utility Package

The fallback mechanism is implemented in `@mend/shared-utils` package:

```typescript
import { setupEnvFallback, createViteDefine } from "@mend/shared-utils";

export default defineConfig(({ mode }) => {
  // Setup environment variable fallback
  const env = setupEnvFallback(__dirname, mode);
  
  return {
    // ... other config
    define: {
      ...createViteDefine(env),
      __DEV__: JSON.stringify(mode === 'development'),
    }
  };
});
```

### Vite Configuration Updates

Both apps' `vite.config.ts` files have been updated to:

1. Import the fallback utilities
2. Setup environment fallback during build
3. Create proper define statements for client-side access
4. Log configuration in development mode

## Usage Examples

### Shared Environment Variables (Root .env)

```bash
# /mend-2/.env
VITE_SHARED_API_URL=https://api.mendplatform.au
VITE_SHARED_VERSION=2.0.0
VITE_SHARED_ENVIRONMENT=production
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...supabase.co
```

### App-Specific Overrides

```bash
# /mend-2/apps/operations/.env.local
VITE_SHARED_ENVIRONMENT=operations-development  # Overrides root value
VITE_PUBLIC_URL=http://localhost:5173/operations # Operations-specific
```

```bash
# /mend-2/apps/marketing/.env.local  
VITE_GA_MEASUREMENT_ID=G-PLACEHOLDER123         # Marketing-specific
VITE_PUBLIC_URL=http://localhost:5174           # Marketing-specific
# Note: VITE_SHARED_ENVIRONMENT will use root fallback value
```

## Development Console Output

When running in development mode, you'll see helpful logging:

```
🔧 Environment Fallback Configuration - operations
  App Directory: /Users/jameskell/Cursor/mend-2/apps/operations
  Root Directory: /Users/jameskell/Cursor/mend-2
  Environment Files Loaded:
    ✅ App .env.local (Priority: High)
    ❌ App .env (Priority: High)
    ✅ Root .env.local (Priority: Low)
    ✅ Root .env (Priority: Low)
  Resolved Environment Variables:
    VITE_SHARED_API_URL: https://api.mendplatform.au
    VITE_SHARED_VERSION: 2.0.0
    VITE_SHARED_ENVIRONMENT: operations-development  # Overridden
    VITE_CLERK_PUBLISHABLE_KEY: ***masked***
    VITE_SUPABASE_URL: https://...supabase.co
```

## Benefits

### 1. **Shared Configuration**
- Common API URLs, keys, and settings stored in one place
- Reduced duplication across apps
- Easier maintenance of shared resources

### 2. **App-Specific Customization**
- Each app can override shared values as needed
- App-specific variables (GA tracking, app URLs) remain isolated
- Environment-specific overrides (development vs production URLs)

### 3. **Clear Priority System**
- Predictable variable resolution
- Easy to understand which value will be used
- Helpful development logging shows the resolution process

### 4. **Production Ready**
- Works in both development and production builds
- Proper security (sensitive values masked in logs)
- No runtime overhead

## Validation and Utilities

The shared-utils package provides additional utilities:

```typescript
import { 
  getEnvVar, 
  getRequiredEnvVar, 
  validateRequiredEnvVars,
  isDevelopment,
  isProduction 
} from "@mend/shared-utils";

// Get environment variable with fallback
const apiUrl = getEnvVar('VITE_SHARED_API_URL', 'https://fallback.com');

// Require environment variable (throws if missing)
const clerkKey = getRequiredEnvVar('VITE_CLERK_PUBLISHABLE_KEY');

// Validate multiple required variables
validateRequiredEnvVars([
  'VITE_CLERK_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL'
]);
```

## Migration Guide

### From Individual App .env Files

1. **Identify shared variables** - Move common variables to root .env
2. **Keep app-specific variables** in app .env files
3. **Test both apps** to ensure variables resolve correctly
4. **Update deployment** to include root .env variables

### Example Migration

**Before:**
```bash
# /apps/operations/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...supabase.co
VITE_PUBLIC_URL=http://localhost:5173/operations

# /apps/marketing/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...  # Duplicate!
VITE_SUPABASE_URL=https://...supabase.co # Duplicate!
VITE_PUBLIC_URL=http://localhost:5174
```

**After:**
```bash
# /mend-2/.env (shared)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...supabase.co

# /apps/operations/.env.local (app-specific)
VITE_PUBLIC_URL=http://localhost:5173/operations

# /apps/marketing/.env.local (app-specific)
VITE_PUBLIC_URL=http://localhost:5174
```

## Deployment Considerations

### Development
- All .env files are automatically loaded
- Console logging helps debug variable resolution
- Hot reload works with environment changes

### Production
- Ensure root .env file is deployed to production
- App-specific .env files should also be deployed
- Consider using .env.production for production-specific overrides

### CI/CD
- Set environment variables in CI/CD pipeline at the root level
- App-specific secrets can be set per deployment
- Use proper secret management for sensitive variables

## Troubleshooting

### Variable Not Found
1. Check console logs in development mode
2. Verify file names (.env vs .env.local)
3. Ensure variables start with VITE_, NEXT_PUBLIC_, or PUBLIC_
4. Check file exists and is readable

### Variable Priority Issues
1. Review the priority order (app files override root files)
2. Check for typos in variable names
3. Use development logging to see which files are loaded
4. Verify the variable exists in the expected file

### Build Issues
1. Ensure @mend/shared-utils package is built (`npm run build`)
2. Check that apps have the correct workspace dependency
3. Verify import paths in vite.config.ts files

## Security Notes

- **Sensitive values** are automatically masked in development logs
- **Never commit** production secrets to .env files
- **Use .env.local** for local development overrides (excluded from git)
- **Consider** using proper secret management in production

## Testing the Setup

Run both apps and verify the console output:

```bash
# Terminal 1 - Operations App
npm run dev:ops

# Terminal 2 - Marketing App  
npm run dev:marketing
```

Look for the environment configuration logs to confirm:
- ✅ Files are loaded correctly
- ✅ Variables resolve with proper priority
- ✅ Shared variables appear in both apps
- ✅ App-specific overrides work as expected

---

**Last Updated:** August 25, 2025  
**Version:** 1.0  
**Status:** ✅ Fully Implemented and Tested
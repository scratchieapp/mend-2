# Environment Variables Quick Reference

## 🚀 Mend-2 Monorepo Environment Variable Setup

### File Locations & Priority

| Priority | File | Description |
|----------|------|-------------|
| **1 (Highest)** | `/apps/{app}/.env.local` | App-specific local overrides |
| **2** | `/apps/{app}/.env` | App-specific environment variables |
| **3** | `/.env.local` | Shared local overrides |
| **4 (Fallback)** | `/.env` | Shared environment variables |

### 📋 Quick Commands

```bash
# Run both apps with environment fallback
npm run dev:ops      # Operations app (port 5173)
npm run dev:marketing # Marketing app (port 5174)

# Build shared utilities (if needed)
cd packages/shared-utils && npm run build
```

### 🔧 Current Shared Variables

Located in `/mend-2/.env`:

```bash
# Authentication & Database
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=...

# Shared Application Settings  
VITE_SHARED_API_URL=https://api.mendplatform.au
VITE_SHARED_VERSION=2.0.0
VITE_SHARED_ENVIRONMENT=production

# Mapbox Integration
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### 🎯 App-Specific Overrides

**Operations App** (`/apps/operations/.env.local`):
```bash
VITE_SHARED_ENVIRONMENT=operations-development  # Overrides root
VITE_PUBLIC_URL=http://localhost:5173/operations
VITE_MARKETING_URL=http://localhost:5174
```

**Marketing App** (`/apps/marketing/.env.local`):
```bash
VITE_GA_MEASUREMENT_ID=G-PLACEHOLDER123
VITE_PUBLIC_URL=http://localhost:5174
VITE_OPERATIONS_URL=http://localhost:5173/operations
```

### ✅ Validation

When you start a development server, you should see:

```
🔧 Environment Fallback Configuration - {app}
  App Directory: /Users/.../apps/{app}
  Root Directory: /Users/.../mend-2
  Environment Files Loaded:
    ✅ App .env.local (Priority: High)
    ✅ Root .env (Priority: Low)
  Resolved Environment Variables:
    VITE_SHARED_API_URL: https://api.mendplatform.au
    VITE_SHARED_ENVIRONMENT: {value}
    ...
```

### 🔍 Usage in Code

```typescript
// Access environment variables in your React components
const apiUrl = import.meta.env.VITE_SHARED_API_URL;
const version = import.meta.env.VITE_SHARED_VERSION;
const environment = import.meta.env.VITE_SHARED_ENVIRONMENT;

// Using the utility functions
import { getEnvVar, getRequiredEnvVar } from "@mend/shared-utils";

const apiUrl = getEnvVar('VITE_SHARED_API_URL', 'https://fallback.com');
const clerkKey = getRequiredEnvVar('VITE_CLERK_PUBLISHABLE_KEY');
```

### 🚨 Troubleshooting

**Variable not found?**
1. Check it starts with `VITE_`, `NEXT_PUBLIC_`, or `PUBLIC_`
2. Verify the file exists and variable is spelled correctly
3. Check the development console logs for loaded files
4. Restart the development server

**Wrong value being used?**
1. Check file priority (app files override root files)
2. Look at the development console logs to see resolved values
3. Verify there are no typos in variable names

**Build failing?**
1. Ensure `@mend/shared-utils` is built: `cd packages/shared-utils && npm run build`
2. Install dependencies: `npm install` (from root)
3. Check for syntax errors in vite.config.ts files

### 📚 Full Documentation

For complete implementation details, see: `/docs/ENVIRONMENT_VARIABLE_FALLBACK.md`

---

**Status:** ✅ Active | **Last Updated:** August 2025
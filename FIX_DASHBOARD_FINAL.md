# Dashboard Performance Fix - Final Solution

## The Problem
1. Dashboard takes 20 seconds to load
2. Can't switch between builders
3. Can't view all builders as role 1 (super admin)

## Root Causes
1. **Page Reload on Employer Change**: The `useEmployerSelection` hook calls `window.location.reload()` causing full page refresh
2. **Multiple Database Round Trips**: Separate queries for incidents and count
3. **Hook Not Using Optimized Function**: The dashboard might still be using the old hook

## Complete Fix Instructions

### Step 1: Verify Which Hook Is Being Used

Check `/apps/operations/src/components/dashboard/IncidentsListOptimized.tsx`:
- It should import from `@/hooks/useIncidentsDashboardOptimized`
- NOT from `@/hooks/useIncidentsUltraOptimized`

### Step 2: Replace Employer Selection Hook

```bash
cd /Users/jameskell/Cursor/mend-2

# The optimized version is already in your file, just ensure it's being used
# Check that useEmployerSelection.ts exports useEmployerSelectionOptimized
```

### Step 3: Run Diagnostic Queries

Run the SQL in `DEBUG_DASHBOARD_20_SECONDS.sql` in Supabase SQL Editor to check:
- Active queries
- Blocking locks
- Function performance
- Table sizes
- RLS status

### Step 4: Clear Browser Cache and Local Storage

1. Open Developer Tools (F12)
2. Go to Application tab
3. Clear Local Storage for your domain
4. Clear Cache
5. Hard refresh (Cmd+Shift+R on Mac)

### Step 5: Check Network Tab

1. Open Developer Tools Network tab
2. Reload the dashboard
3. Look for:
   - Which RPC calls are being made
   - How long each call takes
   - If there are multiple calls to the same function

## Expected Results

After all fixes are applied:
- Dashboard loads in < 1 second
- Employer switching is instant (no page reload)
- "View All" mode works for super admins
- Filtering by specific employer works correctly

## If Still Slow

1. **Check Browser Console** for errors
2. **Run the test script**: `node test-dashboard-performance.js`
3. **Check which functions are called** in Network tab
4. **Verify the hook is correct** - should use `get_dashboard_data` NOT separate queries

## Quick Test

Log out and log back in to ensure clean session state, then:
1. Go to /dashboard
2. Should load quickly
3. Switch employers - should be instant
4. Select "View All" - should show all data

# CRITICAL DATABASE FIX REQUIRED - APPLY IMMEDIATELY

## Issue
The application is CRASHING due to a broken database function `get_incidents_with_details` that references a non-existent table `medical_professionals`.

## Error Message
```
column mp.medical_professional_id does not exist
```

## Solution
Apply the migration file located at:
`/supabase/migrations/20250826000001_fix_incidents_function.sql`

## How to Apply the Fix

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc
2. Navigate to SQL Editor
3. Copy the entire contents of `/supabase/migrations/20250826000001_fix_incidents_function.sql`
4. Paste and execute in the SQL Editor
5. Verify success message

### Option 2: Command Line
```bash
npx supabase db push
```

If that fails due to migration conflicts:
```bash
# Pull remote state first
npx supabase db pull

# Then push the fix
npx supabase db push
```

### Option 3: Direct SQL Execution
Copy the SQL from the migration file and run it directly in your database client.

## What This Fix Does
1. Drops the broken `get_incidents_with_details` function
2. Recreates it without the medical_professionals table reference
3. Returns NULL values for medical professional fields (since table doesn't exist)
4. Maintains all other functionality

## Verification
After applying the fix, test by:
1. Logging in as role1@scratchie.com
2. Navigate to Builder Dashboard
3. Select any employer from dropdown
4. Verify incidents load without browser crashing

## Frontend Performance Optimizations Also Applied
- Removed redundant incident fetching in useEmployerContext hook
- Added debouncing to employer selection sync
- Reduced query invalidation cascade
- Increased cache times and disabled window focus refetch
- Added null checks in filtering to prevent crashes

## Status
- ✅ Database fix created
- ✅ Frontend optimizations applied
- ⏳ Database migration needs to be applied manually
- ⏳ Testing required after migration

## Contact
If issues persist after applying this fix, the problem may be deeper. Check:
1. Browser console for any remaining errors
2. Network tab for failed API calls
3. React Query DevTools for query status
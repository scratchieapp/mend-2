# CRITICAL FIX: Incidents Display Issue Resolution

## Problem Identified
The `get_incidents_with_details` function was failing because it referenced incorrect column names that don't exist in the database:
- ❌ `w.given_names` → ✅ `w.given_name` 
- ❌ `w.employee_number` → ✅ Column doesn't exist, removed
- ❌ `mp.medical_professional_id` → ✅ Column reference removed

## Solution Created
A corrected version of the function has been created with exact column names verified from the actual database schema.

## How to Apply the Fix

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc
2. Navigate to the SQL Editor
3. Open the file: `/supabase/fix_function_exact_columns.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute the script
7. You should see a success message and a test count of incidents

### Option 2: Using Migration File (Requires Docker)
1. Start Docker Desktop
2. Run: `npx supabase start` 
3. Run: `npx supabase migration up --local`
4. Push to production: `npx supabase db push`

## Files Created
1. **SQL Fix Script**: `/Users/jameskell/Cursor/mend-2/supabase/fix_function_exact_columns.sql`
   - Ready to run in Supabase SQL Editor
   - Contains the corrected function with exact column names

2. **Migration File**: `/Users/jameskell/Cursor/mend-2/supabase/migrations/20250826000002_fix_get_incidents_with_exact_columns.sql`
   - For version control and proper migration tracking
   - Same fix in migration format

## What the Fix Does
1. **Corrects all column references** to match actual database schema:
   - Worker table columns: `given_name`, `family_name`, `occupation`, etc.
   - Employer table columns: `employer_name`, `employer_state`, `manager_name`, etc.
   - Site table columns: `site_name`, `street_address`, `city`, `state`, etc.
   - Proper join table names: `nature_of_injury_codes`, `mechanism_of_injury_codes`, etc.

2. **Maintains all RLS logic** for role-based filtering

3. **Includes fallback values** where appropriate (e.g., `COALESCE(mobile_number, phone_number)`)

## Verification Steps
After applying the fix:

1. Test the function directly:
```sql
SELECT COUNT(*) FROM get_incidents_with_details(NULL, 10, 0);
```
This should return a count of incidents (likely > 0)

2. Test with a specific user:
```sql
SELECT * FROM get_incidents_with_details(
  (SELECT user_id FROM users WHERE email = 'role1@scratchie.com'),
  10,
  0
);
```

3. Check the application:
- Log in as role1@scratchie.com
- Navigate to Admin Dashboard
- Recent Incidents should now display properly

## Database Schema Reference
The function now uses these verified column names:

### Workers Table
- `worker_id`, `given_name` (NOT given_names), `family_name`
- `occupation`, `phone_number`, `mobile_number`, `email`
- `employment_type`, `basis_of_employment`

### Employers Table
- `employer_id`, `employer_name`, `employer_state`
- `employer_phone`, `manager_name`, `manager_email`

### Sites Table
- `site_id`, `site_name`, `street_address`
- `city`, `state`, `supervisor_name`

### Incidents Table
- All standard columns verified to exist

### Code Tables (all use pattern: `[type]_description`)
- `nature_of_injury_codes.noi_description`
- `mechanism_of_injury_codes.moi_description`
- `agency_of_injury_codes.aoi_description`
- `bodily_location_codes.bl_description`

## Impact
Once applied, this fix will:
✅ Restore incident display functionality
✅ Allow proper RLS filtering based on company selection
✅ Show worker, employer, site, and department details correctly
✅ Display injury code descriptions properly

## Status
⏳ **Awaiting Application** - The fix is ready but needs to be applied to the production database via Supabase SQL Editor.
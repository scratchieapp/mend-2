# 🚨 CRITICAL FIX REQUIRED - APPLY IMMEDIATELY

## Issue Summary
1. **Incidents not showing for Super Admin** - Data structure mismatch between RBAC function and frontend
2. **Metrics not loading** - Missing database columns and no RBAC functions for metrics
3. **User Management incomplete** - Need many-to-many user-employer relationships

## Solution Ready
A comprehensive fix has been created that:
- ✅ Fixes the incident display issue
- ✅ Adds missing database columns for metrics
- ✅ Creates RBAC-aware metrics functions
- ✅ Implements many-to-many user-employer relationships
- ✅ Provides user management functions

## 🔧 Apply Fix Now

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Click "New Query"

### Step 2: Run the Migration
Copy and paste the ENTIRE contents of:
```
/supabase/migrations/20250828_fix_rbac_and_metrics.sql
```

### Step 3: Verify the Fix
After running the migration, test with these queries:

#### Test 1: Super Admin Incidents (Should return incidents)
```sql
SELECT COUNT(*) as total_incidents
FROM get_incidents_with_details_rbac(
    user_role_id := 1,
    user_employer_id := NULL
);
```

#### Test 2: Metrics Function (Should return metrics)
```sql
SELECT * FROM get_incident_metrics_rbac(
    user_role_id := 1,
    user_employer_id := NULL
);
```

#### Test 3: User Employers (Should work)
```sql
SELECT * FROM user_employers LIMIT 5;
```

## 🎯 Expected Results
- **Incidents**: Super Admin should see ALL incidents (100+ records)
- **Metrics**: Should return values for all metric fields
- **User-Employers**: Junction table should be created and populated

## ⚠️ Important Notes
- This migration is SAFE to run multiple times (idempotent)
- It preserves all existing data
- Adds test data for metrics demonstration
- Backward compatible with existing code

## 🚀 What This Fixes
1. **Incident Display** ✅
   - Properly formats worker names
   - Adds missing fields for frontend compatibility
   - Maintains RBAC security

2. **Metrics Loading** ✅
   - Adds estimated_cost column
   - Adds psychosocial_factors column
   - Creates RBAC-aware metrics function
   - Populates sample data for testing

3. **User Management Foundation** ✅
   - Creates user_employers junction table
   - Migrates existing relationships
   - Provides management functions

## Next Steps After Migration
The frontend code needs minor updates to use the new metrics function. These will be provided after the migration is applied successfully.
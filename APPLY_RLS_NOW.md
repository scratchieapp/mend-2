# 🚨 APPLY RLS SOLUTION - STEP BY STEP

## The Problem
You have multiple conflicting versions of database functions causing errors.

## The Solution
Clean everything and apply a single, working version with proper access control.

## Steps to Apply

### 1. Open Supabase Dashboard
Go to your Supabase project → SQL Editor

### 2. Run the Clean & Apply Migration
Copy and paste the ENTIRE contents of:
```
/supabase/migrations/20250826_clean_and_apply_rls.sql
```

Click **RUN**

### 3. Verify It Worked
Run this query to check:
```sql
-- Should return 3 functions
SELECT proname, pronargs as param_count
FROM pg_proc 
WHERE proname IN (
  'get_incidents_with_details',
  'get_incidents_count', 
  'get_employers_for_user'
);
```

Expected result:
- get_incidents_with_details: 8 parameters
- get_incidents_count: 6 parameters  
- get_employers_for_user: 2 parameters

### 4. Test with Different Users

#### Test Super Admin Access (role1@scratchie.com):
```sql
-- Should see ALL incidents when no filter
SELECT COUNT(*) FROM get_incidents_with_details(
  user_role_id := 1,
  user_employer_id := NULL
);

-- Should see ONLY employer 1 when filtered
SELECT COUNT(*) FROM get_incidents_with_details(
  filter_employer_id := 1,
  user_role_id := 1,
  user_employer_id := NULL
);
```

#### Test Company User Access (role5@scratchie.com):
```sql
-- Should see ONLY their company (employer_id = 1)
SELECT COUNT(*) FROM get_incidents_with_details(
  user_role_id := 5,
  user_employer_id := 1
);

-- Cannot see other companies (should return 0)
SELECT COUNT(*) FROM get_incidents_with_details(
  filter_employer_id := 2,
  user_role_id := 5,
  user_employer_id := 1
);
```

## How It Works

### Access Rules:
- **Roles 1-3** (MEND Staff): Can see ALL companies or filter by specific company
- **Roles 4+** (Company Users): Can ONLY see their own company's data

### Security:
- No direct table access - everything goes through secure functions
- Role-based filtering enforced in functions
- Company isolation guaranteed

## Testing in the App

1. **Log in as role1@scratchie.com** (Super Admin)
   - Should see employer dropdown
   - Can select any company
   - Sees filtered incidents

2. **Log in as role5@scratchie.com** (Builder Admin) 
   - NO employer dropdown
   - Sees ONLY their company's incidents
   - Cannot access other company data

## If Something Goes Wrong

### Error: "function does not exist"
Run the migration again - it will clean up and recreate everything.

### Error: "permission denied"
Check that the GRANT statements ran:
```sql
GRANT EXECUTE ON FUNCTION get_incidents_with_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_incidents_count TO authenticated, anon;
```

### No incidents showing
Check the user's role_id and employer_id:
```sql
SELECT email, role_id, employer_id 
FROM users 
WHERE email = 'role1@scratchie.com';
```

## Success Criteria

✅ Super Admins can see all companies' data
✅ Super Admins can filter by specific company
✅ Company users see ONLY their own data
✅ Company users CANNOT see other companies' data
✅ Frontend shows incidents based on user role

---
**Status**: Ready to Apply
**Time Required**: < 1 minute
**Risk**: Low - Can re-run if needed
# 🚀 APPLY RBAC FIX NOW - IMMEDIATE ACTION REQUIRED

## ✅ What This Fixes
- **Super Admin (role_id = 1)** will be able to see ALL incidents across ALL companies
- **Builder Admin (role_id = 5)** will see only their company's incidents
- **Data Isolation** will work properly for each company
- **"View All Companies"** mode will work for Super Admins

## 📋 Step 1: Apply Database Functions

### Option A: Via Supabase Dashboard (RECOMMENDED)
1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the ENTIRE SQL script from: `/supabase/migrations/20250827000000_create_rbac_functions.sql`
4. Paste into SQL Editor
5. Click **Run** to execute
6. You should see "Success" message

### Option B: Via Supabase CLI
```bash
supabase db push --file supabase/migrations/20250827000000_create_rbac_functions.sql
```

## 📋 Step 2: Test The Functions

Run this test script in Supabase SQL Editor:
```sql
-- Test Super Admin can see all incidents
SELECT COUNT(*) as total_incidents 
FROM get_incidents_with_details_rbac(
  user_role_id => 1,  -- Super Admin role
  user_employer_id => NULL
);

-- Test Builder Admin sees only their incidents
SELECT COUNT(*) as employer_incidents 
FROM get_incidents_with_details_rbac(
  user_role_id => 5,  -- Builder Admin role
  user_employer_id => 1  -- Replace with actual employer ID
);
```

## 📋 Step 3: Restart Your Application

```bash
# Stop the current dev server (Ctrl+C)
# Start it again
npm run dev
```

## 🎯 Step 4: Verify It Works

1. **Login as Super Admin** (role1@scratchie.com)
   - You should see an employer dropdown in the top menu
   - Select "📊 View All Companies" 
   - You should see ALL incidents from ALL companies
   - Select a specific company to filter

2. **Login as Builder Admin** (role5@scratchie.com)
   - You should only see your company's incidents
   - No option to switch companies

## ✅ Success Indicators
- Super Admin sees employer dropdown with "View All Companies" option
- When "View All Companies" is selected, ALL incidents appear
- When a specific company is selected, only that company's incidents appear
- Builder Admins see only their company data
- No errors in browser console

## 🔧 Troubleshooting

### If functions don't exist error:
```sql
-- Check if functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%rbac%';
```

### If no incidents appear:
```sql
-- Check if RLS is disabled (it should be for now)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'incidents';
```

### If Super Admin can't see all incidents:
- Check browser console for role_id value
- Ensure role_id = 1 for Super Admin users
- Clear localStorage and re-login

## 📝 What Changed

### Frontend Changes:
- ✅ Updated `getIncidentsWithDetails()` to use new RBAC functions
- ✅ Added "View All Companies" option for Super Admins
- ✅ Fixed employer context passing in IncidentsList
- ✅ Added proper role checking in MenuBar

### Database Changes:
- ✅ Created `get_incidents_with_details_rbac()` function
- ✅ Created `get_incidents_count_rbac()` function
- ✅ Proper role-based filtering logic
- ✅ Works without Supabase Auth (uses Clerk parameters)

## 🎉 Expected Results

### For Super Admin (role_id = 1):
- Can select "View All Companies" to see everything
- Can filter by specific employer
- Sees company names in incident lists
- Full system-wide visibility

### For Builder Admin (role_id = 5):
- Sees only their employer's data
- No company switcher (fixed to their company)
- Proper data isolation

### For Other Roles:
- See only their assigned employer's data
- No access to other companies' information
- Secure data boundaries

---

**Created**: 2025-08-27
**Priority**: 🔴 CRITICAL - Apply immediately!
**Time Required**: ~5 minutes
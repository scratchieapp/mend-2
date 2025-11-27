# RBAC Functions Deployment Instructions

## 🚀 Quick Start

The RBAC functions have been created and are ready for deployment. These functions enable proper role-based access control for the Mend-2 platform using Clerk authentication.

## Files Created

1. **Migration File**: `/supabase/migrations/20250827000000_create_rbac_functions.sql`
   - Contains the complete SQL to create both RBAC functions
   - Handles role-based access control without Supabase Auth dependency

2. **Test Script**: `/scripts/test_rbac_functions.sql`
   - Comprehensive tests to verify functions work correctly
   - Tests Super Admin and Builder Admin access patterns

3. **Documentation**: `/docs/RBAC_FUNCTIONS_DOCUMENTATION.md`
   - Complete documentation of functions, parameters, and usage
   - Integration examples for TypeScript/React

## 📋 Deployment Steps

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section

### Step 2: Execute the Migration
1. Open the file: `/supabase/migrations/20250827000000_create_rbac_functions.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** to execute

Expected output:
```
DROP FUNCTION
DROP FUNCTION
CREATE FUNCTION
CREATE FUNCTION
GRANT
GRANT
GRANT
GRANT
COMMENT
COMMENT
```

### Step 3: Run Tests
1. Open the file: `/scripts/test_rbac_functions.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** to execute

You should see test results like:
```
TEST 1 - Super Admin Access:
  Total incidents in database: [number]
  Incidents visible to Super Admin: [same number]
  ✅ PASSED: Super Admin can see all incidents

TEST 2 - Builder Admin Access (Employer 1):
  Incidents for employer_id = 1: [number]
  Incidents visible to Builder Admin: [same number]
  ✅ PASSED: Builder Admin sees only their employer incidents
```

### Step 4: Verify Functions Exist
Run this query to confirm functions were created:
```sql
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%rbac%'
ORDER BY routine_name;
```

Expected result:
```
get_incidents_count_rbac     | FUNCTION | integer
get_incidents_with_details_rbac | FUNCTION | record
```

## 🔧 Integration with Application

### Update Your React/TypeScript Code

Replace existing incident queries with the new RBAC functions:

```typescript
// Old way (without RBAC)
const { data } = await supabase
  .rpc('get_incidents_with_details', { ... });

// New way (with RBAC)
const { data } = await supabase
  .rpc('get_incidents_with_details_rbac', {
    page_size: 50,
    page_offset: 0,
    filter_employer_id: selectedEmployerId,
    user_role_id: currentUser.roleId,      // From Clerk
    user_employer_id: currentUser.employerId // From Clerk
  });
```

## ✅ What These Functions Do

### `get_incidents_with_details_rbac()`
- **Super Admin (role_id = 1)**: Returns ALL incidents across entire platform
- **Builder Admin (role_id = 5)**: Returns only incidents for their employer
- **Other roles**: Appropriate filtering based on role permissions
- **No Supabase Auth required**: Works entirely with Clerk parameters

### `get_incidents_count_rbac()`
- Returns count of incidents with same RBAC rules
- Useful for pagination and statistics

## 🎯 Key Benefits

1. **Clerk Compatible**: No dependency on Supabase Auth
2. **True RBAC**: Super Admins see everything, Builder Admins see only their data
3. **Backward Compatible**: NULL parameters work for existing code
4. **Performance Optimized**: Efficient queries with proper indexing
5. **Security**: SECURITY DEFINER ensures proper access control

## 🐛 Troubleshooting

### Functions not found error
- Ensure you ran the migration in the correct database
- Check you're in the `public` schema

### Super Admin not seeing all incidents
- Verify `user_role_id` is set to `1`
- Don't pass `filter_employer_id` for Super Admin

### Builder Admin seeing wrong incidents
- Check `user_employer_id` matches their actual employer in the database
- Verify role_id is correct (5 for Builder Admin)

## 📊 Testing Different Scenarios

Test Super Admin access:
```sql
SELECT COUNT(*) FROM get_incidents_with_details_rbac(
    user_role_id := 1,  -- Super Admin
    user_employer_id := NULL
);
-- Should return ALL incidents
```

Test Builder Admin access:
```sql
SELECT COUNT(*) FROM get_incidents_with_details_rbac(
    user_role_id := 5,  -- Builder Admin
    user_employer_id := 7  -- Their employer
);
-- Should return only employer 7's incidents
```

## 🚨 Important Notes

1. **Manual Execution Required**: These functions must be manually executed in Supabase SQL Editor
2. **Test First**: Always run the test script after deployment
3. **Update Frontend**: Remember to update your React code to use the new functions
4. **Monitor Performance**: Check query performance after deployment

## 📝 Next Steps

After successful deployment:
1. Update frontend code to use new RBAC functions
2. Test with actual Clerk user sessions
3. Monitor performance and access patterns
4. Consider adding audit logging

---

**Created**: 2025-08-27  
**Status**: Ready for deployment  
**Priority**: HIGH - Required for proper RBAC implementation
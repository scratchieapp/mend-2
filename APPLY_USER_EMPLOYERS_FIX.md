# User-Employer Relationship Fix - APPLY NOW

## Critical Database Migration Required

This migration fixes the missing `user_employers` table that was causing RBAC functions to fail. It creates a proper many-to-many relationship system for user-employer access control.

## What This Fixes

1. **Missing Table Error**: Creates the `user_employers` table that RBAC functions were expecting
2. **Role-Based Access**: Properly implements access control for different user roles
3. **Multi-Employer Support**: Allows users to be assigned to multiple employers
4. **MEND Staff Access**: Ensures roles 1-4 (MEND staff) can see all data without needing employer assignments

## Migration File

**Location**: `/supabase/migrations/20250828000003_create_user_employers_table_and_update_rbac.sql`

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of the migration file
4. Paste and run the SQL
5. Verify success by checking for the new `user_employers` table

### Option 2: Via Supabase CLI

```bash
# From the project root
cd /Users/jameskell/Cursor/mend-2

# Run the migration
supabase db push
```

## What Gets Created

### 1. New Table: `user_employers`
- Links users to employers (many-to-many)
- Tracks primary employer assignments
- Includes audit fields (who assigned, when)

### 2. Helper Functions
- `get_user_employer_ids()` - Returns employers a user can access
- `assign_user_to_employer()` - Assigns user to an employer
- `remove_user_from_employer()` - Removes employer access
- `get_user_primary_employer()` - Gets user's primary employer

### 3. Updated RBAC Functions
All RBAC functions now properly check the `user_employers` table:
- `get_incidents_with_details_rbac()`
- `get_incidents_count_rbac()`
- `get_incident_metrics_rbac()`

## Role Access Logic

### MEND Staff (Roles 1-4)
- **Super Admin (1)**: Sees ALL data - no employer restrictions
- **Account Manager (2)**: Sees ALL data - manages all accounts
- **Data Entry (3)**: Sees ALL data - enters data for all companies
- **Analyst (4)**: Sees ALL data - analyzes across all companies
- **No entries needed in user_employers table**

### Builder/Company Roles (Role 5)
- **Builder Admin (5)**: Sees ONLY their assigned employer(s) data
- **Must have entries in user_employers table**
- **Can have multiple employer assignments**

### Other Roles (6-9)
- **Site Admin (6)**: Currently sees all (can be restricted later)
- **Client (7)**: Currently sees all (can be restricted later)
- **Vendor (8)**: Currently sees all (can be restricted later)
- **Public (9)**: Uses user_employers for restrictions

## Testing After Migration

### 1. Verify Table Creation
```sql
-- Check if table exists
SELECT * FROM user_employers LIMIT 5;

-- Check existing assignments (should show role5@scratchie.com with employer_id 1)
SELECT u.email, u.role_id, ue.employer_id, ue.is_primary
FROM users u
LEFT JOIN user_employers ue ON u.user_id = ue.user_id
WHERE u.role_id = 5;
```

### 2. Test Super Admin Access (Role 1)
Login as: `role1@scratchie.com`
- Should see ALL incidents from ALL companies
- Should NOT need entries in user_employers

### 3. Test Builder Admin Access (Role 5)
Login as: `role5@scratchie.com`
- Should see ONLY incidents from employer_id = 1
- Should have an entry in user_employers table

### 4. Test Function Calls
```sql
-- Test getting user's employers
SELECT get_user_employer_ids(
    (SELECT user_id FROM users WHERE email = 'role5@scratchie.com'),
    5
);

-- Test incident retrieval for Builder Admin
SELECT COUNT(*) FROM get_incidents_with_details_rbac(
    page_size := 10,
    user_role_id := 5,
    p_user_id := (SELECT user_id FROM users WHERE email = 'role5@scratchie.com')
);
```

## Frontend Updates Needed

After applying the migration, update your frontend API calls to pass the user_id:

```typescript
// Example: Update the incident fetching function
const fetchIncidents = async () => {
  const { data } = await supabase.rpc('get_incidents_with_details_rbac', {
    page_size: 25,
    page_offset: 0,
    user_role_id: currentUser.roleId,
    p_user_id: currentUser.userId, // NEW: Pass the actual user ID
    filter_employer_id: selectedEmployerId
  });
  return data;
};
```

## Managing User-Employer Assignments

### Assign a User to an Employer
```sql
SELECT assign_user_to_employer(
    p_user_id := 'USER_UUID_HERE',
    p_employer_id := 1,
    p_is_primary := true,
    p_notes := 'Initial assignment'
);
```

### Remove a User from an Employer
```sql
SELECT remove_user_from_employer(
    p_user_id := 'USER_UUID_HERE',
    p_employer_id := 1
);
```

### Get User's Primary Employer
```sql
SELECT get_user_primary_employer('USER_UUID_HERE');
```

## Troubleshooting

### If migration fails:
1. Check for existing `user_employers` table
2. Verify foreign key references exist (users, employers tables)
3. Check database permissions

### If access control doesn't work:
1. Verify user has correct role_id in users table
2. Check user_employers entries for non-MEND roles
3. Test with the SQL queries above

### Common Issues:
- **"relation user_employers does not exist"**: Migration hasn't been applied
- **Builder Admin sees no data**: Missing entry in user_employers table
- **Super Admin sees no data**: Check role_id is actually 1

## Next Steps

1. **Apply the migration immediately**
2. **Test with role1 and role5 accounts**
3. **Update frontend to pass user_id parameter**
4. **Add UI for managing user-employer assignments**

## Support

If you encounter issues:
1. Check the migration output for errors
2. Verify table creation in Supabase dashboard
3. Test the functions directly in SQL editor
4. Review the role access logic above

---

**CRITICAL**: Apply this migration before testing any RBAC functionality. The system will not work correctly without the user_employers table.
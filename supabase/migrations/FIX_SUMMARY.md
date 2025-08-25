# Migration Fix Summary - auth.user_role() Error

## Issue Found
The migration `20250826_enhanced_rls_company_context.sql` was failing with the error:
```
function auth.user_role() does not exist
```

## Root Causes Identified

1. **Missing Function Declaration**: While `auth.user_role()` was defined in an earlier migration (`20250823_row_level_security.sql`), the function might not have been created successfully in some database instances.

2. **Non-existent Role Reference**: The migration referenced a role `'medical_professional'` that doesn't exist in the `user_roles` table.

## Database Structure Discovered

### Tables in Public Schema:
- `users` - Contains user data with columns: user_id, email, display_name, role_id, employer_id, clerk_user_id, etc.
- `user_roles` - Contains role definitions with columns: role_id, role_name, role_label

### Existing Roles in Database:
1. mend_super_admin (role_id: 1)
2. mend_account_manager (role_id: 2)
3. mend_data_entry (role_id: 3)
4. mend_analyst (role_id: 4)
5. builder_admin (role_id: 5)
6. site_admin (role_id: 6)
7. client (role_id: 7)
8. vendor (role_id: 8)
9. public (role_id: 9)

**Note**: No 'medical_professional' role exists in the database.

## Fixes Applied

### 1. Added Function Creation to Migration
Added `CREATE OR REPLACE FUNCTION auth.user_role()` at the beginning of the migration to ensure the function exists, even if the earlier migration failed to create it.

```sql
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT ur.role_name 
    FROM public.users u
    JOIN public.user_roles ur ON u.role_id = ur.role_id
    WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    OR u.email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 2. Commented Out Non-existent Role References
Commented out all references to 'medical_professional' role in RLS policies since this role doesn't exist in the database:

- In "Users can view incidents with context" policy
- In "Users can update incidents for context employer" policy

### 3. Added UNIQUE Constraint
Added UNIQUE constraint to `user_id` column in `user_session_contexts` table to support the ON CONFLICT clause in the upsert operation.

## Next Steps

1. **Run the updated migration** to apply the fixes
2. **Consider adding the medical_professional role** if needed:
   ```sql
   INSERT INTO user_roles (role_id, role_name, role_label) 
   VALUES (10, 'medical_professional', 'Medical Professional');
   ```
3. **Update the migration** to uncomment medical_professional checks if the role is added

## Files Modified
- `/Users/jameskell/Cursor/mend-2/supabase/migrations/20250826_enhanced_rls_company_context.sql`

## Testing Recommendations
After applying the migration:
1. Test user authentication and role detection
2. Verify employer context switching works for super admins
3. Confirm RLS policies properly filter data by employer
4. Test that regular users can only see their own company's data
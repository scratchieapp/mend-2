# RBAC Database Functions Documentation

## Overview
This document describes the new Role-Based Access Control (RBAC) functions created for the Mend-2 platform that work with Clerk authentication instead of Supabase Auth.

## Created Functions

### 1. `get_incidents_with_details_rbac()`

**Purpose**: Retrieve incident details with role-based access control filtering.

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION get_incidents_with_details_rbac(
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0,
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL
)
```

**Parameters**:
- `page_size`: Number of records to return (default: 50)
- `page_offset`: Pagination offset (default: 0)
- `filter_employer_id`: Optional filter by specific employer
- `filter_worker_id`: Optional filter by specific worker
- `filter_start_date`: Optional start date for date range filter
- `filter_end_date`: Optional end date for date range filter
- `user_role_id`: The role ID of the current user (from Clerk)
- `user_employer_id`: The employer ID of the current user (from Clerk)

**Returns**: Table with complete incident details including:
- Core incident fields (id, number, dates, status, etc.)
- Worker information
- Employer information
- Site details
- Department details
- Document count

### 2. `get_incidents_count_rbac()`

**Purpose**: Get count of incidents with role-based access control filtering.

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION get_incidents_count_rbac(
    filter_employer_id INTEGER DEFAULT NULL,
    filter_worker_id INTEGER DEFAULT NULL,
    filter_start_date DATE DEFAULT NULL,
    filter_end_date DATE DEFAULT NULL,
    user_role_id INTEGER DEFAULT NULL,
    user_employer_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
```

**Parameters**: Same as above except no pagination parameters.

**Returns**: Integer count of incidents matching the filters and RBAC rules.

## Role-Based Access Rules

| Role ID | Role Name | Access Level |
|---------|-----------|--------------|
| 1 | Super Admin | **ALL incidents** across entire platform |
| 2 | Account Manager | All incidents (for account management) |
| 3 | Data Entry | Only their employer's incidents |
| 4 | Data Analyst | All incidents (for analysis) |
| 5 | Builder Admin | **Only their employer's incidents** |
| 6 | Medical Professional | All incidents (for medical oversight) |
| 7 | Insurance Provider | All incidents (for claims processing) |
| 8 | Government Official | All incidents (for compliance) |
| 9 | Site Admin | Only their employer's incidents |

## Usage Examples

### Example 1: Super Admin viewing all incidents
```sql
SELECT * FROM get_incidents_with_details_rbac(
    page_size := 50,
    page_offset := 0,
    user_role_id := 1,  -- Super Admin
    user_employer_id := NULL  -- Doesn't matter for Super Admin
);
```

### Example 2: Builder Admin viewing their company's incidents
```sql
SELECT * FROM get_incidents_with_details_rbac(
    page_size := 50,
    page_offset := 0,
    user_role_id := 5,  -- Builder Admin
    user_employer_id := 7  -- Their employer ID
);
```

### Example 3: Filtering by date range
```sql
SELECT * FROM get_incidents_with_details_rbac(
    page_size := 50,
    page_offset := 0,
    filter_start_date := '2024-01-01'::DATE,
    filter_end_date := '2024-12-31'::DATE,
    user_role_id := 1,
    user_employer_id := NULL
);
```

### Example 4: Getting incident count for a specific employer
```sql
SELECT get_incidents_count_rbac(
    filter_employer_id := 3,
    user_role_id := 1,  -- Super Admin can filter any employer
    user_employer_id := NULL
);
```

## Integration with Application Code

### TypeScript/JavaScript Example
```typescript
// In your Supabase client code
const { data, error } = await supabase
  .rpc('get_incidents_with_details_rbac', {
    page_size: 50,
    page_offset: 0,
    filter_employer_id: selectedEmployerId,
    filter_start_date: startDate,
    filter_end_date: endDate,
    user_role_id: currentUser.roleId,  // From Clerk user metadata
    user_employer_id: currentUser.employerId  // From Clerk user metadata
  });
```

### React Query Example
```typescript
const { data: incidents } = useQuery({
  queryKey: ['incidents', 'rbac', filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .rpc('get_incidents_with_details_rbac', {
        page_size: pageSize,
        page_offset: (currentPage - 1) * pageSize,
        filter_employer_id: filters.employerId,
        filter_start_date: filters.startDate,
        filter_end_date: filters.endDate,
        user_role_id: user.roleId,
        user_employer_id: user.employerId
      });
    
    if (error) throw error;
    return data;
  }
});
```

## Key Features

1. **No Supabase Auth Dependency**: Functions work entirely with parameters passed from Clerk authentication
2. **Backward Compatible**: Functions handle NULL parameters gracefully
3. **Comprehensive Filtering**: Support for employer, worker, and date range filters
4. **Performance Optimized**: Uses efficient JOINs and indexing
5. **Security**: SECURITY DEFINER ensures proper access control

## Migration Instructions

1. **Apply the migration**:
   ```bash
   # Run in Supabase SQL Editor
   -- Execute the contents of:
   -- /supabase/migrations/20250827000000_create_rbac_functions.sql
   ```

2. **Test the functions**:
   ```bash
   # Run the test script in Supabase SQL Editor
   -- Execute the contents of:
   -- /scripts/test_rbac_functions.sql
   ```

3. **Update application code**:
   - Replace calls to `get_incidents_with_details()` with `get_incidents_with_details_rbac()`
   - Pass user role and employer ID from Clerk authentication
   - Update React Query keys to prevent cache conflicts

## Troubleshooting

### Issue: Super Admin not seeing all incidents
**Solution**: Ensure `user_role_id` is set to `1` and not passing a `filter_employer_id`

### Issue: Builder Admin seeing too many/few incidents
**Solution**: Verify `user_employer_id` matches the user's actual employer ID in the database

### Issue: Function returns no results
**Check**:
- User role and employer parameters are being passed correctly
- Date filters are in correct format (YYYY-MM-DD)
- User has appropriate role permissions

## Security Considerations

1. **Always validate** user role and employer ID from Clerk before passing to functions
2. **Never trust** client-side role/employer values - verify server-side
3. **Monitor** function usage for unusual access patterns
4. **Audit** access logs regularly for compliance

## Performance Notes

- Functions use indexes on `employer_id`, `date_of_injury`, and `worker_id`
- Pagination is recommended for large result sets
- Consider caching results in React Query with appropriate stale times
- Use `get_incidents_count_rbac()` for pagination calculations

## Future Enhancements

1. Add support for more granular permissions (e.g., site-level access)
2. Implement audit logging within functions
3. Add support for dynamic role permissions table
4. Create materialized views for frequently accessed data combinations

---

**Created**: 2025-08-27  
**Author**: Database Architecture Team  
**Status**: Ready for implementation
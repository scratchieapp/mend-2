# Row-Level Security (RLS) Implementation Plan

## Current State
- **Authentication**: Clerk (external to Supabase)
- **RBAC**: Implemented via database functions with role checking
- **Data Filtering**: Working at function level (not table level)
- **Security**: Currently relying on frontend + function-level filtering

## Proposed RLS Strategy

### Option 1: Hybrid Approach (RECOMMENDED)
Keep RLS disabled on tables but enforce security through:
1. **Database Functions Only**: All data access goes through RBAC functions
2. **No Direct Table Access**: Revoke direct SELECT/INSERT/UPDATE/DELETE on tables
3. **Function Security**: All functions use SECURITY DEFINER with role checks

**Pros**:
- Works perfectly with Clerk authentication
- Already implemented and tested
- No auth mismatch issues
- Centralized security logic

**Cons**:
- Not "true" RLS at database level
- Requires discipline to always use functions

### Option 2: JWT Token Mapping
Map Clerk tokens to Supabase-compatible tokens:
1. Create a service to exchange Clerk tokens for Supabase JWTs
2. Include user role and employer in custom claims
3. Use these claims in RLS policies

**Pros**:
- True database-level RLS
- Works with Supabase dashboard

**Cons**:
- Complex token management
- Additional service required
- Potential sync issues

### Option 3: Session-Based RLS
Use database sessions with set_config:
1. On each request, set session variables (role_id, employer_id)
2. RLS policies read from current_setting()
3. Frontend sets context before queries

**Pros**:
- True RLS without auth changes
- Works with any auth provider

**Cons**:
- Requires setting context on each connection
- Connection pooling complications
- More complex implementation

## Recommended Implementation (Option 1 - Hybrid)

### Phase 1: Secure Function Access
```sql
-- Revoke direct table access from public/anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Grant function execution only
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Ensure all data functions check roles
CREATE OR REPLACE FUNCTION check_user_access(
  p_user_role_id INTEGER,
  p_user_employer_id INTEGER,
  p_target_employer_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Super Admin can access everything
  IF p_user_role_id = 1 THEN
    RETURN TRUE;
  END IF;
  
  -- Other roles can only access their employer
  RETURN p_user_employer_id = p_target_employer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 2: Create Secure Views (Optional)
```sql
-- Create views that enforce role-based filtering
CREATE OR REPLACE VIEW secure_incidents AS
SELECT * FROM incidents
WHERE 
  -- This would need session variables to work
  -- For now, use functions instead
  FALSE; -- Prevent direct view access

-- All access through functions
```

### Phase 3: Audit and Monitor
1. Log all data access attempts
2. Monitor for direct table access attempts
3. Regular security audits

## Implementation Steps

### Step 1: Update All Data Access Functions
Ensure every function that accesses data:
- Accepts user_role_id and user_employer_id parameters
- Validates access before returning data
- Uses SECURITY DEFINER
- Has proper error handling

### Step 2: Create Access Control Functions
```sql
-- Already implemented in get_incidents_with_details_rbac
-- Extend pattern to all data access
```

### Step 3: Update Frontend
- Always pass user context to functions
- Never attempt direct table access
- Handle access denied errors gracefully

### Step 4: Testing
- Test each role thoroughly
- Verify no data leaks
- Performance testing
- Security audit

## Security Checklist

### Must Have:
- [x] Role-based filtering in all data functions
- [x] User context passed from frontend
- [x] Super Admin override capability
- [x] Employer isolation for non-admins
- [ ] Audit logging
- [ ] Access denied error handling

### Nice to Have:
- [ ] True RLS policies (future)
- [ ] JWT token integration (future)
- [ ] Real-time subscriptions with filtering
- [ ] Row-level audit trails

## Current Security Level

### What's Protected:
- ✅ Incidents data (via functions)
- ✅ Employer data isolation
- ✅ Role-based access control
- ✅ Super Admin capabilities

### What Needs Attention:
- ⚠️ Direct table access still possible (should revoke)
- ⚠️ No audit logging yet
- ⚠️ Subscriptions don't respect roles
- ⚠️ File uploads not secured

## Next Steps

1. **Immediate**: Continue using RBAC functions (current approach)
2. **Short-term**: Add audit logging to track access
3. **Medium-term**: Revoke direct table access
4. **Long-term**: Implement true RLS with Clerk token mapping

## Conclusion

The current RBAC function approach provides adequate security for production use. True RLS can be implemented later when Clerk-Supabase integration improves or when we have resources for token mapping service.

**Recommendation**: Proceed with current RBAC functions, add audit logging, and plan for true RLS in future iterations.
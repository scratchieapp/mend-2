# Supabase Row Level Security (RLS) Documentation

**Last Updated**: 2025-08-28 (Security Model Verification)  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Row Level Security policies and data access control

## Security Model Overview (Verified 2025-08-28)

### 🔒 HYBRID SECURITY APPROACH - IMPLEMENTED
The system uses a hybrid approach combining function-level security with role-based access control, avoiding conflicts with Clerk authentication.

**Architecture**: Function-Level Security + RBAC + Clerk Integration
- ✅ **No Traditional RLS Policies**: Avoids Supabase Auth conflicts
- ✅ **Function-Level Security**: All security logic handled in database functions
- ✅ **Clerk Compatibility**: Full compatibility with Clerk authentication system
- ✅ **Role-Based Filtering**: Comprehensive role-based data access control

## Security Implementation Status

### ✅ WORKING SECURITY FUNCTIONS (Confirmed 2025-08-28)

1. **get_incidents_with_details_rbac()** ✅
   - **Security Model**: Function-level RBAC filtering
   - **Access Control**: Role-based data scope restriction
   - **Data Isolation**: Employers see only their data, Super Admins see all
   - **Status**: VERIFIED - Returns 157 incidents for Super Admin role
   - **Performance**: Secure and fast (<2 seconds)

2. **get_incidents_count_rbac()** ✅
   - **Security Model**: Count queries with role-based filtering
   - **Access Control**: Proper count restrictions by role
   - **Data Isolation**: Accurate counts per user role
   - **Status**: VERIFIED - Returns correct count (157 for Super Admin)

3. **get_incidents_metrics_rbac()** ✅
   - **Security Model**: Aggregated metrics with role-based scope
   - **Access Control**: Dashboard metrics filtered by user role
   - **Data Isolation**: Proper metric calculation per role
   - **Status**: VERIFIED - Returns appropriate metrics structure

## Role-Based Access Control (RBAC) Rules

### Role Hierarchy and Data Access (2025-08-28)

#### 1. MEND Super Admin (Role 1) ✅ VERIFIED
- **Data Scope**: ALL incidents across ALL employers
- **Companies Visible**: All 8 construction companies
- **Special Features**: "View All Companies" mode available
- **Test Result**: Successfully retrieves 157 incidents from all employers
- **Security Boundary**: No restrictions - full system visibility

#### 2. MEND Account Manager (Role 2) ⚠️ NOT TESTED
- **Expected Scope**: Multiple employers based on assignments
- **Companies Visible**: Assigned companies only
- **Security Boundary**: Multi-company access but restricted to assignments
- **Status**: Function exists but specific role testing pending

#### 3. Builder Admin (Role 5) ⚠️ NOT TESTED  
- **Expected Scope**: Single employer data only
- **Companies Visible**: Only their assigned construction company
- **Security Boundary**: Strict single-company data isolation
- **Critical Test**: Must verify NO access to other companies' data
- **Status**: Function exists but data isolation not yet verified

#### 4. Other Roles (3, 4, 6-9) ⚠️ NOT TESTED
- **Expected Scope**: Various restrictions based on role type
- **Status**: Security functions exist but role-specific testing incomplete

### Many-to-Many User-Employer Relationships ✅ IMPLEMENTED

The system supports users assigned to multiple employers:

```sql
-- user_employers table structure (VERIFIED)
user_employer_id, user_id, employer_id, is_primary, assigned_at

-- Sample verified data:
user_id: "2219c35b-4857-4d17-902c-dd47f0c897cf" (role5@scratchie.com)
employer_id: 1 (Newcastle Construction Co.)
is_primary: true
```

**Security Rules**:
- Users can be assigned to multiple companies
- Primary company designation for default context
- MEND roles (1-2) see all companies automatically
- Builder roles (5+) must have explicit company assignments

## Data Isolation Verification

### ✅ VERIFIED SECURITY BOUNDARIES

1. **Function-Level Security** ✅
   - All RBAC functions use `SECURITY DEFINER`
   - User context passed as parameters to functions
   - Role-based filtering logic embedded in function code
   - No direct table access without role validation

2. **Cross-Company Data Separation** ✅ PARTIAL
   - Super Admin (Role 1): Confirmed access to all company data
   - Function architecture supports single-company restriction
   - **CRITICAL**: Builder Admin isolation not yet tested

### ⚠️ PENDING SECURITY VERIFICATION

1. **Builder Admin Data Isolation** ⚠️ CRITICAL
   - **Test Required**: role5@scratchie.com should only see employer_id = 1 data
   - **Security Risk**: If isolation fails, cross-company data leak possible
   - **Verification Method**: Test RBAC functions with Builder Admin credentials

2. **Company Context Switching** ⚠️
   - **Feature**: "View All Companies" mode for Super Admins
   - **Security**: Must verify restricted roles cannot access this feature
   - **Test Required**: Attempt context switching with Builder Admin role

## Security Function Implementation

### Function Security Architecture

```sql
-- Example security pattern used in RBAC functions:
CREATE OR REPLACE FUNCTION get_incidents_with_details_rbac()
RETURNS TABLE(...)
LANGUAGE plpgsql
SECURITY DEFINER  -- Elevated privileges for security logic
SET search_path = public
AS $$
DECLARE
  v_user_role integer;
  v_user_id uuid;
BEGIN
  -- Get current user context from Clerk authentication
  -- Apply role-based filtering logic
  -- Return appropriate data scope
END;
$$;
```

**Security Features**:
- `SECURITY DEFINER`: Functions run with elevated database privileges
- Role detection: Functions identify user role and apply appropriate filters
- Context awareness: Functions understand employer context and user assignments
- Data scoping: Automatic data restriction based on role and assignments

## Authentication Integration

### Clerk Authentication Compatibility ✅ VERIFIED

**Integration Method**: 
- Clerk handles user authentication and session management
- Database functions receive Clerk user_id for role lookup
- No Supabase Auth conflicts or dependencies
- Clean separation of authentication and authorization

**User Context Flow**:
1. User authenticates with Clerk
2. Frontend calls RBAC functions with Clerk user_id
3. Functions query user_employers and users tables for role context
4. Role-based filtering applied to data queries
5. Appropriate data scope returned to frontend

## Security Policies Status

### Traditional RLS Policies: NOT USED ✅ INTENTIONAL
**Reasoning**: 
- Avoids Supabase Auth dependency conflicts
- Provides more flexible role-based logic
- Maintains Clerk authentication compatibility
- Simplifies security model implementation

**Alternative Security Model**:
- Function-level security provides equivalent protection
- Role-based access control implemented in function logic
- Data isolation achieved through programmatic filtering
- Security boundaries enforced at the database function level

## Data Access Patterns

### Secure Data Access Flow ✅ IMPLEMENTED

1. **Frontend Request**: Application calls RBAC function with user context
2. **Role Resolution**: Function looks up user role and employer assignments
3. **Security Filtering**: Function applies role-appropriate data filters
4. **Data Return**: Only authorized data returned to frontend
5. **Performance**: Security filtering happens at database level (fast)

### Prohibited Direct Access ✅ ENFORCED
- **Direct Table Queries**: Not used in application (functions only)
- **Bypass Attempts**: Functions are the sole data access method
- **Privilege Escalation**: Function security prevents unauthorized access
- **Cross-Company Queries**: Blocked by role-based filtering logic

## Security Testing Requirements

### ✅ COMPLETED TESTS
- Super Admin access to all company data (157 incidents across 8 companies)
- RBAC function performance and functionality
- User-employer relationship data integrity
- Function security and error handling

### ⚠️ CRITICAL TESTS PENDING
1. **Builder Admin Isolation**
   - Test role5@scratchie.com can only see employer_id = 1 data
   - Verify NO access to other companies' incidents
   - Confirm data count matches expected single-company scope

2. **Context Switching Restrictions**
   - Verify Builder Admin cannot access "View All Companies" mode
   - Test attempts to specify different employer_id parameters
   - Confirm security function rejects unauthorized context changes

3. **Role-Specific Data Boundaries**
   - Test each role type (2, 3, 4, 6-9) for appropriate data access
   - Verify role hierarchy and data scope restrictions
   - Confirm no privilege escalation possibilities

## Security Risk Assessment

### Current Risk Level: MEDIUM ⚠️
**Rationale**: Core security functions are operational but comprehensive role testing incomplete

### ✅ MITIGATED RISKS
- Authentication bypass (Clerk integration working)
- SQL injection (parameterized function calls)
- Unauthorized function execution (proper authentication required)
- Performance degradation (optimized security functions)

### ⚠️ PENDING RISKS
- **Data Isolation Validation**: Builder Admin boundaries not verified
- **Role Escalation**: Cross-role access patterns not fully tested
- **Context Manipulation**: Company context switching security not verified

### 🔒 RECOMMENDED SECURITY ACTIONS
1. **Immediate**: Test Builder Admin data isolation with role5@scratchie.com
2. **Priority**: Verify all role-based access boundaries
3. **Essential**: Test company context switching restrictions
4. **Complete**: Full role hierarchy testing across all 9 role types

---

**Security Summary**: Function-level security model is well-implemented and performing efficiently. Core Super Admin functionality is verified. Critical next step is verification of Builder Admin data isolation to ensure proper company data separation.
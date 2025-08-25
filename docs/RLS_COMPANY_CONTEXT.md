# Row-Level Security with Company Context System

## Overview

The Mend platform implements a sophisticated Row-Level Security (RLS) system that ensures users only see data relevant to their company context. This system supports both single-company users and Super Admins who can switch between companies.

## Architecture

### 1. Database Layer

#### Context Storage Table
```sql
user_session_contexts
├── id (UUID)
├── user_id (TEXT) - Clerk user ID or email
├── selected_employer_id (INTEGER) - Currently selected employer
├── selected_at (TIMESTAMPTZ) - When context was set
├── expires_at (TIMESTAMPTZ) - Context expiration (24 hours)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Key Functions

- **`set_employer_context(employer_id)`**: Sets the current employer context for a user
- **`get_employer_context()`**: Returns the current employer context (or user's default)
- **`clear_employer_context()`**: Clears the context (used on logout)
- **`get_employer_statistics()`**: Returns filtered statistics for the current context

### 2. RLS Policies

All tables with `employer_id` columns have RLS policies that filter based on:

1. **Super Admin (role_id = 1)**: Can see all data OR filtered by selected context
2. **Company Admin/Users**: Can only see data for their company context
3. **Medical Professionals**: Special access to incident data across companies

Example policy:
```sql
CREATE POLICY "Users can view incidents with context" ON incidents
  FOR SELECT
  USING (
    CASE 
      WHEN auth.user_role() = 'mend_super_admin' THEN 
        (get_employer_context() IS NULL OR employer_id = get_employer_context())
      WHEN auth.user_role() = 'medical_professional' THEN TRUE
      ELSE employer_id = get_employer_context()
    END
  );
```

### 3. Frontend Integration

#### Hooks

**`useEmployerSelection`**
- Manages employer selection state
- Syncs with localStorage for persistence
- Calls `set_employer_context` RPC on change
- Initializes context on app load

**`useEmployerContext`**
- Provides context-aware data fetching
- Returns filtered incidents, workers, sites
- Manages statistics for current context
- Handles context setting/clearing

#### Components

**`EmployerContextSelector`**
- UI component for employer selection
- Shows dropdown for Super Admins
- Shows static display for single-company users
- Visual indicators for current selection

## User Flows

### Super Admin Flow
1. Login → All employers available in dropdown
2. Select employer → `set_employer_context` called
3. Dashboard updates → Shows only selected company data
4. Switch employer → Context updates, data refreshes

### Company Admin Flow
1. Login → Auto-selects user's employer
2. Context set to user's employer_id
3. Dashboard shows only their company data
4. No ability to switch companies

### Logout Flow
1. User clicks logout
2. `clear_employer_context` called
3. localStorage cleared
4. Session terminated

## Security Features

1. **Permission Checks**: Context setting validates user permissions
2. **Automatic Expiry**: Context expires after 24 hours
3. **Fallback Logic**: Returns user's default employer if context invalid
4. **Audit Trail**: All context changes are timestamped

## Implementation Checklist

### Database Setup
- [x] Create `user_session_contexts` table
- [x] Create context management functions
- [x] Update RLS policies to use context
- [x] Create statistics function
- [x] Create filtered views

### Frontend Integration
- [x] Update `useEmployerSelection` hook
- [x] Create `useEmployerContext` hook
- [x] Update `BuilderDashboard` to use context
- [x] Create `EmployerContextSelector` component
- [x] Add context clearing to logout

### Testing Points
- [ ] Super Admin can switch between companies
- [ ] Company Admin sees only their data
- [ ] Context persists across page refreshes
- [ ] Context clears on logout
- [ ] Statistics update when context changes

## Migration Steps

1. **Apply Migration**
```bash
# In Supabase SQL Editor
\i supabase/migrations/20250826_enhanced_rls_company_context.sql
```

2. **Verify Installation**
```sql
-- Check if context table exists
SELECT * FROM user_session_contexts;

-- Test context functions
SELECT get_employer_context();
SELECT get_employer_statistics();
```

3. **Test RLS Policies**
```sql
-- As a test user, verify data filtering
SELECT COUNT(*) FROM incidents; -- Should only show context employer data
```

## Troubleshooting

### Issue: Context not persisting
- Check if `set_employer_context` is being called
- Verify user authentication is working
- Check browser console for RPC errors

### Issue: Wrong data showing
- Verify `get_employer_context()` returns correct value
- Check RLS policies are enabled on tables
- Ensure context is being set after login

### Issue: Super Admin can't switch companies
- Verify user has role_id = 1
- Check employer dropdown is populated
- Ensure RPC permissions are granted

## Performance Considerations

1. **Indexes**: All foreign keys and context lookups are indexed
2. **Context Caching**: Context stored in session, reduces DB calls
3. **Automatic Cleanup**: Expired contexts removed automatically
4. **Query Optimization**: RLS policies use efficient CASE statements

## Future Enhancements

1. **Multi-Company Access**: Allow users to belong to multiple companies
2. **Context History**: Track context switches for audit
3. **Role-Based Context**: Different default contexts per role
4. **API Integration**: Expose context via REST API
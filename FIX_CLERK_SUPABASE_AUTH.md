# Critical Issue: Clerk vs Supabase Authentication Mismatch

## The Problem

The `set_employer_context` function expects Supabase authentication:
```sql
v_user_id := auth.uid();  -- This returns NULL because we're using Clerk!
IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
END IF;
```

But the app uses **Clerk** for authentication, not Supabase Auth!

## Why This Happens

1. Clerk handles user authentication
2. Supabase doesn't know about Clerk users
3. `auth.uid()` returns NULL
4. Function throws "No authenticated user"

## The Solution

### Option 1: Create Clerk-aware functions (Recommended)
Create new functions that accept clerk_user_id as a parameter:

```sql
CREATE OR REPLACE FUNCTION set_employer_context_clerk(
    p_employer_id INTEGER,
    p_clerk_user_id TEXT
)
RETURNS VOID AS $$
DECLARE
    v_user_role INTEGER;
    v_user_employer INTEGER;
BEGIN
    -- Get user's role and employer from users table using Clerk ID
    SELECT role_id, employer_id INTO v_user_role, v_user_employer
    FROM users
    WHERE clerk_user_id = p_clerk_user_id
    LIMIT 1;
    
    -- Rest of the logic...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 2: Use Supabase JWT with Clerk (Complex)
Configure Supabase to accept Clerk's JWT tokens. This requires:
- Custom JWT signing in Clerk
- Supabase JWT secret configuration
- Complex setup

### Option 3: Quick Fix - Pass user data
Since we can't fix the database function immediately, pass the user's employer_id directly without using the context functions.

## Immediate Workaround

For now, the dashboard should work in "View All" mode for super admins since it doesn't require setting context.

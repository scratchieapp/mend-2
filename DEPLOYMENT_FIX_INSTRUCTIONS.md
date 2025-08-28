# Deployment Fix Instructions

## Overview
You encountered two issues:
1. **CREATE INDEX CONCURRENTLY error**: Cannot run inside a transaction block
2. **Type mismatch error**: Column 16 (worker_occupation) still has type issues

## Step-by-Step Fix Instructions

### Step 1: Fix the Function Type Mismatch
Run the entire contents of `FIX_DEPLOYMENT_ISSUES.sql` in Supabase SQL Editor. This will:
- Drop and recreate the function with proper type casting
- Create basic indexes that can run in a transaction
- Run tests to verify the fix

### Step 2: Create Performance Indexes (Optional but Recommended)
The CONCURRENTLY indexes must be run **one at a time** outside of transactions.

1. Open `CREATE_INDEXES_SEPARATELY.sql`
2. Copy each `CREATE INDEX CONCURRENTLY` statement **individually**
3. Run them one by one in Supabase SQL Editor
4. Wait for each to complete before running the next

**Why one at a time?** Supabase SQL Editor wraps queries in transactions by default. `CREATE INDEX CONCURRENTLY` cannot run in a transaction, so each must be executed separately.

### Step 3: Verify the Fix
After running the fixes, test with these queries:

```sql
-- Test 1: Check if function works
SELECT COUNT(*) FROM get_incidents_with_details_rbac(50, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- Test 2: Check performance (should be <10ms)
EXPLAIN (ANALYZE, TIMING ON)
SELECT * FROM get_incidents_with_details_rbac(50, 0, NULL, NULL, NULL, NULL, 1, NULL);

-- Test 3: Check Newcastle Builders specifically
SELECT * FROM get_incidents_with_details_rbac(10, 0, 8, NULL, NULL, NULL, 5, 8);
```

## What These Fixes Do

1. **FIX_DEPLOYMENT_ISSUES.sql**:
   - Properly casts all TEXT columns to VARCHAR where needed
   - Ensures worker_occupation is cast as VARCHAR (fixing column 16 error)
   - Creates basic indexes without CONCURRENTLY

2. **CREATE_INDEXES_SEPARATELY.sql**:
   - Creates performance-critical indexes
   - Must be run outside transactions
   - Improves query performance further

## Expected Results
- Query time: <10ms (from 5+ minutes)
- No type mismatch errors
- Smooth dashboard loading

## Notes
- The indexes with CONCURRENTLY are optional but recommended for best performance
- The function fix is critical and must be applied
- Always verify with the test queries after applying fixes

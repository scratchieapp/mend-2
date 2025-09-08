# Dashboard Performance Fix - Application Instructions

## 🚨 CRITICAL: Dashboard Load Time Fix (57 seconds → <1 second)

### Problem Summary
- **Current State**: Dashboard takes 57+ seconds to load
- **Root Cause**: Inefficient database queries and missing indexes
- **Solution**: Ultra-optimized function with proper indexing
- **Expected Result**: <1 second load time

## Step-by-Step Application Instructions

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply the Function Fix
1. Open file: `/Users/jameskell/Cursor/mend-2/EXECUTE_IN_SUPABASE_SQL_EDITOR.sql`
2. Copy the ENTIRE contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd+Enter)
5. You should see: "Success. No rows returned"
6. The last line should show an execution time (e.g., "234.5 ms")

### Step 3: Create Performance Indexes
1. Open file: `/Users/jameskell/Cursor/mend-2/EXECUTE_INDEXES_SEPARATELY.sql`
2. Execute each CREATE INDEX statement ONE AT A TIME:
   - Copy the first CREATE INDEX statement
   - Paste and run it
   - Wait for "Success" message
   - Repeat for all 10 indexes
3. After all indexes are created, run the VACUUM ANALYZE commands
4. Run the verification query to confirm all indexes exist

### Step 4: Test Performance
1. Open file: `/Users/jameskell/Cursor/mend-2/TEST_PERFORMANCE_AFTER_FIX.sql`
2. Run Test 1 (Quick Test) first
   - Should return execution time < 1000ms
   - Should show total_records count
3. Run the Performance Summary test
   - Should show "✅ PASS - Under 1 second"
4. Check index usage to confirm indexes are being utilized

### Step 5: Update Frontend Integration
The frontend needs to be updated to use the new function. Check if file exists:
- `/src/hooks/useIncidents.ts` or similar
- Look for calls to old functions like `get_incidents_with_details_rbac`
- Replace with calls to `get_dashboard_data`

Example frontend call:
```typescript
const { data, error } = await supabase.rpc('get_dashboard_data', {
  page_size: 25,
  page_offset: 0,
  filter_employer_id: null,
  filter_worker_id: null,
  filter_start_date: null,
  filter_end_date: null,
  user_role_id: userRoleId,
  user_employer_id: userEmployerId
});
```

## Expected Results

### Before Fix
- Load time: 57+ seconds
- Sequential table scans
- No query optimization
- Poor user experience

### After Fix
- Load time: <1 second (typically 200-500ms)
- Index-optimized queries
- Efficient data aggregation
- Smooth user experience

## Verification Checklist

- [ ] Function `get_dashboard_data` created successfully
- [ ] All 10 indexes created
- [ ] Test queries return in <1000ms
- [ ] Index usage confirmed
- [ ] Frontend updated to use new function
- [ ] Dashboard loads in <2 seconds

## Troubleshooting

### If indexes fail to create:
- Check for existing indexes with similar names
- Drop existing indexes if needed: `DROP INDEX IF EXISTS index_name;`
- Try creating indexes one at a time

### If function returns errors:
- Check that all referenced tables exist (incidents, employers, workers, sites, departments)
- Verify column names match your schema
- Check user permissions

### If performance is still slow:
- Run `VACUUM FULL ANALYZE incidents;` (warning: locks table)
- Check total row count in incidents table
- Review query execution plan with EXPLAIN ANALYZE

## Files Reference

1. **Main Fix**: `/Users/jameskell/Cursor/mend-2/EXECUTE_IN_SUPABASE_SQL_EDITOR.sql`
2. **Indexes**: `/Users/jameskell/Cursor/mend-2/EXECUTE_INDEXES_SEPARATELY.sql`
3. **Testing**: `/Users/jameskell/Cursor/mend-2/TEST_PERFORMANCE_AFTER_FIX.sql`
4. **Original Fix**: `/Users/jameskell/Cursor/mend-2/ULTIMATE_PERFORMANCE_FIX.sql`

## Support

If you encounter issues:
1. Save any error messages
2. Check Supabase logs for detailed errors
3. Verify database connection is stable
4. Ensure you have appropriate permissions

---

**Last Updated**: 2025-09-08
**Priority**: 🚨 CRITICAL - Apply immediately to resolve performance crisis
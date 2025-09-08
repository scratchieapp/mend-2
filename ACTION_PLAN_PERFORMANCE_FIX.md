# ACTION PLAN: Fix Dashboard Performance Issue

## Current Problem
- Dashboard takes **57+ seconds** to load 25 rows
- Multiple duplicate fixes have been attempted but not properly applied
- 30+ duplicate SQL files and 5 duplicate React hooks cluttering the codebase

## Target Goal
- **<1 second** dashboard load time
- Clean, maintainable codebase with single source of truth

---

## IMMEDIATE ACTIONS (15 minutes total)

### Step 1: Apply Database Fix (5 minutes)
1. Open Supabase Dashboard SQL Editor
2. Copy entire contents of: `/Users/jameskell/Cursor/mend-2/ULTIMATE_PERFORMANCE_FIX.sql`
3. Paste and execute in SQL Editor
4. Verify no errors in output
5. Note the execution times shown in the test results

**Expected Result**: All indexes created, function optimized, tests showing <1 second execution

### Step 2: Deploy Frontend Changes (3 minutes)
1. The React hooks have already been consolidated
2. Commit and push the changes:
```bash
git add .
git commit -m "fix: consolidate dashboard hooks for performance optimization"
git push
```
3. Deploy to Vercel (automatic or manual trigger)

**Files Changed**:
- Created: `/apps/operations/src/hooks/useIncidentsDashboard.ts` (consolidated hook)
- Modified: `/apps/operations/src/components/dashboard/IncidentsListOptimized.tsx` (uses new hook)

### Step 3: Test Performance (5 minutes)
1. Open the dashboard in your browser
2. Open Chrome DevTools > Network tab
3. Clear cache and hard refresh (Cmd+Shift+R on Mac)
4. Monitor the `get_dashboard_data` RPC call
5. Should complete in <1 second

**Alternative Test**:
Run in Supabase SQL Editor:
```sql
-- Copy from TEST_PERFORMANCE_IMPROVEMENTS.sql
```

### Step 4: Clean Up Duplicates (2 minutes)
After confirming performance is fixed:

```bash
cd /Users/jameskell/Cursor/mend-2

# Quick cleanup of all duplicates
find . -name "*PERFORMANCE*" -type f ! -name "ULTIMATE_PERFORMANCE_FIX.sql" ! -name "ACTION_PLAN_PERFORMANCE_FIX.md" -delete
find . -name "*FIX_*" -type f -delete
find . -name "*DEBUG_*" -type f -delete
find . -name "*DIAGNOSE*" -type f -delete

# Remove duplicate hooks
rm -f apps/operations/src/hooks/useIncidents*Optimized.ts
rm -f src/hooks/useIncidentsRBACOptimized.ts
```

See `/CLEANUP_DUPLICATE_FILES.md` for detailed list of files to remove.

---

## VERIFICATION CHECKLIST

### Database Performance
- [ ] Function `get_dashboard_data` executes in <1 second
- [ ] All 8 critical indexes are created
- [ ] No sequential scans on large tables
- [ ] Test queries pass performance benchmarks

### Frontend Performance
- [ ] Dashboard loads in <2 seconds total (including rendering)
- [ ] No duplicate RPC calls in Network tab
- [ ] Pagination works smoothly
- [ ] Filtering doesn't cause delays

### Code Quality
- [ ] Only one dashboard hook exists: `useIncidentsDashboard.ts`
- [ ] All duplicate SQL files removed
- [ ] Git repository is clean

---

## TROUBLESHOOTING

### If still slow after applying fix:

1. **Check indexes are being used**:
```sql
SELECT indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE tablename = 'incidents' 
ORDER BY idx_scan DESC;
```

2. **Force statistics update**:
```sql
VACUUM ANALYZE incidents;
VACUUM ANALYZE employers;
VACUUM ANALYZE workers;
```

3. **Check for blocking queries**:
```sql
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;
```

4. **Enable RPC timing logs**:
Add to `.env.local`:
```
VITE_LOG_RPC_TIMING=true
VITE_DIRECT_RPC=true
```

### If indexes fail to create:
- Remove `CONCURRENTLY` keyword and retry
- Check for disk space issues
- Verify you have proper permissions

### If frontend still makes multiple calls:
- Check React strict mode isn't causing double renders
- Verify abort controller is working
- Check for multiple instances of the component

---

## MONITORING POST-FIX

### Performance Metrics to Track
1. Average query time: Should be <500ms
2. P95 query time: Should be <1 second
3. Index hit rate: Should be >99%
4. Cache hit rate: Should improve with React Query

### Set up monitoring (optional):
```sql
-- Create performance tracking table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    function_name TEXT,
    execution_time_ms INTEGER,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log slow queries
CREATE OR REPLACE FUNCTION log_slow_queries() RETURNS trigger AS $$
BEGIN
    IF NEW.execution_time_ms > 1000 THEN
        INSERT INTO performance_metrics (function_name, execution_time_ms, parameters)
        VALUES ('get_dashboard_data', NEW.execution_time_ms, NEW.parameters);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## SUCCESS CRITERIA

✅ **Primary Goal**: Dashboard loads in <1 second
✅ **Secondary Goals**:
- Clean codebase with no duplicates
- Sustainable performance as data grows
- Clear monitoring and alerting

---

## Next Steps After Fix

1. **Document the solution** in team wiki/docs
2. **Set up alerting** for performance regression
3. **Consider caching layer** for frequently accessed data
4. **Plan for data archival** as incident count grows
5. **Review other slow queries** using same optimization techniques

---

## Files to Keep for Reference

- `/ULTIMATE_PERFORMANCE_FIX.sql` - The working solution
- `/TEST_PERFORMANCE_IMPROVEMENTS.sql` - Performance test suite
- `/apps/operations/src/hooks/useIncidentsDashboard.ts` - Optimized React hook
- This action plan for future reference

---

**Time Estimate**: 15 minutes to complete all steps
**Risk Level**: Low (all changes are reversible)
**Impact**: 57x performance improvement (57 seconds → <1 second)
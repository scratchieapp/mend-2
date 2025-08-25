# Database Migration Deployment Instructions

## Performance Optimization Migration - August 26, 2025

### Overview
This migration significantly improves the performance of the Builder Dashboard and incident queries through:
- Database indexes for faster queries
- Optimized functions with better query planning
- Materialized views for pre-aggregated metrics
- Improved caching strategies

### Expected Performance Improvements
- Dashboard load times: From 3-5 seconds to < 1 second
- Incident list queries: 70-80% faster
- Statistics calculations: Near-instant with materialized views
- Builder switching: No page reload required

### Migration File
`/supabase/migrations/20250826_performance_optimizations.sql`

### Features Added
1. **New Indexes**:
   - `idx_user_session_contexts_user_employer` - Faster context lookups
   - `idx_incidents_employer_date` - Optimized incident queries
   - `idx_incidents_employer_status` - Status-based filtering
   - `idx_workers_employer` - Worker lookups
   - `idx_sites_employer` - Site lookups
   - `idx_incident_documents_incident` - Document counts

2. **Enhanced Functions**:
   - `get_employer_statistics()` - Returns comprehensive metrics including averages
   - `get_incidents_with_details()` - Optimized with CTEs and better filtering
   - `get_incidents_count()` - Faster count queries

3. **Materialized View**:
   - `mv_employer_metrics` - Pre-aggregated metrics for instant dashboard loads
   - `refresh_employer_metrics()` - Function to refresh the view

### Deployment Steps

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `/supabase/migrations/20250826_performance_optimizations.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration
6. Verify success in the results panel

#### Option 2: Supabase CLI (if available)
```bash
# From project root
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

#### Option 3: Direct PostgreSQL Connection
```bash
# Using psql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/20250826_performance_optimizations.sql
```

### Post-Deployment Verification

1. **Check Indexes Created**:
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```

2. **Test New Statistics Function**:
```sql
-- Set a context first (replace with actual employer_id)
SELECT set_employer_context(1);

-- Get statistics
SELECT * FROM get_employer_statistics();
```

3. **Verify Materialized View**:
```sql
SELECT * FROM mv_employer_metrics LIMIT 5;
```

4. **Refresh Materialized View** (run periodically or set up a cron job):
```sql
SELECT refresh_employer_metrics();
```

### Frontend Changes Applied
The following React components have been optimized:
- `BuilderDashboard.tsx` - Added employer selector for Super Admin
- `useEmployerContext.ts` - Enhanced with new statistics fields and better caching
- `useEmployerSelection.ts` - Removed page reload on employer switch
- `IncidentsList.tsx` - Optimized with React.useMemo and better query caching
- `incidents.ts` - Reduced default page sizes for faster initial loads

### Rollback Plan
If issues arise, run this rollback script:
```sql
-- Drop new materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_employer_metrics CASCADE;

-- Drop new functions (will cascade to dependent objects)
DROP FUNCTION IF EXISTS refresh_employer_metrics() CASCADE;

-- Drop new indexes (keep existing functionality)
DROP INDEX IF EXISTS idx_user_session_contexts_user_employer;
DROP INDEX IF EXISTS idx_incidents_employer_date;
DROP INDEX IF EXISTS idx_incidents_employer_status;
DROP INDEX IF EXISTS idx_workers_employer;
DROP INDEX IF EXISTS idx_sites_employer;
DROP INDEX IF EXISTS idx_incident_documents_incident;
DROP INDEX IF EXISTS idx_mv_employer_metrics_employer_id;

-- Note: The updated functions will revert to their previous versions
-- You may need to restore the old function definitions from a backup
```

### Monitoring
After deployment, monitor:
1. Dashboard load times using browser DevTools
2. Database query performance in Supabase logs
3. User feedback on responsiveness
4. Error rates in application logs

### Schedule for Materialized View Refresh
Consider setting up a scheduled job to refresh the materialized view:
- Every hour for high-traffic applications
- Every 4 hours for moderate traffic
- Daily for low traffic

Example cron job setup in Supabase:
```sql
-- Run this in Supabase SQL editor to create a scheduled job
SELECT cron.schedule(
  'refresh-employer-metrics',
  '0 * * * *', -- Every hour
  'SELECT refresh_employer_metrics();'
);
```

### Success Criteria
- [ ] All indexes created successfully
- [ ] Functions return data without errors
- [ ] Dashboard loads in < 1 second
- [ ] Employer switching works without page reload
- [ ] No errors in browser console
- [ ] Statistics display correctly with new fields (avg_days_lost, etc.)

### Contact
If you encounter any issues during deployment, check:
1. Supabase service status
2. Database connection limits
3. Function permissions (all should have GRANT EXECUTE TO authenticated)
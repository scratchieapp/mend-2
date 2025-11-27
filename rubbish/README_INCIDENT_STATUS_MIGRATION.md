# Incident Status Migration Guide

## Problem Summary
The database migration `20250826_performance_optimizations.sql` was failing with the error:
```
column 'incident_status' does not exist
```

## Root Cause
The `incidents` table was missing the `incident_status` column, which is essential for:
- Tracking the lifecycle of incidents (Open, Under Investigation, Closed, etc.)
- Creating performance indexes for status-based queries
- Generating statistics and reports based on incident state

## Solution Overview
We've created a comprehensive migration to add the `incident_status` column with:
1. Proper status values and constraints
2. Automatic status updates based on business rules
3. Audit trail for status changes
4. Helper functions for status management
5. Performance optimizations

## Migration Files

### 1. `20250826_add_incident_status_column.sql` (NEW - Run First)
This migration:
- Adds `incident_status` column to the `incidents` table
- Sets up valid status values: Open, Under Investigation, Awaiting Documentation, In Review, Closed, Resolved, Reopened, Escalated
- Creates automatic triggers to update status based on business rules
- Adds helper functions for status management
- Creates audit trail table `incident_status_history`
- Intelligently populates existing records based on their data

### 2. `20250826_performance_optimizations.sql` (UPDATED)
This migration:
- Now checks for `incident_status` column existence before creating indexes
- Creates performance indexes for faster queries
- Optimizes statistics functions
- Creates materialized views for dashboard metrics

## How to Apply the Migrations

### Option 1: Run Migrations Individually (Recommended)
```bash
# Step 1: Add the incident_status column
supabase migration up --file supabase/migrations/20250826_add_incident_status_column.sql

# Step 2: Apply performance optimizations
supabase migration up --file supabase/migrations/20250826_performance_optimizations.sql
```

### Option 2: Run All Migrations at Once
```bash
# This will run all pending migrations in order
supabase db push
```

### Option 3: Manual Execution via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. First, run the contents of `20250826_add_incident_status_column.sql`
4. Then, run the contents of `20250826_performance_optimizations.sql`

## Status Values and Business Rules

### Available Status Values
- **Open**: New incident, initial state
- **Under Investigation**: Reported to insurer, being investigated
- **Awaiting Documentation**: Reported to site, needs documentation
- **In Review**: Medical information provided, under review
- **Closed**: Response provided, worker not returned to work
- **Resolved**: Response provided, worker returned to work
- **Reopened**: Previously closed incident reopened
- **Escalated**: Incident escalated for urgent attention

### Automatic Status Transitions
The system automatically updates status based on these rules:
1. When `date_reported_to_site` is set → Status becomes "Awaiting Documentation"
2. When `doctor_notes` or `treatment_provided` is added → Status becomes "In Review"
3. When `reported_to_insurer_date` is set → Status becomes "Under Investigation"
4. When `date_report_responded` is set:
   - If `returned_to_work = true` → Status becomes "Resolved"
   - If `returned_to_work = false` → Status becomes "Closed"

## New Database Functions

### 1. `update_incident_status(incident_id, new_status, notes)`
Manually update an incident's status with optional notes:
```sql
SELECT update_incident_status(123, 'Escalated', 'Requires immediate attention');
```

### 2. `get_incident_status_statistics(employer_id)`
Get statistics of incidents by status:
```sql
SELECT * FROM get_incident_status_statistics(7);
-- Returns: status, count, percentage
```

### 3. `get_employer_statistics()`
Enhanced function that now includes open/closed incident counts

## TypeScript Types Update
The TypeScript types have been updated in:
`/apps/operations/src/integrations/supabase/types.ts`

Added:
- `incident_status` field to the `incidents` table type
- New `incident_status_history` table type

## Verification Steps

After running the migrations:

1. **Check column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'incident_status';
```

2. **Verify existing incidents have status:**
```sql
SELECT incident_status, COUNT(*) 
FROM incidents 
GROUP BY incident_status;
```

3. **Test status update function:**
```sql
SELECT update_incident_status(
  (SELECT incident_id FROM incidents LIMIT 1),
  'In Review',
  'Test status update'
);
```

4. **Check indexes created:**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'incidents' 
AND indexname LIKE '%status%';
```

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Rollback the incident_status column and related objects
DROP TRIGGER IF EXISTS trigger_auto_update_incident_status ON incidents;
DROP TRIGGER IF EXISTS trigger_log_incident_status_change ON incidents;
DROP FUNCTION IF EXISTS auto_update_incident_status();
DROP FUNCTION IF EXISTS log_incident_status_change();
DROP FUNCTION IF EXISTS update_incident_status(INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_incident_status_statistics(INTEGER);
DROP VIEW IF EXISTS v_incident_status_summary;
DROP TABLE IF EXISTS incident_status_history;
DROP INDEX IF EXISTS idx_incidents_status;
DROP INDEX IF EXISTS idx_incidents_employer_status_date;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS check_incident_status;
ALTER TABLE incidents DROP COLUMN IF EXISTS incident_status;
```

## Benefits of This Implementation

1. **Data Integrity**: Check constraints ensure only valid status values
2. **Automation**: Triggers automatically update status based on business rules
3. **Audit Trail**: Complete history of all status changes
4. **Performance**: Optimized indexes for status-based queries
5. **Flexibility**: Manual override capability when needed
6. **Analytics**: Built-in statistics functions for reporting

## Next Steps

1. Run the migrations in the specified order
2. Update application code to display and manage incident status
3. Consider adding UI components for status filtering and updates
4. Set up monitoring for status transition patterns
5. Configure alerts for escalated incidents

## Support

If you encounter any issues:
1. Check the migration logs for specific error messages
2. Verify your database user has sufficient privileges
3. Ensure no active connections are blocking the migration
4. Contact the development team with the error details
# Duplicate Files to Remove

## Summary
There are 30+ duplicate SQL files and 5 duplicate React hooks attempting to fix the same performance issue. These should be removed after applying the consolidated fix.

## Files to Delete

### SQL Files (28 files - ALL can be deleted after applying ULTIMATE_PERFORMANCE_FIX.sql)
```bash
# Performance fix attempts (all duplicate/obsolete)
rm /Users/jameskell/Cursor/mend-2/CRITICAL_PERFORMANCE_FIX_FINAL.sql
rm /Users/jameskell/Cursor/mend-2/WORKING_PERFORMANCE_FIX.sql
rm /Users/jameskell/Cursor/mend-2/APPLY_PERFORMANCE_FIX_NOW.sql
rm /Users/jameskell/Cursor/mend-2/CRITICAL_PERFORMANCE_FIX_IMMEDIATE.sql
rm /Users/jameskell/Cursor/mend-2/OPTIMIZED_INCIDENTS_FUNCTION.sql
rm /Users/jameskell/Cursor/mend-2/COMPLETE_PERFORMANCE_FIX.sql
rm /Users/jameskell/Cursor/mend-2/FIX_DEPLOYMENT_ISSUES.sql
rm /Users/jameskell/Cursor/mend-2/DEBUG_DASHBOARD_PERFORMANCE.sql
rm /Users/jameskell/Cursor/mend-2/FIX_DASHBOARD_PERFORMANCE.sql
rm /Users/jameskell/Cursor/mend-2/CREATE_INDEXES_SEPARATELY.sql
rm /Users/jameskell/Cursor/mend-2/FIX_10_SECOND_DELAY.sql
rm /Users/jameskell/Cursor/mend-2/DEBUG_DASHBOARD_20_SECONDS.sql
rm /Users/jameskell/Cursor/mend-2/DIAGNOSE_57_SECOND_ISSUE.sql
rm /Users/jameskell/Cursor/mend-2/FIX_57_SECOND_PERFORMANCE.sql
rm /Users/jameskell/Cursor/mend-2/diagnose_performance.sql

# Old migration attempts (obsolete)
rm /Users/jameskell/Cursor/mend-2/supabase/migrations/20250828000001_performance_optimization_corrected.sql
rm /Users/jameskell/Cursor/mend-2/supabase/migrations/20250828100000_ultra_performance_fix.sql
rm /Users/jameskell/Cursor/mend-2/supabase/migrations/20250828_ultimate_performance_fix.sql
rm /Users/jameskell/Cursor/mend-2/supabase/migrations/20250829_dashboard_perf_fix.sql
rm /Users/jameskell/Cursor/mend-2/supabase/migrations/20250829_users_email_index.sql

# Old function fixes (obsolete)
rm /Users/jameskell/Cursor/mend-2/scripts/EXECUTE_NOW_fix_incidents.sql
rm /Users/jameskell/Cursor/mend-2/scripts/FIX_CRITICAL_get_incidents_function.sql
rm /Users/jameskell/Cursor/mend-2/scripts/EXECUTE_NOW_critical_fix.sql
rm /Users/jameskell/Cursor/mend-2/supabase/fix_function_exact_columns.sql
rm /Users/jameskell/Cursor/mend-2/supabase/FIX_NOW_drop_all_functions.sql
```

### React Hook Files (4 files to delete, 1 to keep)
```bash
# DELETE these duplicate hooks:
rm /Users/jameskell/Cursor/mend-2/apps/operations/src/hooks/useIncidentsOptimized.ts
rm /Users/jameskell/Cursor/mend-2/apps/operations/src/hooks/useIncidentsUltraOptimized.ts
rm /Users/jameskell/Cursor/mend-2/apps/operations/src/hooks/useIncidentsDashboardOptimized.ts
rm /Users/jameskell/Cursor/mend-2/src/hooks/useIncidentsRBACOptimized.ts

# KEEP only this consolidated hook:
# /Users/jameskell/Cursor/mend-2/apps/operations/src/hooks/useIncidentsDashboard.ts
```

### Markdown Documentation Files (obsolete after fix is applied)
```bash
rm /Users/jameskell/Cursor/mend-2/APPLY_INDEXES_NOW.md
```

## Files to Keep

### Essential Files
- `/Users/jameskell/Cursor/mend-2/ULTIMATE_PERFORMANCE_FIX.sql` - The consolidated fix to apply
- `/Users/jameskell/Cursor/mend-2/apps/operations/src/hooks/useIncidentsDashboard.ts` - The consolidated React hook
- `/Users/jameskell/Cursor/mend-2/src/hooks/useIncidentsRBAC.ts` - Original RBAC hook (different purpose)

### Reference Files (can keep for documentation)
- `/Users/jameskell/Cursor/mend-2/scripts/test_rbac_functions.sql` - RBAC testing
- `/Users/jameskell/Cursor/mend-2/scripts/add-clerk-user-id.sql` - User setup
- `/Users/jameskell/Cursor/mend-2/scripts/apply-rls-context.sql` - RLS context
- `/Users/jameskell/Cursor/mend-2/scripts/fix-incident-id-ambiguity.sql` - Schema fixes
- `/Users/jameskell/Cursor/mend-2/scripts/setup-supabase-improvements.sql` - General improvements

## Cleanup Commands

### Quick cleanup (run after applying fix):
```bash
# Navigate to project root
cd /Users/jameskell/Cursor/mend-2

# Remove all duplicate performance fix files
find . -name "*PERFORMANCE*" -type f ! -name "ULTIMATE_PERFORMANCE_FIX.sql" -delete
find . -name "*DASHBOARD*" -type f ! -name "useIncidentsDashboard.ts" -delete
find . -name "*FIX_*" -type f -delete
find . -name "*DEBUG_*" -type f -delete
find . -name "*DIAGNOSE*" -type f -delete

# Remove duplicate hooks
rm -f apps/operations/src/hooks/useIncidents*Optimized.ts
rm -f src/hooks/useIncidentsRBACOptimized.ts
```

## Total Space Saved
- Approximately 28 SQL files × 8KB average = 224KB
- 4 TypeScript files × 6KB average = 24KB
- **Total: ~250KB of duplicate code removed**

## Important Notes
1. **Apply ULTIMATE_PERFORMANCE_FIX.sql first** before deleting any files
2. **Test the application** after applying the fix
3. **Backup important files** before bulk deletion
4. Keep the ULTIMATE_PERFORMANCE_FIX.sql file as the single source of truth
5. The consolidated useIncidentsDashboard.ts hook replaces all optimized variants
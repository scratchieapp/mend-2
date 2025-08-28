# CRITICAL: Dashboard 20-Second Load Time Fix

## ⚠️ The Issue
Your dashboard is still taking 20 seconds because:
1. The optimizations are applied but the frontend might be using the OLD hooks
2. Possible caching issues
3. Possible authentication/session issues

## 🚨 Immediate Action Required

### 1. LOG OUT AND LOG BACK IN
This clears any stale session data and ensures the new optimized functions are used.

### 2. Verify The Right Hook Is Being Used

Open Developer Tools (F12) → Network Tab → Filter by "Fetch/XHR"

When the dashboard loads, you should see ONE of these:
- ✅ `get_dashboard_data` (GOOD - optimized)
- ❌ `get_incidents_with_details_rbac` + `get_incidents_count_rbac` (BAD - old method)

### 3. Clear Everything
```bash
# In browser console:
localStorage.clear()
sessionStorage.clear()
```

Then hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

### 4. Check Which Function Is Actually Called

In Supabase SQL Editor, run:
```sql
-- See recent function calls
SELECT 
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE query LIKE '%get_%'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC
LIMIT 10;
```

### 5. Force Use of New Hook

If still slow, manually verify the import in:
`/apps/operations/src/components/dashboard/IncidentsListOptimized.tsx`

Must be:
```typescript
import { useIncidentsUltraOptimized } from '@/hooks/useIncidentsDashboardOptimized';
```

NOT:
```typescript
import { useIncidentsUltraOptimized } from '@/hooks/useIncidentsUltraOptimized';
```

### 6. The Nuclear Option

If nothing else works:
1. Stop your development server
2. Delete `node_modules` and `.next`/`dist` folders
3. Run `npm install` and rebuild
4. Clear all browser data for localhost
5. Start fresh

## Expected After Fix
- Dashboard loads in < 1 second
- Employer switching is instant
- No page reloads
- "View All" shows all companies for super admin

## Still Not Working?

Check browser console for errors and let me know what you see!

# Critical Fixes Applied - November 18, 2025

## Overview
Fixed three critical production-blocking issues affecting Super Admin dashboard functionality and application stability.

---

## 🚨 Issue #1: Memory Leak Causing Chrome Crashes

### Problem
- Chrome showing "This webpage was reloaded because it was using significant memory"
- 30-second dashboard load times
- Application becoming progressively slower during use
- Browser tab freezing after extended use

### Root Cause
Three aggressive memory cleanup timers in `apps/operations/src/main.tsx`:
1. Timer running every **20 seconds** (should be 5+ minutes)
2. Timer running every **60 seconds** destroying queries with >15 cached items
3. Timer running every **120 seconds** force-destroying ALL inactive queries

**The Problem**: These timers were:
- Destroying queries **while they were still fetching** → causing aborts and retries
- Creating a vicious cycle: fetch → destroy → retry → destroy → timeout
- Causing memory thrashing instead of optimization

### Fix Applied
**File**: `apps/operations/src/main.tsx`

**Changes**:
1. Replaced 3 aggressive timers with 1 gentle cleanup timer
2. New timer runs every **5 minutes** (was 20 seconds)
3. Only removes queries that are:
   - Unwatched (no components using them)
   - Idle (not currently fetching)
   - Very stale (10+ minutes old)
4. Increased `gcTime` from 5 minutes to 10 minutes to match cleanup interval
5. Added development-only monitoring timer (non-destructive)

**Expected Results**:
- No more Chrome memory warnings
- Fast, consistent load times (<200ms)
- Stable performance during extended sessions (30+ minutes)
- Queries complete successfully without interruption

---

## 🚨 Issue #2: "View All Companies" Not Working for Super Admin

### Problem
- Super Admin selects "View All Companies" from dropdown
- Dashboard still shows filtered data (e.g., only Newcastle Builders)
- Switching between employers shows stale data

### Root Cause
**File**: `apps/operations/src/hooks/useEmployerSelection.ts` (lines 109-110)

Cache invalidation logic had a critical bug:
```typescript
const isOldEmployerQuery = queryData?.filterEmployerId !== undefined &&
                           queryData.filterEmployerId !== employerId;
```

**The Problem**:
- When switching from "Newcastle Builders" (ID: 1) to "View All" (null), this works
- But when switching from "View All" (null) back to "View All" (null), the condition fails
- Because `null !== null` is `false`, the cache is NOT cleared
- Old data remains visible even after selecting "View All"

### Fix Applied
**File**: `apps/operations/src/hooks/useEmployerSelection.ts` (lines 102-119)

**Changes**:
Simplified cache invalidation to remove ALL employer-contextual queries on ANY employer change:
```typescript
queryClient.removeQueries({
  predicate: (query) => {
    const key = query.queryKey[0];

    // Remove all employer-contextual queries to ensure fresh data
    return key === 'dashboard-incidents-v2' ||
           key === 'dashboard-metrics' ||
           key === 'employer-statistics' ||
           // ... etc
  }
});
```

**Expected Results**:
- Super Admin can see ALL 157 incidents when "View All Companies" is selected
- Switching between employers shows correct filtered data
- No stale data displayed after employer changes

---

## 🚨 Issue #3: Super Admin RLS Not Bypassing

### Problem
- Super Admin (role_id = 1) should see ALL incidents across ALL companies
- Dashboard showing zero incidents or filtered to single employer

### Root Cause
**Frontend state management issue**, NOT a database issue:
- Database function `get_dashboard_data` works correctly (confirmed: returns 157 incidents for role_id=1)
- `localStorage` had stale `selectedEmployerId` from previous sessions
- Initialization logic only runs once, missing user switches

### Fix Applied
Combination of:
1. Cache invalidation fix (Issue #2 above) ensures fresh queries
2. `useEmployerSelection` hook properly initializes `selectedEmployerId = null` for role_id = 1
3. Database RLS already correctly bypassed for Super Admin

**Expected Results**:
- Super Admin sees all 157 incidents by default
- "View All Companies" option works correctly
- No employer filter applied when role_id = 1 and selectedEmployerId = null

---

## Files Modified

### 1. `/apps/operations/src/main.tsx`
- Lines 28-45: Updated QueryClient config (gcTime: 5min → 10min)
- Lines 64-110: Replaced aggressive cleanup timers with gentle cleanup
- **Impact**: Prevents memory leak, eliminates 30-second delays

### 2. `/apps/operations/src/hooks/useEmployerSelection.ts`
- Lines 102-119: Fixed cache invalidation logic
- **Impact**: "View All Companies" works correctly, no stale data

### 3. `/CLAUDE.md`
- Updated status from "BLOCKED" to "READY FOR TESTING"
- Documented all fixes with root cause analysis
- Updated version to 4.1.0

---

## Testing Required

### Priority 1: Immediate Validation
1. **Log in as Super Admin** (role1@scratchie.com)
2. **Verify** dashboard shows all 157 incidents (not filtered)
3. **Select "View All Companies"** from dropdown
4. **Verify** all 157 incidents still visible
5. **Select a specific employer** (e.g., Newcastle Builders)
6. **Verify** only that employer's incidents show
7. **Select "View All Companies"** again
8. **Verify** all 157 incidents return (no stale Newcastle data)

### Priority 2: Memory Stability
1. **Keep dashboard open for 30+ minutes**
2. **Monitor Chrome DevTools** → Memory tab
3. **Verify** no "significant memory" warnings
4. **Check console** for memory monitor logs every 2 minutes
5. **Verify** query count stays reasonable (<50 queries)

### Priority 3: Performance
1. **Refresh dashboard** multiple times
2. **Verify** load times consistently <1 second (no 30-second delays)
3. **Switch between employers** rapidly
4. **Verify** smooth transitions without hangs

---

## Expected Behavior After Fixes

### Memory Usage
- **Before**: 3 timers running every 20s, 60s, 120s → destroying active queries
- **After**: 1 timer running every 5 minutes → only removing stale unused queries
- **Result**: Stable memory, no Chrome warnings, no performance degradation

### Super Admin Dashboard
- **Before**: Shows 0 incidents or single employer (Newcastle)
- **After**: Shows all 157 incidents across all 7 employers
- **Result**: Proper Super Admin oversight capabilities

### "View All Companies"
- **Before**: Selecting "View All" shows stale filtered data
- **After**: Selecting "View All" immediately shows all incidents
- **Result**: Responsive, accurate employer filtering

### Load Times
- **Before**: 30-second delays, browser hangs, timeouts
- **After**: <200ms consistent load times
- **Result**: Fast, responsive user experience

---

## Rollback Plan (If Needed)

If issues persist, rollback these two files:

```bash
git checkout HEAD~1 apps/operations/src/main.tsx
git checkout HEAD~1 apps/operations/src/hooks/useEmployerSelection.ts
```

Then report the specific symptoms for further diagnosis.

---

## Success Criteria

✅ Super Admin sees all 157 incidents by default
✅ "View All Companies" dropdown works correctly
✅ No Chrome memory warnings during 30+ minute sessions
✅ Dashboard loads in <1 second consistently
✅ Switching employers shows correct filtered data
✅ No stale data displayed after employer changes

---

**Fixes Applied By**: Claude (AI Assistant)
**Date**: November 18, 2025
**Version**: 4.1.0
**Status**: Ready for User Testing

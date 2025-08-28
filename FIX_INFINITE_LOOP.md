# 🚨 CRITICAL FIX: Infinite Loop Causing Performance Issues

## The Problem
The `useEmployerSelection` hook has an infinite loop:
1. `useEffect` depends on `selectedEmployerId`
2. The effect updates `selectedEmployerId`
3. This triggers the effect again → infinite loop!

This causes:
- Constant re-renders
- Multiple API calls
- 400 errors from `set_employer_context`
- Slow performance

## The Fix

Replace the hook with the fixed version:

```bash
cd /Users/jameskell/Cursor/mend-2
cp apps/operations/src/hooks/useEmployerSelectionFinalFix.ts apps/operations/src/hooks/useEmployerSelection.ts
```

## What Changed

1. **Added `isInitialized` ref** to ensure initialization only happens once
2. **Removed `selectedEmployerId` from useEffect dependencies**
3. **Better error logging** to see what's happening

## Console Commands You Asked For

To manually test employer switching:

```javascript
// Set to a specific employer (e.g., Newcastle Builders)
localStorage.setItem("selectedEmployerId", "8");
location.reload();

// Set to View All mode
localStorage.setItem("selectedEmployerId", "null");
location.reload();

// Clear everything and start fresh
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## The 400 Error

The `set_employer_context` 400 error might be because:
1. The function is being called too many times (rate limiting)
2. Invalid employer ID
3. Authentication issue

## Expected After Fix

- No more infinite loop in console
- Employer selection should work
- Dashboard loads faster
- No more 400 errors

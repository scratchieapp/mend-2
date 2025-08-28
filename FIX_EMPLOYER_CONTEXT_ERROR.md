# FIX: Employer Context Function Error

## ⚠️ The Problem
Your app is trying to call `set_employer_context_with_clerk` but your database only has:
- `set_employer_context(p_employer_id integer)`
- `clear_employer_context()`
- `get_employer_context()`

This is why employer switching is broken!

## 🔧 The Fix

Replace your employer selection hook:

```bash
cd /Users/jameskell/Cursor/mend-2
cp apps/operations/src/hooks/useEmployerSelectionFixed.ts apps/operations/src/hooks/useEmployerSelection.ts
```

## 📋 What Changed

The fixed hook now uses the EXISTING database functions:
- `set_employer_context` instead of `set_employer_context_with_clerk`
- `clear_employer_context` for "View All" mode
- Proper parameter name `p_employer_id` instead of `employer_id`

## ✅ After Applying The Fix

1. Clear browser cache/local storage
2. Hard refresh (Cmd+Shift+R)
3. You should be able to:
   - View all companies as super admin
   - Switch between specific employers
   - No more console errors

## 🚀 Expected Results

- Dashboard loads in 5-10 seconds (better than 20!)
- Employer switching works instantly
- No more "function not found" errors

## 💡 Why 5-10 Seconds?

If it's still taking 5-10 seconds, check:
1. Network tab - which functions are being called?
2. Are you using the optimized hook? Check the import in `IncidentsListOptimized.tsx`
3. Consider clearing node_modules and rebuilding

The database functions run in 2-3ms, so the delay is likely:
- Frontend bundling/caching issues
- Multiple unnecessary re-renders
- Not using the optimized `get_dashboard_data` function

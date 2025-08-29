# 🔍 Diagnosing Hanging Request Issue

## Current Status
✅ **Database query works** - Returns Newcastle Builders data in < 100ms  
✅ **Frontend passes employer ID** - `employerId: selectedEmployerId` is correct  
❌ **Request hangs** - Spinner shows but data never loads

## Likely Causes

### 1. React Query Issue
The query might be disabled or stuck. Check:
- Is `roleId` null? (Would disable the query)
- Is the query key changing rapidly?
- Is there a stale closure?

### 2. Supabase Client Issue  
The `supabase` client might not be configured correctly for RPC calls.

### 3. CORS or Network Issue
The request might be blocked at the network level.

## Immediate Debug Actions

1. **Open Chrome DevTools Network tab**
2. **Clear it**
3. **Select "Newcastle Builders"**
4. **Look for**:
   - Is there a `get_dashboard_data` request?
   - What's its status? (Pending? Failed? CORS error?)
   - Any console errors?

## Quick Fix to Try

Since we know the dropdown works but data doesn't load, the issue might be that `roleId` is null in `useUserContext`, which would disable the query.

Can you check the Console for any errors when you select Newcastle Builders?

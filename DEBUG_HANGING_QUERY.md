# Debugging: Query Hanging for 2+ Minutes

## Symptoms
- Dropdown works ✅
- Loading spinner shows ✅  
- But data never loads (2+ minutes) ❌

## Possible Causes

1. **Query timeout** - The `get_dashboard_data` function might be timing out
2. **Large dataset** - Newcastle Builders might have too much data
3. **Missing indexes** - Despite our index creation, some might be missing
4. **Network issue** - Request might not be reaching Supabase

## Debug Steps

1. Check browser Network tab for:
   - Is `get_dashboard_data` request pending?
   - Did it timeout?
   - What's the status?

2. Check browser Console for:
   - Any errors?
   - Any warnings?

3. Test with SQL directly:
```sql
-- Test the query directly
SELECT * FROM get_dashboard_data(
    page_size := 25,
    page_offset := 0,
    filter_employer_id := 8, -- Newcastle Builders
    filter_worker_id := NULL,
    filter_start_date := NULL,
    filter_end_date := NULL,
    user_role_id := 1, -- Super admin
    user_employer_id := NULL
);
```

## Quick Test
Try refreshing and opening the Network tab BEFORE selecting an employer to see what happens.

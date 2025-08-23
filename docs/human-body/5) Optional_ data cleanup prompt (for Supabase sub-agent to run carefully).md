# **5\) Optional: data cleanup prompt (for Supabase sub-agent to run carefully)**

* **Duplicate code check:**

```sql
SELECT bl_code_main, COUNT(*) AS n
FROM bodily_location_codes
GROUP BY bl_code_main
HAVING COUNT(*) > 1
ORDER BY n DESC, bl_code_main;
```

*   
  If duplicates exist and you want to normalize:

  1. Decide the canonical `bl_code_id` per `bl_code_main`.

  2. Update `body_parts_bodily_codes.bl_code_id` to the canonical id.

  3. Delete non-canonical duplicates from `bodily_location_codes`.

  4. Enforce `UNIQUE(bl_code_main)` (already in the migration).  

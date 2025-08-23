# **2\) Supabase sub-agent prompt (give this verbatim to the Supabase MCP)**

**Role:** Supabase migration \+ data integrity.  
 **You have full context of the current DB. Introspect before altering.**  
 **Do not drop or rewrite user tables without explicit conflicts. Use idempotent changes.**

**Known tables/columns likely present:**

* `body_parts(body_part_id PK, body_part_name, created_at, updated_at)`

* `bodily_location_codes(bl_code_id PK, bl_code_main, bl_description, body_part_id?, created_at, updated_at)`

* `body_parts_bodily_codes(id PK, body_part_id FK, bl_code_id FK, created_at, updated_at)`

* `body_sides(body_side_id PK, body_side_name, created_at, updated_at)`

**Target additions (only if missing):**

* `ui_regions(svg_id PK TEXT, view TEXT CHECK (view IN ('front','back')), body_part_id INT NULL, body_side_id SMALLINT NULL, UNIQUE (svg_id))`

  * FKs: `body_part_id → body_parts(body_part_id)` and `body_side_id → body_sides(body_side_id)` if tables exist.

* Constraints (if missing):

  * `UNIQUE (body_part_id, bl_code_id)` on `body_parts_bodily_codes`

  * `UNIQUE (bl_code_main)` on `bodily_location_codes`

**Back-compat:**

* If `bodily_location_codes.body_part_id` exists *and* `body_parts_bodily_codes` exists, **keep both** and create a compatibility **VIEW**:

```sql
CREATE OR REPLACE VIEW v_body_part_codes AS
SELECT j.body_part_id, j.bl_code_id
FROM body_parts_bodily_codes j
UNION
SELECT c.body_part_id, c.bl_code_id
FROM bodily_location_codes c
WHERE c.body_part_id IS NOT NULL;
```

**Data cleanup (non-breaking):**

* If `bodily_location_codes.bl_code_main` has duplicates, create a **temporary dedupe staging table** suggestion only—do not mutate without explicit instruction. Provide a report query listing duplicates.

**Seed/Upsert `ui_regions`:**

* Create `ui_regions` rows for a minimal, working set aligned to the SVG IDs we will supply (see list in the next message from the UI agent). Use `INSERT ... ON CONFLICT (svg_id) DO UPDATE`.

* If `body_sides` table exists but isn’t referenced anywhere else, still reference it from `ui_regions` (`left=…`, `right=…`, `center=…`). If missing, leave `body_side_id` NULL.

**Idempotent pattern:** use `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN ... END $$;`, `CREATE UNIQUE INDEX IF NOT EXISTS`, and `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`.

**Deliver:**

* A single SQL migration file that: checks existence; adds `ui_regions`; adds/repairs constraints/indexes; creates the compatibility view; seeds minimal `ui_regions` with upsert; outputs a duplicate-codes report query as a comment.

**Example skeleton (adjust to actual introspection):**

```sql
-- 1) ui_regions table
CREATE TABLE IF NOT EXISTS ui_regions (
  svg_id TEXT PRIMARY KEY,
  view TEXT CHECK (view IN ('front','back')),
  body_part_id INT NULL,
  body_side_id SMALLINT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) FKs (guarded)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_parts') THEN
    ALTER TABLE ui_regions
    ADD CONSTRAINT IF NOT EXISTS ui_regions_body_part_fk
    FOREIGN KEY (body_part_id) REFERENCES body_parts(body_part_id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_sides') THEN
    ALTER TABLE ui_regions
    ADD CONSTRAINT IF NOT EXISTS ui_regions_side_fk
    FOREIGN KEY (body_side_id) REFERENCES body_sides(body_side_id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Uniqueness/constraints on existing tables
DO $$ BEGIN
  -- codes unique
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bodily_location_codes' AND column_name='bl_code_main') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bodily_location_codes_code_unique ON bodily_location_codes (bl_code_main);
  END IF;
  -- join uniqueness
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_parts_bodily_codes') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bp_bc_unique ON body_parts_bodily_codes (body_part_id, bl_code_id);
  END IF;
END $$;

-- 4) Compatibility View
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bodily_location_codes' AND column_name='body_part_id') THEN
    CREATE OR REPLACE VIEW v_body_part_codes AS
      SELECT j.body_part_id, j.bl_code_id FROM body_parts_bodily_codes j
      UNION
      SELECT c.body_part_id, c.bl_code_id FROM bodily_location_codes c WHERE c.body_part_id IS NOT NULL;
  END IF;
END $$;

-- 5) Seed ui_regions (examples; the UI agent will supply the canonical list)
INSERT INTO ui_regions (svg_id, view, body_part_id, body_side_id)
VALUES
  ('front-head-center','front', NULL, NULL),
  ('front-neck-center','front', NULL, NULL),
  ('front-chest-center','front', NULL, NULL),
  ('front-shoulder-left','front', NULL, NULL),
  ('front-shoulder-right','front', NULL, NULL),
  ('front-knee-left','front', NULL, NULL),
  ('front-knee-right','front', NULL, NULL),
  ('back-upper-back-center','back', NULL, NULL),
  ('back-lower-back-center','back', NULL, NULL)
ON CONFLICT (svg_id) DO UPDATE SET view = EXCLUDED.view;

-- 6) Duplicate code report (run manually to review)
-- SELECT bl_code_main, COUNT(*) AS n FROM bodily_location_codes
-- GROUP BY bl_code_main HAVING COUNT(*) > 1 ORDER BY n DESC, bl_code_main;
```

**End of Supabase brief.**


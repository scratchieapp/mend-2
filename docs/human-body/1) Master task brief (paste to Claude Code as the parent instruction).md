# **1\) Master task brief (paste to Claude Code as the parent instruction)**

**Goal:**  
 Wire up an injury-location picker using the provided SVG (front/back views). Persist selections to Supabase using a clean, FKs-and-constraints-safe schema. Respect existing tables; only add/alter where needed. Do not break current data.

**Key points:**

* Keep the `id` attributes from the SVG exactly as-is (e.g., `front-knee-right`, `back-upper-back-center`).

* Use a small mapping table `ui_regions(svg_id, view, body_part_id, body_side_id)` that bridges UI → domain.

* Prefer **M:N** modeling for parts↔codes via `body_parts_bodily_codes` (if present). If `bodily_location_codes.body_part_id` also exists, treat it as **legacy** and don’t delete it; create a **view** for back-compat.

* Enforce uniqueness and referential integrity without disrupting existing data.

* Add a light “click → upsert” API flow and a read endpoint that returns the current selection for a user/session.

Deliverables:

1. **SQL migrations** (idempotent) for Supabase.

2. **Data cleanup plan** (safe, optional).

3. **UI wiring** using the provided SVG (read mapping from Supabase, write selections).

4. **Smoke tests** checklist.


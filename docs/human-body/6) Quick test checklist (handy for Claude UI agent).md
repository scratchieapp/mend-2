# **6\) Quick test checklist (handy for Claude UI agent)**

* SVG renders and is keyboard navigable.

* Clicking a region toggles `.selected`.

* First click on an unmapped region opens a panel to choose body part \+ side; Save performs an `upsert` to `ui_regions`.

* Reload: mapping persists, and `selected` state can be restored from your app state if desired.

* Supabase has `ui_regions` rows with correct `svg_id` \+ `view`, and optional FKs resolved.

* `UNIQUE` constraints hold; attempting to add duplicate `bl_code_main` fails (as intended).

* `v_body_part_codes` view returns a unified set if both models coexist.

---

If you want, I can also generate a CSV of `ui_regions` with your current **20 locations** mapped to the exact SVG IDs (using your `body_parts` \+ `body_sides` rows).


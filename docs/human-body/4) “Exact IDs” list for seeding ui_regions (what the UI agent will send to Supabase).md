# **4\) “Exact IDs” list for seeding `ui_regions` (what the UI agent will send to Supabase)**

These match the SVG in the canvas. Use these to seed (with `view` filled; `body_part_id`/`body_side_id` may remain null until you map):

**Front**

* `front-head-center`, `front-neck-center`, `front-chest-center`, `front-abdomen-center`, `front-pelvis-center`

* `front-shoulder-left`, `front-upper-arm-left`, `front-forearm-hand-left`

* `front-shoulder-right`, `front-upper-arm-right`, `front-forearm-hand-right`

* `front-thigh-left`, `front-knee-left`, `front-shin-left`, `front-foot-left`

* `front-thigh-right`, `front-knee-right`, `front-shin-right`, `front-foot-right`

**Back**

* `back-head-center`, `back-neck-center`

* `back-upper-back-center`, `back-lower-back-center`, `back-sacrum-pelvis-center`

* `back-shoulder-left`, `back-scapula-left`, `back-forearm-hand-left`, `back-upper-arm-left`, `back-shin-left`, `back-thigh-left`, `back-foot-left`, `back-knee-left`

* `back-shoulder-right`, `back-scapula-right`, `back-forearm-hand-right`, `back-upper-arm-right`, `back-shin-right`, `back-thigh-right`, `back-foot-right`, `back-knee-right`

(If any of these differ from the canvas IDs, use the **canvas** as source of truth.)


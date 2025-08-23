# **3\) UI sub-agent prompt (give this verbatim to the UI MCP)**

**Role:** Frontend integration for the body-map SVG picker.

**Assets:**

* The SVG/HTML file is in this chat/canvas titled **“Human Body Front/back Svg Map (clickable, Accessible)”**. Use that exact markup and IDs.

* Regions are all `.region` nodes with `id` like `front-knee-right`, and `data-*` for `view`, `region`, `side`.

**Tasks:**

1. Wrap the SVG into a reusable component:

   * If React: export `<BodyMap onSelect(regionMeta) onUnselect(regionMeta) selected={Set<string>} />`.

   * Keep keyboard support (Enter/Space) and the selected styling.

2. On mount, **fetch `ui_regions`** from Supabase and build a map `{svg_id -> {body_part_id, body_side_id}}`.

   * If a row does not exist, create it on first user selection (upsert).

3. When a user clicks a region:

   * Toggle selection locally.

   * Upsert to `ui_regions (svg_id, view, body_part_id, body_side_id)` where `body_part_id`/`body_side_id` may be `NULL` initially; expose a small editor to assign them (dropdowns populated from `body_parts` and `body_sides`).

4. Provide a helper `mapToBodyPart(svgId)` that resolves to `{ body_part_id, side }` (or `null` if unmapped).

5. Do **not** rename SVG IDs. Avoid pointer-events changes. Keep everything accessible.

**Suggested TypeScript (React) integration skeleton:**

```
import { createClient } from '@supabase/supabase-js';

type UiRegion = { svg_id: string; view: 'front'|'back'; body_part_id: number|null; body_side_id: number|null };

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function loadUiRegions(): Promise<Record<string, UiRegion>> {
  const { data, error } = await supabase.from('ui_regions').select('*');
  if (error) throw error;
  const map: Record<string, UiRegion> = {};
  data.forEach((r: UiRegion) => { map[r.svg_id] = r; });
  return map;
}

export async function upsertUiRegion(r: UiRegion) {
  const { error } = await supabase.from('ui_regions').upsert(r, { onConflict: 'svg_id' });
  if (error) throw error;
}

// Example event wire-up after rendering the SVG into the DOM:
export function wireBodyMapHandlers(root: HTMLElement, onToggle: (svgId: string, meta: any)=>void) {
  root.querySelectorAll<HTMLElement>('.region').forEach(el => {
    const handler = () => {
      const meta = {
        id: el.id,
        view: el.dataset.view,
        region: el.dataset.region,
        side: el.dataset.side
      };
      el.classList.toggle('selected');
      onToggle(el.id, meta);
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}
```

**Minimal UI flow for mapping:**

* On first click of an unmapped `svg_id`, open a small side panel:

  * Dropdown A \= `body_parts.body_part_name` → sets `body_part_id`

  * Dropdown B \= `body_sides.body_side_name` (Left/Right/Center) → sets `body_side_id`

  * Save \= upsert to `ui_regions`.

* Subsequent clicks just toggle selection; mapping persists.

**End of UI brief.**
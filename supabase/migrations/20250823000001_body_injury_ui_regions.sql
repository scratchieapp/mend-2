-- Migration for Body Injury UI Regions
-- This creates the ui_regions table that maps SVG element IDs to body parts and sides

-- 1) Create ui_regions table if it doesn't exist
CREATE TABLE IF NOT EXISTS ui_regions (
  svg_id TEXT PRIMARY KEY,
  view TEXT CHECK (view IN ('front','back')),
  body_part_id INT NULL,
  body_side_id SMALLINT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Add Foreign Key constraints (guarded)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_parts') THEN
    ALTER TABLE ui_regions
    DROP CONSTRAINT IF EXISTS ui_regions_body_part_fk;
    
    ALTER TABLE ui_regions
    ADD CONSTRAINT ui_regions_body_part_fk
    FOREIGN KEY (body_part_id) REFERENCES body_parts(body_part_id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_sides') THEN
    ALTER TABLE ui_regions
    DROP CONSTRAINT IF EXISTS ui_regions_side_fk;
    
    ALTER TABLE ui_regions
    ADD CONSTRAINT ui_regions_side_fk
    FOREIGN KEY (body_side_id) REFERENCES body_sides(body_side_id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Create body_sides table if it doesn't exist
CREATE TABLE IF NOT EXISTS body_sides (
  body_side_id SMALLINT PRIMARY KEY,
  body_side_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Insert body sides if they don't exist
INSERT INTO body_sides (body_side_id, body_side_name)
VALUES 
  (1, 'left'),
  (2, 'right'),
  (3, 'center'),
  (4, 'not_applicable')
ON CONFLICT (body_side_id) DO NOTHING;

-- 5) Create body_parts_bodily_codes junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS body_parts_bodily_codes (
  id SERIAL PRIMARY KEY,
  body_part_id INT NOT NULL,
  bl_code_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(body_part_id, bl_code_id)
);

-- Add foreign keys for junction table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='body_parts') THEN
    ALTER TABLE body_parts_bodily_codes
    DROP CONSTRAINT IF EXISTS bp_bc_body_part_fk;
    
    ALTER TABLE body_parts_bodily_codes
    ADD CONSTRAINT bp_bc_body_part_fk
    FOREIGN KEY (body_part_id) REFERENCES body_parts(body_part_id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bodily_location_codes') THEN
    ALTER TABLE body_parts_bodily_codes
    DROP CONSTRAINT IF EXISTS bp_bc_bl_code_fk;
    
    ALTER TABLE body_parts_bodily_codes
    ADD CONSTRAINT bp_bc_bl_code_fk
    FOREIGN KEY (bl_code_id) REFERENCES bodily_location_codes(bl_code_id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- 6) Add uniqueness constraints on existing tables
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

-- 7) Create compatibility view if legacy column exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bodily_location_codes' AND column_name='body_part_id') THEN
    CREATE OR REPLACE VIEW v_body_part_codes AS
      SELECT j.body_part_id, j.bl_code_id FROM body_parts_bodily_codes j
      UNION
      SELECT c.body_part_id, c.bl_code_id FROM bodily_location_codes c WHERE c.body_part_id IS NOT NULL;
  END IF;
END $$;

-- 8) Seed ui_regions with SVG mappings
-- Get body_part_ids from existing data
WITH body_part_map AS (
  SELECT body_part_id, LOWER(body_part_name) as name FROM body_parts
),
side_map AS (
  SELECT body_side_id, body_side_name FROM body_sides
)
INSERT INTO ui_regions (svg_id, view, body_part_id, body_side_id)
VALUES
  -- Front view regions
  ('front-head', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%head%' LIMIT 1), 3),
  ('front-neck', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%neck%' LIMIT 1), 3),
  ('front-chest', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%chest%' LIMIT 1), 3),
  ('front-abdomen', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%abdomen%' LIMIT 1), 3),
  ('front-pelvis', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%pelvis%' OR name LIKE '%groin%' LIMIT 1), 3),
  
  -- Left side (front)
  ('front-shoulder-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shoulder%' LIMIT 1), 1),
  ('front-upperarm-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%arm%' AND name LIKE '%upper%' LIMIT 1), 1),
  ('front-forearmhand-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%forearm%' OR name LIKE '%hand%' LIMIT 1), 1),
  ('front-thigh-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%thigh%' LIMIT 1), 1),
  ('front-knee-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%knee%' LIMIT 1), 1),
  ('front-shin-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shin%' OR name LIKE '%leg%' LIMIT 1), 1),
  ('front-foot-left', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%foot%' OR name LIKE '%ankle%' LIMIT 1), 1),
  
  -- Right side (front)
  ('front-shoulder-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shoulder%' LIMIT 1), 2),
  ('front-upperarm-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%arm%' AND name LIKE '%upper%' LIMIT 1), 2),
  ('front-forearmhand-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%forearm%' OR name LIKE '%hand%' LIMIT 1), 2),
  ('front-thigh-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%thigh%' LIMIT 1), 2),
  ('front-knee-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%knee%' LIMIT 1), 2),
  ('front-shin-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shin%' OR name LIKE '%leg%' LIMIT 1), 2),
  ('front-foot-right', 'front', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%foot%' OR name LIKE '%ankle%' LIMIT 1), 2),
  
  -- Back view regions
  ('back-head', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%head%' LIMIT 1), 3),
  ('back-neck', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%neck%' LIMIT 1), 3),
  ('back-upperback', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%back%' AND name LIKE '%upper%' LIMIT 1), 3),
  ('back-lowerback', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%back%' AND name LIKE '%lower%' LIMIT 1), 3),
  ('back-glutes', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%glute%' OR name LIKE '%buttock%' LIMIT 1), 3),
  
  -- Left side (back)
  ('back-shoulder-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shoulder%' LIMIT 1), 1),
  ('back-upperarm-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%arm%' AND name LIKE '%upper%' LIMIT 1), 1),
  ('back-forearmhand-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%forearm%' OR name LIKE '%hand%' LIMIT 1), 1),
  ('back-thigh-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%thigh%' LIMIT 1), 1),
  ('back-calf-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%calf%' LIMIT 1), 1),
  ('back-foot-left', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%foot%' OR name LIKE '%ankle%' LIMIT 1), 1),
  
  -- Right side (back)
  ('back-shoulder-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%shoulder%' LIMIT 1), 2),
  ('back-upperarm-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%arm%' AND name LIKE '%upper%' LIMIT 1), 2),
  ('back-forearmhand-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%forearm%' OR name LIKE '%hand%' LIMIT 1), 2),
  ('back-thigh-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%thigh%' LIMIT 1), 2),
  ('back-calf-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%calf%' LIMIT 1), 2),
  ('back-foot-right', 'back', (SELECT body_part_id FROM body_part_map WHERE name LIKE '%foot%' OR name LIKE '%ankle%' LIMIT 1), 2)
ON CONFLICT (svg_id) DO UPDATE 
SET 
  view = EXCLUDED.view,
  body_part_id = EXCLUDED.body_part_id,
  body_side_id = EXCLUDED.body_side_id,
  updated_at = now();

-- 9) Create function for updating injury selections
CREATE OR REPLACE FUNCTION upsert_injury_selection(
  p_incident_id INT,
  p_svg_ids TEXT[]
) RETURNS void AS $$
BEGIN
  -- Delete existing selections for this incident
  DELETE FROM incident_body_selections WHERE incident_id = p_incident_id;
  
  -- Insert new selections
  INSERT INTO incident_body_selections (incident_id, svg_id)
  SELECT p_incident_id, unnest(p_svg_ids);
END;
$$ LANGUAGE plpgsql;

-- 10) Create table for storing incident body selections
CREATE TABLE IF NOT EXISTS incident_body_selections (
  id SERIAL PRIMARY KEY,
  incident_id INT NOT NULL,
  svg_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (svg_id) REFERENCES ui_regions(svg_id) ON DELETE CASCADE,
  UNIQUE(incident_id, svg_id)
);

-- Grant necessary permissions
GRANT ALL ON ui_regions TO authenticated;
GRANT ALL ON body_sides TO authenticated;
GRANT ALL ON body_parts_bodily_codes TO authenticated;
GRANT ALL ON incident_body_selections TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_injury_selection TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ui_regions_view ON ui_regions(view);
CREATE INDEX IF NOT EXISTS idx_ui_regions_body_part ON ui_regions(body_part_id);
CREATE INDEX IF NOT EXISTS idx_incident_body_selections_incident ON incident_body_selections(incident_id);
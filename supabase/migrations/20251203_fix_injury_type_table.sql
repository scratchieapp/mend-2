-- Migration: Fix injury_type table to contain actual injury types, not classifications
-- Purpose: The injury_type table incorrectly contains classification values (LTI, MTI, FAI)
--          It should contain actual injury types (Fracture, Sprain, Laceration, etc.)
--
-- injury_type: What happened (Fracture, Sprain, Laceration, Abrasion, Strain, Burn, etc.)
-- classification: Severity level (LTI, MTI, FAI) - stored in incidents.classification field

-- =====================================================
-- Step 1: Clear incorrect data from injury_type table
-- =====================================================
DELETE FROM injury_type 
WHERE UPPER(injury_type_name) IN ('LTI', 'MTI', 'FAI', 'LOST TIME INJURY', 'MEDICAL TREATMENT INJURY', 'FIRST AID INJURY', 'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID');

-- =====================================================
-- Step 2: Insert proper injury types if they don't exist
-- =====================================================
-- Using individual INSERT statements with ON CONFLICT for safety
INSERT INTO injury_type (injury_type_name) VALUES ('Fracture') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Sprain') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Strain') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Laceration') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Contusion') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Abrasion') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Burn') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Puncture') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Dislocation') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Crush Injury') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Amputation') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Foreign Body') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Electric Shock') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Chemical Exposure') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Heat Stress') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Cold Stress') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Hearing Loss') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Eye Injury') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Respiratory Issue') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Skin Condition') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Musculoskeletal') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Internal Injury') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Poisoning') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Infection') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Unknown') ON CONFLICT DO NOTHING;
INSERT INTO injury_type (injury_type_name) VALUES ('Other') ON CONFLICT DO NOTHING;

-- =====================================================
-- Step 3: Add comments to clarify the purpose
-- =====================================================
COMMENT ON TABLE injury_type IS 'Lookup table for types of injuries (e.g., Fracture, Sprain, Laceration). NOT for severity classification.';
COMMENT ON COLUMN injury_type.injury_type_name IS 'Name of the injury type (what happened, e.g., Fracture, Burn, Laceration)';

-- =====================================================
-- Verification query
-- =====================================================
-- SELECT * FROM injury_type ORDER BY injury_type_name;


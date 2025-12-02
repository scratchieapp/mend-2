-- Migration: Fix injury_type vs classification data integrity
-- Purpose: Correct incidents where classification values (LTI, MTI, etc.) were incorrectly stored in injury_type field
-- 
-- injury_type: Should contain what happened (e.g., Fracture, Abrasion, Strain, Laceration)
-- classification: Should contain severity (e.g., LTI, MTI, FAI, Unclassified)

-- First, let's see what incorrect data exists (for audit purposes)
-- SELECT incident_id, incident_number, injury_type, classification 
-- FROM incidents 
-- WHERE injury_type IS NOT NULL 
--   AND UPPER(injury_type) IN ('LTI', 'MTI', 'FAI', 'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID', 'LOST TIME INJURY', 'MEDICAL TREATMENT INJURY', 'FIRST AID INJURY');

-- =====================================================
-- Step 1: Update classification from injury_type where injury_type contains a classification value
-- Only update classification if it's currently NULL or 'Unclassified'
-- =====================================================
UPDATE incidents
SET 
  classification = CASE 
    WHEN UPPER(injury_type) IN ('LTI', 'LOST TIME', 'LOST TIME INJURY') THEN 'LTI'
    WHEN UPPER(injury_type) IN ('MTI', 'MEDICAL TREATMENT', 'MEDICAL TREATMENT INJURY') THEN 'MTI'
    WHEN UPPER(injury_type) IN ('FAI', 'FIRST AID', 'FIRST AID INJURY') THEN 'FAI'
    ELSE classification
  END,
  injury_type = NULL,  -- Clear the incorrectly stored value
  updated_at = NOW()
WHERE 
  injury_type IS NOT NULL 
  AND UPPER(injury_type) IN (
    'LTI', 'MTI', 'FAI', 
    'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID',
    'LOST TIME INJURY', 'MEDICAL TREATMENT INJURY', 'FIRST AID INJURY'
  )
  AND (classification IS NULL OR classification = 'Unclassified' OR classification = '');

-- =====================================================
-- Step 2: For incidents where classification already has a value,
-- just clear the incorrect injury_type
-- =====================================================
UPDATE incidents
SET 
  injury_type = NULL,
  updated_at = NOW()
WHERE 
  injury_type IS NOT NULL 
  AND UPPER(injury_type) IN (
    'LTI', 'MTI', 'FAI', 
    'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID',
    'LOST TIME INJURY', 'MEDICAL TREATMENT INJURY', 'FIRST AID INJURY'
  )
  AND classification IS NOT NULL 
  AND classification != '' 
  AND classification != 'Unclassified';

-- =====================================================
-- Step 3: Add a comment to the columns to document their purpose
-- =====================================================
COMMENT ON COLUMN incidents.injury_type IS 'Type of injury sustained (e.g., Fracture, Abrasion, Strain, Laceration, Burn). NOT for classification/severity.';
COMMENT ON COLUMN incidents.classification IS 'Severity classification of the incident: LTI (Lost Time Injury), MTI (Medical Treatment Injury), FAI (First Aid Injury), or Unclassified.';

-- =====================================================
-- Step 4: Create a check constraint to prevent future incorrect data
-- (Optional - uncomment if you want to enforce this at DB level)
-- =====================================================
-- ALTER TABLE incidents 
-- ADD CONSTRAINT chk_injury_type_not_classification 
-- CHECK (
--   injury_type IS NULL 
--   OR UPPER(injury_type) NOT IN ('LTI', 'MTI', 'FAI', 'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID')
-- );

-- =====================================================
-- Verification query (run after migration to verify)
-- =====================================================
-- SELECT 
--   COUNT(*) as total_incidents,
--   COUNT(CASE WHEN injury_type IS NOT NULL AND UPPER(injury_type) IN ('LTI', 'MTI', 'FAI') THEN 1 END) as still_incorrect,
--   COUNT(CASE WHEN classification IN ('LTI', 'MTI', 'FAI') THEN 1 END) as properly_classified
-- FROM incidents;


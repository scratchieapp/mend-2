-- Migration Runner Script
-- Date: 2025-08-26
-- Purpose: Run migrations in the correct order to fix incident_status column issue

-- ============================================
-- STEP 1: CHECK IF INCIDENT_STATUS COLUMN EXISTS
-- ============================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_migration_needed BOOLEAN := false;
BEGIN
  -- Check if incident_status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' 
    AND column_name = 'incident_status'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    RAISE NOTICE 'incident_status column does not exist. It will be added.';
    v_migration_needed := true;
  ELSE
    RAISE NOTICE 'incident_status column already exists.';
    
    -- Check if the column has the check constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_incident_status'
      AND conrelid = 'incidents'::regclass
    ) THEN
      RAISE NOTICE 'incident_status check constraint missing. It will be added.';
      v_migration_needed := true;
    END IF;
  END IF;
  
  -- Store the result for later use
  IF v_migration_needed THEN
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'MIGRATION NEEDED: incident_status column or constraints';
    RAISE NOTICE 'Please run the following migrations in order:';
    RAISE NOTICE '1. 20250826_add_incident_status_column.sql';
    RAISE NOTICE '2. 20250826_performance_optimizations.sql';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'No migration needed for incident_status column';
    RAISE NOTICE 'You can proceed with performance optimizations';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================
-- STEP 2: VERIFY TABLE STRUCTURE
-- ============================================

-- Display current incidents table columns
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'incidents'
  AND column_name IN ('incident_id', 'incident_number', 'incident_status', 'date_of_injury', 'employer_id');
  
  RAISE NOTICE 'Key columns in incidents table: %', v_columns;
END $$;

-- ============================================
-- STEP 3: CHECK EXISTING INDEXES
-- ============================================

DO $$
DECLARE
  v_indexes TEXT;
BEGIN
  SELECT string_agg(indexname, ', ' ORDER BY indexname)
  INTO v_indexes
  FROM pg_indexes
  WHERE tablename = 'incidents'
  AND indexname LIKE '%status%';
  
  IF v_indexes IS NOT NULL THEN
    RAISE NOTICE 'Existing status-related indexes: %', v_indexes;
  ELSE
    RAISE NOTICE 'No status-related indexes found on incidents table';
  END IF;
END $$;

-- ============================================
-- STEP 4: PROVIDE MIGRATION COMMANDS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'RECOMMENDED MIGRATION SEQUENCE:';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Run these commands in your terminal:';
  RAISE NOTICE '';
  RAISE NOTICE '1. First, add the incident_status column:';
  RAISE NOTICE '   supabase migration up --file supabase/migrations/20250826_add_incident_status_column.sql';
  RAISE NOTICE '';
  RAISE NOTICE '2. Then, apply performance optimizations:';
  RAISE NOTICE '   supabase migration up --file supabase/migrations/20250826_performance_optimizations.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'Or run both at once:';
  RAISE NOTICE '   supabase db push';
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
END $$;
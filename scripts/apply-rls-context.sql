-- Script to apply the enhanced RLS with company context
-- Run this script in Supabase SQL Editor

-- First, check if the migration has already been applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_session_contexts'
  ) THEN
    RAISE NOTICE 'Applying enhanced RLS with company context...';
    
    -- Execute the migration
    \i ../supabase/migrations/20250826_enhanced_rls_company_context.sql
    
    RAISE NOTICE 'Migration applied successfully!';
  ELSE
    RAISE NOTICE 'Migration already applied. Skipping...';
  END IF;
END $$;

-- Test the functions
DO $$
DECLARE
  v_context INTEGER;
BEGIN
  -- Test getting context (should return null or user's default employer)
  v_context := get_employer_context();
  RAISE NOTICE 'Current context: %', v_context;
  
  -- Test setting context (this will fail if not authenticated)
  -- PERFORM set_employer_context(1);
  
  RAISE NOTICE 'RLS context system is ready!';
END $$;

-- Verify the policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('incidents', 'sites', 'workers')
ORDER BY tablename, policyname;
-- =====================================================
-- ADD SUPPORT FOR MULTIPLE INJURY BODY REGIONS
-- Date: 2025-11-25
-- Purpose: Store multiple body region selections from the body diagram
-- =====================================================

-- Add body_regions column to incidents table
-- This stores an array of SVG region IDs (e.g., ['front-head', 'front-shoulder-left', 'back-upperback'])
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS body_regions JSONB DEFAULT '[]'::jsonb;

-- Add an index for querying incidents by body region
CREATE INDEX IF NOT EXISTS idx_incidents_body_regions 
ON public.incidents USING GIN (body_regions);

-- Comment on the new column
COMMENT ON COLUMN public.incidents.body_regions IS 'JSON array of body region SVG IDs selected from the body injury diagram (e.g., ["front-head", "front-shoulder-left"])';

-- =====================================================
-- OPTIONAL: Migration helper to convert existing body_part_id to body_regions
-- This preserves existing single body part selections
-- =====================================================
-- Note: This is commented out as it requires the ui_regions mapping table
-- Uncomment and run if you want to migrate existing data

-- UPDATE public.incidents i
-- SET body_regions = COALESCE(
--     (
--         SELECT jsonb_agg(ur.svg_id)
--         FROM public.ui_regions ur
--         WHERE ur.body_part_id = i.body_part_id
--         AND ur.body_side_id = COALESCE(i.body_side_id, ur.body_side_id)
--     ),
--     '[]'::jsonb
-- )
-- WHERE i.body_part_id IS NOT NULL
-- AND (i.body_regions IS NULL OR i.body_regions = '[]'::jsonb);

-- =====================================================
-- Verify the change
-- =====================================================
-- Run this query to verify the column was added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'incidents' AND column_name = 'body_regions';


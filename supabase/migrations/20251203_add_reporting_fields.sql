-- Migration: Add fields for safety reporting system
-- Adds data quality tracking to hours_worked and jurisdictional fields to sites

-- Create enum for data source tracking (for future API integration)
DO $$ BEGIN
    CREATE TYPE hours_data_source AS ENUM ('Manual Input', 'Procore API', 'HammerTech API', 'Payroll System');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for Australian jurisdictions
DO $$ BEGIN
    CREATE TYPE australian_state AS ENUM ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add fields to hours_worked table
ALTER TABLE hours_worked
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'Manual Input';

-- Add fields to sites table
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS is_project_based BOOLEAN DEFAULT TRUE;

-- Add comment documentation
COMMENT ON COLUMN hours_worked.is_estimated IS 'Data quality flag: TRUE if hours are manually estimated, FALSE if verified from records or API';
COMMENT ON COLUMN hours_worked.data_source IS 'Source of hours data: Manual Input, Procore API, HammerTech API, or Payroll System';
COMMENT ON COLUMN sites.state IS 'Australian jurisdiction/state for cross-jurisdictional reporting (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)';
COMMENT ON COLUMN sites.is_project_based IS 'TRUE for fixed-term projects (construction), FALSE for ongoing operations (QSR, retail)';

-- Create index for state-based reporting queries
CREATE INDEX IF NOT EXISTS idx_sites_state ON sites(state) WHERE state IS NOT NULL;

-- Create index for filtering estimated vs verified hours
CREATE INDEX IF NOT EXISTS idx_hours_worked_is_estimated ON hours_worked(is_estimated);


-- =====================================================
-- CREATE INDEXES WITH CONCURRENTLY
-- =====================================================
-- IMPORTANT: Run these commands ONE AT A TIME in Supabase SQL Editor
-- They cannot be run in a transaction block
-- Each CREATE INDEX CONCURRENTLY must be run separately

-- Index 1: Primary performance index on employer_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id_conc 
ON incidents(employer_id) WHERE employer_id IS NOT NULL;

-- Index 2: Compound index for employer + date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date_conc 
ON incidents(employer_id, date_of_injury DESC) WHERE employer_id IS NOT NULL;

-- Index 3: Index on incident status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status_conc 
ON incidents(incident_status) WHERE incident_status IS NOT NULL;

-- Index 4: Index on classification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_classification_conc 
ON incidents(classification) WHERE classification IS NOT NULL;

-- Index 5: Index on estimated cost
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_estimated_cost_conc 
ON incidents(estimated_cost) WHERE estimated_cost > 0;

-- Index 6: GIN index for psychosocial factors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_psychosocial_gin_conc 
ON incidents USING GIN(psychosocial_factors) WHERE psychosocial_factors IS NOT NULL;

-- Index 7: Foreign key index for workers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workers_employer_id_conc 
ON workers(employer_id) WHERE employer_id IS NOT NULL;

-- Index 8: Foreign key index for sites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_employer_id_conc 
ON sites(employer_id) WHERE employer_id IS NOT NULL;

-- =====================================================
-- VERIFY INDEXES AFTER CREATION
-- =====================================================
-- Run this query to verify all indexes were created:
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('incidents', 'workers', 'sites')
AND indexname LIKE '%_conc'
ORDER BY tablename, indexname;

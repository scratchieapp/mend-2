-- =====================================================
-- EXECUTE THIS AFTER THE FUNCTION IS CREATED
-- Go to: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/sql/new
-- Execute each CREATE INDEX statement separately to avoid blocking
-- =====================================================

-- Index 1: Primary filtering index (most important)
CREATE INDEX IF NOT EXISTS idx_incidents_employer_date_id 
    ON incidents(employer_id, date_of_injury DESC NULLS LAST, incident_id DESC)
    WHERE employer_id IS NOT NULL;

-- Index 2: For super admin view (all records)
CREATE INDEX IF NOT EXISTS idx_incidents_date_id 
    ON incidents(date_of_injury DESC NULLS LAST, incident_id DESC);

-- Index 3: Worker filtering
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id 
    ON incidents(worker_id)
    WHERE worker_id IS NOT NULL;

-- Index 4: Date range filtering
CREATE INDEX IF NOT EXISTS idx_incidents_date_range 
    ON incidents(date_of_injury)
    WHERE date_of_injury IS NOT NULL;

-- Index 5: Workers join optimization
CREATE INDEX IF NOT EXISTS idx_workers_worker_id 
    ON workers(worker_id);

-- Index 6: Sites join optimization
CREATE INDEX IF NOT EXISTS idx_sites_site_id 
    ON sites(site_id);

-- Index 7: Departments join optimization
CREATE INDEX IF NOT EXISTS idx_departments_department_id 
    ON departments(department_id);

-- Index 8: Employers join optimization
CREATE INDEX IF NOT EXISTS idx_employers_employer_id 
    ON employers(employer_id);

-- Index 9: Status filtering
CREATE INDEX IF NOT EXISTS idx_incidents_status 
    ON incidents(incident_status)
    WHERE incident_status IS NOT NULL;

-- Index 10: Classification filtering
CREATE INDEX IF NOT EXISTS idx_incidents_classification 
    ON incidents(classification)
    WHERE classification IS NOT NULL;

-- Update table statistics after indexes are created
VACUUM ANALYZE incidents;
VACUUM ANALYZE employers;
VACUUM ANALYZE workers;
VACUUM ANALYZE sites;
VACUUM ANALYZE departments;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('incidents', 'employers', 'workers', 'sites', 'departments')
ORDER BY tablename, indexname;
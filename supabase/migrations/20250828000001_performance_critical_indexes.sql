-- CRITICAL PERFORMANCE FIX: Add indexes for 5-minute load time issue
-- Date: 2025-08-28
-- Purpose: Optimize database queries with proper indexing

-- =============================================================================
-- CRITICAL INDEXES FOR INCIDENTS TABLE
-- =============================================================================

-- Index for employer filtering (MOST CRITICAL - used in every RBAC query)
CREATE INDEX IF NOT EXISTS idx_incidents_employer_id 
ON incidents(employer_id) 
WHERE employer_id IS NOT NULL;

-- Index for date filtering (commonly used in dashboards)
CREATE INDEX IF NOT EXISTS idx_incidents_date_of_injury 
ON incidents(date_of_injury DESC NULLS LAST);

-- Composite index for employer + date (common filter combination)
CREATE INDEX IF NOT EXISTS idx_incidents_employer_date 
ON incidents(employer_id, date_of_injury DESC NULLS LAST)
WHERE employer_id IS NOT NULL;

-- Index for worker filtering
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id 
ON incidents(worker_id)
WHERE worker_id IS NOT NULL;

-- Index for site and department joins
CREATE INDEX IF NOT EXISTS idx_incidents_site_id 
ON incidents(site_id)
WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_department_id 
ON incidents(department_id)
WHERE department_id IS NOT NULL;

-- Index for incident status filtering
CREATE INDEX IF NOT EXISTS idx_incidents_status 
ON incidents(incident_status)
WHERE incident_status IS NOT NULL;

-- =============================================================================
-- CRITICAL INDEXES FOR WORKERS TABLE
-- =============================================================================

-- Index for employer filtering on workers
CREATE INDEX IF NOT EXISTS idx_workers_employer_id 
ON workers(employer_id)
WHERE employer_id IS NOT NULL;

-- Index for worker lookups
CREATE INDEX IF NOT EXISTS idx_workers_worker_id 
ON workers(worker_id);

-- =============================================================================
-- CRITICAL INDEXES FOR USERS TABLE
-- =============================================================================

-- Index for Clerk user ID lookups (used in every auth query)
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id 
ON users(clerk_user_id)
WHERE clerk_user_id IS NOT NULL;

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role_id 
ON users(role_id);

-- =============================================================================
-- CRITICAL INDEXES FOR USER_EMPLOYERS JUNCTION TABLE
-- =============================================================================

-- Index for user employer lookups
CREATE INDEX IF NOT EXISTS idx_user_employers_user_id 
ON user_employers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_employers_employer_id 
ON user_employers(employer_id);

-- Composite index for user + employer (common lookup)
CREATE INDEX IF NOT EXISTS idx_user_employers_user_employer 
ON user_employers(user_id, employer_id);

-- Index for primary employer lookups
CREATE INDEX IF NOT EXISTS idx_user_employers_primary 
ON user_employers(user_id, is_primary)
WHERE is_primary = true;

-- =============================================================================
-- CRITICAL INDEXES FOR INCIDENT_DOCUMENTS
-- =============================================================================

-- Index for document count queries
CREATE INDEX IF NOT EXISTS idx_incident_documents_incident_id 
ON incident_documents(incident_id);

-- =============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =============================================================================

-- Update statistics for query planner optimization
ANALYZE incidents;
ANALYZE workers;
ANALYZE employers;
ANALYZE users;
ANALYZE user_employers;
ANALYZE sites;
ANALYZE departments;
ANALYZE incident_documents;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_incidents_employer_id IS 'Critical performance index for RBAC employer filtering';
COMMENT ON INDEX idx_incidents_date_of_injury IS 'Performance index for date-based incident queries';
COMMENT ON INDEX idx_incidents_employer_date IS 'Composite index for employer + date filtering';
COMMENT ON INDEX idx_users_clerk_user_id IS 'Critical index for Clerk authentication lookups';
COMMENT ON INDEX idx_user_employers_user_employer IS 'Performance index for user-employer relationships';
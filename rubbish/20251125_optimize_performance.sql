-- 1. Index Foreign Keys for Incident Joins (Critical for Incident Details)
CREATE INDEX IF NOT EXISTS idx_incidents_site_id ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON incidents(worker_id);
CREATE INDEX IF NOT EXISTS idx_incidents_department_id ON incidents(department_id);
CREATE INDEX IF NOT EXISTS idx_incidents_body_part_id ON incidents(body_part_id);

-- 2. Index for User Management (Fixes User Page Sluggishness)
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_employer_id ON users(employer_id);

-- 3. Optimize Query Planner
ANALYZE incidents;
ANALYZE users;


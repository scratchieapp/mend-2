-- =====================================================
-- Performance Fix: Speed up user role lookup by email
-- Date: 2025-08-29
-- Context: Frontend fetches user role via users.email (Clerk flow)
--          Without an index on users.email, this can cause 5-10s delays.
-- =====================================================

-- Create a btree index on users.email for fast equality comparisons
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

-- Optional: If email is CITEXT in your schema, the above is sufficient.
-- If email were case-insensitive text without CITEXT, an expression index like
--   CREATE INDEX ... ON users ((lower(email)));
-- could be used, paired with lower(...) in queries. We keep it simple here
-- since the current query uses eq("email", <exact value>).

-- Verification (manual):
-- 1) In the browser Network tab, find the request to /rest/v1/users?select=...&email=eq.*
-- 2) After applying this migration, that request should complete in <100ms.
-- 3) Dashboard incidents should then load immediately via get_dashboard_data.



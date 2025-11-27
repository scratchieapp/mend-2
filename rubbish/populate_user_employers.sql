-- =====================================================================
-- SEED DATA FOR USER_EMPLOYERS TABLE
-- Run this AFTER applying the main migration
-- This creates sample assignments for testing different scenarios
-- =====================================================================

-- Clear existing test data (optional - comment out in production)
-- DELETE FROM user_employers WHERE notes LIKE 'Test data%';

-- =============================================================================
-- SCENARIO 1: Builder Admin with single employer (most common)
-- =============================================================================
-- role5@scratchie.com should only see Newcastle Construction Co. (employer_id = 1)
INSERT INTO user_employers (user_id, employer_id, is_primary, notes)
SELECT 
    user_id,
    1 as employer_id,
    true as is_primary,
    'Test data: Builder Admin single employer assignment'
FROM users 
WHERE email = 'role5@scratchie.com'
ON CONFLICT (user_id, employer_id) DO UPDATE
SET is_primary = true, notes = EXCLUDED.notes;

-- =============================================================================
-- SCENARIO 2: Multi-employer Builder Admin (for testing)
-- Create a test user with access to multiple employers
-- =============================================================================
-- First, ensure we have a multi-employer test user
INSERT INTO users (
    user_id,
    email,
    display_name,
    custom_display_name,
    role_id,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'multi.builder@scratchie.com',
    'Multi-Employer Builder',
    'Builder Admin (Multi)',
    5,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Assign to multiple employers
WITH test_user AS (
    SELECT user_id FROM users WHERE email = 'multi.builder@scratchie.com'
)
INSERT INTO user_employers (user_id, employer_id, is_primary, notes)
SELECT 
    tu.user_id,
    e.employer_id,
    CASE WHEN e.employer_id = 1 THEN true ELSE false END as is_primary,
    'Test data: Multi-employer Builder Admin'
FROM test_user tu
CROSS JOIN (
    SELECT employer_id FROM employers WHERE employer_id IN (1, 2, 3)
) e
ON CONFLICT (user_id, employer_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary, notes = EXCLUDED.notes;

-- =============================================================================
-- SCENARIO 3: Site Admin with specific site assignments
-- =============================================================================
-- Create a site admin if doesn't exist
INSERT INTO users (
    user_id,
    email,
    display_name,
    custom_display_name,
    role_id,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
     'site.admin@scratchie.com',
    'Site Administrator',
    'Site Admin',
    6,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Assign to specific employer
WITH test_user AS (
    SELECT user_id FROM users WHERE email = 'site.admin@scratchie.com'
)
INSERT INTO user_employers (user_id, employer_id, is_primary, notes)
SELECT 
    user_id,
    2, -- Sydney Construction Co.
    true,
    'Test data: Site Admin assignment'
FROM test_user
ON CONFLICT (user_id, employer_id) DO UPDATE
SET is_primary = true, notes = EXCLUDED.notes;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the assignments
-- =============================================================================

-- Show all user-employer assignments
SELECT 
    u.email,
    u.custom_display_name as role,
    u.role_id,
    e.employer_name,
    ue.is_primary,
    ue.assigned_at,
    ue.notes
FROM user_employers ue
JOIN users u ON ue.user_id = u.user_id
JOIN employers e ON ue.employer_id = e.employer_id
ORDER BY u.role_id, u.email, ue.is_primary DESC;

-- Show users WITHOUT employer assignments (should be MEND staff)
SELECT 
    u.email,
    u.custom_display_name as role,
    u.role_id,
    CASE 
        WHEN u.role_id IN (1,2,3,4) THEN 'MEND Staff - Sees All'
        ELSE 'No Access Assigned'
    END as access_level
FROM users u
LEFT JOIN user_employers ue ON u.user_id = ue.user_id
WHERE ue.user_employer_id IS NULL
ORDER BY u.role_id, u.email;

-- Test the get_user_employer_ids function
SELECT 
    u.email,
    u.role_id,
    get_user_employer_ids(u.user_id, u.role_id) as allowed_employers
FROM users u
WHERE u.email IN (
    'role1@scratchie.com',  -- Should return NULL (sees all)
    'role5@scratchie.com',  -- Should return [1]
    'multi.builder@scratchie.com'  -- Should return [1,2,3]
);

-- Count incidents each user should see
WITH user_access AS (
    SELECT 
        u.user_id,
        u.email,
        u.role_id,
        get_user_employer_ids(u.user_id, u.role_id) as allowed_employers
    FROM users u
    WHERE u.email IN ('role1@scratchie.com', 'role5@scratchie.com')
)
SELECT 
    ua.email,
    ua.role_id,
    CASE 
        WHEN ua.allowed_employers IS NULL THEN 'All Employers'
        ELSE array_to_string(ua.allowed_employers, ',')
    END as access_to,
    COUNT(i.*) as incident_count
FROM user_access ua
LEFT JOIN incidents i ON 
    ua.allowed_employers IS NULL -- MEND staff see all
    OR i.employer_id = ANY(ua.allowed_employers) -- Others see assigned employers
GROUP BY ua.email, ua.role_id, ua.allowed_employers;

-- =============================================================================
-- CLEANUP (Optional - uncomment to remove test data)
-- =============================================================================
-- DELETE FROM user_employers WHERE notes LIKE 'Test data%';
-- DELETE FROM users WHERE email IN ('multi.builder@scratchie.com', 'site.admin@scratchie.com');
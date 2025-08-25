-- Migration: Populate custom_display_name with role_label for all users
-- Description: Sets the custom_display_name column in users table to the corresponding role_label from user_roles table
-- Date: 2025-08-24

-- Update all users' custom_display_name with their role_label
UPDATE users u
SET custom_display_name = ur.role_label
FROM user_roles ur
WHERE u.role_id = ur.role_id
  AND (u.custom_display_name IS NULL OR u.custom_display_name = '');

-- Optional: Update ALL users regardless of existing custom_display_name
-- Uncomment the following if you want to reset all display names to role labels

UPDATE users u
SET custom_display_name = ur.role_label
FROM user_roles ur
WHERE u.role_id = ur.role_id;


-- Verify the update (query to check results)
-- This is a comment showing how to verify the migration worked
/*
SELECT 
    u.user_id,
    u.email,
    u.role_id,
    ur.role_label,
    u.custom_display_name,
    CASE 
        WHEN u.custom_display_name = ur.role_label THEN 'Matched'
        ELSE 'Not Matched'
    END as status
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.role_id
ORDER BY u.role_id;
*/
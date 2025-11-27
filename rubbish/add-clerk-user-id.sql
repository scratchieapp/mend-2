-- Add clerk_user_id column to users table for Clerk integration
-- This column will store the Clerk user ID (string format)

-- Add the new column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- Add a comment to document the column
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user ID for authentication integration';
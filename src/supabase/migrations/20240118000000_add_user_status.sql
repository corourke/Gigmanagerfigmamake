-- Add user_status column to users table for pending user placeholders
-- This allows creating user records before authentication is complete

ALTER TABLE users 
ADD COLUMN user_status TEXT DEFAULT 'active' 
CHECK (user_status IN ('active', 'inactive', 'pending'));

-- Add index for efficient queries on pending users
CREATE INDEX idx_users_status ON users(user_status);

-- Add index for email lookups (used during invitation acceptance)
CREATE INDEX idx_users_email ON users(email) WHERE user_status = 'pending';

COMMENT ON COLUMN users.user_status IS 'User account status: active (authenticated), pending (invited but not yet authenticated), inactive (disabled)';

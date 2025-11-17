# User Status Migration

## Overview

This migration adds the `user_status` column to the `users` table to support the User Placeholder feature. This allows creating pending user records immediately when sending invitations, so they can be assigned to gigs before they authenticate.

## Migration File

The migration is located at: `/supabase/migrations/20240118000000_add_user_status.sql`

## What This Migration Does

1. **Drops the foreign key constraint** from `users.id` to `auth.users(id)`:
   - This is necessary to allow creating pending user records before authentication
   - Pending users get a generated UUID that doesn't exist in `auth.users` yet
   - When the user authenticates, their ID is updated to match `auth.users.id`

2. Adds `user_status` column to `users` table with three possible values:
   - `active` (default) - Authenticated, active user
   - `pending` - Invited user who hasn't authenticated yet (placeholder)
   - `inactive` - Disabled user account

3. Creates indexes for efficient querying:
   - Index on `user_status` column
   - Index on `email` for pending users

4. Adds `ON UPDATE CASCADE` to foreign key constraints:
   - `organization_members.user_id` → `users(id)`
   - `gig_staff_assignments.user_id` → `users(id)`
   - `invitations.invited_by` → `users(id)`
   - `invitations.accepted_by` → `users(id)`
   
   This allows the user ID to be updated when converting pending users to active users, and all related records automatically update.

## Security Implications

**Dropping `users.id → auth.users(id)` foreign key**:
- ⚠️ The `users` table is no longer strictly tied to `auth.users`
- This is intentional to support pending user placeholders
- Application code must ensure:
  - Active users always have valid `auth.users` records
  - Pending users are converted to active with proper auth IDs
  - No orphaned user records remain without auth backing
- The `user_status` field tracks which users have auth records ('active') vs placeholders ('pending')

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `/supabase/migrations/20240118000000_add_user_status.sql`
4. Click "Run" to execute the migration

### Option 2: Supabase CLI

```bash
supabase db push
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check that the column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'user_status';

-- Check that existing users have 'active' status
SELECT user_status, COUNT(*) 
FROM users 
GROUP BY user_status;
```

## Feature Description

### User Placeholder Workflow

1. **Invite New User**: Admin invites a new user via the Team screen
   - User record is created immediately with `user_status = 'pending'`
   - User is added to organization
   - Invitation email is sent
   - User can now be assigned to gigs

2. **User Accepts Invitation**: When the invited user authenticates
   - Their `user_status` is updated from `pending` to `active`
   - Invitation is marked as accepted
   - They can now log in and access the system

### Benefits

- **Immediate Assignment**: Pending users can be assigned to gigs before they authenticate
- **No Delays**: Don't need to wait for invitation acceptance to staff events
- **Clear Status**: Visual "Pending" badges show which users haven't authenticated yet
- **Historical Tracking**: All staffing assignments are preserved when user activates

## Rollback

If you need to rollback this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_email;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS user_status;
```

**WARNING**: Rolling back this migration will remove the ability to distinguish between active, pending, and inactive users. Any pending users will remain in the system but without status tracking.
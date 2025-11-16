# Migration 007: Add Default Staff Role to Organization Members

## Overview
This migration adds a `default_staff_role_id` column to the `organization_members` table to allow each member to have a default staff role that will be pre-selected when assigning them to gigs.

## Migration File
`/supabase/migrations/007_add_default_staff_role.sql`

## How to Apply

### Option 1: Supabase SQL Editor (Recommended for Production)
1. Log into your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `/supabase/migrations/007_add_default_staff_role.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration

### Option 2: Supabase CLI (for Development/Local)
```bash
# If you have the Supabase CLI installed and linked to your project
supabase db push
```

## What This Migration Does
1. Adds `default_staff_role_id` column to `organization_members` table
2. Creates a foreign key reference to `staff_roles(id)` with `ON DELETE SET NULL`
3. Creates an index on the new column for query optimization
4. Adds a comment describing the column's purpose

## Features Enabled
- Users can select a default staffing role when editing team members
- Admins/Managers can assign default roles to staff members
- Default roles are displayed in the Team Management screen
- The role can be used as a default when assigning staff to gigs

## Verification
After applying the migration, you can verify it was successful by running:

```sql
-- Check that the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
  AND column_name = 'default_staff_role_id';

-- Check that the index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organization_members'
  AND indexname = 'idx_org_members_default_staff_role';
```

## Rollback
If you need to rollback this migration:

```sql
-- Remove the index
DROP INDEX IF EXISTS idx_org_members_default_staff_role;

-- Remove the column
ALTER TABLE organization_members
DROP COLUMN IF EXISTS default_staff_role_id;
```

## Related Code Changes
- Updated `UserProfileForm` component to include default staff role selector
- Updated `TeamScreen` to use the new shared `UserProfileForm`
- Updated `updateMemberDetails` API function to handle the new field
- Added `getStaffRoles` API function to fetch available staff roles
- Updated backend to return full user profile data including new fields

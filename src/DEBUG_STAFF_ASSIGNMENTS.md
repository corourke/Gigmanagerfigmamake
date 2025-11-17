# Debugging Staff Assignment Issues

## Problem
After adding the user_status migration, staff assignments are no longer working for either active or pending users. No error messages are shown in the UI.

## Root Cause Investigation

The migration made these changes:
1. Dropped `users.id → auth.users(id)` foreign key constraint
2. Added `ON UPDATE CASCADE` to all foreign keys referencing `users(id)`

This could cause issues if:
- RLS policies on tables are checking `auth.users` 
- RLS policies are failing for pending users who don't have `auth.users` records
- The database operations are failing silently

## Fix Applied

Added comprehensive error checking to `updateGigStaffSlots()` in `/utils/api.tsx`:
- All database operations now check for errors
- Errors are logged to console with context
- Errors are thrown to propagate to the UI

## How to Debug

1. **Open Browser Console** - Look for error messages starting with:
   - "Error deleting staff slots:"
   - "Error fetching staff role:"
   - "Error creating staff role:"
   - "Error updating staff slot:"
   - "Error creating staff slot:"
   - "Error fetching existing assignments:"
   - "Error deleting staff assignments:"
   - "Error updating staff assignment:"
   - "Error creating staff assignment:"

2. **Check for RLS Policy Issues** - If you see errors like "new row violates row-level security policy", the issue is with RLS policies on:
   - `gig_staff_slots`
   - `gig_staff_assignments`
   - `staff_roles`

3. **Check for Foreign Key Issues** - If you see errors about foreign key constraints, it might be related to the CASCADE changes

## Likely Issue: RLS Policies

The most likely issue is that RLS policies on `gig_staff_assignments` or `gig_staff_slots` are checking for `auth.users` existence, which fails for pending users.

### Check RLS Policies

Run this in Supabase SQL Editor:

```sql
-- Check RLS policies on gig_staff_assignments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'gig_staff_assignments';

-- Check RLS policies on gig_staff_slots
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'gig_staff_slots';

-- Check RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
```

### Potential Fix

If RLS policies are checking `auth.users`, they need to be updated to allow operations on pending users. For example, if a policy looks like:

```sql
-- OLD (might fail for pending users)
CREATE POLICY "Users can read assignments" ON gig_staff_assignments
  FOR SELECT USING (user_id = auth.uid());
```

It should be updated to handle pending users properly, or we need to ensure that the current user has permissions through organization membership rather than direct user ID matching.

## Next Steps

1. Try to add a staff assignment again
2. Check the browser console for error messages
3. Report the specific error message
4. We'll update RLS policies if needed

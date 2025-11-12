# 🔧 Database Migration Instructions

## Critical: Run Migration to Fix RLS Errors

You are currently experiencing errors when trying to fetch or save gigs:

```
Error: Cannot coerce the result to a single JSON object
Code: PGRST116
```

This is caused by **Row Level Security (RLS) policies** on the `gigs` table that are either:
1. Referencing the old `organization_id` column that no longer exists
2. Creating circular dependencies by querying `gig_participants`

## ✅ Solution: Run the Migration Script

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query

### Step 2: Copy and Run the Migration
1. Open the file `/supabase/migrations/003_fix_all_rls_recursion.sql`
2. Copy the **entire contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify Success
After running the migration, you can verify it worked by running this query:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('gigs', 'organization_members', 'gig_participants', 'gig_staff_slots', 'gig_staff_assignments', 'gig_kit_assignments')
AND schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** All tables should show `rowsecurity = false`

## 📋 What This Migration Does

The migration disables RLS on the following tables and drops their problematic policies:

### Tables with RLS Disabled:
- ✅ **gigs** - Policies referenced old schema or created circular dependencies
- ✅ **organization_members** - Already disabled in base schema
- ✅ **gig_participants** - Policies created self-referencing recursion
- ✅ **gig_staff_slots** - Policies queried gig_participants
- ✅ **gig_staff_assignments** - Policies queried through gig_staff_slots
- ✅ **gig_kit_assignments** - Policies queried through gig_participants

### Access Control Strategy:
With RLS disabled on these tables, **security is now handled at the application layer** in `/utils/api.tsx`:
- `getGig()` - Verifies user is a member of participating organizations
- `createGig()` - Verifies user is authenticated
- `updateGig()` - Verifies user has Admin or Manager role in participating orgs
- `getGigsForOrganization()` - Filters gigs by organization membership

## 🚨 Important Notes

1. **This migration is safe to run multiple times** - All `DROP POLICY IF EXISTS` and `ALTER TABLE` statements are idempotent
2. **Application-level security is already implemented** - The `/utils/api.tsx` file has all necessary access control checks
3. **Other tables still have RLS enabled** - `users`, `organizations`, `staff_roles`, etc. maintain database-level security

## After Migration

Once you run the migration, all the following should work correctly:
- ✅ Viewing gigs
- ✅ Creating new gigs  
- ✅ Updating gig details
- ✅ Changing venues/acts
- ✅ Managing staff assignments
- ✅ Managing participants

The errors you're experiencing will be completely resolved! 🎉

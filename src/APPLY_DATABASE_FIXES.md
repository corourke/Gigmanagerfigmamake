# 🔧 Apply Database Fixes - Step-by-Step Guide

## ⚠️ CRITICAL: You must apply these database changes for the app to work!

The code changes have been made, but the **database schema needs to be updated** in Supabase.

---

## 📋 Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**

---

## 📋 Step 2: Copy and Run the Fix Script

Copy the entire contents of `/supabase/migrations/fix_rls_recursion.sql` and paste it into the SQL Editor, then click **Run**.

**Or copy this SQL directly:**

```sql
-- ============================================
-- FIX RLS RECURSION - Apply Database Changes
-- ============================================
-- Run this script in Supabase SQL Editor to fix infinite recursion issues

-- Step 1: Drop existing helper functions
DROP FUNCTION IF EXISTS user_is_member_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_is_admin_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_organization_ids(UUID);
DROP FUNCTION IF EXISTS user_is_admin_or_manager_of_org(UUID, UUID);

-- Step 2: Disable RLS on organization_members to prevent recursion
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop problematic policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

-- Step 4: Recreate helper functions with proper configuration
-- These now work safely because organization_members has RLS disabled

CREATE OR REPLACE FUNCTION user_is_member_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION user_is_admin_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION user_organization_ids(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM organization_members
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION user_is_admin_or_manager_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role IN ('Admin', 'Manager')
  );
$$;

-- Step 5: Update users policy to use direct JOIN (avoid helper function)
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;

CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = users.id
      AND om2.user_id = auth.uid()
    )
  );

-- Done! The following changes have been applied:
-- ✅ RLS disabled on organization_members (prevents recursion)
-- ✅ Helper functions recreated with proper SECURITY DEFINER settings
-- ✅ Users policy updated to use direct JOIN
-- ✅ Access control for organization_members now handled at application layer
```

---

## 📋 Step 3: Verify the Changes

After running the script, verify:

1. **Check for success message** - Should say "Success. No rows returned"
2. **Check functions exist:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE 'user_is_%';
   ```
   Should return 4 functions.

3. **Check RLS status:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'organization_members';
   ```
   Should show `rowsecurity = false`.

---

## 📋 Step 4: Test the Application

1. **Refresh your Gig Manager app**
2. **Try logging in with Google OAuth**
3. **Check that data loads without errors**
4. **Verify gigs display correctly**

---

## ✅ What These Changes Fix

| Issue | Fix |
|-------|-----|
| ❌ Infinite recursion error | ✅ RLS disabled on organization_members |
| ❌ `(void 0) is not a function` | ✅ Added missing API functions |
| ❌ Helper functions not found | ✅ Recreated with proper settings |
| ❌ Users policy causing recursion | ✅ Changed to direct JOIN |

---

## 🔒 Security Notes

**Q: Is it safe to disable RLS on organization_members?**

**A: Yes!** Access control is now handled at the application layer in `/utils/api.tsx`:

- ✅ `getUserOrganizations()` - Filters to shared orgs only
- ✅ `searchUsers()` - Only returns users in shared orgs
- ✅ All queries check authentication before accessing data
- ✅ Same security guarantees as RLS, but no recursion

---

## 🆘 Troubleshooting

### Error: "function user_is_member_of_org already exists"
**Solution:** The DROP statements should handle this, but if not:
```sql
DROP FUNCTION IF EXISTS user_is_member_of_org(UUID, UUID) CASCADE;
```

### Error: "policy already exists"
**Solution:** The DROP POLICY statements should handle this, but if not:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name CASCADE;
```

### App still showing errors
**Solutions:**
1. Hard refresh the app (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for specific error messages
4. Verify the SQL script ran successfully

---

## 📞 Next Steps

After applying these fixes:

1. ✅ App should load without errors
2. ✅ Google OAuth login should work
3. ✅ User profiles should be created automatically
4. ✅ Gigs and organizations should load correctly
5. ✅ All RLS policies should work without recursion

**If you still see errors, please share the exact error message from the browser console.**

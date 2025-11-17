# Invitation Acceptance RLS Policy Fix

## Problem Summary

When invited users authenticate, their invitation status was not being updated from 'pending' to 'accepted' due to a Row Level Security (RLS) policy conflict.

### Root Cause

1. **RLS Policy Too Restrictive**: The `invitations` table had an UPDATE policy that only allowed Admins and Managers to update invitations
2. **Self-Acceptance Blocked**: When invited users (Staff/Viewer roles) tried to accept their own invitation during authentication, the update failed silently
3. **Missing Field**: The `accepted_by` field was not being populated
4. **Silent Failures**: Errors were logged but not thrown, making debugging difficult

## Solution Implementation

### 1. Database Migration (NEW)

**File**: `/supabase/migrations/20241118000000_fix_invitation_acceptance_rls.sql`

**Changes**:
- Drops the old restrictive RLS policy: `"Admins and Managers can update invitations"`
- Creates new policy: `"Admins and Managers can update invitations, users can accept their own"`
- New policy allows:
  - Admins/Managers to update any invitations in their organization (existing behavior)
  - **Invited users to accept their own invitations** by matching their email (NEW)

**SQL Logic**:
```sql
USING (
  -- Admins/Managers can update any invitation
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('Admin', 'Manager')
  )
  OR 
  -- Invited users can accept their own invitation
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
```

### 2. API Function Update

**File**: `/utils/api.tsx`
**Function**: `convertPendingToActive()`

**Changes**:
1. Added `accepted_by: authUserId` to the invitation update
2. Changed error handling to throw instead of silently logging
3. Now properly tracks who accepted the invitation

**Before**:
```typescript
const { error: inviteError } = await supabase
  .from('invitations')
  .update({ 
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  })
  .eq('email', email)
  .eq('status', 'pending');

if (inviteError) {
  console.error('Error updating invitation status:', inviteError);
  // Don't throw - invitation might not exist
}
```

**After**:
```typescript
const { error: inviteError } = await supabase
  .from('invitations')
  .update({ 
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    accepted_by: authUserId,  // NEW: Track who accepted
  })
  .eq('email', email)
  .eq('status', 'pending');

if (inviteError) {
  console.error('Error updating invitation status:', inviteError);
  throw new Error(`Failed to accept invitation: ${inviteError.message}`);  // NEW: Throw error
}
```

## How to Apply

### Step 1: Run Database Migration

Apply the migration in the Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- /supabase/migrations/20241118000000_fix_invitation_acceptance_rls.sql
```

Or if using the Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Policy Update

Check that the policy was updated:

```sql
-- View the new policy
SELECT * FROM pg_policies 
WHERE tablename = 'invitations' 
AND policyname = 'Admins and Managers can update invitations, users can accept their own';
```

### Step 3: Test the Flow

1. **Create an invitation** as an Admin:
   - Invite a new user with Staff or Viewer role
   - Verify invitation record is created with status='pending'

2. **Accept the invitation** as the invited user:
   - Sign up/sign in with the invited email
   - Check browser console for any RLS errors
   - Verify invitation status updates to 'accepted'
   - Verify `accepted_at` and `accepted_by` are populated

3. **Check database**:
   ```sql
   SELECT id, email, role, status, accepted_at, accepted_by, invited_by
   FROM invitations
   WHERE email = 'invited-user@example.com'
   ORDER BY created_at DESC;
   ```

## Expected Behavior After Fix

### Authentication Flow

1. **User signs up** with email that has pending invitation
2. `convertPendingToActive()` is called
3. **Pending user record** is converted to active (existing)
4. **Invitation status** is updated to 'accepted' (FIXED)
5. **accepted_at** is set to current timestamp (FIXED)
6. **accepted_by** is set to the authenticated user ID (NEW)
7. User can now access the organization with their assigned role

### RLS Policy Behavior

| User Role | Can Update Invitations | Can Accept Own Invitation |
|-----------|----------------------|---------------------------|
| Admin | ✅ All in org | ✅ Yes |
| Manager | ✅ All in org | ✅ Yes |
| Staff | ❌ No | ✅ Yes (NEW) |
| Viewer | ❌ No | ✅ Yes (NEW) |

## Verification Queries

### Check Invitation Acceptance

```sql
-- See all accepted invitations with details
SELECT 
  i.email,
  i.role,
  i.status,
  i.accepted_at,
  i.accepted_by,
  u.first_name || ' ' || u.last_name as accepted_by_name,
  i.invited_by,
  inv.first_name || ' ' || inv.last_name as invited_by_name
FROM invitations i
LEFT JOIN users u ON i.accepted_by = u.id
LEFT JOIN users inv ON i.invited_by = inv.id
WHERE i.status = 'accepted'
ORDER BY i.accepted_at DESC;
```

### Check for Failed Acceptances

```sql
-- Find invitations that should have been accepted but weren't
-- (user exists in auth but invitation still pending)
SELECT 
  i.email,
  i.role,
  i.status,
  i.created_at,
  EXISTS (SELECT 1 FROM auth.users WHERE email = i.email) as user_exists
FROM invitations i
WHERE i.status = 'pending'
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = i.email);
```

## Rollback Plan

If issues occur, you can rollback to the original policy:

```sql
-- Drop the new policy
DROP POLICY IF EXISTS "Admins and Managers can update invitations, users can accept their own" ON invitations;

-- Recreate the original restrictive policy
CREATE POLICY "Admins and Managers can update invitations"
  ON invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );
```

## Related Files

- Migration: `/supabase/migrations/20241118000000_fix_invitation_acceptance_rls.sql`
- API Function: `/utils/api.tsx` (function `convertPendingToActive`)
- Login Flow: `/components/LoginScreen.tsx` (calls `convertPendingToActive`)
- Original Policy: `/supabase/migrations/20240117000000_create_invitations_table.sql`

## Impact Assessment

### What Changed
- ✅ Invited users can now accept their own invitations
- ✅ Invitation acceptance is properly tracked with `accepted_by` field
- ✅ Errors are now thrown and visible for debugging
- ✅ No breaking changes to existing Admin/Manager permissions

### What Stayed the Same
- ✅ Admins/Managers still have full control over invitations
- ✅ Users can only accept invitations sent to their email
- ✅ Other RLS policies remain unchanged
- ✅ Invitation creation/deletion permissions unchanged

## Success Criteria

- [ ] Migration runs without errors
- [ ] RLS policy is updated in database
- [ ] Invited Staff users can sign up and invitation status updates to 'accepted'
- [ ] Invited Viewer users can sign up and invitation status updates to 'accepted'
- [ ] `accepted_at` timestamp is populated
- [ ] `accepted_by` field is populated with correct user ID
- [ ] No RLS errors in browser console during authentication
- [ ] Admins/Managers can still manage invitations as before

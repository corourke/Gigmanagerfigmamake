# Team Management Setup Guide

## Overview

The team management system has been redesigned to support two workflows:

1. **Add Existing User** - Search and add users who already have accounts
2. **Invite New User** - Send email invitations to people who don't have accounts yet

This design works perfectly with Google OAuth and other SSO providers.

## Required Migration

Before using the invitation features, you need to create the `invitations` table.

### Step 1: Apply the Database Migration

Follow the instructions in `APPLY_INVITATIONS_TABLE.md` to create the invitations table.

**Quick Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `APPLY_INVITATIONS_TABLE.md`
3. Verify with: `SELECT * FROM invitations;`

### Step 2: Test the Features

After applying the migration:

✅ **Add Existing User**
- Search for users by name or email
- Select a user from results
- Choose their role (Admin, Manager, or Member)
- Add them to your organization instantly

✅ **Invite New User**
- Enter an email address
- Choose their role
- Create invitation (currently shows placeholder message)
- Invitation tracked with 7-day expiration

✅ **Manage Invitations**
- View pending invitations
- See who sent them and when they expire
- Cancel invitations if needed

## Current Behavior

### Without Migration Applied
- Team management works for existing members
- Adding existing users works
- Inviting new users shows a helpful error message
- No invitations table = graceful fallback with warning

### With Migration Applied
- Full invitation system enabled
- Pending invitations displayed
- Ready for email integration

## Future Integration

When you add email notifications:

1. **Invitation Email**: When an invitation is created, send email with link
2. **Acceptance Link**: Link includes the invitation token
3. **Sign Up Flow**: User signs up via Google/email
4. **Auto-Assignment**: System matches user email to pending invitation
5. **Role Assignment**: User automatically gets the invited role
6. **Notification**: Admin gets notified of acceptance

The database structure is already set up for this workflow!

## API Functions

### User Management
- `searchAllUsers(search)` - Search all users in system
- `addExistingUserToOrganization(orgId, userId, role)` - Add existing user
- `updateMemberDetails(memberId, data)` - Update member info
- `removeMember(memberId)` - Remove from organization

### Invitations
- `inviteUserToOrganization(orgId, email, role)` - Create invitation
- `getOrganizationInvitations(orgId)` - List pending invitations
- `cancelInvitation(invitationId)` - Cancel pending invitation

### Auth Data
- `getOrganizationMembersWithAuth(orgId)` - Get members with last login info

## Database Schema

### invitations Table
- `id` - UUID primary key
- `organization_id` - Organization reference
- `email` - Invited email address
- `role` - Role to assign (Admin/Manager/Member)
- `invited_by` - User who sent invitation
- `status` - pending/accepted/expired/cancelled
- `token` - Unique invitation token
- `expires_at` - Expiration timestamp (7 days)
- `accepted_at` - When accepted
- `accepted_by` - User who accepted

### RLS Policies
- Users can view invitations for their organizations
- Admins/Managers can create/update/delete invitations
- Proper security isolation between organizations

## Error Handling

The code gracefully handles:
- Table doesn't exist yet (shows warning)
- Network errors (shows user-friendly message)
- Duplicate invitations (prevented)
- User already exists (suggests "Add Existing User")
- Already a member (prevented)

## Next Steps

1. ✅ Apply the invitations table migration
2. ✅ Test adding existing users
3. ✅ Test inviting new users
4. ⏳ Set up email service (SendGrid, AWS SES, etc.)
5. ⏳ Implement invitation acceptance flow
6. ⏳ Add email templates
7. ⏳ Configure Google OAuth (already planned)

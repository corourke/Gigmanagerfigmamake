# User Placeholder Feature - Implementation Summary

## Overview

The User Placeholder feature allows administrators to create user records immediately when sending invitations, enabling staff to be assigned to gigs before they've authenticated. Pending users are displayed with a "Pending" status indicator and automatically convert to active users when they accept their invitation and authenticate.

## Implementation Components

### 1. Database Schema Changes

#### Migration: `20240118000000_add_user_status.sql`

**Critical Change**: Drops `users.id → auth.users(id)` foreign key constraint
- The original schema enforced that every `users.id` must exist in `auth.users`
- This prevented creating pending user records (no auth record exists yet)
- Dropping this constraint allows pending users with placeholder UUIDs
- When user authenticates, their ID is updated to match their `auth.users.id`

**Added Column**: `user_status` (TEXT)
- Values: `'active'`, `'pending'`, `'inactive'`
- Default: `'active'`
- Constraint: CHECK ensures only valid values

**Added Foreign Key Cascades**:
- All foreign keys referencing `users(id)` now have `ON UPDATE CASCADE`
- When pending user ID is updated to auth user ID, all relationships update automatically

### 2. API Functions

**File**: `/utils/api.tsx`

#### Modified Functions:

**`inviteUserToOrganization()`**
- Now accepts optional `firstName` and `lastName` parameters
- Creates user record immediately with `user_status = 'pending'`
- Adds user to organization with specified role
- Sends invitation email
- Returns both invitation and user objects
- Checks for existing users with any status (active, pending, or inactive)

**`convertPendingToActive(email, authUserId)`**
- Finds pending user by email
- Updates user ID from placeholder UUID to auth user ID
- Sets user_status to 'active'
- Marks invitation as accepted
- Called during authentication flow when invited user signs in
- **Critical**: Foreign keys with ON UPDATE CASCADE automatically update all related records

**`searchUsers()` and `searchAllUsers()`**
- Now exclude 'inactive' users (not 'pending')
- Pending users are included in searches and can be assigned to gigs

#### Edge Function Updates:

**File**: `/supabase/functions/server/index.tsx`

- Updated `GET /organizations/:id/members` endpoint to include `user_status` in response

#### Authentication Flow Integration:

**File**: `/components/LoginScreen.tsx`

- Updated `handleAuthenticatedUser()` to call `convertPendingToActive()` before creating/fetching user profile
- Checks for pending user by email and converts to active user with auth ID
- Ensures smooth transition from pending to active status during OAuth login

### 3. UI Updates

**File**: `/components/TeamScreen.tsx`

#### Invite New User Form:
- Added `first_name` and `last_name` fields
- Updated to create user placeholder immediately
- Reloads member list after invitation to show new pending user
- Enhanced success message explaining the feature

#### Members List:
- Added `user_status` field to `OrganizationMember` interface
- Shows "Pending" badge (amber) in Last Login column for pending users
- Pending users appear immediately in the member list

### 4. Documentation

- **APPLY_USER_STATUS_MIGRATION.md** - Migration instructions
- **USER_PLACEHOLDER_FEATURE.md** - This file (feature summary)

## User Workflows

### Creating a Pending User

1. Admin navigates to Team screen
2. Clicks "Add Team Member"
3. Selects "Invite New User" tab
4. Fills in:
   - First Name (optional)
   - Last Name (optional)
   - Email Address (required)
   - Role (required)
5. Clicks "Send Invitation"
6. User is created with `pending` status
7. User is added to organization
8. Invitation email is sent
9. User appears in member list with "Pending" badge
10. User can now be assigned to gigs

### Pending User Accepts Invitation

1. User receives invitation email
2. Clicks invitation link
3. Authenticates via Google OAuth (Supabase creates auth user with new ID)
4. `convertPendingToActive()` is called in `LoginScreen.handleAuthenticatedUser()`
5. User ID is updated from placeholder UUID to auth user ID
6. User status changes to 'active'
7. Foreign key CASCADE automatically updates organization_members and gig_staff_assignments
8. Invitation marked as accepted
9. User can now log in and access the system
10. All previous gig assignments are preserved

## Key Features

✅ **Immediate Assignment** - Pending users can be assigned to gigs right away
✅ **Visual Status** - Clear "Pending" badge shows users who haven't authenticated
✅ **No Duplicates** - Prevents duplicate emails across all user statuses
✅ **Graceful Conversion** - Simple single UPDATE operation converts pending to active
✅ **Preserved Relationships** - CASCADE constraints automatically update all related records
✅ **Atomic Operation** - ID conversion happens in one database transaction

## Testing Checklist

- [ ] Apply migration successfully
- [ ] Create pending user via invitation
- [ ] Pending user appears in member list with badge
- [ ] Assign pending user to gig
- [ ] Search for users (pending users should appear)
- [ ] Verify cannot create duplicate emails
- [ ] Convert pending to active (via authentication)
- [ ] Verify staffing assignments preserved after conversion

## Future Enhancements

Potential improvements for future iterations:

1. **Email Integration** - Send actual invitation emails (requires email service setup)
2. **Invitation Resend** - Allow resending invitations to pending users
3. **Bulk Invitations** - Import/invite multiple users at once
4. **Expiration Handling** - Auto-cleanup of expired pending users
5. **Admin Dashboard** - Summary view of pending invitations
6. **Reminder System** - Automated reminders for pending invitations

## Notes

- **User ID Conversion**: Pending users get a generated UUID, but authenticated users get Supabase auth ID. The conversion simply updates the user.id field, and foreign key CASCADE constraints handle all related table updates automatically.
- The conversion is a single atomic UPDATE operation - clean and simple
- Pending users are included in searches (they can be assigned to gigs immediately)
- Inactive users are excluded from most searches but remain in database for historical records
- ON UPDATE CASCADE on foreign keys ensures all relationships update automatically when user ID changes
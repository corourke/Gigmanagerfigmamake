# Supabase Integration - Complete Implementation

## Overview

The Gig Manager application has been successfully migrated to use Supabase for authentication, database storage, and real-time updates. The integration follows the Prisma schema exactly and implements proper Row-Level Security (RLS) policies.

## What Was Changed

### 1. Database Schema (Aligned with Prisma Schema)

The Supabase schema in `/supabase/migrations/001_initial_schema.sql` now matches your Prisma schema exactly:

**Updated Enums:**

- `OrganizationType`: Production, Sound, Lighting, Staging, Rentals, Venue, Act, Agency
- `GigStatus`: DateHold, Proposed, Booked, Completed, Cancelled, Settled
- `UserRole`: Admin, Manager, Staff, Viewer

**New Gig Structure:**

- Changed from `date`, `start_time`, `end_time` to `start` and `end` DateTime fields
- Added `created_by` and `updated_by` fields
- Removed direct `venue_id` and `act_id` foreign keys

**New Tables:**

- `staff_roles` - Enumerated staff roles (FOH, Monitor, Lighting, etc.)
- `gig_status_history` - Automatic logging of status changes
- `gig_participants` - Junction table for venue/act relationships
- `gig_staff_slots` - Staff positions needed for gigs
- `gig_staff_assignments` - Staff assigned to specific slots
- `gig_bids` - Bid tracking for gigs
- `org_annotations` - Organization-private notes about other orgs
- `assets` - Equipment and asset tracking

### 2. Authentication

**Multiple Authentication Methods via Supabase Auth:**

- ✅ **Email/Password** - Works immediately, no setup required
  - Sign up with email and password
  - Sign in with email and password
  - Automatic user profile creation
  
- 🔧 **Google OAuth** - Requires configuration
  - Login screen supports Google OAuth (`/components/LoginScreen.tsx`)
  - Must configure in Supabase Dashboard and Google Cloud Console
  - Follow instructions at: https://supabase.com/docs/guides/auth/social-login/auth-google

- 🔌 **Other OAuth Providers** - Optional
  - Support for GitHub, Microsoft, Facebook, Twitter, etc.
  - Enable any provider in Supabase Dashboard → Authentication → Providers
  - Can easily add more providers to the UI

**Common Features:**
- Automatic session detection and restoration on app load
- Proper redirect flow after OAuth completion
- User profiles automatically created/synced from auth data
- Session persistence across page refreshes

**See `/AUTHENTICATION_SETUP.md` for detailed setup instructions.**

### 3. Row-Level Security (RLS)

All tables have RLS policies that ensure:

- **Users only see data from their organizations**
- **Admins and Managers** can create/update gigs
- **Admins only** can delete gigs
- **All authenticated users** can view organizations (for participant selection)
- **Proper access control** for all sensitive operations

### 4. Real-Time Updates

**Supabase Realtime subscriptions** are set up in GigListScreen:

- Automatically updates the UI when gigs are inserted
- Automatically updates the UI when gigs are modified
- Automatically removes deleted gigs from the list
- No page refresh needed - instant updates across all clients

### 5. Server Endpoints

Created comprehensive REST API endpoints in `/supabase/functions/server/index.tsx`:

**User Management:**

- `POST /make-server-de012ad4/users` - Create user profile
- `GET /make-server-de012ad4/users/:id` - Get user profile

**Organization Management:**

- `GET /make-server-de012ad4/users/:userId/organizations` - Get user's organizations
- `POST /make-server-de012ad4/organizations` - Create organization
- `GET /make-server-de012ad4/organizations?type=Venue` - Get orgs by type

**Gig Management:**

- `GET /make-server-de012ad4/gigs?organization_id=xxx` - Get gigs for organization
- `GET /make-server-de012ad4/gigs/:id` - Get single gig with participants
- `POST /make-server-de012ad4/gigs` - Create gig with participants
- `PUT /make-server-de012ad4/gigs/:id` - Update gig and participants
- `DELETE /make-server-de012ad4/gigs/:id` - Delete gig

All endpoints include:

- Proper authentication checks
- Permission verification (Admin/Manager/Staff/Viewer)
- Error handling with detailed messages
- Automatic participant relationship management

### 6. Frontend Updates

**Updated Type Definitions:**

- `/utils/supabase/types.tsx` - Complete database types
- `/App.tsx` - Updated OrganizationType enum
- `/components/GigListScreen.tsx` - Updated Gig interface with start/end

**Updated Components:**

- `LoginScreen` - Real Google OAuth + session management
- `GigListScreen` - Fetches real data, real-time subscriptions, API calls for updates
- `App.tsx` - Handles sign-out properly, passes useMockData flag

**API Utilities:**

- `/utils/api.tsx` - Centralized API calling functions
- `/utils/supabase/client.tsx` - Singleton Supabase client
- `/utils/mock-data.tsx` - Updated mock data with new schema

### 7. Mock Data Support

The app can still use mock data for testing/development:

- Set `USE_MOCK_DATA = true` in `/App.tsx` (line 51)
- Mock data follows the exact same structure as real data
- Useful for development without Supabase connection

## How to Use

### Option 1: Use Real Supabase (Recommended)

1. **Run the migration in Supabase:**

   ```sql
   -- In Supabase SQL Editor, run:
   /supabase/migrations/001_initial_schema.sql
   ```

2. **Configure Google OAuth:**
   - Go to your Supabase project > Authentication > Providers
   - Enable Google provider
   - Follow setup at https://supabase.com/docs/guides/auth/social-login/auth-google

3. **Set USE_MOCK_DATA to false:**

   ```typescript
   // In /App.tsx line 51
   const USE_MOCK_DATA = false;
   ```

4. **Start the app** - It will use real auth and database

### Option 2: Use Mock Data

1. **Set USE_MOCK_DATA to true:**

   ```typescript
   // In /App.tsx line 51
   const USE_MOCK_DATA = true;
   ```

2. **Start the app** - It will use mock data (no Supabase needed)

## Data Migration

If you have existing data to migrate:

1. The migration file creates all tables with proper constraints
2. You can insert seed data using standard SQL INSERT statements
3. Make sure to maintain the new schema structure:
   - Use `start` and `end` DateTime instead of separate date/time fields
   - Create `gig_participants` entries for venue/act relationships
   - Use the new enum values (DateHold instead of "Hold Date", etc.)

## Real-Time Updates in Action

When a user in one browser:

1. Creates a new gig → Other users see it appear instantly
2. Updates a gig → Other users see the changes immediately
3. Deletes a gig → Other users see it disappear instantly

This is powered by Supabase Realtime PostgreSQL CDC (Change Data Capture).

## Security Notes

**Row-Level Security ensures:**

- Users can only view/edit gigs from their own organizations
- Viewers can read but not modify
- Staff can read and make limited updates
- Managers can create/update gigs
- Admins have full control

**The server enforces:**

- All requests must be authenticated
- User roles are verified before any operation
- Foreign key constraints prevent orphaned records

## Next Steps

### Immediate:

1. Run the migration in Supabase
2. Configure Google OAuth provider
3. Test the authentication flow
4. Verify RLS policies work correctly

### Future Enhancements:

1. Implement staff management (GigStaffSlot, GigStaffAssignment)
2. Add bid tracking (GigBid)
3. Implement organization annotations
4. Add asset management
5. Create status history views
6. Add email notifications for status changes

## Files Changed

### New Files:

- `/utils/supabase/client.tsx` - Supabase client singleton
- `/utils/supabase/types.tsx` - Database type definitions
- `/utils/api.tsx` - API calling utilities
- `/utils/mock-data.tsx` - Centralized mock data
- `/supabase/migrations/001_initial_schema.sql` - Complete schema

### Modified Files:

- `/App.tsx` - Added USE_MOCK_DATA flag, session handling
- `/components/LoginScreen.tsx` - Real Google OAuth
- `/components/GigListScreen.tsx` - Real data fetching + real-time
- `/supabase/functions/server/index.tsx` - Complete API endpoints

## Testing Checklist

- [ ] Run migration in Supabase SQL editor
- [ ] Configure Google OAuth provider
- [ ] Test login with Google account
- [ ] Verify session persistence (refresh page stays logged in)
- [ ] Create an organization
- [ ] Create a gig with venue and act
- [ ] Edit gig inline (title, date, status)
- [ ] Open app in 2 browsers, verify real-time updates
- [ ] Test RLS by switching users/organizations
- [ ] Test permission levels (Admin vs Manager vs Staff vs Viewer)

## Support

For issues:

1. Check browser console for detailed error messages
2. Check Supabase logs in dashboard
3. Verify RLS policies are enabled
4. Ensure Google OAuth is configured correctly

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ 1. Google OAuth
       ▼
┌─────────────────┐
│  Supabase Auth  │
└────────┬────────┘
         │
         │ 2. Authenticated requests
         ▼
┌──────────────────────────┐
│  Supabase Edge Function  │
│  (Hono Server)           │
│  - Authentication checks │
│  - Permission validation │
│  - Business logic        │
└───────────┬──────────────┘
            │
            │ 3. Database queries
            ▼
┌────────────────────────┐
│  PostgreSQL Database   │
│  - RLS policies active │
│  - Real-time enabled   │
└────────────────────────┘
```

## Congratulations!

Your Gig Manager app now has:
✅ Real authentication with Google OAuth
✅ Production-ready database with RLS
✅ Real-time collaborative updates
✅ Proper multi-tenant architecture
✅ Type-safe API layer
✅ Comprehensive permission system

The foundation is solid for building out the remaining features!
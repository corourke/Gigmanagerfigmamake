# Schema Migration 002 - Align with Database Specification

**Date:** November 10, 2025  
**Migration File:** `/supabase/migrations/002_align_with_spec.sql`

## Summary

This migration aligns the Supabase schema with the updated database specification, implementing major architectural changes to support shared gig ownership, equipment kit management, and enhanced organizational scoping.

## Major Changes

### 1. **Gigs Table - Architectural Redesign** ✅
- **REMOVED:** `organization_id` field (gigs are now shared across organizations)
- **ADDED:** `parent_gig_id` UUID (nullable) for hierarchical gig relationships
- **ADDED:** `hierarchy_depth` INTEGER (default 0) for tracking gig hierarchy levels

**Impact:** Gigs are no longer owned by a single organization. Instead, organizations participate in gigs through the `gig_participants` table.

### 2. **Organization Scoping Added** ✅
- **gig_staff_slots:** Added `organization_id` to identify which organization owns staff slots
- **gig_bids:** Added `organization_id` to identify which organization owns bids

**Impact:** Better tenant isolation and clearer ownership of staff positions and bids.

### 3. **New Equipment Management Tables** ✅

#### **kits** Table
Reusable equipment collections for organizations:
```sql
- id: UUID PRIMARY KEY
- organization_id: UUID (tenant ownership)
- name: TEXT
- category: TEXT
- description: TEXT (Markdown)
- tags: TEXT[]
- created_by, updated_by: UUID
- created_at, updated_at: TIMESTAMPTZ
```

#### **kit_assets** Junction Table
Links kits to their constituent assets:
```sql
- id: UUID PRIMARY KEY
- kit_id: UUID
- asset_id: UUID
- quantity: INTEGER (default 1)
- notes: TEXT
- UNIQUE(kit_id, asset_id)
```

#### **gig_kit_assignments** Table
Assigns kits to gigs:
```sql
- id: UUID PRIMARY KEY
- organization_id: UUID (tenant scoping)
- gig_id: UUID
- kit_id: UUID
- notes: TEXT
- assigned_by: UUID
- assigned_at: TIMESTAMPTZ
- UNIQUE(gig_id, kit_id)
```

### 4. **Removed Tables** ✅
- **org_annotations:** Table removed (not in specification)

### 5. **Field Additions** ✅
- **staff_roles.updated_at:** Added missing field that already had a trigger

### 6. **RLS Policies - Complete Rewrite** ✅
All gig-related RLS policies were rewritten to work with the new `gig_participants` model:

**Old Model:**
```sql
-- Gigs had organization_id, policies checked directly
WHERE organization_id = gigs.organization_id
```

**New Model:**
```sql
-- Gigs accessed through participants
EXISTS (
  SELECT 1 FROM gig_participants gp
  JOIN organization_members om ON om.organization_id = gp.organization_id
  WHERE gp.gig_id = gigs.id AND om.user_id = auth.uid()
)
```

### 7. **New RLS Policies** ✅
- Kits: Users can view/manage their organization's kits (Admin/Manager only)
- Kit Assets: Users can view/manage kit assets for their organization's kits
- Gig Kit Assignments: Users can view/manage kit assignments for accessible gigs

### 8. **Triggers** ✅
- Added `update_kits_updated_at` trigger for automatic timestamp management

## Backend Changes

### Server Endpoints Updated

#### **POST /gigs** - Create Gig
- Changed from `organization_id` to `primary_organization_id`
- Automatically creates gig_participant entry for primary org with 'Production' role
- Staff slots now require `organization_id`

#### **GET /gigs** - List Gigs
- Changed to fetch via `gig_participants` join
- Supports filtering by organization participation
- Returns unique gigs where organization is a participant

#### **GET /gigs/:id** - Get Single Gig
- Access control now checks through `gig_participants`
- User must be member of any participating organization

#### **PUT /gigs/:id** - Update Gig
- Access control checks if user is Admin/Manager of any participating org
- No longer references `gigs.organization_id`

#### **DELETE /gigs/:id** - Delete Gig
- Only Admins of participating organizations can delete
- No longer references `gigs.organization_id`

## Frontend Changes

### Type Definitions Updated (`/utils/supabase/types.tsx`)
- **DbGig:** Removed `organization_id`, added `parent_gig_id`, `hierarchy_depth`
- **DbGigStaffSlot:** Added `organization_id`
- **DbGigBid:** Added `organization_id`
- **DbOrgAnnotation:** Marked for future removal
- **New Types:** `DbKit`, `DbKitAsset`, `DbGigKitAssignment`

### Component Updates
- **CreateGigScreen:** Updated to pass `primary_organization_id` instead of `organization_id`
- Staff assignment data structure updated to match new schema

## Data Migration

### Gigs Table
- **All existing gig data was deleted** as requested
- No data migration was necessary

### Organizations
- **kept `allowed_domains` field** as requested (added to spec)

## Breaking Changes

⚠️ **This is a breaking migration:**

1. All existing gigs were deleted
2. Frontend/backend API contracts changed for gig creation
3. Access control model fundamentally changed
4. `org_annotations` table removed

## Verification Steps

Run these queries to verify the migration:

```sql
-- Verify new fields exist
SELECT parent_gig_id, hierarchy_depth FROM gigs LIMIT 1;

-- Verify organization_id removed from gigs
\d gigs  -- Should not show organization_id

-- Verify new tables exist
SELECT * FROM kits LIMIT 1;
SELECT * FROM kit_assets LIMIT 1;
SELECT * FROM gig_kit_assignments LIMIT 1;

-- Verify updated fields
SELECT organization_id FROM gig_staff_slots LIMIT 1;
SELECT organization_id FROM gig_bids LIMIT 1;
SELECT updated_at FROM staff_roles LIMIT 1;

-- Verify org_annotations is gone
\dt org_annotations  -- Should show "No relations found"

-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claims.sub TO '<user_id>';
SELECT * FROM gigs;  -- Should work through gig_participants
```

## Rollback Plan

If rollback is needed:
1. Run migration 001 to restore original schema
2. Re-seed staff_roles data
3. Recreate any organizations/gigs that were created after migration

**Note:** Data created after this migration cannot be automatically rolled back.

## Next Steps

1. ✅ Run migration in Supabase SQL Editor
2. ✅ Update frontend types
3. ✅ Update server endpoints
4. ✅ Update CreateGigScreen component
5. ⏳ Test gig creation flow
6. ⏳ Implement kit management UI (future feature)
7. ⏳ Implement hierarchical gigs UI (future feature)

## Related Files

- `/supabase/migrations/002_align_with_spec.sql` - Migration SQL
- `/utils/supabase/types.tsx` - Updated TypeScript types
- `/supabase/functions/server/index.tsx` - Updated server endpoints
- `/components/CreateGigScreen.tsx` - Updated gig creation form

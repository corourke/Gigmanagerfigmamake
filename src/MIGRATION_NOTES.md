# Migration Notes: Prisma Schema Implementation

## Schema Changes Summary

### Organization Types
**Old:** `ProductionCompany`, `SoundLightingCompany`, `RentalCompany`, `Venue`, `Act`  
**New:** `Production`, `Sound`, `Lighting`, `Staging`, `Rentals`, `Venue`, `Act`, `Agency`

### Gig Status Values
**Old:** `Hold Date`, `Proposed`, `Booked`, `Completed`, `Cancelled`, `Paid`  
**New:** `DateHold`, `Proposed`, `Booked`, `Completed`, `Cancelled`, `Settled`

### Gig Date/Time Structure
**Old:**
```typescript
{
  date: '2025-07-15',        // ISO date string
  start_time: '14:00',       // HH:MM format
  end_time: '23:00',         // HH:MM format
  timezone: 'America/Los_Angeles'
}
```

**New:**
```typescript
{
  start: '2025-07-15T14:00:00-07:00',  // Full ISO DateTime with timezone
  end: '2025-07-15T23:00:00-07:00',    // Full ISO DateTime with timezone
  timezone: 'America/Los_Angeles'       // IANA timezone identifier
}
```

### Gig Participants
**Old:** Direct foreign keys `venue_id`, `act_id` on gigs table  
**New:** Separate `gig_participants` table with flexible roles

```typescript
// Old structure
{
  venue_id: 'uuid',
  act_id: 'uuid'
}

// New structure
{
  participants: [
    { organization_id: 'uuid', role: 'Venue', notes: '...' },
    { organization_id: 'uuid', role: 'Act', notes: '...' },
    { organization_id: 'uuid', role: 'Production', notes: '...' }
  ]
}
```

## UI Compatibility Layer

To maintain the existing UI while supporting the new schema, we need helper functions:

### Date/Time Conversion

```typescript
// Convert new schema to UI format
function gigToUIFormat(gig: DbGig) {
  const startDate = new Date(gig.start);
  const endDate = new Date(gig.end);
  
  return {
    ...gig,
    date: startDate.toISOString().split('T')[0],
    start_time: startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }),
    end_time: endDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }),
    venue: gig.participants?.find(p => p.role === 'Venue')?.organization,
    act: gig.participants?.find(p => p.role === 'Act')?.organization,
  };
}

// Convert UI format to new schema
function uiToGigFormat(uiGig: UIGig) {
  const date = uiGig.date;
  const startTime = uiGig.start_time;
  const endTime = uiGig.end_time;
  
  // Construct full ISO DateTime strings
  const start = `${date}T${startTime}:00`;
  const end = `${date}T${endTime}:00`;
  
  return {
    title: uiGig.title,
    status: uiGig.status,
    start,
    end,
    timezone: uiGig.timezone,
    tags: uiGig.tags,
    notes: uiGig.notes,
    amount_paid: uiGig.amount_paid,
  };
}
```

### Status Mapping

```typescript
// Map old status to new
const STATUS_MAP: Record<string, string> = {
  'Hold Date': 'DateHold',
  'Paid': 'Settled'
};

// Map new status to old for display
const STATUS_DISPLAY_MAP: Record<string, string> = {
  'DateHold': 'Hold Date',
  'Settled': 'Paid'
};
```

## Components Requiring Updates

### High Priority (Core Functionality)
1. ✅ `App.tsx` - Update OrganizationType enum
2. ✅ `utils/supabase/types.tsx` - Update all type definitions
3. ✅ `utils/mock-data.tsx` - Update mock data to use new enums
4. ✅ `supabase/functions/server/index.tsx` - Update API endpoints
5. 🔄 `components/GigListScreen.tsx` - Add conversion layer for date/time
6. 🔄 `components/CreateGigScreen.tsx` - Update form to use new schema
7. 🔄 `components/GigDetailScreen.tsx` - Update display logic
8. 🔄 `components/CreateOrganizationScreen.tsx` - Update organization type options

### Medium Priority (UI Updates)
- Update status badges to use new status values
- Update organization type selectors
- Add participant management UI

### Low Priority (Future Enhancements)
- Staff assignment UI
- Status history viewer
- Bid tracking UI
- Asset management UI
- Organization annotations UI

## Backward Compatibility

The current implementation maintains backward compatibility by:
1. Keeping mock data in the old format
2. Using conversion functions when interfacing with Supabase
3. Preserving existing UI components and workflows
4. Adding feature flags (USE_MOCK_DATA) to toggle between modes

## Testing Checklist

- [ ] Create organization with new type options
- [ ] Create gig with date/time fields
- [ ] View gig list with proper date display
- [ ] Edit gig inline
- [ ] Add participants to gig
- [ ] Verify real-time updates work
- [ ] Test RLS policies (org isolation)
- [ ] Test role-based permissions
- [ ] Verify Google OAuth flow
- [ ] Test with multiple organizations

## Next Steps

1. Complete GigListScreen date/time conversion
2. Update CreateGigScreen to use start/end DateTime
3. Update GigDetailScreen display logic
4. Add participant management UI
5. Test end-to-end with real Supabase backend

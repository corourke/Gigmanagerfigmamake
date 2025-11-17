# Gig Edit Form Fixes - Staff & Kit Assignment Updates

## Problems Fixed

### 1. **Staff Slots & Assignments - Immediate Save Issue**
**Problem:** Staff slots and assignments were being saved immediately after each change, causing:
- Form reload after every edit (bad UX)
- Unable to fill out other fields before save
- Inconsistent with how bids and equipment work

**Solution:**
- Removed all immediate save calls from staff handlers
- Added staff slots/assignments to form submission (`onSubmit`)
- Staff data now saves when user clicks "Update Gig" button
- Matches the pattern used by bids

**Changes Made:**
- `/components/CreateGigScreen.tsx`:
  - Removed `saveStaffSlotsToDatabase()` function
  - Reverted handlers to only update local state:
    - `handleAddStaffSlot()`
    - `handleUpdateStaffSlot()`
    - `handleRemoveStaffSlot()`
    - `handleAddStaffAssignment()`
    - `handleUpdateStaffAssignment()`
    - `handleRemoveStaffAssignment()`
  - Added staff slots saving in `onSubmit()` for edit mode (lines 825-852)

### 2. **Kit Assignment Notes Not Saving**
**Problem:** 
- Kit assignment notes were only updating local state
- No API function existed to save notes
- Wrong toast message appeared ("gig_bid updated")

**Solution:**
- Created new API function: `updateGigKitAssignment()`
- Added kit notes saving to form submission
- Kit notes now save when user clicks "Update Gig"

**Changes Made:**
- `/utils/api.tsx`:
  - Added `updateGigKitAssignment()` function (after line 2282)
  - Handles updating notes and other kit assignment fields
  
- `/components/CreateGigScreen.tsx`:
  - Imported `updateGigKitAssignment`
  - Added kit assignment notes saving in `onSubmit()` for edit mode (lines 854-864)
  - Iterates through kit assignments with DB IDs and saves notes

### 3. **Error Handling in Staff Slots**
**Problem:** Database operations were failing silently with no error messages

**Solution:**
- Added comprehensive error checking to `updateGigStaffSlots()` in `/utils/api.tsx`
- All database operations now check for errors and throw with context
- Errors are logged to console with descriptive messages

## Current Behavior

### Edit Mode Flow:
1. **Staff Slots/Assignments:**
   - Add/edit/remove in UI → Updates local state only
   - Click "Update Gig" → Saves all changes to database
   - No form reload until user clicks button

2. **Kit Assignments:**
   - Add/remove kit → Saves immediately (intentional, for conflict checking)
   - Edit kit notes → Updates local state only
   - Click "Update Gig" → Saves notes to database

3. **Bids:**
   - Add/edit/remove in UI → Updates local state only
   - Click "Update Gig" → Saves all changes to database

### Create Mode Flow:
- All data (staff, kits, bids) is included in the initial creation payload
- Nothing is saved until "Create Gig" is clicked

## Consistency Check

| Feature | Add/Remove | Edit Fields | Save Timing |
|---------|-----------|-------------|-------------|
| **Participants** | Local state | Local state | On submit |
| **Staff Slots** | Local state | Local state | On submit ✅ |
| **Staff Assignments** | Local state | Local state | On submit ✅ |
| **Kit Assignments** | Immediate* | Local state | On submit ✅ |
| **Bids** | Local state | Local state | On submit |

\* Kit add/remove is immediate for business logic (conflict checking)

## Testing Checklist

- [ ] Add staff slot → Edit role/count/notes → Click "Update Gig" → Verify saved
- [ ] Add staff assignment → Select user/status/rate → Click "Update Gig" → Verify saved
- [ ] Edit existing staff assignment → Change rate/notes → Click "Update Gig" → Verify updated
- [ ] Remove staff slot → Click "Update Gig" → Verify deleted from database
- [ ] Add kit to gig → Edit kit notes → Click "Update Gig" → Verify notes saved
- [ ] Edit existing kit notes → Click "Update Gig" → Verify updated
- [ ] Check browser console for any errors during save operations
- [ ] Verify no form reload during editing (only after "Update Gig" clicked)

## Known Patterns to Watch

The form has different patterns for different data types:

1. **Form Data (title, dates, status, etc.)** - Validated and saved on submit
2. **Participants** - CRUD in local state, sent with form submission
3. **Staff Slots/Assignments** - CRUD in local state, saved separately after main form
4. **Kit Assignments** - Add/remove immediate, notes saved on submit
5. **Bids** - CRUD in local state, saved separately after main form

This is intentional for different business requirements (e.g., kit conflicts need immediate detection).

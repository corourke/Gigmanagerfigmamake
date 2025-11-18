# Staff Assignment Confirmation Workflow

## Overview
This document describes the workflow for staff members to confirm or decline their staffing assignments.

## Implementation Status
✅ Backend API routes created (`/supabase/functions/server/index.tsx`)
✅ Assignment detail screen created (`/components/AssignmentDetailScreen.tsx`)
⏳ Email integration pending
⏳ Deep link routing pending

## Workflow Steps

### 1. Assignment Created
- Gig manager assigns a staff member to a role/slot
- Assignment record created in `gig_staff_assignments` table with status `'Requested'` or `'Invited'`

### 2. Notification Sent (To Be Implemented)
When email integration is added:
```
Subject: New Gig Assignment: [Gig Name]
Body: You've been assigned to work [Role] for [Gig Name] on [Date]

[View Assignment Button] → Links to: /assignment/[assignmentId]
```

### 3. Staff Clicks Link
- Staff member clicks the email link
- App loads with a deep-link URL parameter pointing to the assignment
- If not logged in, prompt to login via Google OAuth
- After login, redirect to assignment detail screen

### 4. View Assignment Details
The assignment detail screen shows:
- **Gig Info**: Name, client, dates, location
- **Gig Notes**: Overall gig notes
- **Role**: The staff role (e.g., "Sound Engineer")
- **Role Notes**: Notes specific to this role/slot
- **Assignment Notes**: Notes specific to this individual assignment
- **Compensation**: Rate ($/hour) or Fee ($flat)

### 5. Accept or Decline
Staff member clicks:
- **Accept** → Updates status to `'Confirmed'`
- **Decline** → Updates status to `'Declined'`

### 6. Gig Manager Notification (To Be Implemented)
When email integration is added:
- Send notification to gig manager when staff responds
- Include staff member name and response (accepted/declined)

## API Endpoints

### GET `/assignments/:assignmentId`
Returns assignment details with gig and slot information.

**Auth**: Requires user to be logged in and own the assignment

**Response**:
```json
{
  "id": "assignment-id",
  "status": "Requested",
  "compensation_type": "rate",
  "rate": 50,
  "notes": "Please bring XLR cables",
  "gig": {
    "name": "Corporate Event",
    "client": "Acme Corp",
    "start": "2025-12-01T18:00:00Z",
    "end": "2025-12-01T23:00:00Z",
    "venue": "Convention Center",
    "address": "123 Main St",
    "notes": "Load in at 4pm"
  },
  "slot": {
    "role": "Sound Engineer",
    "notes": "Handle front of house mix"
  }
}
```

### POST `/assignments/:assignmentId/accept`
Accepts the assignment.

**Auth**: Requires user to be logged in and own the assignment

**Response**: Updated assignment record

### POST `/assignments/:assignmentId/decline`
Declines the assignment.

**Auth**: Requires user to be logged in and own the assignment

**Response**: Updated assignment record

## Component Usage

The `AssignmentDetailScreen` component can be used standalone:

```tsx
<AssignmentDetailScreen
  assignmentId="assignment-uuid"
  onBack={() => navigate('/dashboard')}
/>
```

## Next Steps

### For Email Notifications
1. Choose email service (Resend, SendGrid, etc.)
2. Store API key in Supabase secrets
3. Create email template
4. Add notification trigger when assignments are created/updated
5. Add notification trigger when staff responds

### For Deep Linking
1. Add URL routing to support `/assignment/:id` path
2. Store assignment ID in route state
3. Handle authentication flow for unauthenticated users
4. Redirect to assignment detail after login

### For Mobile App (Future)
1. Implement push notifications
2. Use deep links to open assignment in app
3. Cache assignment data for offline viewing

## Database Schema Reference

### gig_staff_assignments
- `id`: UUID
- `gig_id`: UUID (references gigs)
- `slot_id`: UUID (references gig_staff_slots)
- `user_id`: UUID (references users)
- `status`: ENUM ('Requested', 'Invited', 'Confirmed', 'Declined', 'Cancelled')
- `rate`: DECIMAL (hourly rate if applicable)
- `fee`: DECIMAL (flat fee if applicable)
- `notes`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Security Considerations

- ✅ Assignment details only accessible by assigned user
- ✅ Accept/Decline actions validated to ensure user owns assignment
- ⏳ Email links should include secure token (not just assignment ID)
- ⏳ Token should expire after reasonable time period
- ⏳ Rate limiting on API endpoints to prevent abuse

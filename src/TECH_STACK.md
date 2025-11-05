# Figma Make Tech Stack

This document outlines the technology stack used by Figma Make for building web applications, including both UX-only prototypes and fully functioning applications with backend integration.

## Core Stack (All Applications)

### Frontend Framework
- **React** - Component-based UI library
- **TypeScript** - Type-safe JavaScript (inferred from .tsx files)

### Styling
- **Tailwind CSS v4.0** - Utility-first CSS framework
  - Custom design tokens configured in `/styles/globals.css`
  - No `tailwind.config.js` required (using Tailwind v4)

### UI Component Library
- **Shadcn/ui** - High-quality, accessible React components
  - Located in `/components/ui/`
  - Built on Radix UI primitives
  - Fully customizable and composable

## Backend Options

### Recommended: Supabase (Full-Stack Applications)

When you request a fully functioning application with real data persistence, authentication, or API calls, Figma Make recommends **Supabase** as the backend solution.

#### What Supabase Provides:

1. **PostgreSQL Database**
   - Relational database for structured data
   - Row-level security (RLS) policies
   - Real-time subscriptions
   - Full SQL support

2. **Authentication**
   - Multiple providers (Google OAuth, GitHub, Email, etc.)
   - Session management
   - User metadata storage
   - JWT tokens

3. **Storage**
   - File uploads and management
   - CDN-backed asset delivery
   - Access control policies

4. **Edge Functions**
   - Serverless functions for custom backend logic
   - TypeScript support
   - Deployed globally on Deno runtime

5. **Real-time**
   - WebSocket-based real-time subscriptions
   - Live data updates across clients
   - Presence tracking

6. **RESTful API**
   - Auto-generated from database schema
   - Query filtering, sorting, pagination
   - Type-safe client library

#### Implementation Approach:
- **Supabase JS Client** (`@supabase/supabase-js`) for frontend integration
- **Environment Variables** for secure credential storage
- **Row-Level Security** for multi-tenant data isolation
- **Database Functions** for complex business logic

### Alternative: UX-Only Mode (Current Project)

When you explicitly request UX-only development (as with this Gig Manager project):
- **Mock Data** - In-memory data structures
- **LocalStorage** - Client-side persistence simulation
- **Mock Authentication** - Simulated OAuth flows
- **No Backend Calls** - Pure frontend application

This approach is ideal for:
- Rapid prototyping
- Design validation
- UX testing before backend implementation
- Demonstrations and mockups

## Supporting Libraries

### Icons
- **lucide-react** - Beautiful, consistent icon set
  - Modern, clean SVG icons
  - Tree-shakeable

### Data Visualization
- **recharts** - Composable charting library
  - Built on D3.js
  - React-friendly API

### Forms & Validation
- **react-hook-form@7.55.0** - Performant form library
- **zod** - TypeScript-first schema validation
- Integrated with Shadcn/ui Form components

### UI Enhancements
- **react-slick** - Carousel/slider components
- **react-responsive-masonry** - Masonry grid layouts
- **react-dnd** - Drag and drop interactions
- **motion/react** (formerly Framer Motion) - Animation library
- **popper.js** - Tooltip and popover positioning
- **sonner@2.0.3** - Toast notifications

### Date Handling
- **date-fns** - Modern date utility library
  - Used with Shadcn/ui Calendar component

### Rich Text
- **@uiw/react-md-editor** - Markdown editor (as used in MarkdownEditor.tsx)

## Tech Stack Variability

### Fixed Components
- ✅ **React** - Always used
- ✅ **Tailwind CSS** - Always used for styling
- ✅ **Shadcn/ui** - Standard UI component library
- ✅ **TypeScript** - Inferred from .tsx files

### Variable Components
- 🔄 **Backend** - Supabase recommended, but can be:
  - Mock data (UX-only mode)
  - Other backends (if explicitly requested)
  - External APIs with mock responses
  
- 🔄 **Additional Libraries** - Selected based on requirements:
  - Charts: recharts
  - Animation: motion/react
  - Forms: react-hook-form
  - Drag & Drop: react-dnd
  - And others as needed

### Not Supported
- ❌ **react-resizable** - Use `re-resizable` instead
- ❌ **Konva** - Use HTML5 Canvas directly
- ❌ **Custom build tools** - Uses built-in bundler

## File Structure Patterns

```
/
├── App.tsx                          # Main application entry point
├── components/                      # Application components
│   ├── ui/                         # Shadcn/ui components (DO NOT modify structure)
│   ├── figma/                      # Figma Make system components (PROTECTED)
│   │   └── ImageWithFallback.tsx   # Image component with fallback
│   └── [Feature]Screen.tsx         # Feature-specific screens
├── styles/
│   └── globals.css                 # Tailwind v4 config & design tokens
└── guidelines/                     # Project documentation
```

## Migration Path: UX-Only → Full-Stack

To migrate this Gig Manager application from UX-only to full-stack with Supabase:

### 1. Database Schema
Create tables for:
- `organizations` - Production companies, venues, acts, etc.
- `users` - User accounts and profiles
- `organization_members` - Many-to-many with role permissions
- `gigs` - Event/production records
- `tags` - Categorization system
- `equipment` - Inventory management
- `staff` - Personnel records
- `gig_assignments` - Staff and equipment assignments

### 2. Authentication
- Replace mock Google OAuth with Supabase Auth
- Configure Google OAuth provider in Supabase dashboard
- Implement session management with `supabase.auth.getSession()`

### 3. Data Layer
Replace:
```typescript
// UX-Only
const [gigs, setGigs] = useState(mockGigs);
```

With:
```typescript
// Full-Stack
const { data: gigs, error } = await supabase
  .from('gigs')
  .select('*, organization(*), venue(*), act(*), tags(*)')
  .eq('organization_id', currentOrgId);
```

### 4. Real-time Updates
Add subscriptions for live data:
```typescript
supabase
  .channel('gigs')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'gigs' },
    (payload) => {
      // Update UI in real-time
    }
  )
  .subscribe();
```

### 5. Row-Level Security
Implement RLS policies to ensure:
- Users only see data from their organizations
- Role-based permissions (Admin, Manager, Staff, Viewer)
- Secure multi-tenant architecture

## Privacy & Security Notice

As mentioned in Figma Make guidelines:
- **Not for PII** - Figma Make is not designed for collecting personally identifiable information
- **Not for sensitive data** - Should not be used for securing highly sensitive information
- **Prototyping focus** - Best suited for prototypes, demos, and internal tools

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS v4**: https://tailwindcss.com
- **React Documentation**: https://react.dev

## Questions?

The tech stack is designed to be:
- **Flexible** - Adapts to project requirements
- **Modern** - Uses current best practices
- **Type-safe** - TypeScript throughout
- **Scalable** - Can grow from prototype to production

Choose the approach that best fits your development workflow and timeline.

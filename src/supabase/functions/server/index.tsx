import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Helper to get authenticated user
async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message ?? 'Unauthorized' };
  }

  return { user, error: null };
}

// Health check endpoint
app.get("/make-server-de012ad4/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== User Management =====

// Create user profile after OAuth sign-up
app.post("/make-server-de012ad4/users", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { first_name, last_name, avatar_url } = body;

    // Check if user profile already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return c.json(existingUser);
    }

    // Create user profile
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        first_name: first_name ?? user.user_metadata?.first_name ?? '',
        last_name: last_name ?? user.user_metadata?.last_name ?? '',
        avatar_url: avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in user creation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user profile
app.get("/make-server-de012ad4/users/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const userId = c.req.param('id');

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      return c.json({ error: error.message }, 400);
    }

    if (!data) {
      console.log('User profile not found:', userId);
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in user fetch:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user profile
app.put("/make-server-de012ad4/users/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const userId = c.req.param('id');

  // Ensure user can only update their own profile
  if (user.id !== userId) {
    return c.json({ error: 'Cannot update another user\'s profile' }, 403);
  }

  try {
    const body = await c.req.json();
    const { first_name, last_name, phone, address_line1, address_line2, city, state, postal_code, country } = body;

    // Update user profile
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        first_name,
        last_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in user profile update:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Search users (for staff assignment)
app.get("/make-server-de012ad4/users", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const search = c.req.query('search'); // Search by name or email

  try {
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .order('first_name');

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in users search:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== Organization Management =====

// Get user's organizations
app.get("/make-server-de012ad4/users/:userId/organizations", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const userId = c.req.param('userId');

  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('*, organization:organizations(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user organizations:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in organizations fetch:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create organization
app.post("/make-server-de012ad4/organizations", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();

    // Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert(body)
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return c.json({ error: orgError.message }, 400);
    }

    // Add creator as Admin member
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'Admin',
      });

    if (memberError) {
      console.error('Error adding organization member:', memberError);
      // Try to clean up the created org
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      return c.json({ error: memberError.message }, 400);
    }

    return c.json(org);
  } catch (error) {
    console.error('Error in organization creation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Join an existing organization
app.post("/make-server-de012ad4/organizations/:orgId/join", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const orgId = c.req.param('orgId');

  try {
    // Check if organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return c.json({ error: 'Already a member of this organization' }, 400);
    }

    // Add user as a Viewer by default
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'Viewer',
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error joining organization:', memberError);
      return c.json({ error: memberError.message }, 400);
    }

    return c.json({ organization: org, role: membership.role });
  } catch (error) {
    console.error('Error in organization join:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get organizations (for venue/act selection)
app.get("/make-server-de012ad4/organizations", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const type = c.req.query('type'); // Optional filter by type
  const search = c.req.query('search'); // Optional search by name

  try {
    let query = supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Error fetching organizations:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(data);
  } catch (error) {
    console.error('Error in organizations fetch:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== Gig Management =====

// Get gigs for organization (with RLS-like filtering)
app.get("/make-server-de012ad4/gigs", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const organizationId = c.req.query('organization_id');

  if (!organizationId) {
    return c.json({ error: 'organization_id is required' }, 400);
  }

  try {
    // Verify user has access to this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return c.json({ error: 'Access denied to this organization' }, 403);
    }

    // Fetch gigs where this organization is a participant
    const { data: gigParticipants, error } = await supabaseAdmin
      .from('gig_participants')
      .select('*, gig:gigs(*)')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching gigs:', error);
      return c.json({ error: error.message }, 400);
    }

    // Extract unique gigs and fetch additional participants for each
    const gigsMap = new Map();
    for (const gp of gigParticipants || []) {
      if (gp.gig) {
        gigsMap.set(gp.gig.id, gp.gig);
      }
    }

    const gigs = Array.from(gigsMap.values());

    // For each gig, fetch all participants
    const gigsWithParticipants = await Promise.all(
      gigs.map(async (gig) => {
        const { data: participants } = await supabaseAdmin
          .from('gig_participants')
          .select('*, organization:organization_id(*)')
          .eq('gig_id', gig.id);

        // Find venue and act from participants
        const venue = participants?.find(p => p.role === 'Venue')?.organization;
        const act = participants?.find(p => p.role === 'Act')?.organization;

        return {
          ...gig,
          venue,
          act,
        };
      })
    );

    // Sort by start date descending
    gigsWithParticipants.sort((a, b) => 
      new Date(b.start).getTime() - new Date(a.start).getTime()
    );

    return c.json(gigsWithParticipants);
  } catch (error) {
    console.error('Error in gigs fetch:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single gig
app.get("/make-server-de012ad4/gigs/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const gigId = c.req.param('id');

  try {
    const { data: gig, error } = await supabaseAdmin
      .from('gigs')
      .select('*')
      .eq('id', gigId)
      .single();

    if (error) {
      console.error('Error fetching gig:', error);
      return c.json({ error: error.message }, 400);
    }

    // Verify user has access through gig participants
    const { data: gigParticipants } = await supabaseAdmin
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

    if (!gigParticipants || gigParticipants.length === 0) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if user is member of any participating organization
    const orgIds = gigParticipants.map(gp => gp.organization_id);
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .in('organization_id', orgIds)
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Fetch full participant data with organization details
    const { data: participants } = await supabaseAdmin
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gig.id);

    return c.json({
      ...gig,
      participants: participants || [],
    });
  } catch (error) {
    console.error('Error in gig fetch:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create gig
app.post("/make-server-de012ad4/gigs", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { 
      primary_organization_id, // The organization creating the gig (for permission check)
      parent_gig_id,
      hierarchy_depth = 0,
      venue_id, 
      act_id, 
      participants = [],
      staff = [],
      staff_slots = [], // New format with nested assignments
      equipment = [],
      ...gigData 
    } = body;

    // Verify user has permission to create gigs (must be Admin or Manager in at least one org)
    let primaryOrgType = 'Production'; // Default fallback
    if (primary_organization_id) {
      const { data: membership } = await supabaseAdmin
        .from('organization_members')
        .select('*, organization:organizations(type)')
        .eq('organization_id', primary_organization_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || (membership.role !== 'Admin' && membership.role !== 'Manager')) {
        return c.json({ error: 'Insufficient permissions. Only Admins and Managers can create gigs.' }, 403);
      }

      // Get the organization type for the default role
      if (membership.organization && membership.organization.type) {
        primaryOrgType = membership.organization.type;
      }
    }

    // Set created_by and updated_by
    const gigToInsert = {
      ...gigData,
      parent_gig_id,
      hierarchy_depth,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: gig, error } = await supabaseAdmin
      .from('gigs')
      .insert(gigToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating gig:', error);
      return c.json({ error: error.message }, 400);
    }

    // Create participants (including the primary organization if provided)
    const participantsToInsert: Array<{
      gig_id: string;
      organization_id: string;
      role: string;
      notes?: string | null;
    }> = [];
    
    if (primary_organization_id) {
      participantsToInsert.push({
        gig_id: gig.id,
        organization_id: primary_organization_id,
        role: primaryOrgType, // Use the organization's type as the default role
        notes: null,
      });
    }
    
    // Add all participants from the participants array
    participants.forEach((p: any) => {
      if (p.organization_id && p.role) {
        participantsToInsert.push({
          gig_id: gig.id,
          organization_id: p.organization_id,
          role: p.role,
          notes: p.notes || null,
        });
      }
    });

    if (participantsToInsert.length > 0) {
      const { error: participantsError } = await supabaseAdmin
        .from('gig_participants')
        .insert(participantsToInsert);
      
      if (participantsError) {
        console.error('Error creating participants:', participantsError);
      }
    }

    // Create staff slots - support both old format (staff) and new format (staff_slots)
    const staffData = staff_slots.length > 0 ? staff_slots : staff;
    
    if (staffData.length > 0) {
      for (const slot of staffData) {
        // First, we need to get or create the staff_role_id from the role name
        let staffRoleId = null;
        
        if (slot.role) {
          // Try to find existing role
          const { data: existingRole } = await supabaseAdmin
            .from('staff_roles')
            .select('id')
            .eq('name', slot.role)
            .maybeSingle();
          
          staffRoleId = existingRole?.id;
          
          // If role doesn't exist, create it
          if (!staffRoleId) {
            const { data: newRole, error: roleError } = await supabaseAdmin
              .from('staff_roles')
              .insert({ name: slot.role })
              .select('id')
              .single();
            
            if (!roleError && newRole) {
              staffRoleId = newRole.id;
            }
          }
        }
        
        if (!staffRoleId) {
          console.error('Could not create or find staff role for:', slot.role);
          continue;
        }
        
        // Insert the staff slot
        const { data: createdSlot, error: slotError } = await supabaseAdmin
          .from('gig_staff_slots')
          .insert({
            gig_id: gig.id,
            organization_id: slot.organization_id || primary_organization_id,
            staff_role_id: staffRoleId,
            required_count: slot.count || slot.required_count || 1,
            notes: slot.notes || null,
          })
          .select()
          .single();
        
        if (slotError) {
          console.error('Error creating staff slot:', slotError);
          continue;
        }
        
        // Create staff assignments for this slot
        if (slot.assignments && slot.assignments.length > 0) {
          const assignmentsToInsert = slot.assignments
            .filter((a: any) => a.user_id) // Only create if user is assigned
            .map((a: any) => ({
              gig_staff_slot_id: createdSlot.id,
              user_id: a.user_id,
              status: a.status || 'Requested',
              rate: a.rate || null,
              fee: a.fee || null,
              notes: a.notes || null,
            }));
          
          if (assignmentsToInsert.length > 0) {
            const { error: assignmentsError } = await supabaseAdmin
              .from('gig_staff_assignments')
              .insert(assignmentsToInsert);
            
            if (assignmentsError) {
              console.error('Error creating staff assignments:', assignmentsError);
            }
          }
        }
      }
    }

    // Equipment handling removed - will be replaced with kit assignments in future

    // Fetch the complete gig with all relations
    const { data: participantsData } = await supabaseAdmin
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gig.id);

    const venue = participantsData?.find(p => p.role === 'Venue')?.organization;
    const act = participantsData?.find(p => p.role === 'Act')?.organization;

    return c.json({
      ...gig,
      venue,
      act,
      participants: participantsData || [],
    });
  } catch (error) {
    console.error('Error in gig creation:', error);
    return c.json({ error: 'Internal server error while creating gig' }, 500);
  }
});

// Update gig
app.put("/make-server-de012ad4/gigs/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const gigId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { venue_id, act_id, participants, staff_slots, ...gigData } = body;

    // Get existing gig and verify access through participants
    const { data: gig } = await supabaseAdmin
      .from('gigs')
      .select('*')
      .eq('id', gigId)
      .single();

    if (!gig) {
      return c.json({ error: 'Gig not found' }, 404);
    }

    // Verify user has access through gig participants
    const { data: gigParticipants } = await supabaseAdmin
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

    if (!gigParticipants || gigParticipants.length === 0) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if user is Admin or Manager of any participating organization
    const orgIds = gigParticipants.map(gp => gp.organization_id);
    const { data: memberships } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .in('organization_id', orgIds)
      .eq('user_id', user.id)
      .in('role', ['Admin', 'Manager']);

    if (!memberships || memberships.length === 0) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Update gig
    const { data: updatedGig, error } = await supabaseAdmin
      .from('gigs')
      .update({ ...gigData, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', gigId)
      .select()
      .single();

    if (error) {
      console.error('Error updating gig:', error);
      return c.json({ error: error.message }, 400);
    }

    // Handle participants update if provided
    if (participants !== undefined) {
      // Get existing participants
      const { data: existingParticipants } = await supabaseAdmin
        .from('gig_participants')
        .select('id, organization_id, role')
        .eq('gig_id', gigId);

      const existingIds = new Set((existingParticipants || []).map(p => p.id));
      const incomingParticipants = participants
        .filter((p: any) => p.organization_id && p.role)
        .map((p: any) => ({
          id: p.id || null,
          organization_id: p.organization_id,
          role: p.role,
          notes: p.notes || null,
        }));

      const incomingIds = new Set(incomingParticipants.filter((p: any) => p.id).map((p: any) => p.id));

      // Delete participants that are no longer present
      const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
      if (idsToDelete.length > 0) {
        await supabaseAdmin
          .from('gig_participants')
          .delete()
          .in('id', idsToDelete);
      }

      // Update existing participants and insert new ones
      for (const p of incomingParticipants) {
        if (p.id && existingIds.has(p.id)) {
          // Update existing participant
          await supabaseAdmin
            .from('gig_participants')
            .update({
              organization_id: p.organization_id,
              role: p.role,
              notes: p.notes,
            })
            .eq('id', p.id);
        } else {
          // Insert new participant
          await supabaseAdmin
            .from('gig_participants')
            .insert({
              gig_id: gigId,
              organization_id: p.organization_id,
              role: p.role,
              notes: p.notes,
            });
        }
      }
    } else {
      // Legacy support for venue_id and act_id
      if (venue_id !== undefined) {
        // Delete existing venue participant
        await supabaseAdmin
          .from('gig_participants')
          .delete()
          .eq('gig_id', gigId)
          .eq('role', 'Venue');

        // Add new venue participant if provided
        if (venue_id) {
          await supabaseAdmin
            .from('gig_participants')
            .insert({ gig_id: gigId, organization_id: venue_id, role: 'Venue' });
        }
      }

      if (act_id !== undefined) {
        // Delete existing act participant
        await supabaseAdmin
          .from('gig_participants')
          .delete()
          .eq('gig_id', gigId)
          .eq('role', 'Act');

        // Add new act participant if provided
        if (act_id) {
          await supabaseAdmin
            .from('gig_participants')
            .insert({ gig_id: gigId, organization_id: act_id, role: 'Act' });
        }
      }
    }

    // Handle staff slots update if provided
    if (staff_slots !== undefined) {
      // Get existing staff slots with assignments
      const { data: existingSlots } = await supabaseAdmin
        .from('gig_staff_slots')
        .select('id, staff_role_id, organization_id, required_count, notes, assignments:gig_staff_assignments(id, user_id, status, rate, fee, notes)')
        .eq('gig_id', gigId);

      const existingSlotIds = new Set((existingSlots || []).map(s => s.id));
      const incomingSlots = staff_slots.filter((s: any) => s.role && s.role.trim() !== '');

      // Process each incoming slot
      const processedSlotIds = new Set();

      for (const slot of incomingSlots) {
        // Get or create staff role
        let staffRoleId = null;
        const { data: existingRole } = await supabaseAdmin
          .from('staff_roles')
          .select('id')
          .eq('name', slot.role)
          .maybeSingle();

        staffRoleId = existingRole?.id;

        if (!staffRoleId) {
          const { data: newRole, error: roleError } = await supabaseAdmin
            .from('staff_roles')
            .insert({ name: slot.role })
            .select('id')
            .single();

          if (!roleError && newRole) {
            staffRoleId = newRole.id;
          }
        }

        if (!staffRoleId) {
          console.error('Could not create or find staff role for:', slot.role);
          continue;
        }

        let slotId = slot.id;

        // Check if this slot exists
        if (slotId && existingSlotIds.has(slotId)) {
          // Update existing slot
          await supabaseAdmin
            .from('gig_staff_slots')
            .update({
              staff_role_id: staffRoleId,
              organization_id: slot.organization_id || null,
              required_count: slot.count || slot.required_count || 1,
              notes: slot.notes || null,
            })
            .eq('id', slotId);
          
          processedSlotIds.add(slotId);
        } else {
          // Insert new slot
          const { data: newSlot, error: slotError } = await supabaseAdmin
            .from('gig_staff_slots')
            .insert({
              gig_id: gigId,
              staff_role_id: staffRoleId,
              organization_id: slot.organization_id || null,
              required_count: slot.count || slot.required_count || 1,
              notes: slot.notes || null,
            })
            .select('id')
            .single();

          if (slotError) {
            console.error('Error creating staff slot:', slotError);
            continue;
          }

          slotId = newSlot.id;
          processedSlotIds.add(slotId);
        }

        // Handle assignments for this slot
        if (slot.assignments && slot.assignments.length > 0) {
          // Get existing assignments for this slot
          const { data: existingAssignments } = await supabaseAdmin
            .from('gig_staff_assignments')
            .select('id, user_id')
            .eq('gig_staff_slot_id', slotId);

          const existingAssignmentIds = new Set((existingAssignments || []).map(a => a.id));
          const incomingAssignments = slot.assignments.filter((a: any) => a.user_id && a.user_id.trim() !== '');
          const processedAssignmentIds = new Set();

          // Process each assignment
          for (const assignment of incomingAssignments) {
            if (assignment.id && existingAssignmentIds.has(assignment.id)) {
              // Update existing assignment
              await supabaseAdmin
                .from('gig_staff_assignments')
                .update({
                  user_id: assignment.user_id,
                  status: assignment.status || 'Requested',
                  rate: assignment.rate || null,
                  fee: assignment.fee || null,
                  notes: assignment.notes || null,
                })
                .eq('id', assignment.id);
              
              processedAssignmentIds.add(assignment.id);
            } else {
              // Insert new assignment
              const { data: newAssignment } = await supabaseAdmin
                .from('gig_staff_assignments')
                .insert({
                  gig_staff_slot_id: slotId,
                  user_id: assignment.user_id,
                  status: assignment.status || 'Requested',
                  rate: assignment.rate || null,
                  fee: assignment.fee || null,
                  notes: assignment.notes || null,
                })
                .select('id')
                .single();

              if (newAssignment) {
                processedAssignmentIds.add(newAssignment.id);
              }
            }
          }

          // Delete assignments that are no longer present
          const assignmentIdsToDelete = Array.from(existingAssignmentIds).filter(id => !processedAssignmentIds.has(id));
          if (assignmentIdsToDelete.length > 0) {
            await supabaseAdmin
              .from('gig_staff_assignments')
              .delete()
              .in('id', assignmentIdsToDelete);
          }
        } else {
          // No assignments provided, delete all existing assignments for this slot
          await supabaseAdmin
            .from('gig_staff_assignments')
            .delete()
            .eq('gig_staff_slot_id', slotId);
        }
      }

      // Delete slots that are no longer present
      const slotIdsToDelete = Array.from(existingSlotIds).filter(id => !processedSlotIds.has(id));
      if (slotIdsToDelete.length > 0) {
        // Assignments will be deleted via cascade
        await supabaseAdmin
          .from('gig_staff_slots')
          .delete()
          .in('id', slotIdsToDelete);
      }
    }

    // Fetch participants
    const { data: updatedParticipants } = await supabaseAdmin
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gigId);

    const venue = updatedParticipants?.find(p => p.role === 'Venue')?.organization;
    const act = updatedParticipants?.find(p => p.role === 'Act')?.organization;

    return c.json({
      ...updatedGig,
      venue,
      act,
    });
  } catch (error) {
    console.error('Error in gig update:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete gig
app.delete("/make-server-de012ad4/gigs/:id", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const gigId = c.req.param('id');

  try {
    // Verify user has access through gig participants
    const { data: gigParticipants } = await supabaseAdmin
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

    if (!gigParticipants || gigParticipants.length === 0) {
      return c.json({ error: 'Gig not found or access denied' }, 403);
    }

    // Check if user is Admin of any participating organization
    const orgIds = gigParticipants.map(gp => gp.organization_id);
    const { data: adminMemberships } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .in('organization_id', orgIds)
      .eq('user_id', user.id)
      .eq('role', 'Admin');

    if (!adminMemberships || adminMemberships.length === 0) {
      return c.json({ error: 'Insufficient permissions. Only Admins can delete gigs.' }, 403);
    }

    const { error } = await supabaseAdmin
      .from('gigs')
      .delete()
      .eq('id', gigId);

    if (error) {
      console.error('Error deleting gig:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in gig deletion:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== Google Places API Integration =====

// Search Google Places
app.get("/make-server-de012ad4/places/search", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const query = c.req.query('query');
  const latitude = c.req.query('latitude');
  const longitude = c.req.query('longitude');
  
  if (!query) {
    return c.json({ error: 'Query parameter is required' }, 400);
  }

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  
  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return c.json({ error: 'Google Maps API key not configured' }, 500);
  }

  try {
    // Define entertainment/event-related business types to prefer
    const relevantTypes = [
      'point_of_interest',
      'establishment',
      'night_club',
      'stadium',
      'movie_theater',
      'amusement_park',
      'art_gallery',
      'museum',
      'convention_center',
      'tourist_attraction',
      'bar',
      'restaurant', // Venues sometimes categorized as restaurants
    ];

    // Keywords that indicate relevance to our industry
    const relevantKeywords = [
      'sound', 'audio', 'lighting', 'stage', 'staging', 'production',
      'event', 'venue', 'entertainment', 'music', 'concert', 'theater',
      'theatre', 'show', 'performance', 'rental', 'av', 'pro audio',
      'equipment', 'technical', 'rigging', 'truss', 'speaker', 'band',
      'dj', 'disco', 'nightclub', 'club', 'hall', 'ballroom', 'arena',
      'amphitheater', 'festival', 'catering', 'studio', 'recording'
    ];

    // Keywords that indicate likely irrelevance (exclude if these are primary descriptors)
    const irrelevantKeywords = [
      'plumbing', 'hvac', 'roofing', 'concrete', 'paving', 'asphalt',
      'landscaping', 'lawn', 'automotive', 'car wash', 'gas station',
      'convenience store', 'grocery', 'pharmacy', 'medical', 'dental',
      'doctor', 'clinic', 'hospital', 'attorney', 'lawyer', 'insurance',
      'real estate', 'bank', 'credit union', 'tax', 'accounting'
    ];

    // Use Google Places API Text Search with location bias if provided
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', query);
    url.searchParams.append('key', apiKey);
    
    // Add location bias for proximity sorting if coordinates provided
    if (latitude && longitude) {
      url.searchParams.append('location', `${latitude},${longitude}`);
      url.searchParams.append('radius', '50000'); // 50km radius for better results
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return c.json({ 
        error: `Google Places API error: ${data.status}`,
        details: data.error_message 
      }, 500);
    }

    // Filter and score results based on relevance
    const scoredResults = (data.results || []).map((place: any) => {
      const name = (place.name || '').toLowerCase();
      const types = place.types || [];
      
      let score = 0;
      
      // Boost score if name starts with the query (partial match from beginning)
      if (name.startsWith(query.toLowerCase())) {
        score += 50;
      } else if (name.includes(query.toLowerCase())) {
        score += 20;
      }
      
      // Check if name or types contain relevant keywords
      const nameWords = name.split(/\s+/);
      for (const keyword of relevantKeywords) {
        if (name.includes(keyword.toLowerCase())) {
          score += 30;
        }
      }
      
      // Check if business type is relevant
      const hasRelevantType = types.some((type: string) => 
        relevantTypes.includes(type)
      );
      if (hasRelevantType) {
        score += 10;
      }
      
      // Penalize if name contains irrelevant keywords as primary descriptors
      for (const keyword of irrelevantKeywords) {
        if (nameWords.includes(keyword.toLowerCase())) {
          score -= 100; // Strong penalty for clearly irrelevant businesses
        }
      }
      
      return {
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        types: place.types,
        score: score,
      };
    });

    // Filter out clearly irrelevant results (negative score) but keep uncertain ones
    const filteredResults = scoredResults.filter((result: any) => result.score >= 0);
    
    // Sort by score (highest first) - this handles both relevance and proximity
    filteredResults.sort((a: any, b: any) => b.score - a.score);
    
    // Return top 10 results
    const results = filteredResults.slice(0, 10).map((result: any) => ({
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      // Note: Text Search doesn't include phone/website, need Place Details for that
    }));

    return c.json({ results });
  } catch (error) {
    console.error('Error in Google Places search:', error);
    return c.json({ error: 'Internal server error while searching places' }, 500);
  }
});

// Get Google Place details
app.get("/make-server-de012ad4/places/:placeId", async (c) => {
  const authHeader = c.req.header('Authorization');
  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    return c.json({ error: authError ?? 'Unauthorized' }, 401);
  }

  const placeId = c.req.param('placeId');
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  
  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return c.json({ error: 'Google Maps API key not configured' }, 500);
  }

  try {
    // Use Google Places API Place Details
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,website,address_components,editorial_summary');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data);
      return c.json({ 
        error: `Google Places API error: ${data.status}`,
        details: data.error_message 
      }, 500);
    }

    const place = data.result;
    
    return c.json({
      place_id: place.place_id || placeId,
      name: place.name,
      formatted_address: place.formatted_address,
      formatted_phone_number: place.formatted_phone_number,
      website: place.website,
      editorial_summary: place.editorial_summary?.overview,
      address_components: place.address_components || [],
    });
  } catch (error) {
    console.error('Error in Google Places details fetch:', error);
    return c.json({ error: 'Internal server error while fetching place details' }, 500);
  }
});

Deno.serve(app.fetch);
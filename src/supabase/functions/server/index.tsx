import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  try {
    let query = supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

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

    // Fetch gigs
    const { data: gigs, error } = await supabaseAdmin
      .from('gigs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start', { ascending: false });

    if (error) {
      console.error('Error fetching gigs:', error);
      return c.json({ error: error.message }, 400);
    }

    // For each gig, fetch participants
    const gigsWithParticipants = await Promise.all(
      (gigs || []).map(async (gig) => {
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

    // Verify user has access to this gig's organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', gig.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Fetch participants
    const { data: participants } = await supabaseAdmin
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gig.id);

    // Find venue and act from participants
    const venue = participants?.find(p => p.role === 'Venue')?.organization;
    const act = participants?.find(p => p.role === 'Act')?.organization;

    return c.json({
      ...gig,
      venue,
      act,
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
    const { organization_id, venue_id, act_id, ...gigData } = body;

    // Verify user has access to create gigs for this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'Admin' && membership.role !== 'Manager')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Set created_by and updated_by
    const gigToInsert = {
      ...gigData,
      organization_id,
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

    // Create participants
    const participants = [];
    if (venue_id) {
      participants.push({ gig_id: gig.id, organization_id: venue_id, role: 'Venue' });
    }
    if (act_id) {
      participants.push({ gig_id: gig.id, organization_id: act_id, role: 'Act' });
    }

    if (participants.length > 0) {
      await supabaseAdmin.from('gig_participants').insert(participants);
    }

    // Fetch the gig with participants
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
    });
  } catch (error) {
    console.error('Error in gig creation:', error);
    return c.json({ error: 'Internal server error' }, 500);
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
    const { venue_id, act_id, ...gigData } = body;

    // Get existing gig to verify access
    const { data: existingGig } = await supabaseAdmin
      .from('gigs')
      .select('organization_id')
      .eq('id', gigId)
      .single();

    if (!existingGig) {
      return c.json({ error: 'Gig not found' }, 404);
    }

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', existingGig.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'Admin' && membership.role !== 'Manager')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Update gig
    const { data: gig, error } = await supabaseAdmin
      .from('gigs')
      .update({ ...gigData, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', gigId)
      .select()
      .single();

    if (error) {
      console.error('Error updating gig:', error);
      return c.json({ error: error.message }, 400);
    }

    // Update participants if venue_id or act_id changed
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

    // Fetch participants
    const { data: participants } = await supabaseAdmin
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gigId);

    const venue = participants?.find(p => p.role === 'Venue')?.organization;
    const act = participants?.find(p => p.role === 'Act')?.organization;

    return c.json({
      ...gig,
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
    // Get existing gig to verify access
    const { data: existingGig } = await supabaseAdmin
      .from('gigs')
      .select('organization_id')
      .eq('id', gigId)
      .single();

    if (!existingGig) {
      return c.json({ error: 'Gig not found' }, 404);
    }

    // Verify user has access
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', existingGig.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'Admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
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
  
  if (!query) {
    return c.json({ error: 'Query parameter is required' }, 400);
  }

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  
  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return c.json({ error: 'Google Maps API key not configured' }, 500);
  }

  try {
    // Use Google Places API Text Search
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', query);
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return c.json({ 
        error: `Google Places API error: ${data.status}`,
        details: data.error_message 
      }, 500);
    }

    // Return results with limited fields
    const results = (data.results || []).slice(0, 5).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
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
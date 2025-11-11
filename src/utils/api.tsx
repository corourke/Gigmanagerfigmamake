/**
 * API utility functions for Gig Manager
 * These functions use the Supabase client directly with RLS policies for security
 */

import { createClient } from './supabase/client';

const supabase = createClient();

// ===== User Management =====

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return data;
}

export async function createUserProfile(userData: {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}) {
  // Check if user already exists
  const existing = await getUserProfile(userData.id);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }

  return data;
}

export async function updateUserProfile(userId: string, updates: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}) {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }

  return data;
}

export async function searchUsers(search?: string) {
  let query = supabase
    .from('users')
    .select('*')
    .order('first_name');

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return data || [];
}

export async function getUserOrganizations(userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user organizations:', error);
    throw error;
  }

  return data || [];
}

// ===== Organization Management =====

export async function searchOrganizations(filters?: { type?: string; search?: string }) {
  let query = supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error('Error searching organizations:', error);
    throw error;
  }

  return data || [];
}

export async function createOrganization(orgData: {
  name: string;
  type: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  place_id?: string;
}) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert(orgData)
    .select()
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError);
    throw orgError;
  }

  // Add creator as Admin member
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'Admin',
    });

  if (memberError) {
    console.error('Error adding organization member:', memberError);
    // Try to clean up the created org
    await supabase.from('organizations').delete().eq('id', org.id);
    throw memberError;
  }

  return org;
}

export async function joinOrganization(orgId: string) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if organization exists
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    throw new Error('Already a member of this organization');
  }

  // Add user as a Viewer by default
  const { data: membership, error: memberError } = await supabase
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
    throw memberError;
  }

  return { organization: org, role: membership.role };
}

// ===== Gig Management =====

export async function getGigsForOrganization(organizationId: string) {
  // Fetch gigs where this organization is a participant
  const { data: gigParticipants, error } = await supabase
    .from('gig_participants')
    .select('*, gig:gigs(*)')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching gigs:', error);
    throw error;
  }

  // Extract unique gigs
  const gigsMap = new Map();
  for (const gp of gigParticipants || []) {
    if (gp.gig) {
      gigsMap.set(gp.gig.id, gp.gig);
    }
  }

  const gigs = Array.from(gigsMap.values());

  // For each gig, fetch all participants
  const gigsWithParticipants = await Promise.all(
    gigs.map(async (gig: any) => {
      const { data: participants } = await supabase
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gig.id);

      // Legacy support: find venue and act from participants
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
  gigsWithParticipants.sort((a: any, b: any) => 
    new Date(b.start).getTime() - new Date(a.start).getTime()
  );

  return gigsWithParticipants;
}

export async function getGig(gigId: string) {
  const { data: gig, error } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', gigId)
    .single();

  if (error) {
    console.error('Error fetching gig:', error);
    throw error;
  }

  // Fetch full participant data with organization details
  const { data: participants } = await supabase
    .from('gig_participants')
    .select('*, organization:organization_id(*)')
    .eq('gig_id', gig.id);

  return {
    ...gig,
    participants: participants || [],
  };
}

export async function createGig(gigData: {
  name: string;
  start: string;
  end?: string;
  venue_address?: string;
  status?: string;
  notes?: string;
  settlement_type?: string;
  settlement_amount?: number;
  primary_organization_id?: string;
  parent_gig_id?: string;
  hierarchy_depth?: number;
  participants?: Array<{ organization_id: string; role: string; notes?: string }>;
  staff_slots?: Array<{
    role: string;
    organization_id?: string;
    count?: number;
    required_count?: number;
    notes?: string;
    assignments?: Array<{
      user_id: string;
      status?: string;
      rate?: number;
      fee?: number;
      notes?: string;
    }>;
  }>;
}) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { 
    primary_organization_id,
    parent_gig_id,
    hierarchy_depth = 0,
    participants = [],
    staff_slots = [],
    ...restGigData
  } = gigData;

  // Create gig
  const { data: gig, error } = await supabase
    .from('gigs')
    .insert({
      ...restGigData,
      parent_gig_id,
      hierarchy_depth,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating gig:', error);
    throw error;
  }

  // Create participants
  const participantsToInsert: Array<{
    gig_id: string;
    organization_id: string;
    role: string;
    notes?: string | null;
  }> = [];
  
  if (primary_organization_id) {
    // Get organization type for default role
    const { data: org } = await supabase
      .from('organizations')
      .select('type')
      .eq('id', primary_organization_id)
      .single();

    participantsToInsert.push({
      gig_id: gig.id,
      organization_id: primary_organization_id,
      role: org?.type || 'Production',
      notes: null,
    });
  }
  
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
    const { error: participantsError } = await supabase
      .from('gig_participants')
      .insert(participantsToInsert);
    
    if (participantsError) {
      console.error('Error creating participants:', participantsError);
    }
  }

  // Create staff slots with assignments
  if (staff_slots.length > 0) {
    for (const slot of staff_slots) {
      // Get or create staff role
      let staffRoleId: string | null = null;
      
      const { data: existingRole } = await supabase
        .from('staff_roles')
        .select('id')
        .eq('name', slot.role)
        .maybeSingle();

      if (existingRole?.id) {
        staffRoleId = existingRole.id;
      } else {
        const { data: newRole } = await supabase
          .from('staff_roles')
          .insert({ name: slot.role })
          .select('id')
          .single();
        
        staffRoleId = newRole?.id || null;
      }

      if (!staffRoleId) continue;
      
      const { data: createdSlot, error: slotError } = await supabase
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
      
      // Create staff assignments
      if (slot.assignments?.length) {
        const assignmentsToInsert = slot.assignments
          .filter((a: any) => a.user_id)
          .map((a: any) => ({
            gig_staff_slot_id: createdSlot.id,
            user_id: a.user_id,
            status: a.status || 'Requested',
            rate: a.rate || null,
            fee: a.fee || null,
            notes: a.notes || null,
          }));
        
        if (assignmentsToInsert.length > 0) {
          const { error: assignmentsError } = await supabase
            .from('gig_staff_assignments')
            .insert(assignmentsToInsert);
          
          if (assignmentsError) {
            console.error('Error creating staff assignments:', assignmentsError);
          }
        }
      }
    }
  }

  // Fetch complete gig with participants
  const { data: participantsData } = await supabase
    .from('gig_participants')
    .select('*, organization:organization_id(*)')
    .eq('gig_id', gig.id);

  const venue = participantsData?.find(p => p.role === 'Venue')?.organization;
  const act = participantsData?.find(p => p.role === 'Act')?.organization;

  return {
    ...gig,
    venue,
    act,
    participants: participantsData || [],
  };
}

export async function updateGig(gigId: string, updates: any) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { participants, staff_slots, ...gigData } = updates;

  // Update gig
  const { data: updatedGig, error } = await supabase
    .from('gigs')
    .update({ ...gigData, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', gigId)
    .select()
    .single();

  if (error) {
    console.error('Error updating gig:', error);
    throw error;
  }

  // Update participants if provided
  if (participants !== undefined) {
    // Get existing participants
    const { data: existingParticipants } = await supabase
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

    // Delete removed participants
    const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('gig_participants')
        .delete()
        .in('id', idsToDelete);
    }

    // Update existing and insert new participants
    for (const p of incomingParticipants) {
      if (p.id && existingIds.has(p.id)) {
        await supabase
          .from('gig_participants')
          .update({
            organization_id: p.organization_id,
            role: p.role,
            notes: p.notes,
          })
          .eq('id', p.id);
      } else {
        await supabase
          .from('gig_participants')
          .insert({
            gig_id: gigId,
            organization_id: p.organization_id,
            role: p.role,
            notes: p.notes,
          });
      }
    }
  }

  // Fetch updated participants
  const { data: updatedParticipants } = await supabase
    .from('gig_participants')
    .select('*, organization:organization_id(*)')
    .eq('gig_id', gigId);

  const venue = updatedParticipants?.find(p => p.role === 'Venue')?.organization;
  const act = updatedParticipants?.find(p => p.role === 'Act')?.organization;

  return {
    ...updatedGig,
    venue,
    act,
  };
}

export async function deleteGig(gigId: string) {
  const { error } = await supabase
    .from('gigs')
    .delete()
    .eq('id', gigId);

  if (error) {
    console.error('Error deleting gig:', error);
    throw error;
  }

  return { success: true };
}

// ===== Google Places Integration =====

export async function searchGooglePlaces(query: string, latitude?: number, longitude?: number) {
  // Note: Google Places API calls should ideally go through a backend
  // For now, returning empty array as this requires the Edge Function
  console.warn('Google Places search requires Edge Function to be deployed');
  return { results: [] };
}

export async function getGooglePlaceDetails(placeId: string) {
  // Note: Google Places API calls should ideally go through a backend
  // For now, returning null as this requires the Edge Function
  console.warn('Google Places details requires Edge Function to be deployed');
  return null;
}

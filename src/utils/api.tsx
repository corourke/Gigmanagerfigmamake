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
  // Get current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Get organizations current user belongs to
  const { data: userOrgs } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  const orgIds = userOrgs?.map(o => o.organization_id) || [];
  
  if (orgIds.length === 0) {
    return []; // User doesn't belong to any organizations
  }

  // Get all users who are members of these organizations
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('user_id')
    .in('organization_id', orgIds);

  const userIds = [...new Set(memberData?.map(m => m.user_id) || [])];

  if (userIds.length === 0) {
    return [];
  }

  // Only search users in the same organizations
  let query = supabase
    .from('users')
    .select('*')
    .in('id', userIds)
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
  // Get current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  let query = supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', userId);

  // If user is not requesting their own organizations, filter to shared organizations only
  if (user.id !== userId) {
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);
    
    const orgIds = userOrgs?.map(o => o.organization_id) || [];
    if (orgIds.length === 0) {
      return []; // No shared organizations
    }
    query = query.in('organization_id', orgIds);
  }

  const { data, error } = await query;

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
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

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
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

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
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data: gig, error } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', gigId)
    .single();

  if (error) {
    console.error('Error fetching gig:', error);
    throw error;
  }

  // Verify user has access through gig participants
  const { data: gigParticipants } = await supabase
    .from('gig_participants')
    .select('organization_id')
    .eq('gig_id', gigId);

  if (!gigParticipants || gigParticipants.length === 0) {
    throw new Error('Access denied - no participants found');
  }

  const orgIds = gigParticipants.map(gp => gp.organization_id);
  
  // Check if user is member of any participating organization
  const { data: userMemberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .in('organization_id', orgIds);

  if (!userMemberships || userMemberships.length === 0) {
    throw new Error('Access denied - not a member of participating organizations');
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
  title: string; // Required - matches database schema
  start: string; // Required - matches database schema
  end: string; // Required - matches database schema (changed from optional)
  timezone: string; // Required - matches database schema
  status?: string; // Optional - has default
  venue_address?: string; // Optional
  notes?: string; // Optional
  settlement_type?: string; // Optional
  settlement_amount?: number; // Optional
  tags?: string[]; // Optional - has default
  amount_paid?: number; // Optional
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
  try {
    console.log('createGig called with data:', JSON.stringify(gigData, null, 2));
    
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { 
      primary_organization_id,
      parent_gig_id,
      hierarchy_depth = 0,
      participants = [],
      staff_slots = [],
      ...restGigData
    } = gigData;

    console.log('Creating gig with restGigData:', JSON.stringify(restGigData, null, 2));

    // Validate required fields before insert
    if (!restGigData.title) {
      throw new Error('Title is required');
    }
    if (!restGigData.start) {
      throw new Error('Start time is required');
    }
    if (!restGigData.end) {
      throw new Error('End time is required');
    }
    if (!restGigData.timezone) {
      throw new Error('Timezone is required');
    }

    // Prepare insert data
    const insertData = {
      title: restGigData.title,
      start: restGigData.start,
      end: restGigData.end,
      timezone: restGigData.timezone,
      status: restGigData.status || 'DateHold',
      tags: Array.isArray(restGigData.tags) ? restGigData.tags : [],
      notes: restGigData.notes || null,
      amount_paid: restGigData.amount_paid !== undefined && restGigData.amount_paid !== null ? restGigData.amount_paid : null,
      parent_gig_id: parent_gig_id || null,
      hierarchy_depth: hierarchy_depth || 0,
      created_by: user.id,
      updated_by: user.id,
    };
    
    console.log('Inserting gig with data:', JSON.stringify(insertData, null, 2));
    
    // Create gig
    const { data: gig, error } = await supabase
      .from('gigs')
      .insert(insertData)
      .select()
      .single();
    
    console.log('Insert result - gig:', gig);
    console.log('Insert result - error:', error);

    if (error) {
      console.error('Error creating gig:', error);
      throw new Error(`Failed to create gig: ${error.message}`);
    }

    if (!gig) {
      throw new Error('Gig creation returned no data');
    }

    console.log('Gig created successfully:', gig.id);

    // Create participants - UI handles all participant management including primary org
    const participantsToInsert: Array<{
      gig_id: string;
      organization_id: string;
      role: string;
      notes?: string | null;
    }> = [];
    
    // Process participants from UI (already deduplicated)
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
          const { data: newRole, error: roleError } = await supabase
            .from('staff_roles')
            .insert({ name: slot.role })
            .select('id')
            .single();
          
          if (roleError) {
            console.error('Error creating staff role:', roleError);
            continue;
          }
          
          staffRoleId = newRole?.id || null;
        }

        if (!staffRoleId) {
          console.error('Failed to get or create staff role for:', slot.role);
          continue;
        }
        
        // Ensure we have an organization_id for the slot
        const slotOrgId = slot.organization_id || primary_organization_id;
        if (!slotOrgId) {
          console.error('No organization_id available for staff slot:', slot);
          continue;
        }
        
        const { data: createdSlot, error: slotError } = await supabase
          .from('gig_staff_slots')
          .insert({
            gig_id: gig.id,
            organization_id: slotOrgId,
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
        
        if (!createdSlot) {
          console.error('Staff slot creation returned no data');
          continue;
        }
        
        // Create staff assignments
        if (slot.assignments?.length) {
          const assignmentsToInsert = slot.assignments
            .filter((a: any) => a.user_id)
            .map((a: any) => ({
              slot_id: createdSlot.id, // Fixed: column name is slot_id, not gig_staff_slot_id
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

    const result = {
      ...gig,
      venue,
      act,
      participants: participantsData || [],
    };

    console.log('createGig returning:', result);
    return result;
  } catch (error) {
    console.error('createGig error:', error);
    throw error;
  }
}

export async function updateGig(gigId: string, gigData: {
  title?: string;
  start?: string;
  end?: string;
  timezone?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  amount_paid?: number | null;
  participants?: Array<{ 
    id?: string;
    organization_id: string; 
    role: string; 
    notes?: string | null 
  }>;
  staff_slots?: Array<{
    id?: string;
    role: string;
    count?: number;
    notes?: string | null;
    assignments?: Array<{
      id?: string;
      user_id: string;
      status?: string;
      rate?: number | null;
      fee?: number | null;
      notes?: string | null;
    }>;
  }>;
}) {
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Verify user has access to this gig
  const { data: gigParticipants } = await supabase
    .from('gig_participants')
    .select('organization_id')
    .eq('gig_id', gigId);

  if (!gigParticipants || gigParticipants.length === 0) {
    throw new Error('Access denied - no participants found');
  }

  const orgIds = gigParticipants.map(gp => gp.organization_id);
  
  // Check if user is member of any participating organization with Admin or Manager role
  const { data: userMemberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('organization_id', orgIds);

  if (!userMemberships || userMemberships.length === 0) {
    throw new Error('Access denied - not a member of participating organizations');
  }

  const hasAdminOrManager = userMemberships.some(m => m.role === 'Admin' || m.role === 'Manager');
  if (!hasAdminOrManager) {
    throw new Error('Access denied - only Admins and Managers can update gigs');
  }

  const { participants = [], staff_slots = [], ...restGigData } = gigData;

  // Update gig basic info
  const { error: updateError } = await supabase
    .from('gigs')
    .update({
      ...restGigData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gigId);

  if (updateError) {
    console.error('Error updating gig:', updateError);
    throw updateError;
  }

  // Update participants
  if (participants && participants.length > 0) {
    // Get existing participants
    const { data: existingParticipants } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId);

    const existingIds = existingParticipants?.map(p => p.id) || [];
    const incomingIds = participants.filter(p => p.id).map(p => p.id!);

    // Delete participants that are no longer in the list
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('gig_participants')
        .delete()
        .in('id', idsToDelete);
    }

    // Update or insert participants
    for (const participant of participants) {
      if (participant.id && existingIds.includes(participant.id)) {
        // Update existing participant
        await supabase
          .from('gig_participants')
          .update({
            organization_id: participant.organization_id,
            role: participant.role,
            notes: participant.notes || null,
          })
          .eq('id', participant.id);
      } else if (participant.organization_id && participant.role) {
        // Insert new participant
        await supabase
          .from('gig_participants')
          .insert({
            gig_id: gigId,
            organization_id: participant.organization_id,
            role: participant.role,
            notes: participant.notes || null,
          });
      }
    }
  }

  // Update staff slots and assignments
  if (staff_slots && staff_slots.length > 0) {
    // Get existing staff slots
    const { data: existingSlots } = await supabase
      .from('gig_staff_slots')
      .select('id')
      .eq('gig_id', gigId);

    const existingSlotIds = existingSlots?.map(s => s.id) || [];
    const incomingSlotIds = staff_slots.filter(s => s.id).map(s => s.id!);

    // Delete slots that are no longer in the list (cascades to assignments)
    const slotIdsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));
    if (slotIdsToDelete.length > 0) {
      await supabase
        .from('gig_staff_slots')
        .delete()
        .in('id', slotIdsToDelete);
    }

    // Update or insert staff slots
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

      let slotId = slot.id;

      if (slot.id && existingSlotIds.includes(slot.id)) {
        // Update existing slot
        await supabase
          .from('gig_staff_slots')
          .update({
            staff_role_id: staffRoleId,
            required_count: slot.count || 1,
            notes: slot.notes || null,
          })
          .eq('id', slot.id);
      } else if (slot.role) {
        // Insert new slot
        const { data: newSlot } = await supabase
          .from('gig_staff_slots')
          .insert({
            gig_id: gigId,
            staff_role_id: staffRoleId,
            required_count: slot.count || 1,
            notes: slot.notes || null,
          })
          .select('id')
          .single();
        
        slotId = newSlot?.id;
      }

      if (!slotId) continue;

      // Handle assignments for this slot
      if (slot.assignments && slot.assignments.length > 0) {
        // Get existing assignments for this slot
        const { data: existingAssignments } = await supabase
          .from('gig_staff_assignments')
          .select('id')
          .eq('slot_id', slotId); // Fixed: column name is slot_id

        const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
        const incomingAssignmentIds = slot.assignments.filter(a => a.id).map(a => a.id!);

        // Delete assignments that are no longer in the list
        const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));
        if (assignmentIdsToDelete.length > 0) {
          await supabase
            .from('gig_staff_assignments')
            .delete()
            .in('id', assignmentIdsToDelete);
        }

        // Update or insert assignments
        for (const assignment of slot.assignments) {
          if (assignment.id && existingAssignmentIds.includes(assignment.id)) {
            // Update existing assignment
            await supabase
              .from('gig_staff_assignments')
              .update({
                user_id: assignment.user_id,
                status: assignment.status || 'Requested',
                rate: assignment.rate || null,
                fee: assignment.fee || null,
                notes: assignment.notes || null,
              })
              .eq('id', assignment.id);
          } else if (assignment.user_id) {
            // Insert new assignment
            await supabase
              .from('gig_staff_assignments')
              .insert({
                slot_id: slotId, // Fixed: column name is slot_id
                user_id: assignment.user_id,
                status: assignment.status || 'Requested',
                rate: assignment.rate || null,
                fee: assignment.fee || null,
                notes: assignment.notes || null,
              });
          }
        }
      } else if (slotId) {
        // No assignments in incoming data, delete all existing assignments for this slot
        await supabase
          .from('gig_staff_assignments')
          .delete()
          .eq('slot_id', slotId); // Fixed: column name is slot_id
      }
    }
  } else {
    // No slots in incoming data, delete all existing slots (cascades to assignments)
    await supabase
      .from('gig_staff_slots')
      .delete()
      .eq('gig_id', gigId);
  }

  // Fetch updated gig with participants
  const updatedGig = await getGig(gigId);
  return updatedGig;
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

// ===== Legacy/Alias Functions for Backward Compatibility =====

export async function getGigs(organizationId: string) {
  return getGigsForOrganization(organizationId);
}

export async function getOrganizations(type?: string) {
  return searchOrganizations(type ? { type } : undefined);
}
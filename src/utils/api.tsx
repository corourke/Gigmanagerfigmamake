import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4`;

// Helper to get auth headers
async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

// ===== Users =====

export async function createUserProfile(data?: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user profile');
  }

  return response.json();
}

export async function getUserProfile(userId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }

  return response.json();
}

// ===== Organizations =====

export async function getUserOrganizations(userId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}/organizations`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organizations');
  }

  return response.json();
}

export async function createOrganization(data: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/organizations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create organization');
  }

  return response.json();
}

export async function getOrganizations(type?: string) {
  const headers = await getAuthHeaders();
  const url = type 
    ? `${API_BASE_URL}/organizations?type=${encodeURIComponent(type)}`
    : `${API_BASE_URL}/organizations`;
  
  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organizations');
  }

  return response.json();
}

// ===== Gigs =====

export async function getGigs(organizationId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/gigs?organization_id=${encodeURIComponent(organizationId)}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch gigs');
  }

  return response.json();
}

export async function getGig(gigId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/gigs/${gigId}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch gig');
  }

  return response.json();
}

export async function createGig(data: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/gigs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create gig');
  }

  return response.json();
}

export async function updateGig(gigId: string, data: any) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/gigs/${gigId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update gig');
  }

  return response.json();
}

export async function deleteGig(gigId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/gigs/${gigId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete gig');
  }

  return response.json();
}

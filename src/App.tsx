import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import OrganizationSelectionScreen from './components/OrganizationSelectionScreen';
import CreateOrganizationScreen from './components/CreateOrganizationScreen';
import Dashboard from './components/Dashboard';
import GigListScreen from './components/GigListScreen';
import CreateGigScreen from './components/CreateGigScreen';
import GigDetailScreen from './components/GigDetailScreen';
import { Toaster } from './components/ui/sonner';
import { createClient } from './utils/supabase/client';

export type OrganizationType = 
  | 'Production'
  | 'Sound'
  | 'Lighting'
  | 'Staging'
  | 'Rentals'
  | 'Venue'
  | 'Act'
  | 'Agency';

export type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Viewer';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  url?: string;
  phone?: string;
  description?: string;
  notes?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

// Set to true to use mock data instead of real Supabase
const USE_MOCK_DATA = false;

type Route = 
  | 'login' 
  | 'org-selection' 
  | 'create-org' 
  | 'dashboard' 
  | 'gig-list'
  | 'create-gig'
  | 'gig-detail';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMembership[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);

  const handleLogin = (user: User, organizations: OrganizationMembership[]) => {
    setCurrentUser(user);
    setUserOrganizations(organizations);
    setCurrentRoute('org-selection');
  };

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org);
    setCurrentRoute('dashboard');
  };

  const handleCreateOrganization = () => {
    setCurrentRoute('create-org');
  };

  const handleOrganizationCreated = (org: Organization) => {
    // Add new organization to user's list with Admin role
    setUserOrganizations([
      ...userOrganizations,
      { organization: org, role: 'Admin' }
    ]);
    setSelectedOrganization(org);
    setCurrentRoute('dashboard');
  };

  const handleBackToSelection = () => {
    setCurrentRoute('org-selection');
  };

  const handleLogout = async () => {
    if (!USE_MOCK_DATA) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    
    setCurrentUser(null);
    setSelectedOrganization(null);
    setUserOrganizations([]);
    setSelectedGigId(null);
    setCurrentRoute('login');
  };

  const handleNavigateToGigs = () => {
    setCurrentRoute('gig-list');
  };

  const handleCreateGig = () => {
    setCurrentRoute('create-gig');
  };

  const handleViewGig = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('gig-detail');
  };

  const handleGigCreated = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('gig-detail');
  };

  const handleBackToDashboard = () => {
    setCurrentRoute('dashboard');
  };

  const handleBackToGigList = () => {
    setCurrentRoute('gig-list');
  };

  return (
    <>
      {currentRoute === 'login' && (
        <LoginScreen onLogin={handleLogin} useMockData={USE_MOCK_DATA} />
      )}
      
      {currentRoute === 'org-selection' && currentUser && (
        <OrganizationSelectionScreen
          user={currentUser}
          organizations={userOrganizations}
          onSelectOrganization={handleSelectOrganization}
          onCreateOrganization={handleCreateOrganization}
        />
      )}
      
      {currentRoute === 'create-org' && (
        <CreateOrganizationScreen
          onOrganizationCreated={handleOrganizationCreated}
          onCancel={handleBackToSelection}
        />
      )}
      
      {currentRoute === 'dashboard' && selectedOrganization && currentUser && (
        <Dashboard
          organization={selectedOrganization}
          user={currentUser}
          onBackToSelection={handleBackToSelection}
          onLogout={handleLogout}
          onNavigateToGigs={handleNavigateToGigs}
        />
      )}

      {currentRoute === 'gig-list' && selectedOrganization && currentUser && (
        <GigListScreen
          organization={selectedOrganization}
          user={currentUser}
          onBack={handleBackToDashboard}
          onCreateGig={handleCreateGig}
          onViewGig={handleViewGig}
          useMockData={USE_MOCK_DATA}
        />
      )}

      {currentRoute === 'create-gig' && selectedOrganization && currentUser && (
        <CreateGigScreen
          organization={selectedOrganization}
          user={currentUser}
          onCancel={handleBackToGigList}
          onGigCreated={handleGigCreated}
        />
      )}

      {currentRoute === 'gig-detail' && selectedOrganization && currentUser && selectedGigId && (
        <GigDetailScreen
          gigId={selectedGigId}
          organization={selectedOrganization}
          user={currentUser}
          onBack={handleBackToGigList}
        />
      )}
      
      <Toaster />
    </>
  );
}

export default App;

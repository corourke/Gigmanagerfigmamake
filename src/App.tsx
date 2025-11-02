import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import OrganizationSelectionScreen from './components/OrganizationSelectionScreen';
import CreateOrganizationScreen from './components/CreateOrganizationScreen';
import Dashboard from './components/Dashboard';
import { Toaster } from './components/ui/sonner';

export type OrganizationType = 
  | 'ProductionCompany' 
  | 'SoundLightingCompany' 
  | 'RentalCompany' 
  | 'Venue' 
  | 'Act';

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

type Route = 'login' | 'org-selection' | 'create-org' | 'dashboard';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMembership[]>([]);

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

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedOrganization(null);
    setUserOrganizations([]);
    setCurrentRoute('login');
  };

  return (
    <>
      {currentRoute === 'login' && (
        <LoginScreen onLogin={handleLogin} />
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
        />
      )}
      
      <Toaster />
    </>
  );
}

export default App;

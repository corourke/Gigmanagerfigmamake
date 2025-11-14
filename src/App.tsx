import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import UserProfileCompletionScreen from './components/UserProfileCompletionScreen';
import OrganizationSelectionScreen from './components/OrganizationSelectionScreen';
import CreateOrganizationScreen from './components/CreateOrganizationScreen';
import Dashboard from './components/Dashboard';
import GigListScreen from './components/GigListScreen';
import CreateGigScreen from './components/CreateGigScreen';
import GigDetailScreen from './components/GigDetailScreen';
import AssetListScreen from './components/AssetListScreen';
import CreateAssetScreen from './components/CreateAssetScreen';
import KitListScreen from './components/KitListScreen';
import CreateKitScreen from './components/CreateKitScreen';
import KitDetailScreen from './components/KitDetailScreen';
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
  | 'profile-completion'
  | 'org-selection' 
  | 'create-org' 
  | 'dashboard' 
  | 'gig-list'
  | 'create-gig'
  | 'gig-detail'
  | 'asset-list'
  | 'create-asset'
  | 'kit-list'
  | 'create-kit'
  | 'kit-detail';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMembership[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

  // Get user's role in the current organization
  const getCurrentUserRole = (): UserRole | undefined => {
    if (!selectedOrganization) return undefined;
    const membership = userOrganizations.find(
      (m) => m.organization.id === selectedOrganization.id
    );
    return membership?.role;
  };

  const handleLogin = (user: User, organizations: OrganizationMembership[]) => {
    setCurrentUser(user);
    setUserOrganizations(organizations);
    
    // Check if user needs to complete their profile
    // Profile is considered incomplete if both first_name and last_name are empty
    if (!user.first_name?.trim() && !user.last_name?.trim()) {
      setCurrentRoute('profile-completion');
    } else if (organizations.length === 1) {
      // Auto-select if user is only a member of one organization
      setSelectedOrganization(organizations[0].organization);
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute('org-selection');
    }
  };

  const handleProfileCompleted = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    // After profile completion, check if user has only one org
    if (userOrganizations.length === 1) {
      setSelectedOrganization(userOrganizations[0].organization);
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute('org-selection');
    }
  };

  const handleSkipProfile = () => {
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
    const newMembership: OrganizationMembership = {
      organization: org,
      role: 'Admin'
    };
    const updatedOrgs = [...userOrganizations, newMembership];
    setUserOrganizations(updatedOrgs);
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
    setSelectedAssetId(null);
    setSelectedKitId(null);
    setCurrentRoute('login');
  };

  const handleNavigateToGigs = () => {
    setCurrentRoute('gig-list');
  };

  const handleCreateGig = () => {
    setSelectedGigId(null); // Clear selected gig when creating new
    setCurrentRoute('create-gig');
  };

  const handleViewGig = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('create-gig'); // Use create-gig route for editing too
  };

  const handleGigCreated = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('gig-list'); // Navigate back to gig list instead of gig detail
  };

  const handleBackToDashboard = () => {
    setCurrentRoute('dashboard');
  };

  const handleBackToGigList = () => {
    setCurrentRoute('gig-list');
  };

  const handleNavigateToAssets = () => {
    setCurrentRoute('asset-list');
  };

  const handleCreateAsset = () => {
    setSelectedAssetId(null); // Clear selected asset when creating new
    setCurrentRoute('create-asset');
  };

  const handleViewAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('create-asset'); // Use create-asset route for editing too
  };

  const handleAssetCreated = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('asset-list'); // Navigate back to asset list instead of asset detail
  };

  const handleBackToAssetList = () => {
    setCurrentRoute('asset-list');
  };

  const handleNavigateToKits = () => {
    setCurrentRoute('kit-list');
  };

  const handleCreateKit = () => {
    setSelectedKitId(null); // Clear selected kit when creating new
    setCurrentRoute('create-kit');
  };

  const handleViewKit = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('kit-detail'); // Use kit-detail route for viewing
  };

  const handleEditKit = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('create-kit'); // Use create-kit route for editing
  };

  const handleKitCreated = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('kit-list'); // Navigate back to kit list instead of kit detail
  };

  const handleBackToKitList = () => {
    setCurrentRoute('kit-list');
  };

  return (
    <>
      {currentRoute === 'login' && (
        <LoginScreen onLogin={handleLogin} useMockData={USE_MOCK_DATA} />
      )}
      
      {currentRoute === 'profile-completion' && currentUser && (
        <UserProfileCompletionScreen
          user={currentUser}
          onProfileCompleted={handleProfileCompleted}
          onSkip={handleSkipProfile}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'org-selection' && currentUser && (
        <OrganizationSelectionScreen
          user={currentUser}
          organizations={userOrganizations}
          onSelectOrganization={handleSelectOrganization}
          onCreateOrganization={handleCreateOrganization}
        />
      )}
      
      {currentRoute === 'create-org' && currentUser && (
        <CreateOrganizationScreen
          onOrganizationCreated={handleOrganizationCreated}
          onCancel={handleBackToSelection}
          userId={currentUser.id}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'dashboard' && selectedOrganization && currentUser && (
        <Dashboard
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBackToSelection={handleBackToSelection}
          onLogout={handleLogout}
          onNavigateToGigs={handleNavigateToGigs}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToAssets={handleNavigateToAssets}
          onNavigateToKits={handleNavigateToKits}
        />
      )}

      {currentRoute === 'gig-list' && selectedOrganization && currentUser && (
        <GigListScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBack={handleBackToDashboard}
          onCreateGig={handleCreateGig}
          onViewGig={handleViewGig}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onNavigateToAssets={handleNavigateToAssets}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
          useMockData={USE_MOCK_DATA}
        />
      )}

      {currentRoute === 'create-gig' && selectedOrganization && currentUser && (
        <CreateGigScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          gigId={selectedGigId} // Pass gigId for edit mode
          onCancel={handleBackToGigList}
          onGigCreated={handleGigCreated}
          onGigUpdated={handleBackToGigList} // After updating, go back to list
          onGigDeleted={handleBackToGigList} // After deleting, go back to list
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}

      {currentRoute === 'gig-detail' && selectedOrganization && currentUser && selectedGigId && (
        <GigDetailScreen
          gigId={selectedGigId}
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBack={handleBackToGigList}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}
      
      {currentRoute === 'asset-list' && selectedOrganization && currentUser && (
        <AssetListScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBack={handleBackToDashboard}
          onCreateAsset={handleCreateAsset}
          onViewAsset={handleViewAsset}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onNavigateToAssets={handleNavigateToAssets}
          onNavigateToKits={handleNavigateToKits}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
          useMockData={USE_MOCK_DATA}
        />
      )}

      {currentRoute === 'create-asset' && selectedOrganization && currentUser && (
        <CreateAssetScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          assetId={selectedAssetId} // Pass assetId for edit mode
          onCancel={handleBackToAssetList}
          onAssetCreated={handleAssetCreated}
          onAssetUpdated={handleBackToAssetList} // After updating, go back to list
          onAssetDeleted={handleBackToAssetList} // After deleting, go back to list
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}
      
      {currentRoute === 'kit-list' && selectedOrganization && currentUser && (
        <KitListScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBack={handleBackToDashboard}
          onCreateKit={handleCreateKit}
          onViewKit={handleViewKit}
          onEditKit={handleEditKit}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onNavigateToAssets={handleNavigateToAssets}
          onNavigateToKits={handleNavigateToKits}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}

      {currentRoute === 'create-kit' && selectedOrganization && currentUser && (
        <CreateKitScreen
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          kitId={selectedKitId} // Pass kitId for edit mode
          onCancel={handleBackToKitList}
          onKitCreated={handleKitCreated}
          onKitUpdated={handleBackToKitList} // After updating, go back to list
          onKitDeleted={handleBackToKitList} // After deleting, go back to list
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}
      
      {currentRoute === 'kit-detail' && selectedOrganization && currentUser && selectedKitId && (
        <KitDetailScreen
          kitId={selectedKitId}
          organization={selectedOrganization}
          user={currentUser}
          userRole={getCurrentUserRole()}
          onBack={handleBackToKitList}
          onEdit={handleEditKit}
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleBackToGigList}
          onSwitchOrganization={handleBackToSelection}
          onLogout={handleLogout}
        />
      )}
      
      <Toaster />
    </>
  );
}

export default App;
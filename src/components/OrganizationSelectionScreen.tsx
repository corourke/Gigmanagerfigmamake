import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import {
  Search,
  Plus,
  Building2,
  Music,
  Lightbulb,
  Warehouse,
  MapPin,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import type { User, Organization, OrganizationMembership, OrganizationType, UserRole } from '../App';

interface OrganizationSelectionScreenProps {
  user: User;
  organizations: OrganizationMembership[];
  onSelectOrganization: (org: Organization) => void;
  onCreateOrganization: () => void;
}

const ORG_TYPE_CONFIG: Record<OrganizationType, { label: string; icon: typeof Building2; color: string }> = {
  Production: { label: 'Production Company', icon: Building2, color: 'bg-sky-100 text-sky-700' },
  Sound: { label: 'Sound Company', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  Lighting: { label: 'Lighting Company', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  Staging: { label: 'Staging Company', icon: Warehouse, color: 'bg-indigo-100 text-indigo-700' },
  Rentals: { label: 'Rental Company', icon: Warehouse, color: 'bg-purple-100 text-purple-700' },
  Venue: { label: 'Venue', icon: MapPin, color: 'bg-green-100 text-green-700' },
  Act: { label: 'Act', icon: Music, color: 'bg-pink-100 text-pink-700' },
  Agency: { label: 'Agency', icon: Building2, color: 'bg-blue-100 text-blue-700' }
};

const ROLE_CONFIG: Record<UserRole, { color: string }> = {
  Admin: { color: 'bg-red-100 text-red-700 border-red-200' },
  Manager: { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  Staff: { color: 'bg-gray-100 text-gray-700 border-gray-200' },
  Viewer: { color: 'bg-slate-100 text-slate-700 border-slate-200' }
};

type ViewState = 'default' | 'loading' | 'error';

export default function OrganizationSelectionScreen({
  user,
  organizations,
  onSelectOrganization,
  onCreateOrganization
}: OrganizationSelectionScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewState, setViewState] = useState<ViewState>('default');

  // Filter organizations by search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    
    const query = searchQuery.toLowerCase();
    return organizations.filter(({ organization }) =>
      organization.name.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  // Simulate loading state (for demo purposes)
  const simulateLoading = () => {
    setViewState('loading');
    setTimeout(() => setViewState('default'), 1000);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-sky-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-gray-900">GigManager</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                <AvatarFallback className="bg-sky-100 text-sky-700">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-900">{user.first_name} {user.last_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Select Organization</h1>
          <p className="text-gray-600">Choose an organization to continue or create a new one</p>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button
            onClick={onCreateOrganization}
            className="h-12 bg-sky-500 hover:bg-sky-600 text-white"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Organization
          </Button>
        </div>

        {/* Error State */}
        {viewState === 'error' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load organizations. 
              <button 
                onClick={simulateLoading}
                className="ml-2 underline hover:no-underline"
              >
                Try again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {viewState === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3 max-h-[120px]">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {viewState === 'default' && organizations.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No organizations yet</h3>
            <p className="text-gray-600 mb-6">You're not a member of any organizations</p>
            <Button
              onClick={onCreateOrganization}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Organization
            </Button>
          </div>
        )}

        {/* No Search Results */}
        {viewState === 'default' && organizations.length > 0 && filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try a different search term</p>
          </div>
        )}

        {/* Organization Cards */}
        {viewState === 'default' && filteredOrganizations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrganizations.map(({ organization, role }) => {
              const typeConfig = ORG_TYPE_CONFIG[organization.type];
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={organization.id}
                  className="p-3 hover:shadow-lg transition-shadow cursor-pointer group max-h-[120px]"
                  onClick={() => onSelectOrganization(organization)}
                >
                  <div className="flex items-start gap-3 h-full">
                    <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="text-gray-900 line-clamp-1 mb-1">{organization.name}</h3>
                        
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          <Badge variant="secondary" className={`${typeConfig.color} text-xs px-2 py-0`}>
                            {typeConfig.label}
                          </Badge>
                          <Badge variant="outline" className={`${ROLE_CONFIG[role].color} text-xs px-2 py-0`}>
                            {role}
                          </Badge>
                        </div>
                      </div>

                      {(organization.city || organization.state) && (
                        <p className="text-xs text-gray-500 truncate">
                          {[organization.city, organization.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Results Count */}
        {viewState === 'default' && filteredOrganizations.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredOrganizations.length} of {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

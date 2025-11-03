import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Search, X, Building2, MapPin, Loader2 } from 'lucide-react';
import type { Organization, OrganizationType } from '../App';

interface OrganizationSelectorProps {
  onSelect: (org: Organization) => void;
  selectedOrganization: Organization | null;
  organizationType?: OrganizationType;
  placeholder?: string;
  disabled?: boolean;
}

// Mock organization data for search
const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'v1',
    name: 'Central Park Amphitheater',
    type: 'Venue',
    city: 'Los Angeles',
    state: 'CA',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'v2',
    name: 'Grand Ballroom Hotel',
    type: 'Venue',
    city: 'New York',
    state: 'NY',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'v3',
    name: 'Lakeside Garden Venue',
    type: 'Venue',
    city: 'Chicago',
    state: 'IL',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'v4',
    name: 'The Blue Note Jazz Club',
    type: 'Venue',
    city: 'New York',
    state: 'NY',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'v5',
    name: 'Metropolitan Center',
    type: 'Venue',
    city: 'Chicago',
    state: 'IL',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'v6',
    name: 'Red Rocks Amphitheatre',
    type: 'Venue',
    city: 'Morrison',
    state: 'CO',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'a1',
    name: 'The Midnight Riders',
    type: 'Act',
    city: 'Nashville',
    state: 'TN',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'a2',
    name: 'Sarah Johnson Quartet',
    type: 'Act',
    city: 'New York',
    state: 'NY',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'a3',
    name: 'Electric Storm Band',
    type: 'Act',
    city: 'Los Angeles',
    state: 'CA',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'a4',
    name: 'Classical Strings Ensemble',
    type: 'Act',
    city: 'Boston',
    state: 'MA',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'a5',
    name: 'DJ Velocity',
    type: 'Act',
    city: 'Miami',
    state: 'FL',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const TYPE_CONFIG: Record<OrganizationType, { label: string; color: string }> = {
  ProductionCompany: { label: 'Production Company', color: 'bg-purple-100 text-purple-700' },
  SoundLightingCompany: { label: 'Sound & Lighting', color: 'bg-orange-100 text-orange-700' },
  RentalCompany: { label: 'Rental Company', color: 'bg-blue-100 text-blue-700' },
  Venue: { label: 'Venue', color: 'bg-green-100 text-green-700' },
  Act: { label: 'Act', color: 'bg-pink-100 text-pink-700' },
};

export default function OrganizationSelector({
  onSelect,
  selectedOrganization,
  organizationType,
  placeholder = 'Search for organization...',
  disabled = false,
}: OrganizationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API call
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const results = MOCK_ORGANIZATIONS.filter((org) => {
        // Filter by type if specified
        if (organizationType && org.type !== organizationType) {
          return false;
        }
        // Search by name or location
        return (
          org.name.toLowerCase().includes(lowerQuery) ||
          org.city?.toLowerCase().includes(lowerQuery) ||
          org.state?.toLowerCase().includes(lowerQuery)
        );
      });
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSelectOrganization = (org: Organization) => {
    onSelect(org);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemove = () => {
    onSelect(null as any);
  };

  return (
    <div className="space-y-3">
      {/* Display Selected Organization */}
      {selectedOrganization ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="p-2 bg-white rounded-lg border border-gray-200">
            <Building2 className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm truncate">{selectedOrganization.name}</p>
              <Badge variant="secondary" className={`${TYPE_CONFIG[selectedOrganization.type].color} text-xs`}>
                {TYPE_CONFIG[selectedOrganization.type].label}
              </Badge>
            </div>
            {(selectedOrganization.city || selectedOrganization.state) && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[selectedOrganization.city, selectedOrganization.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className="pl-9"
              />
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="p-0 w-[var(--radix-popover-trigger-width)]"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {isSearching ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-500" />
                    <p className="text-sm text-gray-600">Searching...</p>
                  </div>
                ) : searchQuery.trim() && searchResults.length > 0 ? (
                  <CommandGroup heading={`Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}>
                    {searchResults.map((org) => (
                      <CommandItem
                        key={org.id}
                        value={org.id}
                        onSelect={() => handleSelectOrganization(org)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Building2 className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm truncate">{org.name}</p>
                              <Badge variant="secondary" className={`${TYPE_CONFIG[org.type].color} text-xs`}>
                                {TYPE_CONFIG[org.type].label}
                              </Badge>
                            </div>
                            {(org.city || org.state) && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[org.city, org.state].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : searchQuery.trim() ? (
                  <CommandEmpty>
                    <div className="p-8 text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-900 mb-1">No results found</p>
                      <p className="text-sm text-gray-600">
                        Try a different search term
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <div className="p-8 text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Start typing to search for {organizationType ? TYPE_CONFIG[organizationType].label.toLowerCase() : 'organizations'}
                    </p>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Search, User as UserIcon, Loader2 } from 'lucide-react';
import type { User } from '../App';
import { searchUsers } from '../utils/api';

interface UserSelectorProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
}

export default function UserSelector({
  onSelect,
  placeholder = 'Search for user...',
  disabled = false,
  value = '',
}: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use API function instead of Edge Function
      const users = await searchUsers(query);
      setSearchResults(users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    onSelect(user);
    setSearchQuery(fullName);
    setIsOpen(false);
  };

  return (
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
                {searchResults.map((user) => {
                  const fullName = `${user.first_name} ${user.last_name}`.trim();
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleSelectUser(user)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <UserIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{fullName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : searchQuery.trim() ? (
              <CommandEmpty>
                <div className="p-8 text-center">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-900 mb-1">No users found</p>
                  <p className="text-sm text-gray-600">
                    Try a different search term
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Start typing to search for users
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
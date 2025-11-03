import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import {
  Search,
  Plus,
  ChevronLeft,
  MoreVertical,
  Calendar as CalendarIcon,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import type { Organization, User } from '../App';

export type GigStatus = 'Hold Date' | 'Proposed' | 'Booked' | 'Completed' | 'Cancelled' | 'Paid';

export interface Gig {
  id: string;
  title: string;
  date: string; // ISO date string
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  timezone: string;
  status: GigStatus;
  tags: string[];
  notes?: string;
  amount_paid?: number;
  venue?: Organization;
  act?: Organization;
  primary_contact_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface GigListScreenProps {
  organization: Organization;
  user: User;
  onBack: () => void;
  onCreateGig: () => void;
  onViewGig: (gigId: string) => void;
}

// Mock data
const MOCK_GIGS: Gig[] = [
  {
    id: '1',
    title: 'Summer Music Festival 2025',
    date: '2025-07-15',
    start_time: '14:00',
    end_time: '23:00',
    timezone: 'America/Los_Angeles',
    status: 'Booked',
    tags: ['Festival', 'Outdoor', 'Multi-Day'],
    amount_paid: 25000,
    venue: {
      id: 'v1',
      name: 'Central Park Amphitheater',
      type: 'Venue',
      city: 'Los Angeles',
      state: 'CA',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    act: {
      id: 'a1',
      name: 'The Midnight Riders',
      type: 'Act',
      city: 'Nashville',
      state: 'TN',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Corporate Holiday Gala',
    date: '2025-12-18',
    start_time: '18:00',
    end_time: '22:00',
    timezone: 'America/New_York',
    status: 'Proposed',
    tags: ['Corporate Event', 'Holiday'],
    venue: {
      id: 'v2',
      name: 'Grand Ballroom Hotel',
      type: 'Venue',
      city: 'New York',
      state: 'NY',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-01-20T14:30:00Z',
    updated_at: '2025-01-20T14:30:00Z',
  },
  {
    id: '3',
    title: 'Spring Wedding Reception',
    date: '2025-05-10',
    start_time: '17:00',
    end_time: '01:00',
    timezone: 'America/Chicago',
    status: 'Booked',
    tags: ['Wedding', 'Private Event'],
    amount_paid: 8500,
    venue: {
      id: 'v3',
      name: 'Lakeside Garden Venue',
      type: 'Venue',
      city: 'Chicago',
      state: 'IL',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-02-01T09:15:00Z',
    updated_at: '2025-02-01T09:15:00Z',
  },
  {
    id: '4',
    title: 'Tech Conference 2025',
    date: '2025-11-05',
    start_time: '08:00',
    end_time: '18:00',
    timezone: 'America/Los_Angeles',
    status: 'Hold Date',
    tags: ['Conference', 'Corporate Event'],
    created_at: '2025-01-25T16:00:00Z',
    updated_at: '2025-01-25T16:00:00Z',
  },
  {
    id: '5',
    title: 'Jazz Night at The Blue Note',
    date: '2025-03-22',
    start_time: '20:00',
    end_time: '23:30',
    timezone: 'America/New_York',
    status: 'Completed',
    tags: ['Concert', 'Jazz'],
    amount_paid: 3500,
    venue: {
      id: 'v4',
      name: 'The Blue Note Jazz Club',
      type: 'Venue',
      city: 'New York',
      state: 'NY',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    act: {
      id: 'a2',
      name: 'Sarah Johnson Quartet',
      type: 'Act',
      city: 'New York',
      state: 'NY',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-01-10T11:00:00Z',
    updated_at: '2025-03-23T10:00:00Z',
  },
  {
    id: '6',
    title: 'Charity Fundraiser Gala',
    date: '2025-10-15',
    start_time: '18:30',
    end_time: '23:00',
    timezone: 'America/Chicago',
    status: 'Paid',
    tags: ['Charity', 'Gala', 'Formal'],
    amount_paid: 15000,
    venue: {
      id: 'v5',
      name: 'Metropolitan Center',
      type: 'Venue',
      city: 'Chicago',
      state: 'IL',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-08-01T13:00:00Z',
    updated_at: '2025-10-16T09:00:00Z',
  },
  {
    id: '7',
    title: 'Outdoor Concert Series - Week 1',
    date: '2025-06-07',
    start_time: '19:00',
    end_time: '22:00',
    timezone: 'America/Denver',
    status: 'Booked',
    tags: ['Concert', 'Series', 'Outdoor'],
    venue: {
      id: 'v6',
      name: 'Red Rocks Amphitheatre',
      type: 'Venue',
      city: 'Morrison',
      state: 'CO',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    created_at: '2025-01-28T10:30:00Z',
    updated_at: '2025-01-28T10:30:00Z',
  },
  {
    id: '8',
    title: 'Theater Production - Opening Night',
    date: '2025-04-12',
    start_time: '19:30',
    end_time: '22:00',
    timezone: 'America/New_York',
    status: 'Cancelled',
    tags: ['Theater', 'Live Performance'],
    created_at: '2025-01-05T14:00:00Z',
    updated_at: '2025-03-20T16:00:00Z',
  },
];

const STATUS_CONFIG: Record<GigStatus, { color: string; label: string }> = {
  'Hold Date': { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Hold Date' },
  'Proposed': { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Proposed' },
  'Booked': { color: 'bg-green-100 text-green-700 border-green-300', label: 'Booked' },
  'Completed': { color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Completed' },
  'Cancelled': { color: 'bg-red-100 text-red-700 border-red-300', label: 'Cancelled' },
  'Paid': { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: 'Paid' },
};

export default function GigListScreen({
  organization,
  user,
  onBack,
  onCreateGig,
  onViewGig,
}: GigListScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GigStatus | 'All'>('All');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // Mock loading state on mount
  useState(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  });

  // Filter and sort gigs
  const filteredGigs = useMemo(() => {
    let filtered = [...MOCK_GIGS];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((gig) =>
        gig.title.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((gig) => gig.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((gig) => new Date(gig.date) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((gig) => new Date(gig.date) <= dateTo);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [searchQuery, statusFilter, dateFrom, dateTo, sortOrder]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || dateFrom || dateTo;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-gray-900">Gigs</h1>
                <p className="text-sm text-gray-600">{organization.name}</p>
              </div>
            </div>
            <Button
              onClick={onCreateGig}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Gig
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search gigs by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as GigStatus | 'All')}>
              <SelectTrigger className="w-full lg:w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateFrom && dateTo
                    ? `${format(dateFrom, 'MMM dd')} - ${format(dateTo, 'MMM dd')}`
                    : dateFrom
                    ? `From ${format(dateFrom, 'MMM dd')}`
                    : dateTo
                    ? `Until ${format(dateTo, 'MMM dd')}`
                    : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <p className="text-sm">Select date range</p>
                </div>
                <div className="flex gap-2 p-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">From</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">To</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </div>
                </div>
                <div className="p-3 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Oldest First</SelectItem>
                <SelectItem value="desc">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3">
              <p className="text-sm text-gray-600">Active filters:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Act</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : filteredGigs.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">
                {hasActiveFilters ? 'No gigs found' : 'No gigs yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first gig to get started'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={onCreateGig} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Gig
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredGigs.length} {filteredGigs.length === 1 ? 'gig' : 'gigs'}
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Act</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGigs.map((gig) => (
                      <TableRow key={gig.id} className="hover:bg-gray-50">
                        <TableCell>
                          <button
                            onClick={() => onViewGig(gig.id)}
                            className="text-sky-600 hover:text-sky-700 hover:underline text-left"
                          >
                            {gig.title}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {formatDate(gig.date)}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {formatTime(gig.start_time, gig.end_time)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CONFIG[gig.status].color}>
                            {gig.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {gig.venue?.name || '-'}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {gig.act?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {gig.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {gig.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{gig.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewGig(gig.id)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Duplicate</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

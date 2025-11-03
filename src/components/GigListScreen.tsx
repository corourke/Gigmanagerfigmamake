import { useState, useMemo, useRef, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Search,
  Plus,
  ChevronLeft,
  MoreVertical,
  Calendar as CalendarIcon,
  Filter,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  Edit,
  Copy,
  Trash2,
} from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format, parse } from 'date-fns';
import { toast } from 'sonner@2.0.3';
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

type EditingCell = {
  gigId: string;
  field: 'title' | 'date' | 'status' | 'venue' | 'act' | 'tags';
} | null;

interface CellError {
  gigId: string;
  field: string;
  message: string;
}

// Mock organizations for venue/act selection
const MOCK_VENUES: Organization[] = [
  { id: 'v1', name: 'Central Park Amphitheater', type: 'Venue', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v2', name: 'Grand Ballroom Hotel', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v3', name: 'Lakeside Garden Venue', type: 'Venue', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v4', name: 'The Blue Note Jazz Club', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v5', name: 'Metropolitan Center', type: 'Venue', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v6', name: 'Red Rocks Amphitheatre', type: 'Venue', city: 'Morrison', state: 'CO', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v7', name: 'Radio City Music Hall', type: 'Venue', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v8', name: 'The Greek Theatre', type: 'Venue', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v9', name: 'The Fillmore', type: 'Venue', city: 'San Francisco', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'v10', name: 'House of Blues', type: 'Venue', city: 'Boston', state: 'MA', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const MOCK_ACTS: Organization[] = [
  { id: 'a1', name: 'The Midnight Riders', type: 'Act', city: 'Nashville', state: 'TN', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a2', name: 'Sarah Johnson Quartet', type: 'Act', city: 'New York', state: 'NY', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a3', name: 'Electric Dreams Band', type: 'Act', city: 'Los Angeles', state: 'CA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a4', name: 'Jazz Collective', type: 'Act', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a5', name: 'The Acoustic Sessions', type: 'Act', city: 'Austin', state: 'TX', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a6', name: 'Symphony Orchestra', type: 'Act', city: 'Boston', state: 'MA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a7', name: 'Rock Revolution', type: 'Act', city: 'Seattle', state: 'WA', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a8', name: 'Country Roads Trio', type: 'Act', city: 'Nashville', state: 'TN', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a9', name: 'The Blues Brothers Tribute', type: 'Act', city: 'Chicago', state: 'IL', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'a10', name: 'Classical Ensemble', type: 'Act', city: 'Philadelphia', state: 'PA', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

// Mock data
const MOCK_GIGS_DATA: Gig[] = [
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
    venue: MOCK_VENUES[0],
    act: MOCK_ACTS[0],
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
    venue: MOCK_VENUES[1],
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
    venue: MOCK_VENUES[2],
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
    venue: MOCK_VENUES[3],
    act: MOCK_ACTS[1],
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
    venue: MOCK_VENUES[4],
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
    venue: MOCK_VENUES[5],
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

const ALL_TAGS = ['Festival', 'Concert', 'Corporate Event', 'Wedding', 'Theater', 'Conference', 'Charity', 'Gala', 'Outdoor', 'Multi-Day', 'Series', 'Private Event', 'Jazz', 'Formal', 'Live Performance', 'Holiday'];

export default function GigListScreen({
  organization,
  user,
  onBack,
  onCreateGig,
  onViewGig,
}: GigListScreenProps) {
  const [gigs, setGigs] = useState<Gig[]>(MOCK_GIGS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GigStatus | 'All'>('All');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [savingCell, setSavingCell] = useState<{ gigId: string; field: string } | null>(null);
  const [cellError, setCellError] = useState<CellError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Time editing dialog
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [timeDialogGig, setTimeDialogGig] = useState<Gig | null>(null);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');

  // Venue/Act search
  const [venueSearch, setVenueSearch] = useState('');
  const [actSearch, setActSearch] = useState('');

  // Mock loading state on mount
  useState(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  });

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Filter and sort gigs
  const filteredGigs = useMemo(() => {
    let filtered = [...gigs];

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
  }, [gigs, searchQuery, statusFilter, dateFrom, dateTo, sortOrder]);

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

  // Start editing a cell
  const startEditing = (gigId: string, field: EditingCell['field'], currentValue: any) => {
    setEditingCell({ gigId, field });
    setEditValue(currentValue);
    setCellError(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue(null);
    setCellError(null);
    setVenueSearch('');
    setActSearch('');
  };

  // Validate and save changes
  const saveEdit = async (gigId: string, field: string, newValue: any) => {
    // Validation
    if (field === 'title') {
      if (!newValue || newValue.trim().length === 0) {
        setCellError({ gigId, field, message: 'Title is required' });
        return;
      }
      if (newValue.trim().length > 200) {
        setCellError({ gigId, field, message: 'Title must be 200 characters or less' });
        return;
      }
    }

    // Clear editing state
    setEditingCell(null);
    setEditValue(null);
    setCellError(null);
    setVenueSearch('');
    setActSearch('');

    // Optimistic update
    const previousGigs = [...gigs];
    const updatedGigs = gigs.map(gig => {
      if (gig.id === gigId) {
        if (field === 'title') return { ...gig, title: newValue };
        if (field === 'date') return { ...gig, date: newValue };
        if (field === 'status') return { ...gig, status: newValue };
        if (field === 'venue') return { ...gig, venue: newValue };
        if (field === 'act') return { ...gig, act: newValue };
        if (field === 'tags') return { ...gig, tags: newValue };
      }
      return gig;
    });
    setGigs(updatedGigs);

    // Show saving state
    setSavingCell({ gigId, field });

    // Simulate API call
    setTimeout(() => {
      // Simulate random failure (5% chance)
      if (Math.random() < 0.05) {
        // Rollback on error
        setGigs(previousGigs);
        toast.error('Failed to save changes. Please try again.');
        setSavingCell(null);
        return;
      }

      // Success
      setSavingCell(null);
      toast.success('Changes saved successfully');
    }, 800);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent, gigId: string, field: EditingCell['field']) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Enter' && field === 'title') {
      e.preventDefault();
      saveEdit(gigId, field, editValue);
    }
  };

  // Open time dialog
  const openTimeDialog = (gig: Gig) => {
    setTimeDialogGig(gig);
    setTempStartTime(gig.start_time);
    setTempEndTime(gig.end_time);
    setTimeDialogOpen(true);
  };

  // Save time from dialog
  const saveTimeDialog = () => {
    if (!timeDialogGig) return;
    
    if (tempEndTime <= tempStartTime) {
      toast.error('End time must be after start time');
      return;
    }

    const previousGigs = [...gigs];
    const updatedGigs = gigs.map(gig => 
      gig.id === timeDialogGig.id 
        ? { ...gig, start_time: tempStartTime, end_time: tempEndTime }
        : gig
    );
    setGigs(updatedGigs);
    setSavingCell({ gigId: timeDialogGig.id, field: 'time' });
    setTimeDialogOpen(false);

    // Simulate API call
    setTimeout(() => {
      if (Math.random() < 0.05) {
        setGigs(previousGigs);
        toast.error('Failed to save time changes.');
        setSavingCell(null);
        return;
      }
      setSavingCell(null);
      toast.success('Time updated successfully');
    }, 800);
  };

  // Filter venues by search
  const filteredVenues = useMemo(() => {
    if (!venueSearch.trim()) return MOCK_VENUES.slice(0, 10);
    return MOCK_VENUES.filter(v => 
      v.name.toLowerCase().includes(venueSearch.toLowerCase())
    ).slice(0, 10);
  }, [venueSearch]);

  // Filter acts by search
  const filteredActs = useMemo(() => {
    if (!actSearch.trim()) return MOCK_ACTS.slice(0, 10);
    return MOCK_ACTS.filter(a => 
      a.name.toLowerCase().includes(actSearch.toLowerCase())
    ).slice(0, 10);
  }, [actSearch]);

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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Act</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredGigs.length} {filteredGigs.length === 1 ? 'gig' : 'gigs'}
              </p>
              <p className="text-xs text-gray-500">
                Click any field to edit inline
              </p>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Act</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGigs.map((gig) => (
                      <TableRow 
                        key={gig.id} 
                        className={`${
                          editingCell?.gigId === gig.id ? 'bg-sky-50' : ''
                        }`}
                      >
                        {/* Actions Cell */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => onViewGig(gig.id)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        {/* Title Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'title' ? (
                            <div className="space-y-1">
                              <Input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEdit(gig.id, 'title', editValue)}
                                onKeyDown={(e) => handleKeyDown(e, gig.id, 'title')}
                                className={`h-8 ${cellError?.gigId === gig.id && cellError?.field === 'title' ? 'border-red-500' : ''}`}
                                disabled={savingCell?.gigId === gig.id}
                              />
                              {cellError?.gigId === gig.id && cellError?.field === 'title' && (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {cellError.message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'title', gig.title)}
                                className="text-gray-900 hover:bg-gray-100 px-2 py-1 rounded text-left flex-1 w-full"
                              >
                                {gig.title}
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'title' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Date Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'date' ? (
                            <div className="relative">
                              <Popover open={true} onOpenChange={(open) => !open && cancelEditing()}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full h-8 justify-start text-left text-sm"
                                  >
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    {editValue ? format(new Date(editValue), 'MMM dd, yyyy') : formatDate(gig.date)}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                                  <Calendar
                                    mode="single"
                                    selected={editValue ? new Date(editValue) : new Date(gig.date)}
                                    onSelect={(date) => {
                                      if (date) {
                                        const isoDate = format(date, 'yyyy-MM-dd');
                                        saveEdit(gig.id, 'date', isoDate);
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'date', gig.date)}
                                className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
                              >
                                {formatDate(gig.date)}
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'date' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Time Cell */}
                        <TableCell className="relative">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openTimeDialog(gig)}
                              className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left flex items-center gap-2 w-full"
                            >
                              <Clock className="w-4 h-4 text-gray-400" />
                              {formatTime(gig.start_time, gig.end_time)}
                            </button>
                            {savingCell?.gigId === gig.id && savingCell?.field === 'time' && (
                              <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                            )}
                          </div>
                        </TableCell>

                        {/* Status Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'status' ? (
                            <Select
                              value={editValue || gig.status}
                              onValueChange={(value) => {
                                setEditValue(value);
                                saveEdit(gig.id, 'status', value);
                              }}
                              open={true}
                              onOpenChange={(open) => !open && cancelEditing()}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(STATUS_CONFIG).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status as GigStatus].color}`} />
                                      {status}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'status', gig.status)}
                                className="hover:opacity-80 w-full text-left"
                              >
                                <Badge variant="outline" className={STATUS_CONFIG[gig.status].color}>
                                  {gig.status}
                                </Badge>
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'status' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Venue Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'venue' ? (
                            <Popover open={true} onOpenChange={(open) => !open && cancelEditing()}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 w-full justify-start text-left text-sm">
                                  {editValue?.name || gig.venue?.name || 'Select venue'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start" side="bottom">
                                <div className="p-3 border-b">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="Search venues..."
                                      value={venueSearch}
                                      onChange={(e) => setVenueSearch(e.target.value)}
                                      className="pl-9"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {filteredVenues.map((venue) => (
                                    <button
                                      key={venue.id}
                                      onClick={() => {
                                        setEditValue(venue);
                                        saveEdit(gig.id, 'venue', venue);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                                    >
                                      <div>{venue.name}</div>
                                      <div className="text-xs text-gray-500">{venue.city}, {venue.state}</div>
                                    </button>
                                  ))}
                                  {filteredVenues.length === 0 && (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                      No venues found
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setEditValue(null);
                                      saveEdit(gig.id, 'venue', null);
                                    }}
                                  >
                                    Clear selection
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'venue', gig.venue || null)}
                                className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
                              >
                                {gig.venue?.name || '-'}
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'venue' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Act Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'act' ? (
                            <Popover open={true} onOpenChange={(open) => !open && cancelEditing()}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 w-full justify-start text-left text-sm">
                                  {editValue?.name || gig.act?.name || 'Select act'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start" side="bottom">
                                <div className="p-3 border-b">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="Search acts..."
                                      value={actSearch}
                                      onChange={(e) => setActSearch(e.target.value)}
                                      className="pl-9"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {filteredActs.map((act) => (
                                    <button
                                      key={act.id}
                                      onClick={() => {
                                        setEditValue(act);
                                        saveEdit(gig.id, 'act', act);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                                    >
                                      <div>{act.name}</div>
                                      <div className="text-xs text-gray-500">{act.city}, {act.state}</div>
                                    </button>
                                  ))}
                                  {filteredActs.length === 0 && (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                      No acts found
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setEditValue(null);
                                      saveEdit(gig.id, 'act', null);
                                    }}
                                  >
                                    Clear selection
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'act', gig.act || null)}
                                className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
                              >
                                {gig.act?.name || '-'}
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'act' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Tags Cell */}
                        <TableCell className="relative">
                          {editingCell?.gigId === gig.id && editingCell?.field === 'tags' ? (
                            <Popover open={true} onOpenChange={(open) => {
                              if (!open) {
                                saveEdit(gig.id, 'tags', editValue || gig.tags);
                              }
                            }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 w-full justify-start text-left text-sm">
                                  {editValue?.length > 0 ? `${editValue.length} selected` : 'Select tags'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start" side="bottom">
                                <div className="p-3 border-b">
                                  <p className="text-sm">Select tags</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2">
                                  {ALL_TAGS.map((tag) => {
                                    const isSelected = (editValue || gig.tags).includes(tag);
                                    return (
                                      <div
                                        key={tag}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                                        onClick={() => {
                                          const currentTags = editValue || gig.tags;
                                          const newTags = isSelected
                                            ? currentTags.filter((t: string) => t !== tag)
                                            : [...currentTags, tag];
                                          setEditValue(newTags);
                                        }}
                                      >
                                        <Checkbox checked={isSelected} />
                                        <span className="text-sm">{tag}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="p-2 border-t flex justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditValue([])}
                                  >
                                    Clear all
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(gig.id, 'tags', editValue || gig.tags)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(gig.id, 'tags', gig.tags)}
                                className="flex flex-wrap gap-1 hover:bg-gray-100 px-2 py-1 rounded w-full"
                              >
                                {gig.tags.length > 0 ? (
                                  <>
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
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-sm">Add tags</span>
                                )}
                              </button>
                              {savingCell?.gigId === gig.id && savingCell?.field === 'tags' && (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              )}
                            </div>
                          )}
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

      {/* Time Edit Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time</DialogTitle>
            <DialogDescription>
              Update the start and end times for {timeDialogGig?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={tempStartTime}
                onChange={(e) => setTempStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={tempEndTime}
                onChange={(e) => setTempEndTime(e.target.value)}
              />
            </div>
            {tempEndTime && tempStartTime && tempEndTime <= tempStartTime && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                End time must be after start time
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTimeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveTimeDialog}
              disabled={!tempStartTime || !tempEndTime || tempEndTime <= tempStartTime}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

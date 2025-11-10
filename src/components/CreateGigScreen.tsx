import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  AlertCircle,
  Loader2,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Plus,
  X,
  Users,
  Wrench,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { z } from 'zod';
import MarkdownEditor from './MarkdownEditor';
import TagsInput from './TagsInput';
import OrganizationSelector from './OrganizationSelector';
import type { Organization, User, UserRole } from '../App';
import type { GigStatus } from './GigListScreen';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface CreateGigScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onCancel: () => void;
  onGigCreated: (gigId: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

// Zod validation schema
const gigSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  date: z.date({ required_error: 'Date is required' }),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  status: z.enum(['DateHold', 'Proposed', 'Booked', 'Completed', 'Cancelled', 'Settled']),
  amount_paid: z.string().refine((val) => {
    if (!val.trim()) return true; // Optional field
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
}).refine((data) => {
  // End time must be after start time
  if (data.start_time && data.end_time) {
    return data.end_time > data.start_time;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

interface FormData {
  title: string;
  date: Date | undefined;
  start_time: string;
  end_time: string;
  timezone: string;
  status: GigStatus;
  tags: string[];
  notes: string;
  amount_paid: string;
}

interface ParticipantData {
  id: string;
  organization_id: string;
  organization: Organization;
  role: string;
  status: 'Pending' | 'Confirmed' | 'Declined';
  notes: string;
}

interface StaffData {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  rate: string;
  notes: string;
}

interface EquipmentData {
  id: string;
  equipment_id: string;
  equipment_name: string;
  quantity: number;
  notes: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

const STATUS_OPTIONS: { value: GigStatus; label: string }[] = [
  { value: 'DateHold', label: 'Hold Date' },
  { value: 'Proposed', label: 'Proposed' },
  { value: 'Booked', label: 'Booked' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Settled', label: 'Paid' },
];

const SUGGESTED_TAGS = [
  'Concert',
  'Corporate Event',
  'Festival',
  'Theater',
  'Wedding',
  'Live Music',
  'Conference',
  'Private Event',
  'Outdoor',
  'Multi-Day',
  'Charity',
  'Gala',
];

const PARTICIPANT_ROLES = [
  'Sound Provider',
  'Lighting Provider',
  'Staging Provider',
  'Equipment Rental',
  'Production Company',
  'Other',
];

export default function CreateGigScreen({
  organization,
  user,
  userRole,
  onCancel,
  onGigCreated,
  onNavigateToDashboard,
  onNavigateToGigs,
  onSwitchOrganization,
  onLogout,
}: CreateGigScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: undefined,
    start_time: '19:00',
    end_time: '23:00',
    timezone: 'America/Los_Angeles',
    status: 'DateHold',
    tags: [],
    notes: '',
    amount_paid: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Participants
  const [selectedVenue, setSelectedVenue] = useState<Organization | null>(null);
  const [selectedAct, setSelectedAct] = useState<Organization | null>(null);
  const [additionalParticipants, setAdditionalParticipants] = useState<ParticipantData[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // Staff
  const [staffAssignments, setStaffAssignments] = useState<StaffData[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Equipment
  const [equipmentAllocations, setEquipmentAllocations] = useState<EquipmentData[]>([]);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);

  // Load available users for staff assignment
  useEffect(() => {
    loadAvailableUsers();
  }, [organization.id]);

  const loadAvailableUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // For now, we'll just include the current user
      // In a full implementation, this would fetch all organization members
      setAvailableUsers([user]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[] | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      gigSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Participant Management
  const handleAddParticipant = (org: Organization, role: string) => {
    const newParticipant: ParticipantData = {
      id: Math.random().toString(36).substr(2, 9),
      organization_id: org.id,
      organization: org,
      role,
      status: 'Pending',
      notes: '',
    };
    setAdditionalParticipants([...additionalParticipants, newParticipant]);
    setShowAddParticipant(false);
  };

  const handleRemoveParticipant = (id: string) => {
    setAdditionalParticipants(additionalParticipants.filter(p => p.id !== id));
  };

  // Staff Management
  const handleAddStaff = (userId: string, userName: string, role: string) => {
    const newStaff: StaffData = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      user_name: userName,
      role,
      rate: '',
      notes: '',
    };
    setStaffAssignments([...staffAssignments, newStaff]);
    setShowAddStaff(false);
  };

  const handleRemoveStaff = (id: string) => {
    setStaffAssignments(staffAssignments.filter(s => s.id !== id));
  };

  const handleUpdateStaffRate = (id: string, rate: string) => {
    setStaffAssignments(staffAssignments.map(s => 
      s.id === id ? { ...s, rate } : s
    ));
  };

  // Equipment Management
  const handleAddEquipment = (equipmentId: string, equipmentName: string) => {
    const newEquipment: EquipmentData = {
      id: Math.random().toString(36).substr(2, 9),
      equipment_id: equipmentId,
      equipment_name: equipmentName,
      quantity: 1,
      notes: '',
    };
    setEquipmentAllocations([...equipmentAllocations, newEquipment]);
    setShowAddEquipment(false);
  };

  const handleRemoveEquipment = (id: string) => {
    setEquipmentAllocations(equipmentAllocations.filter(e => e.id !== id));
  };

  const handleUpdateEquipmentQuantity = (id: string, quantity: number) => {
    setEquipmentAllocations(equipmentAllocations.map(e => 
      e.id === id ? { ...e, quantity } : e
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setErrors({ general: 'Not authenticated. Please sign in again.' });
        setIsSubmitting(false);
        return;
      }

      // Combine date and time into ISO DateTime strings
      const startDateTime = new Date(formData.date!);
      const [startHours, startMinutes] = formData.start_time.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDateTime = new Date(formData.date!);
      const [endHours, endMinutes] = formData.end_time.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // If end time is before start time, assume it's the next day
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      // Prepare gig data
      const gigData = {
        primary_organization_id: organization.id,
        title: formData.title.trim(),
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        timezone: formData.timezone,
        status: formData.status,
        tags: formData.tags,
        notes: formData.notes.trim() || null,
        amount_paid: formData.amount_paid.trim() ? parseFloat(formData.amount_paid) : null,
        venue_id: selectedVenue?.id || null,
        act_id: selectedAct?.id || null,
        participants: additionalParticipants.map(p => ({
          organization_id: p.organization_id,
          role: p.role,
          notes: p.notes || null,
        })),
        staff: staffAssignments.map(s => ({
          staff_role_id: s.staff_role_id,
          required_count: s.required_count || 1,
          notes: s.notes || null,
        })),
        equipment: equipmentAllocations.map(e => ({
          equipment_id: e.equipment_id,
          quantity: e.quantity,
          notes: e.notes || null,
        })),
      };

      // Create gig via server endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/gigs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gigData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create gig');
      }

      const newGig = await response.json();

      toast.success('Gig created successfully!');
      onGigCreated(newGig.id);
    } catch (err: any) {
      console.error('Error creating gig:', err);
      setErrors({ general: err.message || 'Failed to create gig. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="create-gig"
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToGigs={onNavigateToGigs}
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      {/* Page Title Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-gray-900">Create New Gig</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Section 1: Basic Information */}
          <Card className="p-6 sm:p-8 mb-6">
            <h3 className="text-gray-900 mb-6">Basic Information</h3>

            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Gig Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter gig title (e.g., Summer Music Festival)"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={errors.title ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left ${
                        errors.date ? 'border-red-500' : ''
                      }`}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'PPP') : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => handleInputChange('date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Start and End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                      className={`pl-9 ${errors.start_time ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.start_time && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.start_time}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">
                    End Time <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                      className={`pl-9 ${errors.end_time ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.end_time && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.end_time}
                    </p>
                  )}
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">
                  Timezone <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.timezone ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.timezone}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Section 2: Participants */}
          <Card className="p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Participants</h3>
            </div>

            <div className="space-y-6">
              {/* Venue */}
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <OrganizationSelector
                  onSelect={setSelectedVenue}
                  selectedOrganization={selectedVenue}
                  organizationType="Venue"
                  placeholder="Search for venue..."
                  disabled={isSubmitting}
                />
              </div>

              {/* Act */}
              <div className="space-y-2">
                <Label htmlFor="act">Act</Label>
                <OrganizationSelector
                  onSelect={setSelectedAct}
                  selectedOrganization={selectedAct}
                  organizationType="Act"
                  placeholder="Search for act..."
                  disabled={isSubmitting}
                />
              </div>

              {/* Additional Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Additional Participants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddParticipant(true)}
                    disabled={isSubmitting}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Participant
                  </Button>
                </div>

                {additionalParticipants.length > 0 && (
                  <div className="space-y-2">
                    {additionalParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{participant.organization.name}</p>
                          <p className="text-xs text-gray-500">{participant.role}</p>
                        </div>
                        <Badge variant="outline">{participant.status}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddParticipant && (
                  <Card className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-3">
                      Add sound, lighting, staging, or other production companies to this gig
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddParticipant(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Use organization selector to add participants (feature coming soon)
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </Card>

          {/* Section 3: Staff Assignments */}
          <Card className="p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Staff Assignments</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Assign staff members to this gig
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddStaff(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Staff
                </Button>
              </div>

              {staffAssignments.length > 0 && (
                <div className="space-y-2">
                  {staffAssignments.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{staff.user_name}</p>
                        <p className="text-xs text-gray-500">{staff.role}</p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={staff.rate}
                          onChange={(e) => handleUpdateStaffRate(staff.id, e.target.value)}
                          className="text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStaff(staff.id)}
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showAddStaff && (
                <Card className="p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Select staff member and role
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Add current user as an example
                        handleAddStaff(user.id, `${user.first_name} ${user.last_name}`, 'Staff');
                      }}
                    >
                      Add Me
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddStaff(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Full staff roster integration coming soon
                  </p>
                </Card>
              )}
            </div>
          </Card>

          {/* Section 4: Equipment */}
          <Card className="p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Wrench className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Equipment Allocation</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Allocate equipment to this gig
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddEquipment(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Equipment
                </Button>
              </div>

              {equipmentAllocations.length > 0 && (
                <div className="space-y-2">
                  {equipmentAllocations.map((equipment) => (
                    <div
                      key={equipment.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{equipment.equipment_name}</p>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={equipment.quantity}
                          onChange={(e) => handleUpdateEquipmentQuantity(equipment.id, parseInt(e.target.value) || 1)}
                          className="text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEquipment(equipment.id)}
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showAddEquipment && (
                <Card className="p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Equipment management will be available once equipment is added to your organization
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddEquipment(false)}
                  >
                    Cancel
                  </Button>
                </Card>
              )}
            </div>
          </Card>

          {/* Section 5: Additional Information */}
          <Card className="p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-2 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900">
                  <strong>Private to your organization:</strong> Tags, notes, and financial information below are only visible to members of your organization.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <TagsInput
                  value={formData.tags}
                  onChange={(tags) => handleInputChange('tags', tags)}
                  suggestions={SUGGESTED_TAGS}
                  placeholder="Add tags to categorize this gig..."
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">Tags help organize and filter gigs</p>
              </div>

              {/* Amount Paid */}
              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount_paid}
                    onChange={(e) => handleInputChange('amount_paid', e.target.value)}
                    className={`pl-7 ${errors.amount_paid ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.amount_paid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amount_paid}
                  </p>
                )}
                <p className="text-sm text-gray-500">Total revenue collected for this gig</p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <MarkdownEditor
                  value={formData.notes}
                  onChange={(value) => handleInputChange('notes', value)}
                  placeholder="Add notes about this gig... You can use **Markdown** formatting!"
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">Supports Markdown formatting for rich text</p>
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white sm:ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Gig...
                </>
              ) : (
                'Create Gig'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
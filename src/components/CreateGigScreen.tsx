import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Textarea } from './ui/textarea';
import AppHeader from './AppHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertCircle,
  Loader2,
  ChevronLeft,
  Clock,
  Lock,
  Plus,
  X,
  Users,
  Wrench,
  Building2,
  FileText,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { z } from 'zod';
import MarkdownEditor from './MarkdownEditor';
import TagsInput from './TagsInput';
import OrganizationSelector from './OrganizationSelector';
import UserSelector from './UserSelector';
import type { Organization, User, UserRole, OrganizationType } from '../App';
import type { GigStatus } from './GigListScreen';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

const supabase = createClient();

interface CreateGigScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  gigId?: string | null; // Add gigId for edit mode
  onCancel: () => void;
  onGigCreated: (gigId: string) => void;
  onGigUpdated?: () => void; // Add callback for updates
  onGigDeleted?: () => void; // Add callback for deletion
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

// Zod validation schema
const gigSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  start_time: z.date({ required_error: 'Start date/time is required' }),
  end_time: z.date({ required_error: 'End date/time is required' }),
  timezone: z.string().min(1, 'Timezone is required'),
  status: z.enum(['DateHold', 'Proposed', 'Booked', 'Completed', 'Cancelled', 'Settled']),
  amount_paid: z.string().refine((val) => {
    if (!val.trim()) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
}).refine((data) => {
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
  start_time: Date | undefined;
  end_time: Date | undefined;
  timezone: string;
  status: GigStatus;
  tags: string[];
  notes: string;
  amount_paid: string;
}

interface ParticipantData {
  id: string;
  organization_id: string;
  organization_name: string;
  organization?: Organization | null; // Store full organization object for selector
  role: string;
  notes: string;
}

interface StaffSlotData {
  id: string;
  role: string;
  count: number;
  notes: string;
  assignments: StaffAssignmentData[];
}

interface StaffAssignmentData {
  id: string;
  user_id: string;
  user_name: string;
  status: 'Requested' | 'Confirmed' | 'Declined';
  compensation_type: 'rate' | 'fee';
  amount: string;
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

const ORGANIZATION_TYPES: OrganizationType[] = [
  'Production',
  'Sound',
  'Lighting',
  'Staging',
  'Rentals',
  'Venue',
  'Act',
  'Agency',
];

export default function CreateGigScreen({
  organization,
  user,
  userRole,
  gigId,
  onCancel,
  onGigCreated,
  onGigUpdated,
  onGigDeleted,
  onNavigateToDashboard,
  onNavigateToGigs,
  onSwitchOrganization,
  onLogout,
}: CreateGigScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    start_time: undefined,
    end_time: undefined,
    timezone: 'America/Los_Angeles',
    status: 'DateHold',
    tags: [],
    notes: '',
    amount_paid: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!gigId;
  
  // Participants - automatically add current organization
  const [participants, setParticipants] = useState<ParticipantData[]>([
    {
      id: 'current-org',
      organization_id: organization.id,
      organization_name: organization.name,
      role: organization.type,
      notes: '',
    },
  ]);
  const [showParticipantNotes, setShowParticipantNotes] = useState<string | null>(null);
  const [currentParticipantNotes, setCurrentParticipantNotes] = useState('');

  // Staff Slots and Assignments
  const [staffSlots, setStaffSlots] = useState<StaffSlotData[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignmentData[]>([]);
  const [showSlotNotes, setShowSlotNotes] = useState<string | null>(null);
  const [currentSlotNotes, setCurrentSlotNotes] = useState('');
  const [showAssignmentNotes, setShowAssignmentNotes] = useState<string | null>(null);
  const [currentAssignmentNotes, setCurrentAssignmentNotes] = useState('');
  const [staffRoles, setStaffRoles] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Load staff roles from database
  useEffect(() => {
    loadStaffRoles();
  }, []);

  // Load gig data in edit mode
  useEffect(() => {
    if (gigId) {
      loadGigData();
    }
  }, [gigId]);

  const loadStaffRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoadingRoles(false);
        return;
      }

      const { data, error } = await supabase
        .from('staff_roles')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error loading staff roles:', error);
      } else {
        setStaffRoles(data?.map(r => r.name) || []);
      }
    } catch (error) {
      console.error('Error loading staff roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadGigData = async () => {
    if (!gigId) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/gigs/${gigId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load gig');
      }

      const gig = await response.json();

      // Populate form with gig data
      setFormData({
        title: gig.title || '',
        start_time: gig.start ? new Date(gig.start) : undefined,
        end_time: gig.end ? new Date(gig.end) : undefined,
        timezone: gig.timezone || 'America/Los_Angeles',
        status: gig.status || 'DateHold',
        tags: gig.tags || [],
        notes: gig.notes || '',
        amount_paid: gig.amount_paid ? gig.amount_paid.toString() : '',
      });

      // Load participants
      const { data: participantsData } = await supabase
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gigId);

      if (participantsData && participantsData.length > 0) {
        const loadedParticipants: ParticipantData[] = participantsData.map(p => ({
          id: p.id || Math.random().toString(36).substr(2, 9),
          organization_id: p.organization_id,
          organization_name: p.organization?.name || '',
          organization: p.organization || null,
          role: p.role || '',
          notes: p.notes || '',
        }));
        setParticipants(loadedParticipants);
      }

      // Load staff slots and assignments
      const { data: slotsData } = await supabase
        .from('gig_staff_slots')
        .select(`
          *,
          staff_role:staff_roles(name),
          assignments:gig_staff_assignments(
            *,
            user:users(id, first_name, last_name)
          )
        `)
        .eq('gig_id', gigId);

      if (slotsData && slotsData.length > 0) {
        const loadedSlots: StaffSlotData[] = slotsData.map(s => {
          const assignments: StaffAssignmentData[] = (s.assignments || []).map((a: any) => ({
            id: a.id || Math.random().toString(36).substr(2, 9),
            user_id: a.user_id || '',
            user_name: a.user ? `${a.user.first_name} ${a.user.last_name}`.trim() : '',
            status: a.status || 'Requested',
            compensation_type: a.rate ? 'rate' : 'fee',
            amount: (a.rate || a.fee || '').toString(),
            notes: a.notes || '',
          }));

          return {
            id: s.id || Math.random().toString(36).substr(2, 9),
            role: s.staff_role?.name || '',
            count: s.required_count || 1,
            notes: s.notes || '',
            assignments,
          };
        });
        setStaffSlots(loadedSlots);
      }

      toast.success('Gig loaded successfully');
    } catch (error: any) {
      console.error('Error loading gig:', error);
      toast.error('Failed to load gig data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[] | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err) => {
            if (err.path && Array.isArray(err.path)) {
              const path = err.path.join('.');
              newErrors[path] = err.message || 'Invalid value';
            }
          });
        }
        setErrors(newErrors);
      } else {
        console.error('Validation error:', error);
        setErrors({ general: 'Form validation failed' });
      }
      return false;
    }
  };

  // Participant Management
  const handleAddParticipant = () => {
    const newParticipant: ParticipantData = {
      id: Math.random().toString(36).substr(2, 9),
      organization_id: '',
      organization_name: '',
      organization: null,
      role: '',
      notes: '',
    };
    setParticipants([...participants, newParticipant]);
  };

  const handleUpdateParticipant = (id: string, field: keyof ParticipantData, value: string) => {
    setParticipants(participants.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleRemoveParticipant = (id: string) => {
    if (id === 'current-org') {
      toast.error('Cannot remove the current organization from participants');
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleOpenParticipantNotes = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (participant) {
      setCurrentParticipantNotes(participant.notes);
      setShowParticipantNotes(id);
    }
  };

  const handleSaveParticipantNotes = () => {
    if (showParticipantNotes) {
      handleUpdateParticipant(showParticipantNotes, 'notes', currentParticipantNotes);
      setShowParticipantNotes(null);
      setCurrentParticipantNotes('');
    }
  };

  // Staff Slot Management
  const handleAddStaffSlot = () => {
    const newSlot: StaffSlotData = {
      id: Math.random().toString(36).substr(2, 9),
      role: '',
      count: 1,
      notes: '',
      assignments: [],
    };
    setStaffSlots([...staffSlots, newSlot]);
  };

  const handleUpdateStaffSlot = (id: string, field: keyof Omit<StaffSlotData, 'assignments'>, value: string | number) => {
    setStaffSlots(staffSlots.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleRemoveStaffSlot = (id: string) => {
    setStaffSlots(staffSlots.filter(s => s.id !== id));
  };

  const handleOpenSlotNotes = (id: string) => {
    const slot = staffSlots.find(s => s.id === id);
    if (slot) {
      setCurrentSlotNotes(slot.notes);
      setShowSlotNotes(id);
    }
  };

  const handleSaveSlotNotes = () => {
    if (showSlotNotes) {
      handleUpdateStaffSlot(showSlotNotes, 'notes', currentSlotNotes);
      setShowSlotNotes(null);
      setCurrentSlotNotes('');
    }
  };

  // Staff Assignment Management
  const handleAddStaffAssignment = (slotId: string) => {
    const newAssignment: StaffAssignmentData = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: '',
      user_name: '',
      status: 'Requested',
      compensation_type: 'rate',
      amount: '',
      notes: '',
    };
    setStaffSlots(staffSlots.map(slot => 
      slot.id === slotId ? { ...slot, assignments: [...slot.assignments, newAssignment] } : slot
    ));
  };

  const handleUpdateStaffAssignment = (slotId: string, assignmentId: string, field: keyof StaffAssignmentData, value: string) => {
    setStaffSlots(staffSlots.map(slot => 
      slot.id === slotId ? {
        ...slot,
        assignments: slot.assignments.map(a => 
          a.id === assignmentId ? { ...a, [field]: value } : a
        )
      } : slot
    ));
  };

  const handleRemoveStaffAssignment = (slotId: string, assignmentId: string) => {
    setStaffSlots(staffSlots.map(slot => 
      slot.id === slotId ? {
        ...slot,
        assignments: slot.assignments.filter(a => a.id !== assignmentId)
      } : slot
    ));
  };

  const handleOpenAssignmentNotes = (slotId: string, assignmentId: string) => {
    const slot = staffSlots.find(s => s.id === slotId);
    if (slot) {
      const assignment = slot.assignments.find(a => a.id === assignmentId);
      if (assignment) {
        setCurrentAssignmentNotes(assignment.notes);
        setShowAssignmentNotes(`${slotId}:${assignmentId}`);
      }
    }
  };

  const handleSaveAssignmentNotes = () => {
    if (showAssignmentNotes) {
      const [slotId, assignmentId] = showAssignmentNotes.split(':');
      handleUpdateStaffAssignment(slotId, assignmentId, 'notes', currentAssignmentNotes);
      setShowAssignmentNotes(null);
      setCurrentAssignmentNotes('');
    }
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

      // Prepare gig data
      const gigData: any = {
        title: formData.title.trim(),
        start: formData.start_time!.toISOString(),
        end: formData.end_time!.toISOString(),
        timezone: formData.timezone,
        status: formData.status,
        tags: formData.tags,
        notes: formData.notes.trim() || null,
        amount_paid: formData.amount_paid.trim() ? parseFloat(formData.amount_paid) : null,
      };

      if (isEditMode) {
        // Update existing gig
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/gigs/${gigId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(gigData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update gig');
        }

        toast.success('Gig updated successfully!');
        if (onGigUpdated) {
          onGigUpdated();
        }
      } else {
        // Create new gig
        gigData.primary_organization_id = organization.id;
        gigData.participants = participants
          .filter(p => p.id !== 'current-org' && p.organization_id)
          .map(p => ({
            organization_id: p.organization_id,
            role: p.role,
            notes: p.notes || null,
          }));
        gigData.staff_slots = staffSlots.map(s => ({
          role: s.role,
          count: s.count,
          notes: s.notes || null,
          assignments: s.assignments.map(a => ({
            user_id: a.user_id,
            status: a.status,
            compensation_type: a.compensation_type,
            rate: a.compensation_type === 'rate' ? (a.amount ? parseFloat(a.amount) : null) : null,
            fee: a.compensation_type === 'fee' ? (a.amount ? parseFloat(a.amount) : null) : null,
            notes: a.notes || null,
          })),
        }));

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
      }
    } catch (err: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} gig:`, err);
      setErrors({ general: err.message || `Failed to ${isEditMode ? 'update' : 'create'} gig. Please try again.` });
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!gigId) return;

    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Not authenticated');
        setIsDeleting(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/gigs/${gigId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete gig');
      }

      toast.success('Gig deleted successfully!');
      setShowDeleteConfirm(false);
      if (onGigDeleted) {
        onGigDeleted();
      }
    } catch (err: any) {
      console.error('Error deleting gig:', err);
      toast.error(err.message || 'Failed to delete gig');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
              disabled={isSubmitting || isLoading}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-gray-900">{isEditMode ? 'Edit Gig' : 'Create New Gig'}</h1>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-sky-500 mb-4" />
            <p className="text-gray-600">Loading gig...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit}>
            {errors.general && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <Card className="p-6 sm:p-8 mb-6">
              <h3 className="text-gray-900 mb-6">Basic Information</h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Gig Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter gig title"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">
                      Start Date/Time <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time ? format(formData.start_time, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => handleInputChange('start_time', e.target.value ? new Date(e.target.value) : undefined)}
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
                      End Date/Time <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time ? format(formData.end_time, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => handleInputChange('end_time', e.target.value ? new Date(e.target.value) : undefined)}
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

                <div className="space-y-2">
                  <Label htmlFor="timezone">
                    Timezone <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
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
                </div>

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

            {/* Participants */}
            <Card className="p-6 sm:p-8 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Participants</h3>
              </div>

              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Role</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead className="w-[100px]">Notes</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <Select
                              value={participant.role}
                              onValueChange={(value) => handleUpdateParticipant(participant.id, 'role', value)}
                              disabled={isSubmitting || participant.id === 'current-org'}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {ORGANIZATION_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {participant.id === 'current-org' ? (
                              <div className="text-sm text-gray-900 py-2">
                                {participant.organization_name}
                              </div>
                            ) : (
                              <OrganizationSelector
                                onSelect={(org) => {
                                  if (org) {
                                    setParticipants(participants.map(p => 
                                      p.id === participant.id ? {
                                        ...p,
                                        organization_id: org.id,
                                        organization_name: org.name,
                                        organization: org,
                                      } : p
                                    ));
                                  } else {
                                    setParticipants(participants.map(p => 
                                      p.id === participant.id ? {
                                        ...p,
                                        organization_id: '',
                                        organization_name: '',
                                        organization: null,
                                      } : p
                                    ));
                                  }
                                }}
                                selectedOrganization={participant.organization || null}
                                organizationType={participant.role ? participant.role as OrganizationType : undefined}
                                placeholder="Search organizations..."
                                disabled={isSubmitting}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenParticipantNotes(participant.id)}
                              disabled={isSubmitting}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveParticipant(participant.id)}
                              disabled={isSubmitting || participant.id === 'current-org'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddParticipant}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Participant
                </Button>
              </div>
            </Card>

            {/* Staff Assignments */}
            <Card className="p-6 sm:p-8 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Staff Assignments</h3>
              </div>

              <div className="space-y-6">
                {/* Staff Assignments - Hierarchical Display */}
                <div className="space-y-4">
                  {staffSlots.map((slot) => (
                    <div key={slot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Slot Header */}
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Select
                            value={slot.role}
                            onValueChange={(value) => handleUpdateStaffSlot(slot.id, 'role', value)}
                            disabled={isSubmitting || isLoadingRoles}
                          >
                            <SelectTrigger className="max-w-xs bg-white">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffRoles.length > 0 ? (
                                staffRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {isLoadingRoles ? 'Loading roles...' : 'No roles available'}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600">Count:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={slot.count}
                              onChange={(e) => handleUpdateStaffSlot(slot.id, 'count', parseInt(e.target.value) || 1)}
                              disabled={isSubmitting}
                              className="w-16 bg-white"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSlotNotes(slot.id)}
                            disabled={isSubmitting}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Notes
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaffSlot(slot.id)}
                          disabled={isSubmitting}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Assignments for this Slot */}
                      <div className="p-4">
                        {slot.assignments.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {slot.assignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                              >
                                <div className="flex-1">
                                  <UserSelector
                                    onSelect={(selectedUser) => {
                                      const fullName = `${selectedUser.first_name} ${selectedUser.last_name}`.trim();
                                      handleUpdateStaffAssignment(slot.id, assignment.id, 'user_id', selectedUser.id);
                                      handleUpdateStaffAssignment(slot.id, assignment.id, 'user_name', fullName);
                                    }}
                                    placeholder="Search for user..."
                                    disabled={isSubmitting}
                                    value={assignment.user_name}
                                  />
                                </div>
                                <Select
                                  value={assignment.status}
                                  onValueChange={(value) => handleUpdateStaffAssignment(slot.id, assignment.id, 'status', value)}
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger className="w-32 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Requested">Requested</SelectItem>
                                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                                    <SelectItem value="Declined">Declined</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={assignment.compensation_type}
                                  onValueChange={(value) => handleUpdateStaffAssignment(slot.id, assignment.id, 'compensation_type', value)}
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger className="w-24 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rate">Rate</SelectItem>
                                    <SelectItem value="fee">Fee</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={assignment.amount}
                                    onChange={(e) => handleUpdateStaffAssignment(slot.id, assignment.id, 'amount', e.target.value)}
                                    placeholder="0.00"
                                    disabled={isSubmitting}
                                    className="pl-5 bg-white"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAssignmentNotes(slot.id, assignment.id)}
                                  disabled={isSubmitting}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveStaffAssignment(slot.id, assignment.id)}
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mb-3">No assignments yet</p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddStaffAssignment(slot.id)}
                          disabled={isSubmitting}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Assignment
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddStaffSlot}
                    disabled={isSubmitting}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Staff Slot
                  </Button>
                </div>
              </div>
            </Card>

            {/* Additional Information */}
            <Card className="p-6 sm:p-8 mb-6">
              <div className="flex items-start gap-2 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-900">
                    <strong>Private to your organization:</strong> Tags, notes, and financial information are only visible to members of your organization.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <TagsInput
                    value={formData.tags}
                    onChange={(tags) => handleInputChange('tags', tags)}
                    suggestions={SUGGESTED_TAGS}
                    placeholder="Add tags to categorize this gig..."
                    disabled={isSubmitting}
                  />
                </div>

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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <MarkdownEditor
                    value={formData.notes}
                    onChange={(value) => handleInputChange('notes', value)}
                    placeholder="Add notes about this gig..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </Card>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              {isEditMode && userRole === 'Admin' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Gig
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className={isEditMode ? '' : 'sm:mr-auto'}
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
                    {isEditMode ? 'Updating Gig...' : 'Creating Gig...'}
                  </>
                ) : (
                  isEditMode ? 'Update Gig' : 'Create Gig'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gig</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this gig? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialogs */}
      <Dialog open={!!showParticipantNotes} onOpenChange={() => setShowParticipantNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participant Notes</DialogTitle>
            <DialogDescription>
              Add notes for this participant
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentParticipantNotes}
            onChange={(e) => setCurrentParticipantNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParticipantNotes(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveParticipantNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showSlotNotes} onOpenChange={() => setShowSlotNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Slot Notes</DialogTitle>
            <DialogDescription>
              Add notes for this staff slot
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentSlotNotes}
            onChange={(e) => setCurrentSlotNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlotNotes(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlotNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAssignmentNotes} onOpenChange={() => setShowAssignmentNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Assignment Notes</DialogTitle>
            <DialogDescription>
              Add notes for this staff assignment
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentAssignmentNotes}
            onChange={(e) => setCurrentAssignmentNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentNotes(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignmentNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
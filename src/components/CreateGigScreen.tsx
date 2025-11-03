import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import MarkdownEditor from './MarkdownEditor';
import TagsInput from './TagsInput';
import OrganizationSelector from './OrganizationSelector';
import type { Organization, User } from '../App';
import type { GigStatus } from './GigListScreen';

interface CreateGigScreenProps {
  organization: Organization;
  user: User;
  onCancel: () => void;
  onGigCreated: (gigId: string) => void;
}

interface FormData {
  title: string;
  date: Date | undefined;
  start_time: string;
  end_time: string;
  timezone: string;
  status: GigStatus;
  primary_contact_user_id: string;
  venue_id: string;
  act_id: string;
  tags: string[];
  notes: string;
  amount_paid: string;
}

interface FormErrors {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  status?: string;
  amount_paid?: string;
  general?: string;
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

const STATUS_OPTIONS: GigStatus[] = [
  'Hold Date',
  'Proposed',
  'Booked',
  'Completed',
  'Cancelled',
  'Paid',
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

// Mock users for primary contact selection
const MOCK_USERS = [
  { id: 'u1', name: 'John Smith', email: 'john@example.com', role: 'Manager' },
  { id: 'u2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin' },
  { id: 'u3', name: 'Mike Davis', email: 'mike@example.com', role: 'Staff' },
];

export default function CreateGigScreen({
  organization,
  user,
  onCancel,
  onGigCreated,
}: CreateGigScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: undefined,
    start_time: '19:00',
    end_time: '23:00',
    timezone: 'America/Los_Angeles',
    status: 'Hold Date',
    primary_contact_user_id: '',
    venue_id: '',
    act_id: '',
    tags: [],
    notes: '',
    amount_paid: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Organization | null>(null);
  const [selectedAct, setSelectedAct] = useState<Organization | null>(null);

  const handleInputChange = (field: keyof FormData, value: string | string[] | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required: Title
    if (!formData.title.trim()) {
      newErrors.title = 'Gig title is required';
    } else if (formData.title.trim().length < 1 || formData.title.trim().length > 200) {
      newErrors.title = 'Title must be between 1 and 200 characters';
    }

    // Required: Date
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    // Required: Start time
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    // Required: End time
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    } else if (formData.start_time && formData.end_time <= formData.start_time) {
      newErrors.end_time = 'End time must be after start time';
    }

    // Required: Timezone
    if (!formData.timezone) {
      newErrors.timezone = 'Timezone is required';
    }

    // Optional: Amount paid validation
    if (formData.amount_paid.trim()) {
      const amount = parseFloat(formData.amount_paid);
      if (isNaN(amount) || amount < 0) {
        newErrors.amount_paid = 'Please enter a valid positive amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Simulate API call
    setTimeout(() => {
      // Simulate error (5% chance)
      if (Math.random() < 0.05) {
        setErrors({ general: 'Failed to create gig. Please try again.' });
        setIsSubmitting(false);
        return;
      }

      // Success
      const newGigId = Math.random().toString(36).substr(2, 9);
      toast.success('Gig created successfully!');
      onGigCreated(newGigId);
    }, 1500);
  };

  const handleVenueSelect = (org: Organization) => {
    setSelectedVenue(org);
    setFormData((prev) => ({ ...prev, venue_id: org.id }));
  };

  const handleActSelect = (org: Organization) => {
    setSelectedAct(org);
    setFormData((prev) => ({ ...prev, act_id: org.id }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-gray-900">Create New Gig</h1>
              <p className="text-sm text-gray-600">{organization.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Section 1: Basic Information */}
            <div className="space-y-6 mb-8">
              <h3 className="text-gray-900">Basic Information</h3>

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
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 2: Participants */}
            <div className="space-y-6 mb-8 pt-8 border-t border-gray-200">
              <h3 className="text-gray-900">Participants</h3>

              {/* Primary Contact */}
              <div className="space-y-2">
                <Label htmlFor="primary_contact">Primary Contact</Label>
                <Select
                  value={formData.primary_contact_user_id}
                  onValueChange={(value) => handleInputChange('primary_contact_user_id', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div>
                          <div>{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email} • {u.role}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Person responsible for this gig</p>
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <OrganizationSelector
                  onSelect={handleVenueSelect}
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
                  onSelect={handleActSelect}
                  selectedOrganization={selectedAct}
                  organizationType="Act"
                  placeholder="Search for act..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Section 3: Additional Information */}
            <div className="pt-8 mb-8">
              <Separator className="mb-6" />

              <div className="flex items-start gap-2 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-900">
                    <strong>Private to your organization:</strong> Tags, notes, and financial information below are only visible to members of your organization.
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2 mb-6">
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
              <div className="space-y-2 mb-6">
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

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200">
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
        </Card>
      </div>
    </div>
  );
}

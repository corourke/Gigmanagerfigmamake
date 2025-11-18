import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AssignmentDetail {
  id: string;
  status: string;
  compensation_type: 'rate' | 'fee';
  rate?: number;
  fee?: number;
  notes?: string;
  gig: {
    id: string;
    name: string;
    client: string;
    start: string;
    end?: string;
    venue?: string;
    address?: string;
    notes?: string;
  };
  slot: {
    role: string;
    notes?: string;
  };
}

interface AssignmentDetailScreenProps {
  assignmentId: string;
  onBack: () => void;
}

export default function AssignmentDetailScreen({ assignmentId, onBack }: AssignmentDetailScreenProps) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/assignments/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token || publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load assignment');
      }

      const data = await response.json();
      setAssignment(data);
    } catch (error) {
      console.error('Error loading assignment:', error);
      toast.error('Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'decline') => {
    if (!assignmentId) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/assignments/${assignmentId}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token || publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} assignment`);
      }

      toast.success(action === 'accept' ? 'Assignment accepted!' : 'Assignment declined');
      
      // Navigate back or to dashboard
      onBack();
    } catch (error) {
      console.error(`Error ${action}ing assignment:`, error);
      toast.error(`Failed to ${action} assignment`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Assignment not found</p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCompensation = () => {
    if (assignment.compensation_type === 'rate' && assignment.rate) {
      return `$${assignment.rate}/hour`;
    } else if (assignment.compensation_type === 'fee' && assignment.fee) {
      return `$${assignment.fee} flat fee`;
    }
    return 'TBD';
  };

  const canRespond = assignment.status === 'Requested' || assignment.status === 'Invited';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl mb-2">Staffing Assignment</h1>
          <Badge variant={assignment.status === 'Confirmed' ? 'default' : 'outline'}>
            {assignment.status}
          </Badge>
        </div>

        {/* Gig Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gig Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">{assignment.gig.name}</h3>
              <p className="text-gray-600">{assignment.gig.client}</p>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 mt-0.5 text-gray-400" />
              <div>
                <p>{formatDateTime(assignment.gig.start)}</p>
                {assignment.gig.end && (
                  <p className="text-gray-600">to {formatDateTime(assignment.gig.end)}</p>
                )}
              </div>
            </div>

            {(assignment.gig.venue || assignment.gig.address) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                <div>
                  {assignment.gig.venue && <p>{assignment.gig.venue}</p>}
                  {assignment.gig.address && <p className="text-gray-600">{assignment.gig.address}</p>}
                </div>
              </div>
            )}

            {assignment.gig.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Gig Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{assignment.gig.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Assignment Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Role</p>
              <p className="font-semibold">{assignment.slot.role}</p>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Compensation</p>
                <p className="font-semibold">{formatCompensation()}</p>
              </div>
            </div>

            {assignment.slot.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Role Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{assignment.slot.notes}</p>
                </div>
              </>
            )}

            {assignment.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Assignment Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{assignment.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canRespond && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleResponse('decline')}
              disabled={submitting}
              variant="outline"
              className="flex-1 h-12"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Decline
            </Button>
            <Button
              onClick={() => handleResponse('accept')}
              disabled={submitting}
              className="flex-1 h-12"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Accept Assignment
            </Button>
          </div>
        )}

        {!canRespond && assignment.status === 'Confirmed' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <p className="font-medium">You've accepted this assignment</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!canRespond && assignment.status === 'Declined' && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600">
                <XCircle className="w-5 h-5" />
                <p className="font-medium">You've declined this assignment</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
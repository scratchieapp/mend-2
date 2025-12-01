import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneCall, 
  PhoneMissed, 
  PhoneOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Bot
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CallLogSummaryCardProps {
  incidentId: number;
  onViewDetails: () => void;
}

interface VoiceSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  no_answer_calls: number;
  total_duration_seconds: number;
  last_call: {
    id: string;
    task_type: string;
    target_name: string;
    status: string;
    duration_seconds: number;
    call_summary: string;
    created_at: string;
  } | null;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const getTaskTypeLabel = (taskType: string): string => {
  const labels: Record<string, string> = {
    'booking_get_times': 'Booking - Get Times',
    'booking_patient_confirm': 'Booking - Patient Confirm',
    'booking_final_confirm': 'Booking - Final Confirm',
    'booking': 'Booking',
    'check_in': 'Wellness Check-In',
    'reminder': 'Appointment Reminder',
    'follow_up': 'Follow-up',
    'survey': 'Survey',
  };
  return labels[taskType] || taskType?.replace(/_/g, ' ') || 'Voice Call';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'no_answer':
      return <PhoneMissed className="h-4 w-4 text-amber-500" />;
    case 'in_progress':
      return <PhoneCall className="h-4 w-4 text-blue-500 animate-pulse" />;
    default:
      return <Phone className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'no_answer':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">No Answer</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

export function CallLogSummaryCard({ incidentId, onViewDetails }: CallLogSummaryCardProps) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['voice-summary', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_incident_voice_summary', {
        p_incident_id: incidentId
      });
      if (error) throw error;
      return data as VoiceSummary;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Voice Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Voice Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Unable to load call history
          </div>
        </CardContent>
      </Card>
    );
  }

  // No calls yet
  if (!summary || summary.total_calls === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Voice Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <PhoneOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No voice calls yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Calls will appear here when the AI booking agent is used
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Voice Agent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewDetails} className="text-xs">
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold">{summary.total_calls}</div>
            <div className="text-xs text-muted-foreground">Total Calls</div>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-700">{summary.successful_calls}</div>
            <div className="text-xs text-green-600">Successful</div>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg">
            <div className="text-lg font-semibold text-amber-700">{summary.no_answer_calls}</div>
            <div className="text-xs text-amber-600">No Answer</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-700">{summary.failed_calls}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
        </div>

        {/* Total Duration */}
        {summary.total_duration_seconds > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Total call time: {formatDuration(summary.total_duration_seconds)}</span>
          </div>
        )}

        {/* Last Call */}
        {summary.last_call && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Most Recent Call</div>
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(summary.last_call.status)}
                  <span className="text-sm font-medium">
                    {getTaskTypeLabel(summary.last_call.task_type)}
                  </span>
                </div>
                {getStatusBadge(summary.last_call.status)}
              </div>
              
              {summary.last_call.target_name && (
                <div className="text-sm text-muted-foreground">
                  Called: {summary.last_call.target_name}
                </div>
              )}
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(summary.last_call.created_at), { addSuffix: true })}
                </span>
                {summary.last_call.duration_seconds > 0 && (
                  <span>• {formatDuration(summary.last_call.duration_seconds)}</span>
                )}
              </div>

              {summary.last_call.call_summary && (
                <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                  <span className="font-medium">Summary: </span>
                  {summary.last_call.call_summary.length > 100
                    ? `${summary.last_call.call_summary.substring(0, 100)}...`
                    : summary.last_call.call_summary}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  PhoneCall, 
  PhoneMissed, 
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bot,
  User,
  Building2,
  Calendar,
  FileText,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface VoiceCallLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: number;
}

interface VoiceLog {
  id: string;
  call_id: string;
  task_type: string;
  target_phone: string;
  target_name: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration_seconds: number;
  transcript: string;
  call_summary: string;
  sentiment: string;
  recording_url: string;
  created_at: string;
  ended_at: string;
  booking_workflow_id: string;
  error_message: string;
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0s';
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
    'booking_get_times': 'Get Available Times',
    'booking_patient_confirm': 'Patient Confirmation',
    'booking_final_confirm': 'Final Booking Confirmation',
    'booking': 'Booking Call',
    'check_in': 'Wellness Check-In',
    'reminder': 'Appointment Reminder',
    'follow_up': 'Follow-up Call',
    'survey': 'Patient Survey',
    'incident_report': 'Incident Report',
  };
  return labels[taskType] || taskType?.replace(/_/g, ' ') || 'Voice Call';
};

const getTaskTypeIcon = (taskType: string) => {
  if (taskType?.includes('booking')) return <Calendar className="h-4 w-4" />;
  if (taskType === 'check_in') return <User className="h-4 w-4" />;
  if (taskType === 'reminder') return <Clock className="h-4 w-4" />;
  if (taskType === 'incident_report') return <FileText className="h-4 w-4" />;
  return <Phone className="h-4 w-4" />;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    case 'no_answer':
      return 'bg-amber-50 border-amber-200';
    case 'in_progress':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-muted/50 border-muted';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'no_answer':
      return <PhoneMissed className="h-5 w-5 text-amber-500" />;
    case 'in_progress':
      return <PhoneCall className="h-5 w-5 text-blue-500 animate-pulse" />;
    default:
      return <Phone className="h-5 w-5 text-muted-foreground" />;
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

const getSentimentBadge = (sentiment: string) => {
  if (!sentiment) return null;
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Positive</Badge>;
    case 'negative':
      return <Badge variant="destructive">Negative</Badge>;
    case 'neutral':
      return <Badge variant="secondary">Neutral</Badge>;
    default:
      return <Badge variant="outline">{sentiment}</Badge>;
  }
};

export function VoiceCallLogModal({ open, onOpenChange, incidentId }: VoiceCallLogModalProps) {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['voice-logs', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_incident_voice_logs', {
        p_incident_id: incidentId
      });
      if (error) throw error;
      return (data || []) as VoiceLog[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Voice Call History
          </DialogTitle>
          <DialogDescription>
            Complete log of all AI voice agent calls for this incident
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load call history</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <PhoneOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No voice calls yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Calls will appear here when the AI booking agent is used
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id}>
                  <div className={`p-4 rounded-lg border ${getStatusColor(log.status)}`}>
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            {getTaskTypeIcon(log.task_type)}
                            <span className="font-medium">{getTaskTypeLabel(log.task_type)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            {log.direction === 'inbound' ? (
                              <PhoneIncoming className="h-3 w-3" />
                            ) : (
                              <PhoneOutgoing className="h-3 w-3" />
                            )}
                            <span>{log.direction === 'inbound' ? 'Inbound' : 'Outbound'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(log.status)}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      {log.target_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Called:</span>
                          <span className="font-medium">{log.target_name}</span>
                        </div>
                      )}
                      {log.target_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{log.target_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(log.created_at), 'dd MMM yyyy, h:mm a')}
                        </span>
                      </div>
                      {log.duration_seconds > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Duration: {formatDuration(log.duration_seconds)}</span>
                        </div>
                      )}
                    </div>

                    {/* Sentiment */}
                    {log.sentiment && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-muted-foreground">Sentiment:</span>
                        {getSentimentBadge(log.sentiment)}
                      </div>
                    )}

                    {/* Call Summary */}
                    {log.call_summary && (
                      <div className="bg-background/50 p-3 rounded border mb-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                        <p className="text-sm">{log.call_summary}</p>
                      </div>
                    )}

                    {/* Error Message */}
                    {log.error_message && (
                      <div className="bg-red-50 p-3 rounded border border-red-200 mb-3">
                        <div className="text-xs font-medium text-red-700 mb-1">Error</div>
                        <p className="text-sm text-red-600">{log.error_message}</p>
                      </div>
                    )}

                    {/* Transcript Toggle (collapsed by default) */}
                    {log.transcript && (
                      <details className="mt-2">
                        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                          View Full Transcript
                        </summary>
                        <div className="mt-2 p-3 bg-muted/30 rounded text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {log.transcript}
                        </div>
                      </details>
                    )}

                    {/* Recording Link */}
                    {log.recording_url && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(log.recording_url, '_blank')}
                          className="gap-2"
                        >
                          <Volume2 className="h-4 w-4" />
                          Listen to Recording
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Time Ago */}
                    <div className="text-xs text-muted-foreground mt-3">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  {index < logs.length - 1 && (
                    <div className="flex items-center justify-center my-2">
                      <div className="h-4 border-l border-dashed border-muted-foreground/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


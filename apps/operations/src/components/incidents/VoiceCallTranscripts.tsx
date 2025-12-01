import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VoiceLog {
  id: string;
  incident_id: number;
  retell_call_id: string;
  call_type: string;
  direction: string | null;
  phone_number: string;
  duration_seconds: number | null;
  call_status: string;
  disconnect_reason: string | null;
  transcript: string | null;
  transcript_object: Array<{
    role: 'agent' | 'user';
    content: string;
    timestamp?: number;
  }> | null;
  recording_url: string | null;
  created_at: string;
}

interface VoiceCallTranscriptsProps {
  incidentId: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function CallTranscriptItem({ call }: { call: VoiceLog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (!call.recording_url) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(call.recording_url);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const isInbound = call.direction === 'inbound' || call.call_type === 'web';
  const isSuccessful = call.call_status === 'completed';

  // Parse transcript_object if available, otherwise use plain transcript
  const hasStructuredTranscript = call.transcript_object && call.transcript_object.length > 0;
  const hasPlainTranscript = call.transcript && call.transcript.trim().length > 0;
  const hasAnyTranscript = hasStructuredTranscript || hasPlainTranscript;

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header - always visible */}
      <div 
        className={cn(
          "px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors",
          isExpanded && "border-b"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Direction icon */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isInbound ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
          )}>
            {isInbound ? (
              <PhoneIncoming className="h-4 w-4" />
            ) : (
              <PhoneOutgoing className="h-4 w-4" />
            )}
          </div>

          {/* Call info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {isInbound ? 'Inbound Call' : 'Outbound Call'}
              </span>
              <Badge variant={isSuccessful ? "default" : "destructive"} className="text-xs">
                {isSuccessful ? 'Completed' : call.disconnect_reason || 'Failed'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{call.phone_number}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(call.duration_seconds)}
              </span>
              <span>•</span>
              <span>{format(new Date(call.created_at), 'MMM d, h:mm a')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Play button - only if recording exists */}
          {call.recording_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayback();
              }}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Expand/collapse */}
          {hasAnyTranscript && (
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Transcript content - expandable */}
      {isExpanded && hasAnyTranscript && (
        <div className="px-4 py-3 bg-gray-50 max-h-[400px] overflow-y-auto">
          {hasStructuredTranscript ? (
            <div className="space-y-3">
              {call.transcript_object!.map((message, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    message.role === 'agent' ? "justify-start" : "justify-end"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === 'agent' 
                      ? "bg-emerald-100 text-emerald-900" 
                      : "bg-blue-100 text-blue-900"
                  )}>
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {message.role === 'agent' ? 'AI Agent' : 'Caller'}
                    </div>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-md border p-3">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                {call.transcript}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* No transcript message */}
      {isExpanded && !hasAnyTranscript && (
        <div className="px-4 py-3 bg-gray-50 text-center text-sm text-muted-foreground">
          No transcript available for this call.
        </div>
      )}
    </div>
  );
}

export function VoiceCallTranscripts({ incidentId }: VoiceCallTranscriptsProps) {
  const { data: voiceLogs, isLoading } = useQuery({
    queryKey: ['voice-logs', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_logs')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice logs:', error);
        return [];
      }

      return data as VoiceLog[];
    },
    enabled: !!incidentId,
  });

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Voice Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading call history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!voiceLogs || voiceLogs.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Voice Calls
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Call recordings and transcripts from voice agent interactions
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-md border p-4 text-center text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No voice calls recorded for this incident.</p>
            <p className="text-xs mt-1">
              Calls will appear here when the AI agent makes or receives calls.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-blue-600" />
          Voice Calls
          <Badge variant="secondary" className="ml-2">
            {voiceLogs.length} call{voiceLogs.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click on a call to view the transcript. Use the play button to listen to recordings.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {voiceLogs.map((call) => (
          <CallTranscriptItem key={call.id} call={call} />
        ))}
      </CardContent>
    </Card>
  );
}


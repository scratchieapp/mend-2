import { format, formatDistanceToNow } from 'date-fns';
import { 
  PhoneCall, CalendarCheck, MessageSquare, Bot, Pencil, 
  Clock, User, ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ActivityLogEntry {
  id: string;
  incident_id: number;
  type: 'call' | 'appointment' | 'note' | 'voice_agent' | 'edit';
  title: string;
  description?: string;
  created_at: string;
  created_by: string;
  metadata?: Record<string, string>;
}

// Keywords that indicate a milestone/success in activity summaries
const MILESTONE_KEYWORDS = [
  'booked successfully',
  'confirmed',
  'completed',
  'times collected',
  'appointment booked',
  'patient confirmed',
  'booking confirmed',
  'established',
  'scheduled',
];

interface IncidentActivityLogProps {
  activities: ActivityLogEntry[];
}

const activityIcons: Record<ActivityLogEntry['type'], React.ReactNode> = {
  call: <PhoneCall className="h-3.5 w-3.5" />,
  appointment: <CalendarCheck className="h-3.5 w-3.5" />,
  note: <MessageSquare className="h-3.5 w-3.5" />,
  voice_agent: <Bot className="h-3.5 w-3.5" />,
  edit: <Pencil className="h-3.5 w-3.5" />,
};

const activityColors: Record<ActivityLogEntry['type'], string> = {
  call: 'bg-blue-100 text-blue-700 border-blue-200',
  appointment: 'bg-green-100 text-green-700 border-green-200',
  note: 'bg-amber-100 text-amber-700 border-amber-200',
  voice_agent: 'bg-violet-100 text-violet-700 border-violet-200',
  edit: 'bg-gray-100 text-gray-700 border-gray-200',
};

// Milestone activities get special highlighting
const milestoneColors = 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200';

// Check if an activity is a milestone (success indicator)
function isMilestoneActivity(activity: ActivityLogEntry): boolean {
  const titleLower = activity.title.toLowerCase();
  const descLower = (activity.description || '').toLowerCase();
  
  return MILESTONE_KEYWORDS.some(keyword => 
    titleLower.includes(keyword) || descLower.includes(keyword)
  );
}

const activityLabels: Record<ActivityLogEntry['type'], string> = {
  call: 'Call',
  appointment: 'Appointment',
  note: 'Note',
  voice_agent: 'Voice Agent',
  edit: 'Edit',
};

export function IncidentActivityLog({ activities }: IncidentActivityLogProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
        <p className="text-xs mt-1">Activities will appear here as they are logged</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const isMilestone = isMilestoneActivity(activity);
          const colorClass = isMilestone ? milestoneColors : activityColors[activity.type];
          
          return (
          <div 
            key={activity.id}
            className={cn(
              "relative pl-6 pb-3",
              index !== activities.length - 1 && "border-l-2 border-muted ml-2"
            )}
          >
            {/* Timeline dot - larger and highlighted for milestones */}
            <div className={cn(
              "absolute left-0 -translate-x-1/2 rounded-full border-2 flex items-center justify-center",
              isMilestone ? "w-6 h-6" : "w-5 h-5",
              colorClass
            )}>
              {activityIcons[activity.type]}
            </div>

            {/* Content */}
            <div className="ml-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-1.5 py-0", colorClass)}
                >
                  {isMilestone ? '✓ Milestone' : activityLabels[activity.type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <p className={cn("text-sm font-medium", isMilestone && "text-emerald-700")}>{activity.title}</p>
              
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
              
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{activity.created_by}</span>
                <span className="mx-1">•</span>
                <span>{format(new Date(activity.created_at), 'MMM d, h:mm a')}</span>
              </div>

              {/* Show metadata for appointments */}
              {activity.type === 'appointment' && activity.metadata?.appointmentDate && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                  <span className="font-medium text-green-700">Scheduled for: </span>
                  <span className="text-green-600">
                    {format(new Date(activity.metadata.appointmentDate), 'PPP p')}
                  </span>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}


import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Stethoscope, Phone, Bot } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface UpcomingAppointmentsProps {
  incidentId: number;
}

interface Appointment {
  id: string;
  scheduled_date: string;
  appointment_type: string;
  status: string;
  confirmation_method: string;
  confirmed_at: string | null;
  location_address: string | null;
  location_suburb: string | null;
  notes: string | null;
  medical_center: {
    id: string;
    name: string;
    phone_number: string;
    address: string;
  } | null;
  medical_professional: {
    id: number;
    first_name: string;
    last_name: string;
    specialty: string;
  } | null;
}

export function UpcomingAppointments({ incidentId }: UpcomingAppointmentsProps) {
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['upcoming-appointments', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_upcoming_appointments', { p_incident_id: incidentId });
      
      if (error) throw error;
      return (data || []) as Appointment[];
    },
  });

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 to-transparent">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-emerald-200 rounded w-1/3" />
              <div className="h-3 bg-emerald-100 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return null; // Don't show anything if no appointments
  }

  const getTimeUrgency = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) return 'today';
    if (isTomorrow(appointmentDate)) return 'tomorrow';
    if (isThisWeek(appointmentDate)) return 'this-week';
    return 'future';
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'today':
        return {
          border: 'border-l-red-500',
          bg: 'bg-gradient-to-r from-red-50/80 to-transparent',
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: 'text-red-600',
        };
      case 'tomorrow':
        return {
          border: 'border-l-amber-500',
          bg: 'bg-gradient-to-r from-amber-50/80 to-transparent',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: 'text-amber-600',
        };
      case 'this-week':
        return {
          border: 'border-l-blue-500',
          bg: 'bg-gradient-to-r from-blue-50/80 to-transparent',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: 'text-blue-600',
        };
      default:
        return {
          border: 'border-l-emerald-500',
          bg: 'bg-gradient-to-r from-emerald-50/80 to-transparent',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: 'text-emerald-600',
        };
    }
  };

  const formatAppointmentType = (type: string) => {
    const types: Record<string, string> = {
      initial_consult: 'Initial Consultation',
      follow_up: 'Follow-up',
      specialist: 'Specialist',
      physio: 'Physiotherapy',
      review: 'Medical Review',
    };
    return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => {
        const urgency = getTimeUrgency(appointment.scheduled_date);
        const styles = getUrgencyStyles(urgency);
        const appointmentDate = new Date(appointment.scheduled_date);

        return (
          <Card 
            key={appointment.id} 
            className={`border-l-4 ${styles.border} ${styles.bg} shadow-sm`}
          >
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full bg-white shadow-sm`}>
                    <Calendar className={`h-4 w-4 ${styles.icon}`} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {formatAppointmentType(appointment.appointment_type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(appointmentDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {appointment.confirmation_method === 'voice_agent' && (
                    <Badge variant="outline" className="text-xs gap-1 bg-white">
                      <Bot className="h-3 w-3" />
                      AI Booked
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${styles.badge}`}
                  >
                    {urgency === 'today' ? 'Today' : 
                     urgency === 'tomorrow' ? 'Tomorrow' :
                     format(appointmentDate, 'EEE, MMM d')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-3 px-4 pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Date & Time */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(appointmentDate, 'h:mm a')}
                    <span className="text-muted-foreground ml-1">
                      ({format(appointmentDate, 'EEEE')})
                    </span>
                  </span>
                </div>

                {/* Doctor */}
                {appointment.medical_professional && (
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Dr {appointment.medical_professional.first_name} {appointment.medical_professional.last_name}
                    </span>
                  </div>
                )}

                {/* Location */}
                {(appointment.medical_center || appointment.location_address) && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      {appointment.medical_center && (
                        <span className="font-medium">{appointment.medical_center.name}</span>
                      )}
                      {appointment.location_address && (
                        <p className="text-xs text-muted-foreground">
                          {appointment.location_address}
                          {appointment.location_suburb && `, ${appointment.location_suburb}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Phone */}
                {appointment.medical_center?.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a 
                      href={`tel:${appointment.medical_center.phone_number}`}
                      className="text-blue-600 hover:underline"
                    >
                      {appointment.medical_center.phone_number}
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  {appointment.notes}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


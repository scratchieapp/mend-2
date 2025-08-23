import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  Edit, 
  Filter, 
  Search, 
  Calendar,
  User,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getIncidentsWithDetails, type IncidentWithDetails } from '@/lib/supabase/incidents';
import { useNavigate } from 'react-router-dom';

interface IncidentsListProps {
  highlightIncidentId?: number;
  showActions?: boolean;
  maxHeight?: string;
}

export function IncidentsList({ 
  highlightIncidentId, 
  showActions = true,
  maxHeight = "600px" 
}: IncidentsListProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { 
    data: incidentsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['incidents', currentPage, pageSize, searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      
      // Calculate date filters
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (dateFilter !== 'all') {
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            startDate = format(now, 'yyyy-MM-dd');
            endDate = format(now, 'yyyy-MM-dd');
            break;
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = format(weekAgo, 'yyyy-MM-dd');
            endDate = format(now, 'yyyy-MM-dd');
            break;
          }
          case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = format(monthAgo, 'yyyy-MM-dd');
            endDate = format(now, 'yyyy-MM-dd');
            break;
          }
        }
      }

      return await getIncidentsWithDetails({
        pageSize,
        pageOffset: offset,
        startDate,
        endDate
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter incidents based on search term
  const filteredIncidents = incidentsData?.incidents.filter(incident => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      incident.worker_full_name.toLowerCase().includes(searchLower) ||
      incident.injury_type.toLowerCase().includes(searchLower) ||
      incident.incident_number.toLowerCase().includes(searchLower) ||
      incident.employer_name.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatusBadge = (incident: IncidentWithDetails) => {
    if (incident.fatality) {
      return <Badge variant="destructive" className="bg-black text-white">Fatal</Badge>;
    }
    if (!incident.returned_to_work && incident.total_days_lost > 0) {
      return <Badge variant="destructive">Off Work</Badge>;
    }
    if (incident.returned_to_work) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Returned to Work</Badge>;
    }
    return <Badge variant="secondary">Under Review</Badge>;
  };

  const getSeverityColor = (incident: IncidentWithDetails) => {
    if (incident.fatality) return 'border-l-black';
    if (incident.total_days_lost > 7) return 'border-l-red-500';
    if (incident.total_days_lost > 0) return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  const formatIncidentDate = (dateStr: string, timeStr?: string) => {
    try {
      const date = parseISO(dateStr);
      const dateFormatted = format(date, 'MMM dd, yyyy');
      return timeStr ? `${dateFormatted} at ${timeStr}` : dateFormatted;
    } catch {
      return dateStr;
    }
  };

  const handleViewIncident = (incidentId: number) => {
    navigate(`/incident/${incidentId}`);
  };

  const handleEditIncident = (incidentId: number) => {
    navigate(`/incident/${incidentId}/edit`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load incidents. Please try again.
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Incidents ({incidentsData?.totalCount || 0})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ maxHeight }} className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Injury Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days Lost</TableHead>
                <TableHead>Date</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8" />
                      <p>No incidents found</p>
                      {searchTerm && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSearchTerm('')}
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow 
                    key={incident.incident_id}
                    className={`
                      border-l-4 ${getSeverityColor(incident)}
                      ${highlightIncidentId === incident.incident_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      hover:bg-muted/50
                    `}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          #{incident.incident_number}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {incident.employer_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{incident.worker_full_name}</div>
                          {incident.worker_employee_number && (
                            <div className="text-sm text-muted-foreground">
                              #{incident.worker_employee_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{incident.injury_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {incident.classification}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(incident)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={incident.total_days_lost > 7 ? 'font-medium text-red-600' : ''}>
                          {incident.total_days_lost} days
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatIncidentDate(incident.date_of_injury, incident.time_of_injury)}
                      </div>
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewIncident(incident.incident_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditIncident(incident.incident_id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {incidentsData && incidentsData.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, incidentsData.totalCount)} of {incidentsData.totalCount} incidents
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">Page {currentPage} of {incidentsData.totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(incidentsData.totalPages, prev + 1))}
                disabled={currentPage === incidentsData.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bot,
  Archive,
  Trash2,
  RotateCcw,
  MoreHorizontal
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useIncidentsDashboard } from '@/hooks/useIncidentsDashboard';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import type { DebouncedFunc } from 'lodash';

// Import the IncidentData type from the hook
interface IncidentData {
  incident_id: number;
  incident_number: string;
  date_of_injury: string;
  time_of_injury: string | null;
  injury_type: string;
  classification: string;
  incident_status: string;
  injury_description: string;
  fatality: boolean;
  returned_to_work: boolean;
  total_days_lost: number;
  created_at: string;
  updated_at: string;
  worker_id: number | null;
  worker_name: string;
  worker_occupation: string;
  employer_id: number;
  employer_name: string;
  site_id: number | null;
  site_name: string;
  department_id: number | null;
  department_name: string;
  document_count: number;
  estimated_cost: number;
  psychosocial_factors?: unknown;
}

interface IncidentsListOptimizedProps {
  highlightIncidentId?: number;
  maxHeight?: string;
  selectedEmployerId?: number | null;
  enableVirtualScroll?: boolean;
  onLoaded?: () => void; // notify when initial data is loaded
}

// Memoized incident row component for better performance
const IncidentRow = React.memo(({ 
  incident, 
  isHighlighted, 
  onView,
  isSelected,
  onToggleSelect
}: {
  incident: IncidentData;
  isHighlighted: boolean;
  onView: (id: number) => void;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border border-dashed border-gray-400';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in review':
      case 'under investigation':
        return 'bg-blue-100 text-blue-800';
      case 'escalated':
        return 'bg-red-100 text-red-800';
      case 'voice agent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if this is a voice agent incident
  const isVoiceAgentIncident = incident.incident_status?.toLowerCase() === 'voice agent';

  const getClassificationColor = (classification: string) => {
    switch (classification?.toUpperCase()) {
      case 'LTI':
        return 'bg-red-100 text-red-800';
      case 'MTI':
        return 'bg-orange-100 text-orange-800';
      case 'FAI':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if injury_type incorrectly contains a classification value
  const classificationValues = ['LTI', 'MTI', 'FAI', 'LOST TIME', 'MEDICAL TREATMENT', 'FIRST AID'];
  const isInjuryTypeMisclassified = incident.injury_type && 
    classificationValues.some(cv => incident.injury_type?.toUpperCase().includes(cv));
  
  const displayInjuryType = isInjuryTypeMisclassified 
    ? 'Unknown' 
    : (incident.injury_type || 'N/A');

  return (
    <TableRow 
      className={cn(
        "hover:bg-muted/50 transition-colors cursor-pointer",
        isHighlighted && "bg-yellow-50 border-yellow-300",
        isSelected && "bg-primary/5"
      )}
      onClick={() => onView(incident.incident_id)}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(incident.incident_id)}
          aria-label={`Select incident ${incident.incident_number}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        {incident.incident_number || `INC-${incident.incident_id}`}
      </TableCell>
      <TableCell>
        {incident.date_of_injury ? format(parseISO(incident.date_of_injury), 'MMM d, yyyy') : 'N/A'}
      </TableCell>
      <TableCell>{incident.worker_name || '—'}</TableCell>
      <TableCell className={isInjuryTypeMisclassified ? 'text-amber-600' : ''}>
        {displayInjuryType}
        {isInjuryTypeMisclassified && (
          <span className="ml-1 text-xs" title="This value appears to be a classification, not an injury type">⚠</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={getClassificationColor(incident.classification)}>
          {incident.classification || 'N/A'}
        </Badge>
      </TableCell>
      <TableCell>{incident.site_name || 'N/A'}</TableCell>
      <TableCell>{incident.employer_name || 'N/A'}</TableCell>
      <TableCell>
        <Badge className={getStatusColor(incident.incident_status)}>
          {isVoiceAgentIncident && <Bot className="h-3 w-3 mr-1" />}
          {incident.incident_status || 'Open'}
        </Badge>
      </TableCell>
    </TableRow>
  );
});

IncidentRow.displayName = 'IncidentRow';

export function IncidentsList({ 
  highlightIncidentId, 
  maxHeight = "600px",
  selectedEmployerId,
  enableVirtualScroll = false,
  onLoaded
}: IncidentsListOptimizedProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<string>('active'); // 'active', 'archived', 'deleted', 'all'
  const [selectedIncidents, setSelectedIncidents] = useState<Set<number>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'delete' | 'restore' | 'permanent_delete' | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { userData } = useAuth();

  // Calculate date filters
  const { startDate, endDate } = useMemo(() => {
    if (dateFilter === 'all') return { startDate: null, endDate: null };
    
    const now = new Date();
    let start: Date | null = null;
    const end: Date | null = new Date();
    
    switch (dateFilter) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }
    
    return {
      startDate: start ? format(start, 'yyyy-MM-dd') : null,
      endDate: end ? format(end, 'yyyy-MM-dd') : null
    };
  }, [dateFilter]);

  // Use ultra-optimized hook
  const { 
    incidents, 
    totalCount,
    totalPages,
    isLoading, 
    isError, 
    error, 
    isFetching,
    refetch,
    prefetchNextPage
  } = useIncidentsDashboard({
    pageSize,
    page: currentPage,
    employerId: selectedEmployerId,
    startDate,
    endDate,
    prefetchNext: true,
    archiveFilter: archiveFilter as 'active' | 'archived' | 'deleted' | 'all'
  });
  
  // Force refetch when employer changes - add a key reset to ensure full re-render
  useEffect(() => {
    setCurrentPage(1); // Reset to first page
    refetch();
  }, [selectedEmployerId, refetch]);

  // Notify parent once when initial load completes
  const hasNotifiedRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onLoaded?.();
    }
  }, [isLoading, onLoaded]);

  // Filter incidents on the client side for search
  const filteredIncidents = useMemo(() => {
    if (!searchTerm && statusFilter === 'all') return incidents;
    
    return incidents.filter(incident => {
      const matchesSearch = !searchTerm || 
        incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.injury_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.site_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        incident.incident_status?.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [incidents, searchTerm, statusFilter]);

  // Debounced search handler
  const handleSearchChange: DebouncedFunc<(value: string) => void> = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  // CRITICAL: Cleanup all references on unmount to prevent memory leaks
  useEffect(() => {
    const currentSearchHandler = handleSearchChange;
    const currentSearchRef = searchInputRef.current;

    return () => {
      // Cancel debounced function to prevent memory leak
      currentSearchHandler.cancel();

      // Clear ref to prevent memory retention
      if (currentSearchRef) {
        currentSearchRef.value = '';
      }

      // Reset state to prevent stale closures
      setSearchTerm('');
      setCurrentPage(1);
    };
  }, []); // Empty deps - only cleanup on unmount

  // Navigation handler - clicking a row views the incident (or edits if draft)
  const handleView = useCallback((incidentId: number) => {
    // Find the incident to check if it's a draft
    const incident = incidents.find(i => i.incident_id === incidentId);
    if (incident?.incident_status?.toLowerCase() === 'draft') {
      // For drafts, go to edit mode to continue working on it
      navigate(`/incident/${incidentId}/edit`);
    } else {
      navigate(`/incident/${incidentId}`);
    }
  }, [navigate, incidents]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Prefetch the next page for instant navigation
    if (newPage < totalPages) {
      prefetchNextPage();
    }
  }, [totalPages, prefetchNextPage]);

  // Toggle incident selection
  const toggleIncidentSelection = useCallback((incidentId: number) => {
    setSelectedIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(incidentId)) {
        newSet.delete(incidentId);
      } else {
        newSet.add(incidentId);
      }
      return newSet;
    });
  }, []);

  // Select all visible incidents
  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredIncidents.map(i => i.incident_id);
    setSelectedIncidents(new Set(visibleIds));
  }, [filteredIncidents]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIncidents(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkArchive = useCallback(async () => {
    const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
    let successCount = 0;
    
    for (const incidentId of selectedIncidents) {
      const { error } = await supabase.rpc('archive_incident', {
        p_incident_id: incidentId,
        p_user_name: userName
      });
      if (!error) successCount++;
    }
    
    toast.success(`${successCount} incident(s) archived`);
    setSelectedIncidents(new Set());
    refetch();
  }, [selectedIncidents, userData, refetch]);

  const handleBulkRestore = useCallback(async () => {
    let successCount = 0;
    
    for (const incidentId of selectedIncidents) {
      const { error } = await supabase.rpc('restore_incident', {
        p_incident_id: incidentId
      });
      if (!error) successCount++;
    }
    
    toast.success(`${successCount} incident(s) restored`);
    setSelectedIncidents(new Set());
    refetch();
  }, [selectedIncidents, refetch]);

  const handleBulkDelete = useCallback(async () => {
    const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
    let successCount = 0;
    
    for (const incidentId of selectedIncidents) {
      const { error } = await supabase.rpc('soft_delete_incident', {
        p_incident_id: incidentId,
        p_user_name: userName
      });
      if (!error) successCount++;
    }
    
    toast.success(`${successCount} incident(s) deleted`);
    setSelectedIncidents(new Set());
    setShowBulkDeleteConfirm(false);
    refetch();
  }, [selectedIncidents, userData, refetch]);

  const handlePermanentDelete = useCallback(async () => {
    let successCount = 0;
    
    for (const incidentId of selectedIncidents) {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('incident_id', incidentId);
      if (!error) successCount++;
    }
    
    toast.success(`${successCount} incident(s) permanently deleted`);
    setSelectedIncidents(new Set());
    setShowPermanentDeleteConfirm(false);
    refetch();
  }, [selectedIncidents, refetch]);

  // Loading skeleton
  const renderSkeleton = () => (
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(9)].map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );

  if (isError) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load incidents: {error?.message || 'Unknown error'}
          <Button 
            variant="link" 
            className="ml-2 p-0 h-auto" 
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
    {/* Bulk Delete Confirmation Dialog */}
    <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedIncidents.size} incident(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft delete the selected incidents. They will be hidden from view but can be restored by an admin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleBulkDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Permanent Delete Confirmation Dialog */}
    <AlertDialog open={showPermanentDeleteConfirm} onOpenChange={setShowPermanentDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {selectedIncidents.size} incident(s)?</AlertDialogTitle>
          <AlertDialogDescription className="text-destructive">
            ⚠️ This action cannot be undone. The incidents and all associated data will be permanently removed from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handlePermanentDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Permanently Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Card>
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            Incidents
            {isFetching && !isLoading && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {selectedIncidents.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedIncidents.size} selected
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {/* Bulk Actions */}
            {selectedIncidents.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {archiveFilter === 'active' && (
                    <DropdownMenuItem onClick={handleBulkArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Selected
                    </DropdownMenuItem>
                  )}
                  {archiveFilter === 'archived' && (
                    <DropdownMenuItem onClick={handleBulkRestore}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Selected
                    </DropdownMenuItem>
                  )}
                  {archiveFilter !== 'deleted' && (
                    <DropdownMenuItem 
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  )}
                  {archiveFilter === 'deleted' && (
                    <>
                      <DropdownMenuItem onClick={handleBulkRestore}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore Selected
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowPermanentDeleteConfirm(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Permanently Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearSelection}>
                    Clear Selection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search incidents..."
                className="pl-8 w-[200px]"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            {/* Archive Filter */}
            <Select value={archiveFilter} onValueChange={setArchiveFilter}>
              <SelectTrigger className="w-[130px]">
                <Archive className="h-4 w-4 mr-2" />
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">
                  <span className="flex items-center gap-1">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                </SelectItem>
                <SelectItem value="deleted">
                  <span className="flex items-center gap-1 text-destructive">
                    <Trash2 className="h-3 w-3" />
                    Deleted
                  </span>
                </SelectItem>
                <SelectItem value="all">All Records</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="voice agent">
                  <span className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    Voice Agent
                  </span>
                </SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under investigation">Under Investigation</SelectItem>
                <SelectItem value="in review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="quarter">Past Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border" style={{ maxHeight, overflowY: 'auto' }}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filteredIncidents.length > 0 && selectedIncidents.size === filteredIncidents.length}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllVisible();
                      else clearSelection();
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[120px]">Incident #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead title="Type of injury (e.g., Fracture, Abrasion, Strain)">Injury Type</TableHead>
                <TableHead title="Severity classification (LTI, MTI, FAI)">Classification</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? renderSkeleton() : (
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map(incident => (
                    <IncidentRow
                      key={incident.incident_id}
                      incident={incident}
                      isHighlighted={incident.incident_id === highlightIncidentId}
                      onView={handleView}
                      isSelected={selectedIncidents.has(incident.incident_id)}
                      onToggleSelect={toggleIncidentSelection}
                    />
                  ))
                )}
              </TableBody>
            )}
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} incidents
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  if (totalPages <= 5) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isFetching}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  
                  // Smart pagination for many pages
                  if (pageNum === 1 || pageNum === totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isFetching}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  
                  if (pageNum === 2 && currentPage > 3) {
                    return <span key={pageNum} className="px-1">...</span>;
                  }
                  
                  if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                    return <span key={pageNum} className="px-1">...</span>;
                  }
                  
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isFetching}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

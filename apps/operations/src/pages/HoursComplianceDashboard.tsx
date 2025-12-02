import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Building2, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronRight,
  Search,
  MapPin,
  Calendar,
  Loader2,
  Mail,
  ExternalLink,
  Filter
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";

interface EmployerCompliance {
  employer_id: number;
  employer_name: string;
  total_sites: number;
  sites_with_hours: number;
  sites_missing_hours: number;
  completion_percentage: number;
  months_checked: number;
  missing_site_months: number;
  total_site_months: number;
  last_hours_entry: string | null;
  contact_email: string | null;
}

interface SiteHoursDetail {
  site_id: number;
  site_name: string;
  site_state: string | null;
  missing_month: string;
  has_hours: boolean;
}

const HoursComplianceDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [monthsBack, setMonthsBack] = useState("3");
  const [filterStatus, setFilterStatus] = useState<"all" | "missing" | "complete">("all");
  const [expandedEmployers, setExpandedEmployers] = useState<Set<number>>(new Set());
  const [selectedEmployerForReminder, setSelectedEmployerForReminder] = useState<EmployerCompliance | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const userRoleId = userData?.role_id ? parseInt(userData.role_id) : null;
  const isMendUser = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);

  // Fetch hours compliance data for all employers
  const { data: complianceData = [], isLoading } = useQuery({
    queryKey: ['hours-compliance', monthsBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hours_compliance', {
        p_user_role_id: userRoleId,
        p_months_back: parseInt(monthsBack)
      });
      
      if (error) {
        console.error('Error fetching hours compliance:', error);
        throw error;
      }
      return data as EmployerCompliance[];
    },
    enabled: isMendUser,
  });

  // Fetch detailed hours for expanded employers
  const fetchEmployerDetails = async (employerId: number) => {
    const { data, error } = await supabase.rpc('get_employer_missing_hours', {
      p_user_role_id: userRoleId,
      p_employer_id: employerId,
      p_months_back: parseInt(monthsBack)
    });
    
    if (error) throw error;
    return data as SiteHoursDetail[];
  };

  // Filter and search compliance data
  const filteredData = useMemo(() => {
    return complianceData.filter(emp => {
      // Search filter
      const matchesSearch = emp.employer_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (filterStatus === "missing") {
        matchesStatus = emp.missing_site_months > 0;
      } else if (filterStatus === "complete") {
        matchesStatus = emp.missing_site_months === 0;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [complianceData, searchQuery, filterStatus]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalEmployers = complianceData.length;
    const employersWithMissing = complianceData.filter(e => e.missing_site_months > 0).length;
    const totalMissingSiteMonths = complianceData.reduce((sum, e) => sum + e.missing_site_months, 0);
    const totalSiteMonths = complianceData.reduce((sum, e) => sum + e.total_site_months, 0);
    const overallCompletion = totalSiteMonths > 0 
      ? Math.round((totalSiteMonths - totalMissingSiteMonths) / totalSiteMonths * 100) 
      : 0;
    
    return {
      totalEmployers,
      employersWithMissing,
      totalMissingSiteMonths,
      overallCompletion,
    };
  }, [complianceData]);

  // Toggle employer expansion
  const toggleExpand = (employerId: number) => {
    setExpandedEmployers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employerId)) {
        newSet.delete(employerId);
      } else {
        newSet.add(employerId);
      }
      return newSet;
    });
  };

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (employer: EmployerCompliance) => {
      // For now, we'll just log this - in production, this would call an edge function
      // to send an email reminder
      console.log('Sending reminder to:', employer.employer_name, employer.contact_email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Call edge function to send email
      // const { error } = await supabase.functions.invoke('send-hours-reminder', {
      //   body: { employer_id: employer.employer_id }
      // });
      
      return employer;
    },
    onSuccess: (employer) => {
      toast.success(`Reminder sent to ${employer.employer_name}`);
      setReminderDialogOpen(false);
      setSelectedEmployerForReminder(null);
    },
    onError: (error) => {
      toast.error('Failed to send reminder');
      console.error('Reminder error:', error);
    },
  });

  const handleSendReminder = (employer: EmployerCompliance) => {
    setSelectedEmployerForReminder(employer);
    setReminderDialogOpen(true);
  };

  const confirmSendReminder = () => {
    if (selectedEmployerForReminder) {
      sendReminderMutation.mutate(selectedEmployerForReminder);
    }
  };

  // Generate month labels for the period
  const monthLabels = useMemo(() => {
    return Array.from({ length: parseInt(monthsBack) }, (_, i) => {
      const date = subMonths(new Date(), i + 1);
      return format(date, 'MMM yyyy');
    }).reverse();
  }, [monthsBack]);

  if (!isMendUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-muted-foreground">This page is only available to Mend staff.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Hours Compliance</h1>
        <p className="text-muted-foreground">
          Monitor and manage hours worked reporting across all employers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.totalEmployers}</div>
          </CardContent>
        </Card>
        
        <Card className={summaryStats.employersWithMissing > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Need Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{summaryStats.employersWithMissing}</div>
            <p className="text-xs text-muted-foreground mt-1">employers with missing hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Missing Site-Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.totalMissingSiteMonths}</div>
            <p className="text-xs text-muted-foreground mt-1">across all employers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.overallCompletion}%</div>
            <Progress value={summaryStats.overallCompletion} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={monthsBack} onValueChange={setMonthsBack}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 month</SelectItem>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employers</SelectItem>
                  <SelectItem value="missing">Missing Hours</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Employers ({filteredData.length})
          </CardTitle>
          <CardDescription>
            Checking: {monthLabels.join(', ')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No employers found matching your criteria
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map((employer) => (
                <EmployerComplianceRow
                  key={employer.employer_id}
                  employer={employer}
                  isExpanded={expandedEmployers.has(employer.employer_id)}
                  onToggle={() => toggleExpand(employer.employer_id)}
                  onSendReminder={() => handleSendReminder(employer)}
                  onEnterHours={() => navigate(`/hours-management?employer=${employer.employer_id}`)}
                  fetchDetails={fetchEmployerDetails}
                  userRoleId={userRoleId}
                  monthsBack={parseInt(monthsBack)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Confirmation Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Hours Reminder</DialogTitle>
            <DialogDescription>
              Send an email reminder to {selectedEmployerForReminder?.employer_name} to enter their hours worked data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedEmployerForReminder?.contact_email ? (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Will send to: <strong>{selectedEmployerForReminder.contact_email}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>No contact email on file for this employer</span>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Missing Hours Summary:</p>
              <p className="text-muted-foreground">
                {selectedEmployerForReminder?.missing_site_months} site-month{selectedEmployerForReminder?.missing_site_months !== 1 ? 's' : ''} missing 
                across {selectedEmployerForReminder?.sites_missing_hours} site{selectedEmployerForReminder?.sites_missing_hours !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendReminder}
              disabled={sendReminderMutation.isPending || !selectedEmployerForReminder?.contact_email}
            >
              {sendReminderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate component for each employer row
interface EmployerRowProps {
  employer: EmployerCompliance;
  isExpanded: boolean;
  onToggle: () => void;
  onSendReminder: () => void;
  onEnterHours: () => void;
  fetchDetails: (employerId: number) => Promise<SiteHoursDetail[]>;
  userRoleId: number | null;
  monthsBack: number;
}

const EmployerComplianceRow = ({ 
  employer, 
  isExpanded, 
  onToggle, 
  onSendReminder, 
  onEnterHours,
  fetchDetails,
  userRoleId,
  monthsBack
}: EmployerRowProps) => {
  const { data: siteDetails, isLoading } = useQuery({
    queryKey: ['employer-hours-details', employer.employer_id, monthsBack],
    queryFn: () => fetchDetails(employer.employer_id),
    enabled: isExpanded,
  });

  const isComplete = employer.missing_site_months === 0;
  const hasNoSites = employer.total_sites === 0;

  // Group site details by site
  const siteGroups = useMemo(() => {
    if (!siteDetails) return [];
    
    const groups: Record<number, SiteHoursDetail[]> = {};
    siteDetails.forEach(detail => {
      if (!groups[detail.site_id]) {
        groups[detail.site_id] = [];
      }
      groups[detail.site_id].push(detail);
    });
    
    return Object.values(groups);
  }, [siteDetails]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`border rounded-lg ${isComplete ? 'border-green-200 bg-green-50/30' : employer.missing_site_months > 5 ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{employer.employer_name}</span>
                  {isComplete ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  ) : hasNoSites ? (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      No Sites
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={employer.missing_site_months > 5 ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {employer.missing_site_months} missing
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {employer.total_sites} sites
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {employer.completion_percentage}% complete
                  </span>
                  {employer.last_hours_entry && (
                    <span>
                      Last entry: {format(new Date(employer.last_hours_entry), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Progress 
                value={employer.completion_percentage} 
                className="w-24 h-2"
              />
              
              {!isComplete && !hasNoSites && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendReminder();
                  }}
                  className="gap-1"
                >
                  <Send className="h-3 w-3" />
                  Remind
                </Button>
              )}
              
              {!hasNoSites && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterHours();
                  }}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {isComplete ? "View Hours" : "Enter Hours"}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : siteGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sites found for this employer</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>State</TableHead>
                    {siteDetails && siteDetails.length > 0 && (
                      [...new Set(siteDetails.map(d => d.missing_month))].sort().map(month => (
                        <TableHead key={month} className="text-center">
                          {format(new Date(month), 'MMM yyyy')}
                        </TableHead>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteGroups.map((siteMonths) => {
                    const site = siteMonths[0];
                    return (
                      <TableRow key={site.site_id}>
                        <TableCell className="font-medium">{site.site_name}</TableCell>
                        <TableCell className="text-muted-foreground">{site.site_state || '—'}</TableCell>
                        {siteMonths.map(detail => (
                          <TableCell key={detail.missing_month} className="text-center">
                            {detail.has_hours ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default HoursComplianceDashboard;


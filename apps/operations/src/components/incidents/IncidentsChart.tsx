import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface IncidentsChartProps {
  employerId: number | null;
  userRoleId?: number | null;
  height?: number;
  hideCard?: boolean;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  LTI: number;
  MTI: number;
  FAI: number;
  Other: number;
  total: number;
}

// Normalize classification to standard abbreviations
const normalizeClassification = (classification: string | null | undefined): string => {
  const upper = classification?.toUpperCase() || '';
  
  if (upper === 'LTI' || upper === 'LOST TIME INJURY' || upper === 'LOST TIME') {
    return 'LTI';
  }
  if (upper === 'MTI' || upper === 'MEDICAL TREATMENT INJURY' || upper === 'MEDICAL TREATMENT') {
    return 'MTI';
  }
  if (upper === 'FAI' || upper === 'FIRST AID INJURY' || upper === 'FIRST AID') {
    return 'FAI';
  }
  
  return 'Other';
};

export function IncidentsChart({ employerId, userRoleId, height = 300, hideCard = false }: IncidentsChartProps) {
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  
  // Super Admin (roles 1-4) can view all incidents without specific employer
  const isSuperAdmin = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);
  const canFetchData = !!employerId || isSuperAdmin;

  // Generate last 6 months
  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        value: format(startOfMonth(date), 'yyyy-MM'),
        label: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });
  }, []);

  // Fetch sites for filter dropdown
  const { data: sites = [] } = useQuery({
    queryKey: ['sites-for-filter', employerId, isSuperAdmin],
    queryFn: async () => {
      // For Super Admin with no employer filter, get all sites
      let query = supabase
        .from('sites')
        .select('site_id, site_name')
        .order('site_name');
      
      if (employerId) {
        query = query.eq('employer_id', employerId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching sites:', error);
        return [];
      }
      return data || [];
    },
    enabled: canFetchData,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch incidents for the chart using RBAC-aware RPC
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents-chart', employerId, isSuperAdmin, userRoleId, months[0]?.value, months[5]?.value],
    queryFn: async () => {
      const startDate = format(months[0].start, 'yyyy-MM-dd');
      const endDate = format(months[5].end, 'yyyy-MM-dd');
      
      // Use the get_dashboard_data RPC which respects RBAC
      // For Super Admin with no employer, pass null to get all incidents
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        page_size: 1000,
        page_offset: 0,
        filter_employer_id: employerId, // null for Super Admin viewing all
        filter_worker_id: null,
        filter_start_date: startDate,
        filter_end_date: endDate,
        user_role_id: userRoleId || 5, // Use actual role or default to Builder Admin
        user_employer_id: employerId,
        filter_archive_status: 'active'
      });
      
      if (error) {
        console.error('Error fetching incidents for chart:', error);
        return [];
      }
      
      // The RPC returns { incidents: [...], totalCount: N }
      const incidentsData = data?.incidents || [];
      
      return incidentsData.map((incident: any) => ({
        incident_id: incident.incident_id,
        date_of_injury: incident.date_of_injury,
        classification: incident.classification,
        site_id: incident.site_id
      }));
    },
    enabled: canFetchData,
    staleTime: 60 * 1000,
  });

  // Process data for chart
  const chartData = useMemo(() => {
    const data: MonthlyData[] = months.map(month => ({
      month: month.value,
      monthLabel: month.label,
      LTI: 0,
      MTI: 0,
      FAI: 0,
      Other: 0,
      total: 0,
    }));

    incidents.forEach(incident => {
      if (!incident.date_of_injury) return;
      
      // Apply site filter
      if (siteFilter !== 'all' && incident.site_id !== parseInt(siteFilter)) {
        return;
      }
      
      const incidentMonth = format(new Date(incident.date_of_injury), 'yyyy-MM');
      const monthData = data.find(d => d.month === incidentMonth);
      
      if (monthData) {
        const classification = normalizeClassification(incident.classification);
        
        // Apply classification filter
        if (classificationFilter !== 'all' && classification !== classificationFilter) {
          return;
        }
        
        monthData[classification as keyof Pick<MonthlyData, 'LTI' | 'MTI' | 'FAI' | 'Other'>]++;
        monthData.total++;
      }
    });

    return data;
  }, [incidents, months, classificationFilter, siteFilter]);

  // Calculate totals for summary badges
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, month) => ({
        LTI: acc.LTI + month.LTI,
        MTI: acc.MTI + month.MTI,
        FAI: acc.FAI + month.FAI,
        Other: acc.Other + month.Other,
        total: acc.total + month.total,
      }),
      { LTI: 0, MTI: 0, FAI: 0, Other: 0, total: 0 }
    );
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any) => (
            entry.value > 0 && (
              <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">{entry.value}</span>
              </div>
            )
          ))}
          <div className="border-t mt-2 pt-2 font-medium">
            Total: {total}
          </div>
        </div>
      );
    }
    return null;
  };

  // Chart content rendering - extracted to reuse with/without card
  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div style={{ height: `${height}px` }} className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }
    
    return (
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  LTI: 'Lost Time Injury',
                  MTI: 'Medical Treatment',
                  FAI: 'First Aid',
                  Other: 'Unclassified'
                };
                return labels[value] || value;
              }}
            />
            <Bar 
              dataKey="LTI" 
              stackId="a" 
              fill="#ef4444" 
              name="LTI"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="MTI" 
              stackId="a" 
              fill="#f97316" 
              name="MTI"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="FAI" 
              stackId="a" 
              fill="#eab308" 
              name="FAI"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="Other" 
              stackId="a" 
              fill="#9ca3af" 
              name="Other"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // If hideCard is true, just return the chart content
  if (hideCard) {
    return renderChartContent();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Incidents Over Time</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 6 months by classification</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Summary badges */}
            <div className="flex gap-2 mr-4">
              <Badge 
                variant="outline" 
                className="bg-red-50 text-red-700 border-red-200 cursor-help"
                title="Lost Time Injury"
              >
                LTI: {totals.LTI}
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-orange-50 text-orange-700 border-orange-200 cursor-help"
                title="Medical Treatment Injury"
              >
                MTI: {totals.MTI}
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-yellow-50 text-yellow-700 border-yellow-200 cursor-help"
                title="First Aid Injury"
              >
                FAI: {totals.FAI}
              </Badge>
            </div>
            
            {/* Filters */}
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="LTI">LTI Only</SelectItem>
                <SelectItem value="MTI">MTI Only</SelectItem>
                <SelectItem value="FAI">FAI Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.site_id} value={site.site_id.toString()}>
                    {site.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChartContent()}
      </CardContent>
    </Card>
  );
}


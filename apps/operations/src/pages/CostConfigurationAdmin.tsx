import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@clerk/clerk-react';
import { isSuperAdmin } from '@/lib/auth/roles';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  Save, 
  TrendingUp,
  AlertCircle,
  Activity,
  Clock,
  Brain,
  Percent,
  Edit2,
  Plus
} from 'lucide-react';

interface CostAssumption {
  assumption_id: number;
  category: string;
  subcategory?: string;
  key: string;
  value: number;
  unit?: string;
  description?: string;
  source?: string;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

interface CostSummary {
  total_incidents: number;
  total_estimated_cost: number;
  average_cost_per_incident: number;
  incidents_with_override: number;
  incidents_calculated: number;
}

export default function CostConfigurationAdmin() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [assumptions, setAssumptions] = useState<CostAssumption[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<Record<number, number>>({});
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [activeTab, setActiveTab] = useState('incident_type');

  const categories = [
    { id: 'incident_type', label: 'Incident Types', icon: <Activity className="h-4 w-4" /> },
    { id: 'daily_costs', label: 'Daily Costs', icon: <Clock className="h-4 w-4" /> },
    { id: 'body_part_multiplier', label: 'Body Part Multipliers', icon: <Brain className="h-4 w-4" /> },
    { id: 'indirect_costs', label: 'Indirect Costs', icon: <Percent className="h-4 w-4" /> },
    { id: 'psychosocial', label: 'Psychosocial Factors', icon: <TrendingUp className="h-4 w-4" /> }
  ];

  // Check user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('email', user.primaryEmailAddress.emailAddress)
        .single();

      if (data?.role_id) {
        setUserRoleId(data.role_id);
        
        // Only super admins can access this page
        if (!isSuperAdmin(data.role_id)) {
          navigate('/unauthorized');
        }
      } else {
        navigate('/unauthorized');
      }
      setLoading(false);
    };

    if (isLoaded) {
      fetchUserRole();
    }
  }, [user, isLoaded, navigate]);

  // Fetch cost assumptions
  useEffect(() => {
    fetchAssumptions();
    fetchCostSummary();
  }, []);

  const fetchAssumptions = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_assumptions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      setAssumptions(data || []);
    } catch (error) {
      console.error('Error fetching cost assumptions:', error);
      toast.error('Failed to load cost assumptions');
    }
  };

  const fetchCostSummary = async () => {
    try {
      // Get summary statistics
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('estimated_cost, cost_override');

      if (error) throw error;

      const summary: CostSummary = {
        total_incidents: incidents?.length || 0,
        total_estimated_cost: 0,
        average_cost_per_incident: 0,
        incidents_with_override: 0,
        incidents_calculated: 0
      };

      incidents?.forEach(incident => {
        const cost = incident.cost_override || incident.estimated_cost || 0;
        summary.total_estimated_cost += cost;
        if (incident.cost_override) {
          summary.incidents_with_override++;
        }
        if (incident.estimated_cost) {
          summary.incidents_calculated++;
        }
      });

      if (summary.total_incidents > 0) {
        summary.average_cost_per_incident = summary.total_estimated_cost / summary.total_incidents;
      }

      setCostSummary(summary);
    } catch (error) {
      console.error('Error fetching cost summary:', error);
    }
  };

  const handleEdit = (assumptionId: number, currentValue: number) => {
    setEditingId(assumptionId);
    setEditedValues({ ...editedValues, [assumptionId]: currentValue });
  };

  const handleSave = async (assumptionId: number) => {
    setSaving(true);
    try {
      const newValue = editedValues[assumptionId];
      
      const { error } = await supabase
        .from('cost_assumptions')
        .update({ 
          value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('assumption_id', assumptionId);

      if (error) throw error;

      // Update local state
      setAssumptions(assumptions.map(a => 
        a.assumption_id === assumptionId 
          ? { ...a, value: newValue } 
          : a
      ));
      
      setEditingId(null);
      toast.success('Cost assumption updated successfully');
    } catch (error) {
      console.error('Error updating cost assumption:', error);
      toast.error('Failed to update cost assumption');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      // Call the recalculate function via RPC
      const { data, error } = await supabase
        .rpc('recalculate_all_incident_costs');

      if (error) throw error;

      toast.success(`Recalculated costs for ${data[0]?.incidents_processed || 0} incidents`);
      
      // Refresh the summary
      await fetchCostSummary();
    } catch (error) {
      console.error('Error recalculating costs:', error);
      toast.error('Failed to recalculate incident costs');
    } finally {
      setRecalculating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatUnit = (unit?: string) => {
    if (!unit) return '';
    switch (unit) {
      case 'per_incident': return 'per incident';
      case 'per_day': return 'per day';
      case 'percentage': return '%';
      case 'multiplier': return '×';
      default: return unit;
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Cost Configuration' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Incident Cost Configuration"
        description="Configure cost assumptions and calculation parameters"
        breadcrumbItems={breadcrumbItems}
      />

      <div className="container mx-auto py-8 px-4">
        {/* Summary Cards */}
        {costSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{costSummary.total_incidents}</div>
                <p className="text-xs text-muted-foreground">
                  {costSummary.incidents_calculated} calculated
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Estimated Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(costSummary.total_estimated_cost)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all incidents
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(costSummary.average_cost_per_incident)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per incident
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manual Overrides</CardTitle>
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{costSummary.incidents_with_override}</div>
                <p className="text-xs text-muted-foreground">
                  Manually adjusted
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Changes to cost assumptions will affect future incident cost calculations. 
            Use the "Recalculate All" button to update existing incident estimates based on new values.
          </AlertDescription>
        </Alert>

        {/* Cost Assumptions Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cost Assumptions</CardTitle>
                <CardDescription>
                  Configure the base values used in incident cost calculations
                </CardDescription>
              </div>
              <Button 
                onClick={handleRecalculateAll} 
                disabled={recalculating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                Recalculate All Incidents
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1">
                    {cat.icon}
                    <span className="hidden sm:inline">{cat.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map(category => (
                <TabsContent key={category.id} value={category.id}>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assumptions
                          .filter(a => a.category === category.id)
                          .map(assumption => (
                            <TableRow key={assumption.assumption_id}>
                              <TableCell className="font-medium">
                                <Badge variant="outline">{assumption.key}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <span className="text-sm">{assumption.description}</span>
                              </TableCell>
                              <TableCell>
                                {editingId === assumption.assumption_id ? (
                                  <Input
                                    type="number"
                                    value={editedValues[assumption.assumption_id] || assumption.value}
                                    onChange={(e) => setEditedValues({
                                      ...editedValues,
                                      [assumption.assumption_id]: parseFloat(e.target.value)
                                    })}
                                    className="w-32"
                                    step="0.01"
                                  />
                                ) : (
                                  <span className="font-semibold">
                                    {assumption.unit === 'percentage' 
                                      ? `${(assumption.value * 100).toFixed(0)}%`
                                      : assumption.unit === 'multiplier'
                                      ? `${assumption.value}×`
                                      : formatCurrency(assumption.value)
                                    }
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatUnit(assumption.unit)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {assumption.source}
                                </span>
                              </TableCell>
                              <TableCell>
                                {editingId === assumption.assumption_id ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSave(assumption.assumption_id)}
                                      disabled={saving}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(assumption.assumption_id, assumption.value)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cost Calculation Formula</CardTitle>
            <CardDescription>
              How incident costs are calculated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Base Formula:</h4>
                <code className="text-sm">
                  Total Cost = (Base Cost × Body Part Multiplier) + Days Lost Cost + Indirect Costs + Psychosocial Costs
                </code>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Direct Costs Include:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Medical treatment expenses</li>
                    <li>• Workers compensation claims</li>
                    <li>• Lost productivity (days lost)</li>
                    <li>• Replacement worker costs</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Indirect Costs Include:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Administrative overhead (15%)</li>
                    <li>• Investigation costs (10%)</li>
                    <li>• Legal and compliance (8%)</li>
                    <li>• Training replacement workers (12%)</li>
                    <li>• Reputation impact (5%)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
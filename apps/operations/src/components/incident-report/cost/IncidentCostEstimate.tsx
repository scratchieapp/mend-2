import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  DollarSign, 
  Edit2, 
  Save, 
  X,
  Info,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CostBreakdown {
  base_cost: number;
  days_lost_cost: number;
  body_part_multiplier: number;
  indirect_costs: number;
  psychosocial_costs: number;
  total_cost: number;
  classification: string;
  days_lost: number;
  body_part?: string;
  calculation_date: string;
}

interface IncidentCostEstimateProps {
  incidentId?: number;
  classification?: string;
  daysLost?: number;
  bodyPartId?: number | null;
  isFatality?: boolean;
  onCostUpdate?: (cost: number, isOverride: boolean) => void;
  readOnly?: boolean;
}

export default function IncidentCostEstimate({
  incidentId,
  classification,
  daysLost = 0,
  bodyPartId,
  isFatality = false,
  onCostUpdate,
  readOnly = false
}: IncidentCostEstimateProps) {
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [costOverride, setCostOverride] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempOverride, setTempOverride] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bodyPartName, setBodyPartName] = useState<string | null>(null);

  // Fetch body part name if provided
  useEffect(() => {
    const fetchBodyPart = async () => {
      if (bodyPartId) {
        const { data } = await supabase
          .from('body_parts')
          .select('body_part_name')
          .eq('body_part_id', bodyPartId)
          .single();
        
        if (data) {
          setBodyPartName(data.body_part_name);
        }
      }
    };
    fetchBodyPart();
  }, [bodyPartId]);

  // Calculate or fetch cost estimate
  useEffect(() => {
    if (incidentId) {
      fetchExistingCost();
    } else if (classification) {
      calculateEstimate();
    }
  }, [incidentId, classification, daysLost, bodyPartId, isFatality]);

  const fetchExistingCost = async () => {
    if (!incidentId) return;

    try {
      const { data: incident } = await supabase
        .from('incidents')
        .select('estimated_cost, cost_override, indirect_costs')
        .eq('incident_id', incidentId)
        .single();

      if (incident) {
        setEstimatedCost(incident.estimated_cost);
        setCostOverride(incident.cost_override);
        
        // Try to fetch the latest calculation breakdown
        const { data: calculation } = await supabase
          .from('incident_cost_calculations')
          .select('calculation_breakdown')
          .eq('incident_id', incidentId)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .single();

        if (calculation?.calculation_breakdown) {
          setBreakdown(calculation.calculation_breakdown as CostBreakdown);
        }
      }
    } catch (error) {
      console.error('Error fetching cost:', error);
    }
  };

  const calculateEstimate = async () => {
    if (!classification) return;

    setLoading(true);
    try {
      // Get base cost for classification
      const { data: baseCostData } = await supabase
        .from('cost_assumptions')
        .select('value')
        .eq('category', 'incident_type')
        .eq('key', classification)
        .eq('is_active', true)
        .single();

      let baseCost = baseCostData?.value || 1000;

      // Get daily cost for lost time
      let daysLostCost = 0;
      if (daysLost > 0) {
        const { data: dailyCostData } = await supabase
          .from('cost_assumptions')
          .select('value')
          .eq('category', 'daily_costs')
          .eq('key', 'lost_time_day')
          .eq('is_active', true)
          .single();

        daysLostCost = (dailyCostData?.value || 1500) * daysLost;
      }

      // Get body part multiplier
      let bodyPartMultiplier = 1.0;
      if (bodyPartName) {
        const { data: multiplierData } = await supabase
          .from('cost_assumptions')
          .select('key, value')
          .eq('category', 'body_part_multiplier')
          .eq('is_active', true);

        const match = multiplierData?.find(m => 
          bodyPartName.toLowerCase().includes(m.key.toLowerCase()) ||
          m.key.toLowerCase().includes(bodyPartName.toLowerCase())
        );

        if (match) {
          bodyPartMultiplier = match.value;
        }
      }

      // Apply body part multiplier
      baseCost = baseCost * bodyPartMultiplier;

      // Calculate indirect costs (sum of percentages)
      const { data: indirectData } = await supabase
        .from('cost_assumptions')
        .select('value')
        .eq('category', 'indirect_costs')
        .eq('is_active', true);

      const indirectPercentage = indirectData?.reduce((sum, item) => sum + item.value, 0) || 0.5;
      const indirectCosts = (baseCost + daysLostCost) * indirectPercentage;

      // Calculate psychosocial costs for serious incidents
      let psychosocialCosts = 0;
      if (classification === 'FAT' || classification === 'LTI' || isFatality) {
        const { data: psychoData } = await supabase
          .from('cost_assumptions')
          .select('value')
          .eq('category', 'psychosocial')
          .in('key', ['witness_trauma', 'team_counseling'])
          .eq('is_active', true);

        psychosocialCosts = psychoData?.reduce((sum, item) => sum + item.value, 0) || 0;
      }

      const totalCost = baseCost + daysLostCost + indirectCosts + psychosocialCosts;

      setEstimatedCost(totalCost);
      setBreakdown({
        base_cost: baseCost,
        days_lost_cost: daysLostCost,
        body_part_multiplier: bodyPartMultiplier,
        indirect_costs: indirectCosts,
        psychosocial_costs: psychosocialCosts,
        total_cost: totalCost,
        classification: classification,
        days_lost: daysLost,
        body_part: bodyPartName || undefined,
        calculation_date: new Date().toISOString()
      });

      if (onCostUpdate) {
        onCostUpdate(totalCost, false);
      }
    } catch (error) {
      console.error('Error calculating estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = async () => {
    const overrideValue = parseFloat(tempOverride);
    
    if (isNaN(overrideValue) || overrideValue < 0) {
      toast.error('Please enter a valid cost amount');
      return;
    }

    setCostOverride(overrideValue);
    setIsEditing(false);

    if (incidentId) {
      try {
        await supabase
          .from('incidents')
          .update({ 
            cost_override: overrideValue,
            cost_calculation_method: 'manual'
          })
          .eq('incident_id', incidentId);

        toast.success('Cost override saved successfully');
      } catch (error) {
        console.error('Error saving override:', error);
        toast.error('Failed to save cost override');
      }
    }

    if (onCostUpdate) {
      onCostUpdate(overrideValue, true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempOverride('');
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setTempOverride(costOverride?.toString() || estimatedCost?.toString() || '');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const displayCost = costOverride !== null ? costOverride : estimatedCost;

  if (!classification && !incidentId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <CardTitle>Cost Estimate</CardTitle>
          </div>
          {!readOnly && !isEditing && displayCost !== null && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartEdit}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Override
            </Button>
          )}
        </div>
        <CardDescription>
          {costOverride !== null 
            ? 'Manual override applied' 
            : 'Automatically calculated based on incident factors'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Cost Display */}
        <div className="text-center p-6 bg-muted rounded-lg">
          {isEditing ? (
            <div className="space-y-4">
              <Label htmlFor="cost-override">Manual Cost Override</Label>
              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <span className="text-lg">$</span>
                <Input
                  id="cost-override"
                  type="number"
                  value={tempOverride}
                  onChange={(e) => setTempOverride(e.target.value)}
                  placeholder="0"
                  step="100"
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={handleSaveOverride}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold">
                {loading ? (
                  <span className="animate-pulse">Calculating...</span>
                ) : displayCost !== null ? (
                  formatCurrency(displayCost)
                ) : (
                  'Not calculated'
                )}
              </div>
              {costOverride !== null && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Original estimate: {estimatedCost ? formatCurrency(estimatedCost) : 'N/A'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cost Breakdown */}
        {breakdown && !isEditing && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Cost Breakdown
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Cost ({breakdown.classification})</span>
                  <span className="font-medium">{formatCurrency(breakdown.base_cost / (breakdown.body_part_multiplier || 1))}</span>
                </div>
                
                {breakdown.body_part_multiplier > 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Body Part Multiplier ({breakdown.body_part})</span>
                    <span className="font-medium">×{breakdown.body_part_multiplier}</span>
                  </div>
                )}
                
                {breakdown.days_lost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lost Time ({breakdown.days_lost} days)</span>
                    <span className="font-medium">{formatCurrency(breakdown.days_lost_cost)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Indirect Costs</span>
                  <span className="font-medium">{formatCurrency(breakdown.indirect_costs)}</span>
                </div>
                
                {breakdown.psychosocial_costs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Psychosocial Impact</span>
                    <span className="font-medium">{formatCurrency(breakdown.psychosocial_costs)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-semibold">
                  <span>Total Estimated Cost</span>
                  <span>{formatCurrency(breakdown.total_cost)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Alert */}
        {!incidentId && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is an estimate based on incident type, days lost, and injury location. 
              The final cost will be calculated and stored when the incident is saved.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
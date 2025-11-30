import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calculator, 
  TrendingDown,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Banknote,
  UserMinus,
  Stethoscope,
  Building2,
  ClipboardList
} from 'lucide-react';
import { 
  estimateIncidentCost, 
  formatCurrency, 
  toRange, 
  formatCostRange,
  type CostEstimate,
  type CostEstimationInput,
  type Severity,
  mapBodyPartToRegion,
  mapInjuryType
} from '@/lib/cost-estimation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface IncidentCostEstimateProps {
  incidentId?: number;
  classification?: string;
  daysLost?: number;
  bodyPartId?: number | null;
  bodyPartName?: string;
  injuryType?: string;
  severity?: string;
  state?: string;
  workerRole?: string;
  isFatality?: boolean;
  suitableDutiesAvailable?: 'Yes' | 'No' | 'Unsure';
  onCostUpdate?: (cost: number, isOverride: boolean) => void;
  readOnly?: boolean;
  compact?: boolean;
}

// Cost comparison bar component
function CostBar({ 
  value, 
  maxValue, 
  label, 
  color = 'bg-red-500',
  showLabel = true 
}: { 
  value: number; 
  maxValue: number; 
  label: string;
  color?: string;
  showLabel?: boolean;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold">{formatCurrency(value)}</span>
        </div>
      )}
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Breakdown row component
function BreakdownRow({ 
  icon: Icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ElementType;
  label: string; 
  value: number;
  subtext?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="text-sm text-muted-foreground truncate">{label}</span>
          <span className="text-sm font-medium tabular-nums">{formatCurrency(value)}</span>
        </div>
        {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
      </div>
    </div>
  );
}

export default function IncidentCostEstimate({
  incidentId,
  classification,
  daysLost = 0,
  bodyPartId,
  bodyPartName,
  injuryType,
  severity = 'Moderate',
  state,
  workerRole,
  isFatality = false,
  suitableDutiesAvailable = 'Unsure',
  onCostUpdate,
  readOnly = false,
  compact = false
}: IncidentCostEstimateProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [includePremiumImpact, setIncludePremiumImpact] = useState(false);
  const [resolvedBodyPartName, setResolvedBodyPartName] = useState<string | null>(bodyPartName || null);
  const [resolvedState, setResolvedState] = useState<string>(state || 'NSW');

  // Resolve body part name from ID if not provided
  useEffect(() => {
    const resolveBodyPart = async () => {
      if (bodyPartName) {
        setResolvedBodyPartName(bodyPartName);
        return;
      }
      
      if (bodyPartId) {
        const { data } = await supabase
          .from('body_parts')
          .select('body_part_name')
          .eq('body_part_id', bodyPartId)
          .single();
        
        if (data) {
          setResolvedBodyPartName(data.body_part_name);
        }
      }
    };
    resolveBodyPart();
  }, [bodyPartId, bodyPartName]);

  // Resolve state from incident if not provided
  useEffect(() => {
    const resolveState = async () => {
      if (state) {
        setResolvedState(state);
        return;
      }
      
      if (incidentId) {
        const { data } = await supabase
          .from('incidents')
          .select('sites(state)')
          .eq('incident_id', incidentId)
          .single();
        
        if (data?.sites?.state) {
          setResolvedState(data.sites.state);
        }
      }
    };
    resolveState();
  }, [incidentId, state]);

  // Calculate estimate when inputs change
  useEffect(() => {
    const calculateEstimate = async () => {
      // Need at least injury type to calculate
      if (!injuryType && !classification) {
        setEstimate(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const input: CostEstimationInput = {
          injuryType: injuryType || classification || 'Strain',
          bodyRegion: resolvedBodyPartName || 'General',
          severity: (severity as Severity) || 'Moderate',
          state: resolvedState,
          roleCategory: workerRole || 'Labourer',
          suitableDutiesAvailable,
          includePremiumImpact,
        };

        const result = await estimateIncidentCost(input);
        
        if (result) {
          setEstimate(result);
          
          // Notify parent of cost update
          if (onCostUpdate) {
            onCostUpdate(result.ltiCost.total, false);
          }
        }
      } catch (err) {
        console.error('Error calculating cost estimate:', err);
        setError('Unable to calculate cost estimate');
      } finally {
        setLoading(false);
      }
    };

    calculateEstimate();
  }, [
    injuryType, 
    classification, 
    resolvedBodyPartName, 
    severity, 
    resolvedState, 
    workerRole, 
    suitableDutiesAvailable, 
    includePremiumImpact,
    onCostUpdate
  ]);

  // Calculate ranges for display
  const ltiRange = useMemo(() => estimate ? toRange(estimate.ltiCost.total) : null, [estimate]);
  const mtiRange = useMemo(() => estimate ? toRange(estimate.mtiCost.total) : null, [estimate]);
  const savingsRange = useMemo(() => estimate ? toRange(estimate.potentialSavings) : null, [estimate]);

  // Determine which scenario message to show
  const scenarioMessage = useMemo(() => {
    if (suitableDutiesAvailable === 'No') {
      return {
        type: 'warning' as const,
        title: 'Suitable duties not available',
        message: 'Without suitable duties, this injury will likely become an LTI. Consider: Can any light duties be created? Training courses? Administrative tasks? Even 1 hour/day can prevent LTI classification.',
      };
    }
    if (suitableDutiesAvailable === 'Unsure') {
      return {
        type: 'info' as const,
        title: 'Suitable duties availability unknown',
        message: 'If suitable duties CAN be arranged, significant savings are possible. Recommend discussing with supervisor and treating doctor.',
      };
    }
    return null;
  }, [suitableDutiesAvailable]);

  // Don't render if no data to show
  if (!injuryType && !classification && !incidentId) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No estimate yet
  if (!estimate) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Cost Estimate
          </CardTitle>
          <CardDescription>
            Automatically calculated based on incident factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Not calculated</p>
            <p className="text-xs mt-1">Enter injury type and body part to see estimate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCost = Math.max(estimate.ltiCost.total, estimate.mtiCost.total) * 1.1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Cost Impact Estimate
          </CardTitle>
          {estimate.savingsPercentage > 0 && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <TrendingDown className="h-3 w-3 mr-1" />
              {estimate.savingsPercentage}% savings potential
            </Badge>
          )}
        </div>
        <CardDescription>
          Comparing unmanaged (LTI) vs managed (MTI) scenarios
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* LTI (Unmanaged) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-700">If Unmanaged (LTI)</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-700">
                {ltiRange && formatCostRange(ltiRange)}
              </div>
              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <Clock className="h-3 w-3" />
                <span>{estimate.ltiCost.durationWeeks} weeks off work</span>
              </div>
            </div>
          </div>

          {/* MTI (Managed) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">If Managed (MTI)</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(estimate.mtiCost.total)}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                <Clock className="h-3 w-3" />
                <span>{estimate.mtiCost.durationWeeks} weeks light duties</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual comparison bar */}
        <div className="space-y-2 pt-2">
          <CostBar 
            value={estimate.ltiCost.total} 
            maxValue={maxCost} 
            label="Unmanaged Cost (LTI)"
            color="bg-red-500"
          />
          <CostBar 
            value={estimate.mtiCost.total} 
            maxValue={maxCost} 
            label="Managed Cost (MTI)"
            color="bg-emerald-500"
          />
        </div>

        {/* Potential Savings */}
        {estimate.potentialSavings > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800">Potential Savings</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {savingsRange && formatCostRange(savingsRange)}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              by managing this injury with suitable duties
            </p>
          </div>
        )}

        {/* Scenario-specific message */}
        {scenarioMessage && (
          <Alert variant={scenarioMessage.type === 'warning' ? 'destructive' : 'default'}>
            {scenarioMessage.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <span className="font-medium">{scenarioMessage.title}:</span>{' '}
              {scenarioMessage.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Toggle for premium impact */}
        {!compact && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="premium-impact" className="text-sm text-muted-foreground">
                Include 3-year premium impact
              </Label>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Switch
              id="premium-impact"
              checked={includePremiumImpact}
              onCheckedChange={setIncludePremiumImpact}
              disabled={readOnly}
            />
          </div>
        )}

        {/* Detailed breakdown toggle */}
        {!compact && (
          <>
            <Separator />
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Detailed Breakdown
                </>
              )}
            </Button>

            {showBreakdown && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* LTI Breakdown */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">LTI Breakdown</h4>
                  <BreakdownRow 
                    icon={Banknote} 
                    label="Worker Compensation" 
                    value={estimate.ltiCost.breakdown.compensation}
                    subtext={`${estimate.ltiCost.durationWeeks} weeks @ 95% of PIAWE`}
                  />
                  <BreakdownRow 
                    icon={UserMinus} 
                    label="Replacement Labour" 
                    value={estimate.ltiCost.breakdown.replacementLabour}
                    subtext="Labour hire costs"
                  />
                  <BreakdownRow 
                    icon={Stethoscope} 
                    label="Medical Costs" 
                    value={estimate.ltiCost.breakdown.medical}
                  />
                  <BreakdownRow 
                    icon={Building2} 
                    label="Indirect Costs" 
                    value={estimate.ltiCost.indirectCosts}
                    subtext="Admin, investigation, productivity"
                  />
                  {estimate.ltiCost.premiumImpact > 0 && (
                    <BreakdownRow 
                      icon={ClipboardList} 
                      label="Premium Impact (3yr)" 
                      value={estimate.ltiCost.premiumImpact}
                    />
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-sm">
                    <span>Total LTI Cost</span>
                    <span className="text-red-700">{formatCurrency(estimate.ltiCost.total)}</span>
                  </div>
                </div>

                {/* MTI Breakdown */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-700 mb-2">MTI Breakdown</h4>
                  <BreakdownRow 
                    icon={TrendingDown} 
                    label="Productivity Loss" 
                    value={estimate.mtiCost.breakdown.productivityLoss || 0}
                    subtext="30% productivity on light duties"
                  />
                  <BreakdownRow 
                    icon={Stethoscope} 
                    label="Medical Costs" 
                    value={estimate.mtiCost.breakdown.medical}
                    subtext="Less intensive treatment"
                  />
                  <BreakdownRow 
                    icon={ClipboardList} 
                    label="Administration" 
                    value={estimate.mtiCost.breakdown.administration || 0}
                    subtext="Coordination & paperwork"
                  />
                  <BreakdownRow 
                    icon={Building2} 
                    label="Indirect Costs" 
                    value={estimate.mtiCost.indirectCosts}
                  />
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-sm">
                    <span>Total MTI Cost</span>
                    <span className="text-emerald-700">{formatCurrency(estimate.mtiCost.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Data source footer */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            Based on: {estimate.inputFactors.injuryType} ({estimate.inputFactors.bodyRegion}), 
            {estimate.inputFactors.severity} severity, {estimate.inputFactors.roleCategory} role, 
            {estimate.inputFactors.state} scheme.
          </p>
          <p className="mt-0.5">{estimate.dataSource}. Last updated: November 2024.</p>
        </div>
      </CardContent>
    </Card>
  );
}

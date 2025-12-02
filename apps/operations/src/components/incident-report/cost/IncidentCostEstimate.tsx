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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Calculator, 
  TrendingDown,
  Clock,
  Info,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Banknote,
  UserMinus,
  Stethoscope,
  Building2,
  ClipboardList,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Shield,
  Pencil
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  estimateIncidentCost, 
  formatCurrency, 
  toRange, 
  formatCostRange,
  type CostEstimate,
  type CostEstimationInput,
  type Severity,
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
  // Callbacks for when user edits cost estimation inputs
  onSeverityChange?: (severity: string) => void;
  onWorkerRoleChange?: (workerRole: string) => void;
  onStateChange?: (state: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

// Available options for editable fields
const SEVERITY_OPTIONS = ['Minor', 'Moderate', 'Severe'] as const;
const WORKER_ROLE_OPTIONS = ['Labourer', 'Tradesperson', 'Operator', 'Supervisor'] as const;
const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'] as const;

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

// Breakdown row component for modal
function BreakdownRow({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  calculation 
}: { 
  icon: React.ElementType;
  label: string; 
  value: number;
  subtext?: string;
  calculation?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm font-bold tabular-nums">{formatCurrency(value)}</span>
        </div>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
        {calculation && (
          <p className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 px-2 py-1 rounded">
            {calculation}
          </p>
        )}
      </div>
    </div>
  );
}

// Detailed breakdown modal component
function CostBreakdownModal({ 
  estimate, 
  includePremiumImpact,
  onTogglePremiumImpact
}: { 
  estimate: CostEstimate;
  includePremiumImpact: boolean;
  onTogglePremiumImpact: (value: boolean) => void;
}) {
  const ltiRange = toRange(estimate.ltiCost.total);
  const savingsRange = toRange(estimate.potentialSavings);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Detailed Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-6 w-6" />
            Cost Estimation Breakdown
          </DialogTitle>
          <DialogDescription>
            Detailed comparison of unmanaged (LTI) vs managed (MTI) injury scenarios
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {/* LTI Summary */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-800">If Unmanaged (LTI)</span>
            </div>
            <div className="text-3xl font-bold text-red-700">
              {formatCostRange(ltiRange)}
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600 mt-2">
              <Clock className="h-4 w-4" />
              <span>{estimate.ltiCost.durationWeeks} weeks off work</span>
            </div>
          </div>

          {/* MTI Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-800">If Managed (MTI)</span>
            </div>
            <div className="text-3xl font-bold text-emerald-700">
              {formatCurrency(estimate.mtiCost.total)}
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600 mt-2">
              <Clock className="h-4 w-4" />
              <span>{estimate.mtiCost.durationWeeks} weeks light duties</span>
            </div>
          </div>

          {/* Savings Summary */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">Potential Savings</span>
            </div>
            <div className="text-3xl font-bold text-emerald-700">
              {formatCostRange(savingsRange)}
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600 mt-2">
              <TrendingDown className="h-4 w-4" />
              <span>{estimate.savingsPercentage}% cost reduction</span>
            </div>
          </div>
        </div>

        {/* Premium Impact Toggle */}
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <Label htmlFor="premium-impact-modal" className="text-sm font-semibold text-amber-800">
                Include 3-Year Premium Impact
              </Label>
              <p className="text-xs text-amber-600 mt-0.5">
                Add estimated workers' comp premium increases over 3 years to LTI cost
              </p>
            </div>
          </div>
          <Switch
            id="premium-impact-modal"
            checked={includePremiumImpact}
            onCheckedChange={onTogglePremiumImpact}
          />
        </div>

        {/* Visual Comparison */}
        <div className="mt-6 p-4 bg-muted/30 rounded-xl">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Visual Comparison
          </h3>
          <div className="space-y-3">
            <CostBar 
              value={estimate.ltiCost.total} 
              maxValue={estimate.ltiCost.total * 1.1} 
              label="Unmanaged Cost (LTI)"
              color="bg-red-500"
            />
            <CostBar 
              value={estimate.mtiCost.total} 
              maxValue={estimate.ltiCost.total * 1.1} 
              label="Managed Cost (MTI)"
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Detailed Breakdowns Side by Side */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* LTI Breakdown */}
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                LTI Cost Breakdown (Unmanaged)
              </h3>
              <p className="text-xs text-red-600 mt-1">Worker stays home, no suitable duties arranged</p>
            </div>
            <div className="p-4">
              <BreakdownRow 
                icon={Banknote} 
                label="Worker Compensation" 
                value={estimate.ltiCost.breakdown.compensation}
                subtext="Weekly payments to injured worker"
                calculation={`${estimate.ltiCost.durationWeeks} weeks × 95% of PIAWE (capped)`}
              />
              <BreakdownRow 
                icon={UserMinus} 
                label="Replacement Labour" 
                value={estimate.ltiCost.breakdown.replacementLabour}
                subtext="Labour hire to cover absent worker"
                calculation={`${estimate.ltiCost.durationWeeks} weeks × weekly replacement rate`}
              />
              <BreakdownRow 
                icon={Stethoscope} 
                label="Medical & Rehabilitation" 
                value={estimate.ltiCost.breakdown.medical}
                subtext="Treatment, physio, specialist visits"
              />
              <BreakdownRow 
                icon={Building2} 
                label="Indirect Costs" 
                value={estimate.ltiCost.indirectCosts}
                subtext="Admin, investigation, productivity loss, training"
                calculation="2× multiplier on direct costs (iceberg effect)"
              />
              {estimate.ltiCost.premiumImpact > 0 && (
                <BreakdownRow 
                  icon={TrendingUp} 
                  label="Premium Impact (3 Years)" 
                  value={estimate.ltiCost.premiumImpact}
                  subtext="Increased workers' comp premiums"
                  calculation={`Direct costs × ${estimate.inputFactors.state} premium multiplier`}
                />
              )}
              <Separator className="my-3" />
              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-red-800">Total LTI Cost</span>
                <span className="text-xl font-bold text-red-700">{formatCurrency(estimate.ltiCost.total)}</span>
              </div>
            </div>
          </div>

          {/* MTI Breakdown */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
              <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                MTI Cost Breakdown (Managed)
              </h3>
              <p className="text-xs text-emerald-600 mt-1">Worker on light duties, actively managed return-to-work</p>
            </div>
            <div className="p-4">
              <BreakdownRow 
                icon={TrendingDown} 
                label="Productivity Loss" 
                value={estimate.mtiCost.breakdown.productivityLoss || 0}
                subtext="Reduced output during light duties period"
                calculation={`${estimate.mtiCost.durationWeeks} weeks × 30% productivity loss × weekly wage`}
              />
              <BreakdownRow 
                icon={Stethoscope} 
                label="Medical Costs" 
                value={estimate.mtiCost.breakdown.medical}
                subtext="Less intensive treatment required"
              />
              <BreakdownRow 
                icon={ClipboardList} 
                label="Administration" 
                value={estimate.mtiCost.breakdown.administration || 0}
                subtext="RTW coordination, paperwork, case management"
              />
              <BreakdownRow 
                icon={Building2} 
                label="Indirect Costs" 
                value={estimate.mtiCost.indirectCosts}
                subtext="Lower multiplier due to maintained productivity"
                calculation="1.5× multiplier (vs 2× for LTI)"
              />
              <div className="py-3 px-3 bg-emerald-50 rounded-lg mt-2 mb-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">No premium impact - stays off claims record</span>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-emerald-800">Total MTI Cost</span>
                <span className="text-xl font-bold text-emerald-700">{formatCurrency(estimate.mtiCost.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Inputs */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-700">
            <Info className="h-4 w-4" />
            Calculation Inputs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Injury Type:</span>
              <p className="font-medium">{estimate.inputFactors.injuryType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Body Region:</span>
              <p className="font-medium">{estimate.inputFactors.bodyRegion}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Severity:</span>
              <p className="font-medium">{estimate.inputFactors.severity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Worker Role:</span>
              <p className="font-medium">{estimate.inputFactors.roleCategory}</p>
            </div>
            <div>
              <span className="text-muted-foreground">State/Scheme:</span>
              <p className="font-medium">{estimate.inputFactors.state}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data Source:</span>
              <p className="font-medium">{estimate.dataSource}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          <p>
            Estimates based on Safe Work Australia Key WHS Statistics 2024, state workers' compensation scheme data,
            and construction industry benchmarks. Actual costs may vary based on individual circumstances.
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
  onSeverityChange,
  onWorkerRoleChange,
  onStateChange,
  readOnly = false,
  compact = false
}: IncidentCostEstimateProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includePremiumImpact, setIncludePremiumImpact] = useState(false);
  const [resolvedBodyPartName, setResolvedBodyPartName] = useState<string | null>(bodyPartName || null);
  const [resolvedState, setResolvedState] = useState<string>(state || 'NSW');
  
  // Editable values - use internal state that syncs with props
  const [editableSeverity, setEditableSeverity] = useState<string>(severity || 'Moderate');
  const [editableWorkerRole, setEditableWorkerRole] = useState<string>(workerRole || 'Labourer');
  const [editableState, setEditableState] = useState<string>(state || 'NSW');
  
  // Sync editable values with props when they change
  useEffect(() => {
    if (severity) setEditableSeverity(severity);
  }, [severity]);
  
  useEffect(() => {
    if (workerRole) setEditableWorkerRole(workerRole);
  }, [workerRole]);
  
  useEffect(() => {
    if (state) setEditableState(state);
  }, [state]);
  
  // Handlers for editable fields
  const handleSeverityChange = (value: string) => {
    setEditableSeverity(value);
    onSeverityChange?.(value);
  };
  
  const handleWorkerRoleChange = (value: string) => {
    setEditableWorkerRole(value);
    onWorkerRoleChange?.(value);
  };
  
  const handleStateChange = (value: string) => {
    setEditableState(value);
    setResolvedState(value);
    onStateChange?.(value);
  };

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
  // Uses editable values which may differ from props when user edits them
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
          severity: (editableSeverity as Severity) || 'Moderate',
          state: editableState || resolvedState,
          roleCategory: editableWorkerRole || 'Labourer',
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
    editableSeverity, 
    editableState,
    resolvedState, 
    editableWorkerRole, 
    suitableDutiesAvailable, 
    includePremiumImpact,
    onCostUpdate
  ]);

  // Calculate ranges for display
  const ltiRange = useMemo(() => estimate ? toRange(estimate.ltiCost.total) : null, [estimate]);
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

        {/* Toggle for premium impact - ALWAYS enabled */}
        {!compact && (
          <TooltipProvider>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="premium-impact" className="text-sm text-muted-foreground cursor-pointer">
                  Include 3-year premium impact
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Adds estimated workers' compensation premium increases over 3 years to the LTI cost.
                      Relevant for mid-to-large employers where claims directly impact premiums.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="premium-impact"
                checked={includePremiumImpact}
                onCheckedChange={setIncludePremiumImpact}
              />
            </div>
          </TooltipProvider>
        )}

        {/* Detailed breakdown modal button */}
        {!compact && (
          <>
            <Separator />
            <CostBreakdownModal 
              estimate={estimate}
              includePremiumImpact={includePremiumImpact}
              onTogglePremiumImpact={setIncludePremiumImpact}
            />
          </>
        )}

        {/* Estimation Basis - Editable when not readOnly */}
        <div className={cn(
          "rounded-lg p-3 mt-2",
          readOnly ? "bg-slate-50 border border-slate-200" : "bg-blue-50 border border-blue-200"
        )}>
          <div className="flex items-start gap-2">
            {readOnly ? (
              <Info className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Pencil className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm w-full">
              <p className={cn(
                "font-medium mb-2",
                readOnly ? "text-slate-700" : "text-blue-700"
              )}>
                {readOnly ? "Estimate Based On:" : "Edit Estimation Inputs:"}
              </p>
              
              {readOnly ? (
                // Read-only display
                <ul className="text-slate-600 space-y-0.5 text-xs">
                  <li>• <strong>Injury:</strong> {estimate.inputFactors.injuryType} to {estimate.inputFactors.bodyRegion}</li>
                  <li>• <strong>Severity:</strong> {estimate.inputFactors.severity}</li>
                  <li>• <strong>Worker Type:</strong> {estimate.inputFactors.roleCategory}</li>
                  <li>• <strong>Jurisdiction:</strong> {estimate.inputFactors.state} workers compensation scheme</li>
                </ul>
              ) : (
                // Editable form
                <div className="space-y-3">
                  {/* Injury - read only, comes from form */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-20">Injury:</span>
                    <span className="text-slate-700">{estimate.inputFactors.injuryType} to {estimate.inputFactors.bodyRegion}</span>
                  </div>
                  
                  {/* Severity - editable */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500 w-20">Severity:</Label>
                    <Select value={editableSeverity} onValueChange={handleSeverityChange}>
                      <SelectTrigger className="h-8 text-xs flex-1 max-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Worker Type - editable */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500 w-20">Worker Type:</Label>
                    <Select value={editableWorkerRole} onValueChange={handleWorkerRoleChange}>
                      <SelectTrigger className="h-8 text-xs flex-1 max-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKER_ROLE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Jurisdiction - editable */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500 w-20">Jurisdiction:</Label>
                    <Select value={editableState} onValueChange={handleStateChange}>
                      <SelectTrigger className="h-8 text-xs flex-1 max-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <p className="text-blue-600 text-xs mt-2">
                    Changes update the cost estimate automatically
                  </p>
                </div>
              )}
              
              <p className="text-slate-500 mt-2 text-xs">
                <strong>Data source:</strong> {estimate.dataSource}. Updated November 2024.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

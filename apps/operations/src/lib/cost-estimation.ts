/**
 * Cost Estimation Library
 * 
 * Calculates the estimated cost of workplace incidents comparing:
 * - LTI (Lost Time Injury) - Unmanaged scenario: worker stays home
 * - MTI (Medical Treatment Injury) - Managed scenario: worker on light duties
 * 
 * Based on Safe Work Australia 2024 data and Australian workers' compensation schemes.
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface InjuryBenchmark {
  injury_type: string;
  body_region: string;
  median_weeks_lti: number;
  median_weeks_mti: number;
  medical_cost_lti: number;
  medical_cost_mti: number;
  severity_modifier_minor: number;
  severity_modifier_moderate: number;
  severity_modifier_severe: number;
  source: string;
}

export interface RoleCost {
  role_category: string;
  state: string;
  weekly_piawe: number;
  weekly_replacement: number;
}

export interface SchemeParams {
  state: string;
  weekly_comp_rate_first_13: number;
  weekly_comp_rate_after_13: number;
  max_weekly_compensation: number;
  indirect_multiplier_lti: number;
  indirect_multiplier_mti: number;
  premium_impact_multiplier: number;
  source: string;
}

export interface CostEstimationParams {
  injury_benchmark: InjuryBenchmark;
  role_cost: RoleCost;
  scheme_params: SchemeParams;
}

export interface CostBreakdown {
  compensation: number;
  replacementLabour: number;
  medical: number;
  productivityLoss?: number;
  administration?: number;
}

export interface ScenarioCost {
  directCosts: number;
  indirectCosts: number;
  premiumImpact: number;
  total: number;
  breakdown: CostBreakdown;
  durationWeeks: number;
}

export interface CostRange {
  low: number;
  mid: number;
  high: number;
}

export interface CostEstimate {
  ltiCost: ScenarioCost;
  mtiCost: ScenarioCost;
  potentialSavings: number;
  savingsPercentage: number;
  inputFactors: {
    injuryType: string;
    bodyRegion: string;
    severity: Severity;
    state: string;
    roleCategory: string;
    includePremiumImpact: boolean;
  };
  dataSource: string;
  calculatedAt: string;
}

export type Severity = 'Minor' | 'Moderate' | 'Severe';
export type SuitableDuties = 'Yes' | 'No' | 'Unsure';

export interface CostEstimationInput {
  injuryType: string;
  bodyRegion: string;
  severity: Severity;
  state?: string;
  roleCategory?: string;
  suitableDutiesAvailable?: SuitableDuties;
  includePremiumImpact?: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const PRODUCTIVITY_LOSS_RATE = 0.30; // 30% productivity loss on light duties
const ADMIN_COST = 1500; // Fixed admin/coordination cost for managed injuries
const RANGE_VARIANCE = 0.20; // ±20% for cost ranges

// Body part to region mapping for the benchmark lookup
const BODY_PART_TO_REGION: Record<string, string> = {
  // Head/Neck
  'Head': 'Head/Neck',
  'Neck': 'Head/Neck',
  
  // Upper Limb
  'Shoulder': 'Upper Limb',
  'Left Shoulder': 'Upper Limb',
  'Right Shoulder': 'Upper Limb',
  'Upper Arm': 'Upper Limb',
  'Left Upper Arm': 'Upper Limb',
  'Right Upper Arm': 'Upper Limb',
  'Forearm': 'Upper Limb',
  'Left Forearm': 'Upper Limb',
  'Right Forearm': 'Upper Limb',
  'Arm': 'Upper Limb',
  
  // Hand
  'Hand': 'Hand',
  'Left Hand': 'Hand',
  'Right Hand': 'Hand',
  
  // Back/Spine
  'Back': 'Back/Spine',
  'Upper Back': 'Back/Spine',
  'Lower Back': 'Back/Spine',
  
  // Lower Limb
  'Thigh': 'Lower Limb',
  'Left Thigh': 'Lower Limb',
  'Right Thigh': 'Lower Limb',
  'Knee': 'Lower Limb',
  'Left Knee': 'Lower Limb',
  'Right Knee': 'Lower Limb',
  'Shin': 'Lower Limb',
  'Left Shin': 'Lower Limb',
  'Right Shin': 'Lower Limb',
  'Calf': 'Lower Limb',
  'Left Calf': 'Lower Limb',
  'Right Calf': 'Lower Limb',
  'Leg': 'Lower Limb',
  'Ankle': 'Lower Limb',
  'Left Ankle': 'Lower Limb',
  'Right Ankle': 'Lower Limb',
  'Foot': 'Lower Limb',
  'Left Foot': 'Lower Limb',
  'Right Foot': 'Lower Limb',
  
  // Eye
  'Eye': 'Eye',
  
  // General/Other
  'Chest': 'General',
  'Abdomen': 'General',
  'Pelvis': 'General',
  'Groin': 'General',
  'Glutes': 'General',
  'Trunk': 'General',
};

// Map injury type names to benchmark values
const INJURY_TYPE_MAPPING: Record<string, string> = {
  'Fracture': 'Fracture',
  'Laceration': 'Laceration',
  'Cut': 'Laceration',
  'Sprain': 'Sprain',
  'Strain': 'Strain',
  'Muscle strain': 'Strain',
  'Contusion': 'Contusion',
  'Bruise': 'Contusion',
  'Burn': 'Burn',
  'Eye Injury': 'Eye Injury',
  'Foreign body in eye': 'Eye Injury',
  'Crushing': 'Crushing',
  'Crush injury': 'Crushing',
  'Dislocation': 'Dislocation',
  'Back Injury': 'Strain',
  'Soft tissue': 'Strain',
  'Musculoskeletal': 'Strain',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the severity modifier from the benchmark data
 */
function getSeverityModifier(severity: Severity, benchmark: InjuryBenchmark): number {
  switch (severity) {
    case 'Minor':
      return benchmark.severity_modifier_minor;
    case 'Moderate':
      return benchmark.severity_modifier_moderate;
    case 'Severe':
      return benchmark.severity_modifier_severe;
    default:
      return 1.0;
  }
}

/**
 * Map body part name to benchmark body region
 */
export function mapBodyPartToRegion(bodyPartName: string): string {
  if (!bodyPartName) return 'General';
  
  // Direct match
  const mapped = BODY_PART_TO_REGION[bodyPartName];
  if (mapped) return mapped;
  
  // Partial match (case-insensitive)
  const lowerName = bodyPartName.toLowerCase();
  for (const [part, region] of Object.entries(BODY_PART_TO_REGION)) {
    if (lowerName.includes(part.toLowerCase()) || part.toLowerCase().includes(lowerName)) {
      return region;
    }
  }
  
  return 'General';
}

/**
 * Map injury type name to benchmark injury type
 */
export function mapInjuryType(injuryTypeName: string): string {
  if (!injuryTypeName) return 'Strain'; // Default to most common
  
  // Direct match
  const mapped = INJURY_TYPE_MAPPING[injuryTypeName];
  if (mapped) return mapped;
  
  // Partial match (case-insensitive)
  const lowerName = injuryTypeName.toLowerCase();
  for (const [type, benchmark] of Object.entries(INJURY_TYPE_MAPPING)) {
    if (lowerName.includes(type.toLowerCase()) || type.toLowerCase().includes(lowerName)) {
      return benchmark;
    }
  }
  
  return 'Strain'; // Default
}

/**
 * Convert a single value to a range (±20%)
 */
export function toRange(value: number): CostRange {
  return {
    low: Math.round(value * (1 - RANGE_VARIANCE)),
    mid: Math.round(value),
    high: Math.round(value * (1 + RANGE_VARIANCE)),
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a cost range for display (e.g., "$61,000 – $91,000")
 */
export function formatCostRange(range: CostRange): string {
  return `${formatCurrency(range.low)} – ${formatCurrency(range.high)}`;
}

// =====================================================
// DATA FETCHING
// =====================================================

/**
 * Fetch cost estimation parameters from Supabase
 * Uses the RPC function for efficient single-call data retrieval
 */
export async function fetchCostEstimationParams(
  injuryType: string,
  bodyRegion: string,
  state: string = 'NSW',
  roleCategory: string = 'Labourer'
): Promise<CostEstimationParams | null> {
  try {
    const { data, error } = await supabase.rpc('get_cost_estimation_params', {
      p_injury_type: mapInjuryType(injuryType),
      p_body_region: mapBodyPartToRegion(bodyRegion),
      p_state: state,
      p_role_category: roleCategory,
    });

    if (error) {
      console.error('Error fetching cost estimation params:', error);
      return null;
    }

    return data as CostEstimationParams;
  } catch (err) {
    console.error('Exception fetching cost estimation params:', err);
    return null;
  }
}

/**
 * Fetch parameters directly from tables (fallback if RPC not available)
 */
export async function fetchCostEstimationParamsDirect(
  injuryType: string,
  bodyRegion: string,
  state: string = 'NSW',
  roleCategory: string = 'Labourer'
): Promise<CostEstimationParams | null> {
  try {
    const mappedInjuryType = mapInjuryType(injuryType);
    const mappedBodyRegion = mapBodyPartToRegion(bodyRegion);

    // Fetch injury benchmark
    let { data: injuryBenchmark } = await supabase
      .from('injury_benchmarks')
      .select('*')
      .eq('injury_type', mappedInjuryType)
      .eq('body_region', mappedBodyRegion)
      .single();

    // Fallback to General body region
    if (!injuryBenchmark) {
      const { data: generalBenchmark } = await supabase
        .from('injury_benchmarks')
        .select('*')
        .eq('injury_type', mappedInjuryType)
        .eq('body_region', 'General')
        .single();
      injuryBenchmark = generalBenchmark;
    }

    // Fetch role costs
    let { data: roleCost } = await supabase
      .from('role_costs')
      .select('*')
      .eq('role_category', roleCategory)
      .eq('state', state)
      .single();

    // Fallback to Labourer NSW
    if (!roleCost) {
      const { data: defaultRole } = await supabase
        .from('role_costs')
        .select('*')
        .eq('role_category', 'Labourer')
        .eq('state', 'NSW')
        .single();
      roleCost = defaultRole;
    }

    // Fetch scheme parameters
    let { data: schemeParams } = await supabase
      .from('scheme_parameters')
      .select('*')
      .eq('state', state)
      .single();

    // Fallback to NSW
    if (!schemeParams) {
      const { data: defaultScheme } = await supabase
        .from('scheme_parameters')
        .select('*')
        .eq('state', 'NSW')
        .single();
      schemeParams = defaultScheme;
    }

    if (!injuryBenchmark || !roleCost || !schemeParams) {
      console.warn('Missing cost estimation data, using defaults');
      return getDefaultParams(mappedInjuryType, mappedBodyRegion, state, roleCategory);
    }

    return {
      injury_benchmark: injuryBenchmark,
      role_cost: roleCost,
      scheme_params: schemeParams,
    };
  } catch (err) {
    console.error('Exception fetching cost estimation params directly:', err);
    return null;
  }
}

/**
 * Get default parameters when database data is unavailable
 */
function getDefaultParams(
  injuryType: string,
  bodyRegion: string,
  state: string,
  roleCategory: string
): CostEstimationParams {
  return {
    injury_benchmark: {
      injury_type: injuryType,
      body_region: bodyRegion,
      median_weeks_lti: 6.0,
      median_weeks_mti: 3.0,
      medical_cost_lti: 4000,
      medical_cost_mti: 2000,
      severity_modifier_minor: 0.6,
      severity_modifier_moderate: 1.0,
      severity_modifier_severe: 1.5,
      source: 'Default values',
    },
    role_cost: {
      role_category: roleCategory,
      state: state,
      weekly_piawe: 2000,
      weekly_replacement: 2100,
    },
    scheme_params: {
      state: state,
      weekly_comp_rate_first_13: 0.95,
      weekly_comp_rate_after_13: 0.80,
      max_weekly_compensation: 2523,
      indirect_multiplier_lti: 2.0,
      indirect_multiplier_mti: 1.5,
      premium_impact_multiplier: 1.5,
      source: 'Default values',
    },
  };
}

// =====================================================
// MAIN CALCULATION FUNCTION
// =====================================================

/**
 * Calculate the estimated cost of an incident
 * Compares LTI (unmanaged) vs MTI (managed) scenarios
 */
export async function estimateIncidentCost(input: CostEstimationInput): Promise<CostEstimate | null> {
  const {
    injuryType,
    bodyRegion,
    severity,
    state = 'NSW',
    roleCategory = 'Labourer',
    includePremiumImpact = false,
  } = input;

  // Fetch benchmark data
  let params = await fetchCostEstimationParams(injuryType, bodyRegion, state, roleCategory);
  
  // Fallback to direct fetch if RPC fails
  if (!params) {
    params = await fetchCostEstimationParamsDirect(injuryType, bodyRegion, state, roleCategory);
  }

  // Use defaults if still no data
  if (!params) {
    params = getDefaultParams(
      mapInjuryType(injuryType),
      mapBodyPartToRegion(bodyRegion),
      state,
      roleCategory
    );
  }

  const { injury_benchmark, role_cost, scheme_params } = params;

  // Calculate severity modifier
  const severityModifier = getSeverityModifier(severity, injury_benchmark);

  // =====================================================
  // LTI SCENARIO (Unmanaged - worker stays home)
  // =====================================================
  const ltiDurationWeeks = injury_benchmark.median_weeks_lti * severityModifier;

  // Weekly compensation (capped at scheme maximum)
  const weeklyCompensation = Math.min(
    role_cost.weekly_piawe * scheme_params.weekly_comp_rate_first_13,
    scheme_params.max_weekly_compensation
  );

  const ltiCompensation = weeklyCompensation * ltiDurationWeeks;
  const ltiReplacementLabour = role_cost.weekly_replacement * ltiDurationWeeks;
  const ltiMedical = injury_benchmark.medical_cost_lti;

  const ltiDirectCosts = ltiCompensation + ltiReplacementLabour + ltiMedical;
  const ltiIndirectCosts = ltiDirectCosts * (scheme_params.indirect_multiplier_lti - 1);

  let ltiPremiumImpact = 0;
  if (includePremiumImpact) {
    ltiPremiumImpact = ltiDirectCosts * scheme_params.premium_impact_multiplier;
  }

  const ltiTotal = ltiDirectCosts + ltiIndirectCosts + ltiPremiumImpact;

  // =====================================================
  // MTI SCENARIO (Managed - worker on light duties)
  // =====================================================
  const mtiDurationWeeks = injury_benchmark.median_weeks_mti * severityModifier;

  const mtiProductivityLoss = role_cost.weekly_piawe * PRODUCTIVITY_LOSS_RATE * mtiDurationWeeks;
  const mtiMedical = injury_benchmark.medical_cost_mti;
  const mtiAdmin = ADMIN_COST;

  const mtiDirectCosts = mtiProductivityLoss + mtiMedical + mtiAdmin;
  const mtiIndirectCosts = mtiDirectCosts * (scheme_params.indirect_multiplier_mti - 1);
  const mtiTotal = mtiDirectCosts + mtiIndirectCosts;

  // =====================================================
  // CALCULATE SAVINGS
  // =====================================================
  const potentialSavings = ltiTotal - mtiTotal;
  const savingsPercentage = ltiTotal > 0 ? Math.round((potentialSavings / ltiTotal) * 100) : 0;

  // =====================================================
  // BUILD RESULT
  // =====================================================
  return {
    ltiCost: {
      directCosts: Math.round(ltiDirectCosts),
      indirectCosts: Math.round(ltiIndirectCosts),
      premiumImpact: Math.round(ltiPremiumImpact),
      total: Math.round(ltiTotal),
      breakdown: {
        compensation: Math.round(ltiCompensation),
        replacementLabour: Math.round(ltiReplacementLabour),
        medical: Math.round(ltiMedical),
      },
      durationWeeks: Math.round(ltiDurationWeeks * 10) / 10,
    },
    mtiCost: {
      directCosts: Math.round(mtiDirectCosts),
      indirectCosts: Math.round(mtiIndirectCosts),
      premiumImpact: 0,
      total: Math.round(mtiTotal),
      breakdown: {
        productivityLoss: Math.round(mtiProductivityLoss),
        medical: Math.round(mtiMedical),
        administration: Math.round(mtiAdmin),
        compensation: 0,
        replacementLabour: 0,
      },
      durationWeeks: Math.round(mtiDurationWeeks * 10) / 10,
    },
    potentialSavings: Math.round(potentialSavings),
    savingsPercentage,
    inputFactors: {
      injuryType: injury_benchmark.injury_type,
      bodyRegion: injury_benchmark.body_region,
      severity,
      state: scheme_params.state,
      roleCategory: role_cost.role_category,
      includePremiumImpact,
    },
    dataSource: injury_benchmark.source,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Quick estimate without database lookup (uses default values)
 * Useful for real-time form previews
 */
export function estimateIncidentCostSync(input: CostEstimationInput): CostEstimate {
  const {
    injuryType,
    bodyRegion,
    severity,
    state = 'NSW',
    roleCategory = 'Labourer',
    includePremiumImpact = false,
  } = input;

  const params = getDefaultParams(
    mapInjuryType(injuryType),
    mapBodyPartToRegion(bodyRegion),
    state,
    roleCategory
  );

  const { injury_benchmark, role_cost, scheme_params } = params;
  const severityModifier = getSeverityModifier(severity, injury_benchmark);

  // LTI calculation
  const ltiDurationWeeks = injury_benchmark.median_weeks_lti * severityModifier;
  const weeklyCompensation = Math.min(
    role_cost.weekly_piawe * scheme_params.weekly_comp_rate_first_13,
    scheme_params.max_weekly_compensation
  );
  const ltiCompensation = weeklyCompensation * ltiDurationWeeks;
  const ltiReplacementLabour = role_cost.weekly_replacement * ltiDurationWeeks;
  const ltiMedical = injury_benchmark.medical_cost_lti;
  const ltiDirectCosts = ltiCompensation + ltiReplacementLabour + ltiMedical;
  const ltiIndirectCosts = ltiDirectCosts * (scheme_params.indirect_multiplier_lti - 1);
  let ltiPremiumImpact = includePremiumImpact ? ltiDirectCosts * scheme_params.premium_impact_multiplier : 0;
  const ltiTotal = ltiDirectCosts + ltiIndirectCosts + ltiPremiumImpact;

  // MTI calculation
  const mtiDurationWeeks = injury_benchmark.median_weeks_mti * severityModifier;
  const mtiProductivityLoss = role_cost.weekly_piawe * PRODUCTIVITY_LOSS_RATE * mtiDurationWeeks;
  const mtiMedical = injury_benchmark.medical_cost_mti;
  const mtiAdmin = ADMIN_COST;
  const mtiDirectCosts = mtiProductivityLoss + mtiMedical + mtiAdmin;
  const mtiIndirectCosts = mtiDirectCosts * (scheme_params.indirect_multiplier_mti - 1);
  const mtiTotal = mtiDirectCosts + mtiIndirectCosts;

  const potentialSavings = ltiTotal - mtiTotal;
  const savingsPercentage = ltiTotal > 0 ? Math.round((potentialSavings / ltiTotal) * 100) : 0;

  return {
    ltiCost: {
      directCosts: Math.round(ltiDirectCosts),
      indirectCosts: Math.round(ltiIndirectCosts),
      premiumImpact: Math.round(ltiPremiumImpact),
      total: Math.round(ltiTotal),
      breakdown: {
        compensation: Math.round(ltiCompensation),
        replacementLabour: Math.round(ltiReplacementLabour),
        medical: Math.round(ltiMedical),
      },
      durationWeeks: Math.round(ltiDurationWeeks * 10) / 10,
    },
    mtiCost: {
      directCosts: Math.round(mtiDirectCosts),
      indirectCosts: Math.round(mtiIndirectCosts),
      premiumImpact: 0,
      total: Math.round(mtiTotal),
      breakdown: {
        productivityLoss: Math.round(mtiProductivityLoss),
        medical: Math.round(mtiMedical),
        administration: Math.round(mtiAdmin),
        compensation: 0,
        replacementLabour: 0,
      },
      durationWeeks: Math.round(mtiDurationWeeks * 10) / 10,
    },
    potentialSavings: Math.round(potentialSavings),
    savingsPercentage,
    inputFactors: {
      injuryType: injury_benchmark.injury_type,
      bodyRegion: injury_benchmark.body_region,
      severity,
      state: scheme_params.state,
      roleCategory: role_cost.role_category,
      includePremiumImpact,
    },
    dataSource: 'Default estimates',
    calculatedAt: new Date().toISOString(),
  };
}


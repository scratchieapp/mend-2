# Incident Cost Estimator — Implementation Guide

> **Purpose:** This document specifies how to build an injury cost estimation feature that compares LTI (Lost Time Injury) vs MTI (Medical Treatment Injury) scenarios, showing potential savings when injuries are actively managed.

---

## 1. Core Concept

When a workplace injury occurs, the business outcome depends heavily on **how it's managed**:

| Scenario | Definition | Typical Cost |
|----------|------------|--------------|
| **LTI (Unmanaged)** | Worker stays home, no suitable duties arranged | High — wages + replacement + premium impact |
| **MTI (Managed)** | Worker does light duties, training, or modified work | Low — productivity loss only, no replacement |

**The value proposition:** Show users the cost delta between these scenarios instantly when logging an incident.

---

## 2. Data Model

### 2.1 Benchmark Tables (Supabase)

#### `injury_benchmarks`

Stores median durations and medical costs by injury type and body region.

```sql
CREATE TABLE injury_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_type TEXT NOT NULL,           -- 'Fracture', 'Laceration', 'Sprain', 'Contusion', 'Burn', 'Eye Injury'
  body_region TEXT NOT NULL,           -- 'Upper Limb', 'Lower Limb', 'Back/Spine', 'Head/Neck', 'Hand', 'Eye', 'General'
  median_weeks_lti DECIMAL(4,1) NOT NULL,      -- Median weeks off work if LTI
  median_weeks_mti DECIMAL(4,1) NOT NULL,      -- Median weeks on light duties if MTI
  medical_cost_lti DECIMAL(10,2) NOT NULL,     -- Typical medical costs for LTI
  medical_cost_mti DECIMAL(10,2) NOT NULL,     -- Typical medical costs for MTI (less intensive)
  severity_modifier_minor DECIMAL(3,2) DEFAULT 0.6,   -- Multiply duration by this for minor severity
  severity_modifier_moderate DECIMAL(3,2) DEFAULT 1.0,
  severity_modifier_severe DECIMAL(3,2) DEFAULT 1.5,
  source TEXT,                         -- 'Safe Work Australia 2024'
  last_updated DATE NOT NULL,
  UNIQUE(injury_type, body_region)
);
```

**Seed data:**

| injury_type | body_region | median_weeks_lti | median_weeks_mti | medical_cost_lti | medical_cost_mti |
|-------------|-------------|------------------|------------------|------------------|------------------|
| Fracture | Upper Limb | 8.0 | 4.0 | 5500 | 3000 |
| Fracture | Lower Limb | 10.0 | 6.0 | 6500 | 4000 |
| Fracture | Back/Spine | 14.0 | 8.0 | 12000 | 6000 |
| Fracture | Hand | 6.0 | 3.0 | 4500 | 2500 |
| Laceration | Hand | 4.0 | 1.0 | 2500 | 800 |
| Laceration | Upper Limb | 3.0 | 1.0 | 2000 | 600 |
| Laceration | Eye | 3.0 | 1.0 | 4000 | 1500 |
| Laceration | General | 3.5 | 1.0 | 2200 | 700 |
| Sprain | Back/Spine | 8.0 | 4.0 | 4000 | 2000 |
| Sprain | Shoulder | 7.0 | 3.0 | 3500 | 1800 |
| Sprain | Lower Limb | 6.0 | 3.0 | 3000 | 1500 |
| Sprain | General | 5.0 | 2.5 | 2500 | 1200 |
| Contusion | General | 3.0 | 1.0 | 1500 | 500 |
| Contusion | Back/Spine | 4.0 | 1.5 | 2000 | 800 |
| Burn | Hand | 4.0 | 2.0 | 3500 | 1500 |
| Burn | Upper Limb | 5.0 | 2.5 | 4500 | 2000 |
| Burn | General | 4.0 | 2.0 | 3000 | 1200 |
| Eye Injury | Eye | 2.0 | 0.5 | 3500 | 1000 |

#### `role_costs`

Stores weekly wage and replacement costs by worker role and state.

```sql
CREATE TABLE role_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_category TEXT NOT NULL,         -- 'Labourer', 'Tradesperson', 'Supervisor', 'Operator'
  state TEXT NOT NULL,                 -- 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'
  weekly_piawe DECIMAL(10,2) NOT NULL, -- Pre-Injury Average Weekly Earnings (typical)
  weekly_replacement DECIMAL(10,2) NOT NULL, -- Fully-loaded labour hire cost
  last_updated DATE NOT NULL,
  UNIQUE(role_category, state)
);
```

**Seed data:**

| role_category | state | weekly_piawe | weekly_replacement |
|---------------|-------|--------------|-------------------|
| Labourer | NSW | 2000 | 2100 |
| Labourer | VIC | 2000 | 2200 |
| Labourer | QLD | 1900 | 2000 |
| Tradesperson | NSW | 2400 | 4200 |
| Tradesperson | VIC | 2400 | 4400 |
| Tradesperson | QLD | 2300 | 4000 |
| Supervisor | NSW | 2800 | 3500 |
| Supervisor | VIC | 2800 | 3600 |
| Operator | NSW | 2200 | 3200 |
| Operator | VIC | 2200 | 3300 |

#### `scheme_parameters`

Stores workers' compensation scheme parameters by state.

```sql
CREATE TABLE scheme_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT PRIMARY KEY,
  weekly_comp_rate_first_13 DECIMAL(4,2) DEFAULT 0.95,  -- 95% of PIAWE
  weekly_comp_rate_after_13 DECIMAL(4,2) DEFAULT 0.80,  -- 80% of PIAWE
  max_weekly_compensation DECIMAL(10,2) NOT NULL,       -- Cap
  indirect_multiplier_lti DECIMAL(3,1) DEFAULT 2.0,     -- Apply to direct costs
  indirect_multiplier_mti DECIMAL(3,1) DEFAULT 1.5,
  premium_impact_multiplier DECIMAL(3,1) DEFAULT 1.5,   -- 3-year premium impact factor
  last_updated DATE NOT NULL
);
```

**Seed data:**

| state | max_weekly_compensation | indirect_multiplier_lti | indirect_multiplier_mti | premium_impact_multiplier |
|-------|------------------------|------------------------|------------------------|--------------------------|
| NSW | 2523 | 2.0 | 1.5 | 1.8 |
| VIC | 2800 | 2.0 | 1.5 | 1.6 |
| QLD | 2700 | 2.0 | 1.5 | 1.5 |
| WA | 2600 | 2.0 | 1.5 | 1.5 |
| SA | 2500 | 2.0 | 1.5 | 1.5 |

---

## 3. Required Incident Fields

The incident form must capture these fields to enable cost estimation:

### Already Captured (verify these exist)

| Field | Type | Values |
|-------|------|--------|
| `state` | Enum | NSW, VIC, QLD, WA, SA, TAS, NT, ACT |
| `injury_type` | Enum | Fracture, Laceration, Sprain, Contusion, Burn, Eye Injury |
| `body_region` | Enum | Upper Limb, Lower Limb, Back/Spine, Head/Neck, Hand, Eye, General |
| `severity` | Enum | Minor, Moderate, Severe |
| `worker_role` | Enum | Labourer, Tradesperson, Supervisor, Operator |

### New Field Required

| Field | Type | Values | Purpose |
|-------|------|--------|---------|
| `suitable_duties_available` | Enum | Yes, No, Unsure | Determines if MTI scenario is viable |

---

## 4. Calculation Logic

### 4.1 Core Estimation Function

```typescript
interface CostEstimate {
  ltiCost: {
    directCosts: number;
    indirectCosts: number;
    premiumImpact: number;
    total: number;
    breakdown: {
      compensation: number;
      replacementLabour: number;
      medical: number;
    };
    durationWeeks: number;
  };
  mtiCost: {
    directCosts: number;
    indirectCosts: number;
    total: number;
    breakdown: {
      productivityLoss: number;
      medical: number;
      administration: number;
    };
    durationWeeks: number;
  };
  potentialSavings: number;
  savingsPercentage: number;
}

interface IncidentInput {
  state: string;
  injuryType: string;
  bodyRegion: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  workerRole: string;
  suitableDutiesAvailable: 'Yes' | 'No' | 'Unsure';
  includePremiumImpact?: boolean; // Optional toggle for larger employers
}

async function estimateIncidentCost(input: IncidentInput): Promise<CostEstimate> {
  // 1. Fetch benchmarks
  const injuryBenchmark = await fetchInjuryBenchmark(input.injuryType, input.bodyRegion);
  const roleCost = await fetchRoleCost(input.workerRole, input.state);
  const scheme = await fetchSchemeParameters(input.state);

  // 2. Calculate severity modifier
  const severityModifier = getSeverityModifier(input.severity, injuryBenchmark);

  // 3. Calculate LTI scenario
  const ltiDurationWeeks = injuryBenchmark.median_weeks_lti * severityModifier;
  
  const weeklyCompensation = Math.min(
    roleCost.weekly_piawe * scheme.weekly_comp_rate_first_13,
    scheme.max_weekly_compensation
  );
  
  const ltiCompensation = weeklyCompensation * ltiDurationWeeks;
  const ltiReplacementLabour = roleCost.weekly_replacement * ltiDurationWeeks;
  const ltiMedical = injuryBenchmark.medical_cost_lti;
  
  const ltiDirectCosts = ltiCompensation + ltiReplacementLabour + ltiMedical;
  const ltiIndirectCosts = ltiDirectCosts * (scheme.indirect_multiplier_lti - 1);
  
  let ltiPremiumImpact = 0;
  if (input.includePremiumImpact) {
    ltiPremiumImpact = ltiDirectCosts * scheme.premium_impact_multiplier;
  }
  
  const ltiTotal = ltiDirectCosts + ltiIndirectCosts + ltiPremiumImpact;

  // 4. Calculate MTI scenario
  const mtiDurationWeeks = injuryBenchmark.median_weeks_mti * severityModifier;
  const PRODUCTIVITY_LOSS_RATE = 0.30; // 30% productivity loss on light duties
  const ADMIN_COST = 1500; // Fixed admin/coordination cost
  
  const mtiProductivityLoss = roleCost.weekly_piawe * PRODUCTIVITY_LOSS_RATE * mtiDurationWeeks;
  const mtiMedical = injuryBenchmark.medical_cost_mti;
  const mtiAdmin = ADMIN_COST;
  
  const mtiDirectCosts = mtiProductivityLoss + mtiMedical + mtiAdmin;
  const mtiIndirectCosts = mtiDirectCosts * (scheme.indirect_multiplier_mti - 1);
  const mtiTotal = mtiDirectCosts + mtiIndirectCosts;

  // 5. Calculate savings
  const potentialSavings = ltiTotal - mtiTotal;
  const savingsPercentage = Math.round((potentialSavings / ltiTotal) * 100);

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
      total: Math.round(mtiTotal),
      breakdown: {
        productivityLoss: Math.round(mtiProductivityLoss),
        medical: Math.round(mtiMedical),
        administration: Math.round(mtiAdmin),
      },
      durationWeeks: Math.round(mtiDurationWeeks * 10) / 10,
    },
    potentialSavings: Math.round(potentialSavings),
    savingsPercentage,
  };
}

function getSeverityModifier(
  severity: 'Minor' | 'Moderate' | 'Severe',
  benchmark: InjuryBenchmark
): number {
  switch (severity) {
    case 'Minor': return benchmark.severity_modifier_minor;
    case 'Moderate': return benchmark.severity_modifier_moderate;
    case 'Severe': return benchmark.severity_modifier_severe;
    default: return 1.0;
  }
}
```

### 4.2 Range Calculation

To show a range (low–high) instead of a single figure, apply ±20% to the estimates:

```typescript
interface CostRange {
  low: number;
  mid: number;
  high: number;
}

function toRange(value: number): CostRange {
  return {
    low: Math.round(value * 0.8),
    mid: Math.round(value),
    high: Math.round(value * 1.2),
  };
}

// Usage: Display as "$61,000 – $91,000" with midpoint $76,000
```

---

## 5. UI Component Specification

### 5.1 Cost Estimate Card

Display immediately after incident is logged (or in real-time as fields are filled).

```
┌─────────────────────────────────────────────────────────────┐
│  💰 COST IMPACT ESTIMATE                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  If Unmanaged (LTI)              If Managed (MTI)          │
│  ─────────────────               ────────────────          │
│  $76,000 – $114,000              $13,650                   │
│                                                             │
│  • 8 weeks off work              • 6 weeks light duties    │
│  • Replacement: $16,800          • Productivity loss: $3,600│
│  • Compensation: $15,200         • Medical: $4,000         │
│  • Medical: $6,000               • Admin: $1,500           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ POTENTIAL SAVINGS: $62,000 – $100,000                   │
│     by managing this as an MTI                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Based on: Fracture (Lower Limb), Moderate severity,        │
│  Labourer role, NSW scheme. Safe Work Australia 2024 data.  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Visual Comparison (Optional Enhancement)

A horizontal bar chart showing LTI vs MTI makes the delta visually obvious:

```
LTI Cost ████████████████████████████████████░░░░░░ $76,000
MTI Cost █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $13,650
         ─────────────────────────────────────────────────
         0       $20K      $40K      $60K      $80K    $100K
```

### 5.3 Toggle Options

| Toggle | Default | Purpose |
|--------|---------|---------|
| Include 3-year premium impact | OFF | Adds premium loading for large employers |
| Show detailed breakdown | OFF | Expands to show line-item costs |

---

## 6. Edge Cases

### 6.1 When `suitable_duties_available` = "No"

MTI scenario is not viable. Display:

```
⚠️ Without suitable duties, this injury will likely become an LTI.
   Estimated cost: $76,000 – $114,000
   
   Consider: Can any light duties be created? Training courses? 
   Administrative tasks? Even 1 hour/day prevents LTI classification.
```

### 6.2 When `suitable_duties_available` = "Unsure"

Show both scenarios but flag the uncertainty:

```
If suitable duties CAN be arranged: Save $62,000 – $100,000
If suitable duties CANNOT be arranged: Full LTI cost applies

→ Recommend discussing with supervisor and treating doctor.
```

### 6.3 Missing Benchmark Data

If no exact match for `injury_type` + `body_region`, fall back to:
1. Same `injury_type` with `body_region` = 'General'
2. If still missing, use conservative defaults: 6 weeks LTI, 3 weeks MTI, $4,000 medical

---

## 7. Data Refresh Strategy

### Annual Update Process (Q4 each year)

1. Download Safe Work Australia "Key Work Health and Safety Statistics" (released ~October)
2. Update `injury_benchmarks` with new median durations
3. Check icare/WorkSafe rate schedules for max weekly compensation changes
4. Update `scheme_parameters` with new caps
5. Review labour hire market rates and update `role_costs`

### Version Tracking

Add to each table:
```sql
data_version TEXT DEFAULT '2024.1',
source_url TEXT,
last_updated DATE
```

Display in UI footer: "Based on Safe Work Australia 2024 data. Last updated: October 2024."

---

## 8. Testing Scenarios

Use these to validate calculations:

| Scenario | Expected LTI Cost | Expected MTI Cost | Expected Savings |
|----------|-------------------|-------------------|------------------|
| Fracture, Lower Limb, Moderate, Labourer, NSW | ~$76,000 | ~$13,650 | ~$62,000 |
| Laceration, Hand, Minor, Tradesperson, VIC | ~$28,000 | ~$5,000 | ~$23,000 |
| Sprain, Back, Severe, Supervisor, NSW | ~$95,000 | ~$18,000 | ~$77,000 |
| Contusion, General, Minor, Labourer, QLD | ~$12,000 | ~$3,500 | ~$8,500 |

---

## 9. Future Enhancements (Post-MVP)

1. **Historical comparison:** Show actual vs estimated costs once claim closes
2. **Company benchmarking:** Compare client's injury costs to industry average
3. **Cumulative dashboard:** Total savings across all managed incidents YTD
4. **PDF export:** Generate cost estimate report for management

---

## 10. Key Files to Create/Modify

| File | Purpose |
|------|---------|
| `lib/cost-estimation.ts` | Core calculation functions |
| `components/IncidentCostEstimate.tsx` | Display component |
| `supabase/migrations/xxx_add_cost_benchmarks.sql` | Database tables |
| `supabase/seed/cost_benchmarks.sql` | Initial benchmark data |

---

## Appendix: Data Sources

- **Injury durations & costs:** Safe Work Australia, Key Work Health and Safety Statistics 2024
- **Workers' comp rates:** icare NSW Premium Rates 2024-25, WorkSafe Victoria Gazette 2024
- **Labour hire costs:** Industry benchmarks (LocalWorkforceHire, recruitment agency rates)
- **Indirect cost multipliers:** Stanford/OSHA research, Australian university studies

*Document version: 1.0 | Created: November 2024*

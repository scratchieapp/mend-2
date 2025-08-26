# APPLY COST ESTIMATION MIGRATION - CRITICAL

## Overview
This migration implements a comprehensive incident cost estimation system that will:
- Add cost estimation columns to the incidents table
- Create configurable cost assumptions
- Calculate costs based on incident factors (type, days lost, body part)
- Allow manual overrides
- Track calculation history

## Migration File
**File**: `/supabase/migrations/20250828000005_incident_cost_estimation_system.sql`

## HOW TO APPLY THIS MIGRATION

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the ENTIRE contents of the migration file
4. Paste and run in SQL Editor
5. Verify success

### Option 2: Supabase CLI (if local DB is running)
```bash
npx supabase db push
```

### Option 3: Direct Database Connection
```bash
psql <your-connection-string> -f supabase/migrations/20250828000005_incident_cost_estimation_system.sql
```

## WHAT THIS MIGRATION DOES

### 1. Adds Cost Columns to Incidents Table
- `estimated_cost`: Automatically calculated cost
- `cost_override`: Manual override value
- `cost_calculation_method`: Track if cost is automatic or manual
- `cost_last_calculated_at`: When cost was last calculated
- `psychosocial_factors`: JSON data for psychological impacts
- `indirect_costs`: Breakdown of indirect costs

### 2. Creates Cost Assumptions Table
Configurable cost factors including:
- **Incident Type Costs**: FAT ($2.5M), LTI ($85K), MTI ($15K), FAI ($2.5K), etc.
- **Daily Costs**: Lost time ($1,500/day), restricted duty ($750/day)
- **Body Part Multipliers**: Head (2.5x), Back (2.0x), etc.
- **Indirect Cost Percentages**: Admin (15%), Investigation (10%), etc.
- **Psychosocial Costs**: Witness trauma, team counseling

### 3. Creates Calculation Functions
- `calculate_incident_cost()`: Calculates cost for a single incident
- `recalculate_all_incident_costs()`: Batch recalculation
- Auto-recalculation trigger on relevant field changes

### 4. Creates Audit Table
- `incident_cost_calculations`: Tracks all cost calculations with breakdowns

### 5. Creates Analysis View
- `incident_cost_analysis`: Comprehensive view with cost breakdowns

### 6. Populates Initial Data
- Pre-configured cost assumptions based on Safe Work Australia research
- Calculates costs for all existing incidents

## FEATURES ENABLED AFTER MIGRATION

### For Super Admins
- **Cost Configuration Page** (`/admin/cost-configuration`)
  - View and edit cost assumptions
  - See total cost across all incidents
  - Recalculate all incident costs
  - View cost breakdowns by category

### For All Users
- **Incident Details Page**
  - See estimated cost with breakdown
  - View indirect costs and multipliers
  - Understand cost drivers

### For Incident Editors
- **Cost Override Capability**
  - Manually override calculated costs
  - Add notes for overrides
  - Track who made changes

## VERIFICATION STEPS

After applying the migration, verify:

1. **Check Tables Created**:
```sql
SELECT * FROM cost_assumptions LIMIT 5;
SELECT * FROM incident_cost_calculations LIMIT 5;
```

2. **Check Columns Added**:
```sql
SELECT 
  incident_id, 
  estimated_cost, 
  cost_override, 
  cost_calculation_method 
FROM incidents 
LIMIT 5;
```

3. **Test Calculation Function**:
```sql
SELECT calculate_incident_cost(1);  -- Replace 1 with valid incident_id
```

4. **Check View**:
```sql
SELECT * FROM incident_cost_analysis LIMIT 5;
```

## POST-MIGRATION STEPS

1. **Access Cost Configuration**:
   - Login as Super Admin (role1@scratchie.com)
   - Navigate to Admin Dashboard
   - Click "Cost Configuration"
   - Review and adjust cost assumptions as needed

2. **Review Calculated Costs**:
   - Check that incidents have estimated costs
   - Verify calculations look reasonable
   - Test manual override functionality

3. **Monitor Performance**:
   - The trigger will auto-calculate costs for new/updated incidents
   - Batch recalculation available for bulk updates

## ROLLBACK (IF NEEDED)

If you need to rollback:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS auto_recalculate_incident_cost ON public.incidents;

-- Remove functions
DROP FUNCTION IF EXISTS calculate_incident_cost(INTEGER);
DROP FUNCTION IF EXISTS recalculate_all_incident_costs();
DROP FUNCTION IF EXISTS trigger_recalculate_incident_cost();

-- Remove views
DROP VIEW IF EXISTS public.incident_cost_analysis;

-- Remove tables
DROP TABLE IF EXISTS public.incident_cost_calculations;
DROP TABLE IF EXISTS public.cost_assumptions;

-- Remove columns from incidents
ALTER TABLE public.incidents 
DROP COLUMN IF EXISTS estimated_cost,
DROP COLUMN IF EXISTS cost_override,
DROP COLUMN IF EXISTS cost_calculation_method,
DROP COLUMN IF EXISTS cost_last_calculated_at,
DROP COLUMN IF EXISTS psychosocial_factors,
DROP COLUMN IF EXISTS indirect_costs;
```

## SUPPORT

If you encounter issues:
1. Check the Supabase logs for errors
2. Verify all previous migrations were applied successfully
3. Ensure you have appropriate permissions
4. Test with a single incident first

## BUSINESS VALUE

This system will:
- **Quantify incident impacts**: Show real financial costs
- **Support decision making**: Prioritize safety investments
- **Track trends**: Monitor cost reduction over time
- **Justify safety programs**: ROI calculations for safety initiatives
- **Compliance reporting**: Cost data for regulatory requirements

## TECHNICAL NOTES

- Costs are in AUD (Australian Dollars)
- Based on Safe Work Australia 2024 research
- Automatically recalculates when key fields change
- Manual overrides preserved during recalculation
- Audit trail maintained for all calculations

---

**STATUS**: READY TO DEPLOY
**Priority**: HIGH - Enables critical cost tracking functionality
**Risk**: LOW - Non-breaking changes with rollback available
**Impact**: Adds powerful cost estimation capabilities to platform
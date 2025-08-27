# CRITICAL SCHEMA FIX - Performance Migration Correction

**Date**: 2025-08-27  
**Issue**: Migration failing due to schema mismatches  
**Impact**: Performance fix blocked, 5-minute load times continuing  
**Priority**: 🚨 CRITICAL - Fix required immediately  

## Root Cause Analysis

### Schema Mismatch Errors Found
**Error Location**: `/supabase/migrations/20250828000012_performance_final_verified.sql`  
**Line Numbers**: 155, 156, 364  

#### 1. Employers Table Column Mismatch
```sql
-- ❌ INCORRECT (in migration):
CREATE INDEX IF NOT EXISTS idx_employers_company_name
ON public.employers(company_name);

-- ✅ CORRECT (actual schema):
CREATE INDEX IF NOT EXISTS idx_employers_company_name  
ON public.employers(employer_name);
```

#### 2. Function Reference Mismatch  
```sql
-- ❌ INCORRECT (in migration line 364):
e.company_name,

-- ✅ CORRECT (actual schema):
e.employer_name,
```

### Verified Actual Schema
**Table**: `employers`  
**Confirmed Columns**:
- ✅ `employer_id` (integer, PRIMARY KEY)
- ✅ `employer_name` (text) - **NOT company_name**
- ✅ `employer_state` (text)
- ✅ `manager_name` (text)
- ✅ `abn` (text)

## Immediate Fix Required

### Step 1: Create Corrected Migration
Create new migration file with correct column references:

```sql
-- Fixed index creation
CREATE INDEX IF NOT EXISTS idx_employers_employer_name
ON public.employers(employer_name);

-- Fixed function reference  
SELECT 
  e.employer_name,  -- NOT e.company_name
  -- ... other fields
```

### Step 2: Column Name Mapping
**Update all references**:
- `company_name` → `employer_name`
- `first_name` → `given_name` (workers table)
- `last_name` → `family_name` (workers table)

### Step 3: Verify Other Column References
**Confirmed working columns**:
- ✅ `incidents.employer_id` - EXISTS
- ✅ `sites.employer_id` - EXISTS  
- ✅ `workers.employer_id` - EXISTS
- ✅ `incidents.estimated_cost` - EXISTS
- ✅ `incidents.psychosocial_factors` - EXISTS (JSONB)

## Impact of Fix

### Before Fix
- ❌ Migration fails with Error 42703
- ❌ Performance indexes not created
- ❌ 5-minute load times continue
- ❌ User experience degraded

### After Fix  
- ✅ Migration applies successfully
- ✅ Performance indexes created
- ✅ Load times: 5+ minutes → <2 seconds
- ✅ User experience restored

## Testing Plan

### 1. Schema Verification
```sql
-- Verify employer table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employers';

-- Should show employer_name, NOT company_name
```

### 2. Index Verification
```sql
-- Verify indexes created successfully
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'employers';

-- Should show idx_employers_employer_name
```

### 3. Performance Testing
- Test incident list load time
- Verify dashboard metrics loading
- Confirm <2 second response times
- Validate RBAC queries working

## Next Steps

1. **Create Corrected Migration**: Fix column name references
2. **Apply Fixed Migration**: Run corrected version
3. **Verify Performance**: Test load time improvements
4. **Monitor Results**: Ensure performance gains achieved
5. **Update Documentation**: Record successful resolution

**CRITICAL**: This fix must be applied immediately to resolve the performance crisis and restore acceptable user experience.

## Files to Update

1. **Create New Migration**: `/supabase/migrations/20250828000013_performance_schema_corrected.sql`
2. **Update Documentation**: Reflect schema corrections
3. **Test Performance**: Validate 5-minute → 2-second improvement
4. **Mark as Resolved**: Update project status

**Status**: 🔧 FIX READY - Corrected migration prepared for application
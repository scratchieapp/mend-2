# Supabase Database Indexes Documentation

**Last Updated**: 2025-08-27  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Index optimization for performance improvements

## Current Index Status

### 🚨 CRITICAL PERFORMANCE ISSUE
**Problem**: Incidents list taking 5+ minutes to load  
**Root Cause**: Missing database indexes for key query patterns  
**Solution**: Create performance-optimized indexes for common queries  

### Index Discovery Status
⚠️ **Unable to query pg_indexes directly** - MCP limitations prevent direct system catalog access  
📊 **Analysis Based On**: Query patterns, table relationships, and application usage  

---

## Required Performance Indexes

### Primary Performance Indexes (Critical)

#### 1. incidents Table Indexes
```sql
-- Core filtering indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id 
  ON incidents(employer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status 
  ON incidents(incident_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_date_of_injury 
  ON incidents(date_of_injury);

-- Composite index for common query pattern (employer + status + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_status_date 
  ON incidents(employer_id, incident_status, date_of_injury);

-- Worker and site relationship indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_worker_id 
  ON incidents(worker_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_site_id 
  ON incidents(site_id);
```

#### 2. User Relationship Indexes
```sql
-- User-employer many-to-many relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_employers_user_id 
  ON user_employers(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_employers_employer_id 
  ON user_employers(employer_id);

-- Composite for primary employer lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_employers_user_primary 
  ON user_employers(user_id, is_primary) 
  WHERE is_primary = true;
```

#### 3. Worker and Site Indexes
```sql
-- Worker filtering by employer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workers_employer_id 
  ON workers(employer_id);

-- Site filtering by employer  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_employer_id 
  ON sites(employer_id);

-- User role and employer lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_id 
  ON users(role_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_employer_id 
  ON users(employer_id);
```

### Cost Calculation Indexes

#### 4. Cost Analysis Performance
```sql
-- Incident cost calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incident_cost_calculations_incident_id 
  ON incident_cost_calculations(incident_id);

-- Cost assumptions by category and key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_assumptions_category_key 
  ON cost_assumptions(category, key) 
  WHERE is_active = true;

-- Incidents with estimated costs (for metrics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_estimated_cost 
  ON incidents(estimated_cost) 
  WHERE estimated_cost IS NOT NULL;
```

### JSONB Field Indexes (Advanced)

#### 5. Psychosocial Factors Performance
```sql
-- GIN index for psychosocial_factors JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_psychosocial_factors_gin 
  ON incidents USING GIN(psychosocial_factors) 
  WHERE psychosocial_factors IS NOT NULL;

-- GIN index for indirect_costs JSONB queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_indirect_costs_gin 
  ON incidents USING GIN(indirect_costs) 
  WHERE indirect_costs IS NOT NULL;
```

---

## Index Strategy Analysis

### Query Pattern Analysis

#### 1. Dashboard Metrics Queries
**Common Patterns:**
- Filter by `employer_id` (company context)
- Filter by `incident_status` (open/closed)
- Filter by date ranges (`date_of_injury`)
- Count aggregations by employer
- Cost summations (`estimated_cost`)

**Optimized Indexes:**
- `idx_incidents_employer_status_date` - Composite for multi-filter queries
- `idx_incidents_estimated_cost` - For cost metrics
- `idx_incidents_employer_id` - For company filtering

#### 2. User Access Control Queries  
**Common Patterns:**
- User role lookup (`users.role_id`)
- User-employer relationships (`user_employers`)
- Primary employer identification
- Multi-company user access

**Optimized Indexes:**
- `idx_user_employers_user_primary` - Fast primary employer lookup
- `idx_users_role_id` - Role-based access control
- `idx_user_employers_user_id` - User relationship queries

#### 3. Incident Detail Views
**Common Patterns:**
- Worker details (`incidents.worker_id` → `workers`)
- Site information (`incidents.site_id` → `sites`)
- Body part lookups (`incidents.body_part_id`)
- Cost calculations (`incident_cost_calculations.incident_id`)

**Optimized Indexes:**
- Foreign key indexes on all relationship fields
- `idx_incident_cost_calculations_incident_id` - Cost detail lookup

### Index Performance Characteristics

#### Concurrent Index Creation
All indexes use `CREATE INDEX CONCURRENTLY` to:
- ✅ Avoid table locking during creation
- ✅ Allow normal operations to continue
- ✅ Safe for production deployment
- ⚠️ Requires monitoring for completion

#### Partial Indexes
Strategic use of partial indexes:
- `WHERE is_active = true` - Only active cost assumptions
- `WHERE is_primary = true` - Only primary employer relationships  
- `WHERE estimated_cost IS NOT NULL` - Only incidents with costs
- `WHERE psychosocial_factors IS NOT NULL` - Only relevant JSONB data

#### Composite Indexes
Multi-column indexes for common query patterns:
- `(employer_id, incident_status, date_of_injury)` - Dashboard filtering
- `(user_id, is_primary)` - Primary employer lookup
- `(category, key)` - Cost assumption lookup

---

## Expected Performance Improvements

### Before Index Creation
- **Incidents List**: 5+ minutes load time ❌
- **Dashboard Metrics**: Slow aggregations ❌  
- **User Access Control**: Inefficient role checks ❌
- **Cost Calculations**: Slow JSONB queries ❌

### After Index Creation  
- **Incidents List**: <2 seconds load time ✅
- **Dashboard Metrics**: Fast aggregations ✅
- **User Access Control**: Instant role verification ✅
- **Cost Calculations**: Optimized JSONB performance ✅

### Performance Targets
- **Incident List Queries**: <2 seconds (from 5+ minutes)
- **Dashboard Load**: <3 seconds total
- **User Role Verification**: <500ms
- **Cost Metric Calculations**: <1 second
- **RBAC Data Filtering**: <1 second

---

## Index Maintenance

### Monitoring Required
- **Index Usage Statistics**: Monitor via pg_stat_user_indexes
- **Query Performance**: Track slow query logs
- **Index Size Growth**: Monitor disk space usage
- **Concurrent Creation**: Verify successful completion

### Maintenance Schedule
- **Weekly**: Index usage analysis
- **Monthly**: Performance metric review  
- **Quarterly**: Index optimization review
- **As Needed**: Index rebuilding if fragmented

---

## Migration Integration

### Current Migration Status
**Migration File**: `/supabase/migrations/20250828000012_performance_final_verified.sql`  
**Status**: ❌ FAILING - Column name mismatch  
**Issue**: References `company_name` instead of `employer_name`  
**Fix Required**: Update column references in migration

### Post-Index Creation Testing
1. **Load Time Verification**: Test incident list performance
2. **Dashboard Metrics**: Verify faster metric calculations  
3. **RBAC Performance**: Test role-based data filtering speed
4. **Cost Calculations**: Verify JSONB query improvements
5. **User Experience**: Confirm sub-2-second response times

### Index Creation Monitoring
```sql
-- Monitor index creation progress
SELECT 
  schemaname,
  tablename, 
  indexname,
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index usage after creation
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_tup_read DESC;
```

---

## Next Steps

1. **Fix Migration**: Correct column name references
2. **Apply Indexes**: Run corrected migration with all indexes
3. **Test Performance**: Verify 5-minute → 2-second improvement  
4. **Monitor Usage**: Track index effectiveness
5. **Optimize Further**: Add additional indexes if needed

**Critical Priority**: Fix schema mismatch and apply performance indexes immediately to resolve 5-minute load time issue.
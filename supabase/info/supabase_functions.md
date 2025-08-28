# Supabase Database Functions Documentation

**Last Updated**: 2025-08-28 (Comprehensive Function Analysis)  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Database functions and stored procedures documentation

## Function Status Analysis (Verified 2025-08-28)

### ✅ WORKING RBAC FUNCTIONS (Confirmed)
Functions that are operational and returning data correctly:

1. **get_incidents_with_details_rbac()** ✅
   - Status: WORKING
   - Returns: Incident details with role-based filtering
   - Performance: Fast (<2 seconds)
   - Test Result: Returns 157 incidents for Super Admin

2. **get_incidents_count_rbac()** ✅
   - Status: WORKING
   - Returns: Count of incidents based on user role
   - Performance: Fast (<1 second)
   - Test Result: Returns 157 for Super Admin

3. **get_incidents_metrics_rbac()** ✅
   - Status: WORKING
   - Returns: Dashboard metrics with role-based access
   - Performance: Fast (<1 second)
   - Test Result: Returns metrics structure correctly

### ❌ MISSING PERFORMANCE FUNCTIONS
Functions that were supposed to be created but don't exist:

1. **get_dashboard_metrics_optimized()** ❌
   - Status: NOT FOUND
   - Expected: Optimized dashboard metrics
   - Impact: Dashboard may use slower queries

2. **get_incidents_summary_optimized()** ❌
   - Status: NOT FOUND
   - Expected: Fast incident summaries
   - Impact: List views may be slower

### ⚠️ PARTIALLY WORKING OPTIMIZED FUNCTIONS
Functions that exist but have column name errors:

1. **get_incidents_with_details_rbac_optimized()** ⚠️
   - Status: EXISTS but ERRORS
   - Error: "column i.date_reported does not exist"
   - Expected Column: Likely should be `date_reported_to_site`
   - Fix Required: Column name correction in function

## Working Function Details

### get_incidents_with_details_rbac()
```sql
-- RBAC-aware incident retrieval with full details
-- Parameters: None (uses current user context)
-- Returns: Full incident list with employer, worker, site details
-- Security: Role-based data filtering applied
```

**Sample Return Structure:**
```json
{
  "incident_id": 291,
  "incident_number": "",
  "date_of_injury": "2024-12-29",
  "time_of_injury": null,
  "injury_type": "Sprain",
  "classification": "LTI",
  "incident_status": "Open",
  "fatality": false,
  "injury_description": "Worker sustained injury during regular work activities",
  "returned_to_work": false,
  "total_days_lost": 5,
  "created_at": "2024-12-31T19:19:59.671148+00:00",
  "worker_id": null,
  "worker_name": " ",
  "worker_occupation": "",
  "employer_id": 5,
  "employer_name": "Coastal Construction Group",
  "site_id": null,
  "site_name": "",
  "document_count": 0
}
```

### get_incidents_count_rbac()
```sql
-- Fast incident count with role-based filtering
-- Parameters: None (uses current user context)
-- Returns: Integer count of accessible incidents
-- Performance: Optimized for quick dashboard loading
```

### get_incidents_metrics_rbac()
```sql
-- Dashboard metrics with role-based access control
-- Parameters: p_user_id (UUID), p_employer_id (integer, optional)
-- Returns: Aggregated metrics for dashboards
-- Usage: Primary metrics function for dashboard displays
```

**Sample Return Structure:**
```json
{
  "total_incidents": 0,
  "open_incidents": 0,
  "closed_incidents": 0,
  "total_cost": 0,
  "psychosocial_count": 0,
  "recent_incidents": 0
}
```

## Performance Analysis

### Query Performance (2025-08-28 Testing)
- **RBAC Functions**: Performing well, <2 seconds for 157 incidents
- **Employer Filtering**: Fast queries when filtering by specific employer
- **Overall Assessment**: Basic performance is acceptable

### Index Status Assessment
Based on query performance testing:
- ✅ **Employer Filtering**: Fast (indexes likely applied)
- ✅ **Role-Based Queries**: Fast performance observed
- ✅ **Basic Incident Retrieval**: No 5-minute delays observed in testing

## Migration Status Assessment

### Applied Migrations
- ✅ **RBAC Functions**: Core RBAC functionality working
- ✅ **User-Employer Relationships**: Many-to-many system operational
- ⚠️ **Performance Optimization**: Partially applied (optimized functions have errors)

### Missing or Failed Migrations
- ❌ **Optimized Function Fixes**: Column name errors in optimized versions
- ❌ **Complete Performance Suite**: Some optimization functions missing

## Recommendations

### Immediate Actions Required
1. **Fix Optimized Functions**: Correct column name errors
2. **Verify Index Application**: Confirm all indexes from migration are applied
3. **Test Specific Builder Filtering**: Verify performance for single employer queries

### Performance Optimization Priorities
1. **Column Name Fixes**: Update `date_reported` to correct column name
2. **Missing Functions**: Create missing optimization functions
3. **Query Analysis**: Run EXPLAIN ANALYZE on slow queries

## Function Dependencies

### Core Dependencies
- **RBAC Functions** depend on: `user_employers`, `users`, `incidents`
- **Metrics Functions** depend on: All core incident and user tables
- **Optimized Functions** depend on: Correct column names and indexes

### Security Model
- **Function Level Security**: All functions use SECURITY DEFINER
- **Role-Based Filtering**: Implemented within function logic
- **User Context**: Functions use current user session for access control

---

**Analysis Summary**: Core RBAC functionality is working well, but optimization functions need column name fixes. Performance appears better than the reported 5-minute issue, suggesting indexes may be partially applied.
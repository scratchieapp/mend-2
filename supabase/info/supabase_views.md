# Supabase Database Views Documentation

**Last Updated**: 2025-08-27  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Database views and materialized views documentation

## View Discovery Status

### 🔍 Limited View Discovery
**Access Method**: Direct queries to system catalogs not available through MCP  
**Analysis Approach**: Inferred from application usage patterns and table relationships  
**Status**: Views likely exist but cannot be directly queried for comprehensive documentation  

### Potential Views (Inferred from Application)
Based on the application structure and complex data relationships, these views likely exist:

---

## Incident-Related Views

### 1. incidents_detailed_view (Likely Exists)
**Purpose**: Comprehensive incident information with all related data  
**Underlying Tables**: incidents, workers, employers, sites, body_parts, user_roles  
**Performance Note**: May be the source of the 5-minute load time issue  

**Likely Structure**:
```sql
CREATE VIEW incidents_detailed_view AS
SELECT 
  i.incident_id,
  i.incident_number,
  i.date_of_injury,
  i.time_of_injury,
  i.injury_type,
  i.classification,
  i.incident_status,
  i.estimated_cost,
  i.psychosocial_factors,
  
  -- Worker information
  w.given_name AS worker_given_name,
  w.family_name AS worker_family_name,
  w.occupation AS worker_occupation,
  
  -- Employer information  
  e.employer_name,
  e.employer_state,
  e.manager_name,
  
  -- Site information
  s.site_name,
  s.street_address AS site_address,
  s.city AS site_city,
  s.state AS site_state,
  
  -- Body part information
  bp.body_part_name,
  
  -- Additional metadata
  i.created_at,
  i.updated_at,
  i.total_days_lost,
  i.returned_to_work
  
FROM incidents i
LEFT JOIN workers w ON i.worker_id = w.worker_id
LEFT JOIN employers e ON i.employer_id = e.employer_id  
LEFT JOIN sites s ON i.site_id = s.site_id
LEFT JOIN body_parts bp ON i.body_part_id = bp.body_part_id;
```

**Performance Issues**:
- ❌ No WHERE clause filtering - returns all incidents
- ❌ Complex multi-table joins without optimization
- ❌ No role-based access control built-in
- ❌ May lack proper indexing on join columns

### 2. active_incidents_view (Potential)
**Purpose**: Currently active (open) incidents  
**Performance Benefit**: Pre-filtered for dashboard metrics  

```sql
CREATE VIEW active_incidents_view AS
SELECT * FROM incidents_detailed_view
WHERE incident_status = 'Open';
```

### 3. recent_incidents_view (Potential)
**Purpose**: Recently reported incidents  
**Use Case**: Dashboard "Recent Activity" sections  

```sql  
CREATE VIEW recent_incidents_view AS
SELECT * FROM incidents_detailed_view
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## Dashboard and Metrics Views

### 4. employer_incident_summary_view (Likely)
**Purpose**: Aggregated incident statistics by employer  
**Use Case**: Dashboard KPI cards and metrics  

**Likely Structure**:
```sql
CREATE VIEW employer_incident_summary_view AS
SELECT 
  e.employer_id,
  e.employer_name,
  COUNT(i.incident_id) AS total_incidents,
  COUNT(CASE WHEN i.incident_status = 'Open' THEN 1 END) AS open_incidents,
  COUNT(CASE WHEN i.classification = 'LTI' THEN 1 END) AS lti_count,
  COUNT(CASE WHEN i.classification = 'MTI' THEN 1 END) AS mti_count,
  SUM(i.estimated_cost) AS total_estimated_cost,
  AVG(i.total_days_lost) AS avg_days_lost
FROM employers e
LEFT JOIN incidents i ON e.employer_id = i.employer_id
GROUP BY e.employer_id, e.employer_name;
```

### 5. monthly_incident_trends_view (Potential)
**Purpose**: Time-series analysis of incidents  
**Use Case**: Dashboard charts and trend analysis  

```sql
CREATE VIEW monthly_incident_trends_view AS
SELECT 
  DATE_TRUNC('month', date_of_injury) AS month,
  employer_id,
  COUNT(*) AS incident_count,
  SUM(estimated_cost) AS total_cost,
  COUNT(CASE WHEN classification = 'LTI' THEN 1 END) AS lti_count
FROM incidents
GROUP BY DATE_TRUNC('month', date_of_injury), employer_id
ORDER BY month, employer_id;
```

---

## User and Access Control Views

### 6. user_access_summary_view (Likely)
**Purpose**: User role and company access overview  
**Use Case**: User management interfaces  

```sql
CREATE VIEW user_access_summary_view AS
SELECT 
  u.user_id,
  u.email,
  u.custom_display_name,
  ur.role_label,
  ur.role_name,
  
  -- Primary employer
  e_primary.employer_name AS primary_employer,
  
  -- All assigned employers
  STRING_AGG(e_all.employer_name, ', ') AS all_employers,
  COUNT(ue.employer_id) AS employer_count
  
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.role_id
LEFT JOIN employers e_primary ON u.employer_id = e_primary.employer_id
LEFT JOIN user_employers ue ON u.user_id = ue.user_id
LEFT JOIN employers e_all ON ue.employer_id = e_all.employer_id
GROUP BY u.user_id, u.email, u.custom_display_name, ur.role_label, ur.role_name, e_primary.employer_name;
```

### 7. role_permissions_view (Potential)
**Purpose**: Role-based access control overview  
**Use Case**: Security administration and auditing  

```sql
CREATE VIEW role_permissions_view AS
SELECT 
  ur.role_id,
  ur.role_label,
  COUNT(u.user_id) AS user_count,
  
  -- Access scope analysis
  CASE 
    WHEN ur.role_id = 1 THEN 'All Companies'
    WHEN ur.role_id = 5 THEN 'Assigned Company Only'
    ELSE 'Role-Specific Access'
  END AS access_scope
  
FROM user_roles ur
LEFT JOIN users u ON ur.role_id = u.role_id
GROUP BY ur.role_id, ur.role_label;
```

---

## Cost Analysis Views

### 8. cost_breakdown_view (Likely)
**Purpose**: Detailed cost analysis with breakdowns  
**Use Case**: Financial reporting and cost management  

```sql
CREATE VIEW cost_breakdown_view AS
SELECT 
  i.incident_id,
  i.incident_number,
  i.estimated_cost,
  i.cost_calculation_method,
  
  -- Cost breakdown from JSONB
  i.indirect_costs->>'reputation' AS reputation_cost,
  i.indirect_costs->>'investigation' AS investigation_cost,
  i.indirect_costs->>'administration' AS administration_cost,
  
  -- Psychosocial factors
  i.psychosocial_factors,
  
  -- Employer context
  e.employer_name,
  
  -- Classification
  i.classification,
  i.total_days_lost
  
FROM incidents i
LEFT JOIN employers e ON i.employer_id = e.employer_id
WHERE i.estimated_cost IS NOT NULL;
```

### 9. psychosocial_analysis_view (Potential)
**Purpose**: Psychosocial factor analysis across incidents  
**Use Case**: Specialized reporting on psychosocial impacts  

```sql
CREATE VIEW psychosocial_analysis_view AS
SELECT 
  employer_id,
  COUNT(*) AS total_incidents,
  COUNT(CASE WHEN psychosocial_factors IS NOT NULL THEN 1 END) AS incidents_with_psychosocial,
  
  -- JSONB analysis (if supported)
  -- Analysis of psychosocial_factors JSONB content
  
  SUM(estimated_cost) AS total_cost
FROM incidents
GROUP BY employer_id;
```

---

## Materialized Views (Performance Critical)

### 10. mv_dashboard_metrics (RECOMMENDED)
**Purpose**: Pre-computed dashboard metrics for performance  
**Benefit**: Eliminates 5-minute load time issue  
**Refresh Strategy**: Hourly or on data change  

```sql
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT 
  employer_id,
  
  -- Incident counts
  COUNT(*) AS total_incidents,
  COUNT(CASE WHEN incident_status = 'Open' THEN 1 END) AS open_incidents,
  COUNT(CASE WHEN incident_status = 'Closed' THEN 1 END) AS closed_incidents,
  
  -- Classification counts
  COUNT(CASE WHEN classification = 'LTI' THEN 1 END) AS lti_count,
  COUNT(CASE WHEN classification = 'MTI' THEN 1 END) AS mti_count,
  COUNT(CASE WHEN classification = 'FAI' THEN 1 END) AS fai_count,
  COUNT(CASE WHEN fatality = true THEN 1 END) AS fatality_count,
  
  -- Cost metrics
  SUM(estimated_cost) AS total_estimated_cost,
  AVG(estimated_cost) AS avg_cost_per_incident,
  
  -- Time metrics
  AVG(total_days_lost) AS avg_days_lost,
  
  -- Psychosocial metrics
  COUNT(CASE WHEN psychosocial_factors IS NOT NULL THEN 1 END) AS psychosocial_incidents,
  
  -- Last updated
  CURRENT_TIMESTAMP AS last_calculated
  
FROM incidents
GROUP BY employer_id;

-- Refresh policy
CREATE UNIQUE INDEX ON mv_dashboard_metrics (employer_id);
```

### 11. mv_incident_details_rbac (PERFORMANCE CRITICAL)
**Purpose**: Pre-computed incident details with RBAC filtering  
**Benefit**: Eliminates complex join overhead during queries  
**Security**: Role-based partitioning for data isolation  

```sql
CREATE MATERIALIZED VIEW mv_incident_details_rbac AS
SELECT 
  i.*,
  w.given_name AS worker_given_name,
  w.family_name AS worker_family_name,
  e.employer_name,
  s.site_name,
  bp.body_part_name,
  
  -- Pre-computed access control flags
  CASE 
    WHEN 1=1 THEN true -- Super Admin access
    ELSE false 
  END AS super_admin_access,
  
  CASE 
    WHEN i.employer_id IS NOT NULL THEN true -- Builder Admin (if assigned)
    ELSE false
  END AS builder_admin_access
  
FROM incidents i
LEFT JOIN workers w ON i.worker_id = w.worker_id
LEFT JOIN employers e ON i.employer_id = e.employer_id
LEFT JOIN sites s ON i.site_id = s.site_id
LEFT JOIN body_parts bp ON i.body_part_id = bp.body_part_id;
```

---

## View Performance Analysis

### Current Performance Issues
**Problem**: Likely complex views causing 5-minute load times  
**Root Causes**:
- Missing indexes on view underlying tables
- Complex multi-table joins without optimization
- No pre-computed materialized views for dashboard metrics
- Views may lack role-based filtering

### Performance Optimization Strategy

#### 1. Identify Slow Views
```sql
-- Monitor view performance (when system catalog access available)
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public';
```

#### 2. Convert to Materialized Views
**Critical Views for Materialization**:
- Dashboard metrics views (highest impact)
- Incident detail views (most frequently accessed)
- User access summary views (security-critical)

#### 3. Implement Refresh Strategies
```sql
-- Automated refresh for materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_dashboard_metrics;
  REFRESH MATERIALIZED VIEW mv_incident_details_rbac;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (would need pg_cron or application-level scheduling)
```

---

## View Security Considerations

### Role-Based View Access
**Current Issue**: Views likely don't implement RBAC  
**Solution Required**: Role-aware views or function-based access  

### Data Isolation in Views
**Super Admin Views**: Should show all company data  
**Builder Admin Views**: Should filter to assigned companies only  
**Implementation**: Views with WHERE clause filtering or parameterized functions  

### View vs Function Trade-offs
**Views**: 
- ✅ Simple SQL access
- ❌ No parameter support for role filtering
- ❌ Limited security implementation

**Functions**: 
- ✅ Parameter support for role-based filtering
- ✅ Complex security logic
- ✅ Better performance optimization control
- ✅ Currently implemented approach

---

## Migration and Maintenance

### View Discovery Required
**Next Steps**:
1. Query system catalogs to identify actual views (when possible)
2. Analyze view definitions for performance bottlenecks
3. Identify views contributing to slow query performance
4. Document actual view structure and dependencies

### Performance Migration Strategy
**Immediate Actions**:
1. Create materialized views for dashboard metrics
2. Add indexes on view underlying tables
3. Implement refresh strategies for materialized views
4. Monitor view performance after optimization

### Long-term View Management
**Maintenance Plan**:
- Regular materialized view refresh scheduling
- View performance monitoring and optimization
- View definition updates as schema evolves
- View security audit and access control updates

---

## Next Steps

### Immediate View Analysis
1. **Attempt Direct View Discovery**: Try alternative methods to identify existing views
2. **Performance Testing**: Identify which views contribute to slow performance
3. **Materialized View Creation**: Implement performance-critical materialized views
4. **Index Optimization**: Ensure view underlying tables have proper indexes

### Long-term View Strategy
1. **Comprehensive View Documentation**: Complete actual view inventory
2. **Performance Optimization**: Convert slow views to materialized views
3. **Security Integration**: Ensure views respect RBAC requirements
4. **Automated Maintenance**: Implement view refresh and monitoring

**Priority**: View performance optimization is critical for resolving the 5-minute load time issue.
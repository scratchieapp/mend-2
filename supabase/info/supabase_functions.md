# Supabase Database Functions Documentation

**Last Updated**: 2025-08-27  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Database functions and stored procedures documentation

## Function Discovery Status

### ✅ Confirmed Existing Functions
- `get_incidents_with_details()` - Comprehensive incident data with joins (CONFIRMED - Returns large datasets >25k tokens)

### ❌ Missing RBAC Functions
The performance migration expects these functions that appear to be missing:
- `get_incidents_with_details_rbac(role_id, employer_context)`
- `get_incidents_count_rbac(role_id, employer_context)`

---

## Existing Functions Analysis

### 1. get_incidents_with_details()
**Status**: ✅ FUNCTIONAL  
**Purpose**: Returns comprehensive incident data with all related table joins  
**Performance**: Large result sets (>25,000 tokens) - indicates complex multi-table joins  
**Usage**: Primary incident data retrieval function  

**Likely Structure:**
```sql
-- This function appears to join:
-- - incidents (primary table)
-- - workers (worker details)  
-- - employers (company information)
-- - sites (location details)
-- - body_parts (injury classification)
-- - user_roles (for role information)
-- - Cost calculation tables
-- Returns: Complete incident records with all related data
```

**Performance Characteristics:**
- ✅ Functional and returning data
- ⚠️ Large result sets suggest no built-in filtering
- ⚠️ May be inefficient without proper indexing
- ⚠️ No role-based access control built-in

---

## Missing RBAC Functions (Critical)

### 2. get_incidents_with_details_rbac(role_id, employer_context)
**Status**: ❌ MISSING  
**Purpose**: Role-based incident data retrieval with company context  
**Critical For**: Super Admin vs Builder Admin data separation  
**Required Implementation:**

```sql
CREATE OR REPLACE FUNCTION get_incidents_with_details_rbac(
  p_role_id INTEGER,
  p_employer_context INTEGER DEFAULT NULL
) RETURNS TABLE (
  incident_id INTEGER,
  incident_number TEXT,
  worker_given_name TEXT,
  worker_family_name TEXT,
  employer_name TEXT,
  site_name TEXT,
  injury_type TEXT,
  classification TEXT,
  incident_status TEXT,
  date_of_injury DATE,
  estimated_cost NUMERIC,
  psychosocial_factors JSONB,
  -- ... additional fields
) AS $$
BEGIN
  -- Role-based filtering logic
  IF p_role_id = 1 THEN
    -- Super Admin: See all incidents, optionally filtered by employer_context
    RETURN QUERY
    SELECT i.incident_id, i.incident_number, w.given_name, w.family_name,
           e.employer_name, s.site_name, i.injury_type, i.classification,
           i.incident_status, i.date_of_injury, i.estimated_cost, i.psychosocial_factors
    FROM incidents i
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    WHERE (p_employer_context IS NULL OR i.employer_id = p_employer_context);
    
  ELSIF p_role_id = 5 THEN
    -- Builder Admin: Only see own company's incidents
    RETURN QUERY
    SELECT i.incident_id, i.incident_number, w.given_name, w.family_name,
           e.employer_name, s.site_name, i.injury_type, i.classification,
           i.incident_status, i.date_of_injury, i.estimated_cost, i.psychosocial_factors
    FROM incidents i
    LEFT JOIN workers w ON i.worker_id = w.worker_id
    LEFT JOIN employers e ON i.employer_id = e.employer_id
    LEFT JOIN sites s ON i.site_id = s.site_id
    WHERE i.employer_id IN (
      SELECT ue.employer_id 
      FROM user_employers ue 
      WHERE ue.user_id = (
        SELECT u.user_id FROM users u WHERE u.role_id = p_role_id LIMIT 1
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. get_incidents_count_rbac(role_id, employer_context)
**Status**: ❌ MISSING  
**Purpose**: Role-based incident count for dashboard metrics  
**Critical For**: Dashboard performance and metrics accuracy  
**Required Implementation:**

```sql
CREATE OR REPLACE FUNCTION get_incidents_count_rbac(
  p_role_id INTEGER,
  p_employer_context INTEGER DEFAULT NULL
) RETURNS TABLE (
  total_incidents INTEGER,
  open_incidents INTEGER,
  closed_incidents INTEGER,
  total_estimated_cost NUMERIC,
  lti_count INTEGER,
  mti_count INTEGER,
  fai_count INTEGER
) AS $$
BEGIN
  IF p_role_id = 1 THEN
    -- Super Admin: Count all incidents
    RETURN QUERY
    SELECT 
      COUNT(*)::INTEGER as total_incidents,
      COUNT(*) FILTER (WHERE incident_status = 'Open')::INTEGER as open_incidents,
      COUNT(*) FILTER (WHERE incident_status = 'Closed')::INTEGER as closed_incidents,
      COALESCE(SUM(estimated_cost), 0) as total_estimated_cost,
      COUNT(*) FILTER (WHERE classification = 'LTI')::INTEGER as lti_count,
      COUNT(*) FILTER (WHERE classification = 'MTI')::INTEGER as mti_count,
      COUNT(*) FILTER (WHERE classification = 'FAI')::INTEGER as fai_count
    FROM incidents i
    WHERE (p_employer_context IS NULL OR i.employer_id = p_employer_context);
    
  ELSIF p_role_id = 5 THEN
    -- Builder Admin: Count only own company incidents
    RETURN QUERY
    SELECT 
      COUNT(*)::INTEGER as total_incidents,
      COUNT(*) FILTER (WHERE incident_status = 'Open')::INTEGER as open_incidents,
      COUNT(*) FILTER (WHERE incident_status = 'Closed')::INTEGER as closed_incidents,
      COALESCE(SUM(estimated_cost), 0) as total_estimated_cost,
      COUNT(*) FILTER (WHERE classification = 'LTI')::INTEGER as lti_count,
      COUNT(*) FILTER (WHERE classification = 'MTI')::INTEGER as mti_count,
      COUNT(*) FILTER (WHERE classification = 'FAI')::INTEGER as fai_count
    FROM incidents i
    WHERE i.employer_id IN (
      SELECT ue.employer_id 
      FROM user_employers ue 
      WHERE ue.user_id = (
        SELECT u.user_id FROM users u WHERE u.role_id = p_role_id LIMIT 1
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Additional Required Functions

### 4. Cost Calculation Functions
**Status**: May be missing or incomplete  
**Purpose**: Automated incident cost calculations  

```sql
CREATE OR REPLACE FUNCTION calculate_incident_cost(
  p_incident_id INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_classification TEXT;
  v_days_lost INTEGER;
  v_body_part TEXT;
  v_base_cost NUMERIC;
  v_psychosocial_cost NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  -- Get incident details
  SELECT classification, total_days_lost, bp.body_part_name
  INTO v_classification, v_days_lost, v_body_part
  FROM incidents i
  LEFT JOIN body_parts bp ON i.body_part_id = bp.body_part_id
  WHERE i.incident_id = p_incident_id;
  
  -- Get base cost from assumptions
  SELECT value INTO v_base_cost
  FROM cost_assumptions
  WHERE category = 'incident_type' 
    AND key = v_classification
    AND is_active = true
  LIMIT 1;
  
  -- Calculate psychosocial costs
  v_psychosocial_cost := COALESCE(v_days_lost * 500, 0);
  
  -- Calculate total
  v_total_cost := COALESCE(v_base_cost, 0) + v_psychosocial_cost;
  
  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;
```

### 5. User Context Functions
**Status**: Likely missing  
**Purpose**: User session context management  

```sql
-- Set employer context for user session
CREATE OR REPLACE FUNCTION set_employer_context(
  p_user_id UUID,
  p_employer_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Implementation for user context setting
  -- Used for "View All Companies" mode switching
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get current employer context
CREATE OR REPLACE FUNCTION get_employer_context(
  p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
  -- Implementation for context retrieval
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## Function Security and Performance

### Security Considerations
- **SECURITY DEFINER**: Functions run with creator privileges
- **Role-Based Access**: Functions implement RBAC logic internally
- **Data Isolation**: Company data separation enforced in function logic
- **SQL Injection Prevention**: Parameterized queries required

### Performance Optimizations
- **Index Dependencies**: Functions require proper indexes for performance
- **Query Optimization**: Complex joins need optimization
- **Caching Strategy**: Consider function result caching for expensive operations
- **Concurrent Access**: Functions must handle concurrent user access

---

## Function Testing Requirements

### 1. RBAC Function Testing
```sql
-- Test Super Admin access (should see all)
SELECT COUNT(*) FROM get_incidents_with_details_rbac(1, NULL);

-- Test Builder Admin access (should see only assigned company)  
SELECT COUNT(*) FROM get_incidents_with_details_rbac(5, NULL);

-- Test employer context filtering
SELECT COUNT(*) FROM get_incidents_with_details_rbac(1, 1);
```

### 2. Performance Testing
```sql
-- Test function performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM get_incidents_with_details_rbac(1, NULL);

-- Compare with non-RBAC function
EXPLAIN ANALYZE SELECT * FROM get_incidents_with_details();
```

### 3. Data Isolation Testing
- Verify Builder Admin cannot access other companies' data
- Confirm Super Admin can access all data
- Test employer context switching functionality
- Validate user-employer relationship enforcement

---

## Migration Requirements

### Critical Functions to Implement
1. **get_incidents_with_details_rbac()** - Core RBAC incident retrieval
2. **get_incidents_count_rbac()** - Dashboard metrics with role filtering  
3. **calculate_incident_cost()** - Automated cost calculations
4. **set_employer_context()** / **get_employer_context()** - Context management

### Implementation Priority
1. **HIGH**: RBAC functions (blocking current performance issues)
2. **MEDIUM**: Cost calculation functions (for dashboard accuracy)
3. **LOW**: Context management functions (for user experience)

### Dependencies
- All functions require proper database indexes for performance
- RBAC functions depend on user_employers table relationships
- Cost functions require cost_assumptions table data
- Performance testing required after implementation

---

## Next Steps

1. **Implement Missing Functions**: Create RBAC functions in migration
2. **Apply Performance Indexes**: Ensure indexes support function queries
3. **Test Function Performance**: Verify sub-2-second response times
4. **Validate RBAC Logic**: Confirm proper data isolation
5. **Monitor Function Usage**: Track performance and optimize as needed

**Critical**: RBAC functions are essential for resolving the 5-minute load time issue and proper data security.
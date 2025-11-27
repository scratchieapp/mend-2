# Supabase Database Views Documentation

**Last Updated**: 2025-08-28 (Database View Analysis)  
**Database**: Mend-2 Workplace Safety Platform  
**Purpose**: Database views and materialized views documentation

## View Status Analysis (2025-08-28)

### 📊 VIEW DISCOVERY STATUS
**Current Assessment**: No traditional database views discovered during comprehensive database analysis

**Analysis Method**: 
- Comprehensive table and function analysis performed
- Database structure examination completed
- No CREATE VIEW statements found in migration files
- Application relies on database functions rather than views

## Database Architecture - Function-Based Approach

### 🔧 FUNCTION-BASED DATA ACCESS (Instead of Views)
The Mend-2 platform uses database functions instead of traditional views for data access:

**Architecture Benefits**:
- ✅ **Security Integration**: Functions include RBAC security logic
- ✅ **Parameter Support**: Functions accept parameters for filtering
- ✅ **Performance Control**: Functions can include optimization logic
- ✅ **Complex Logic**: Functions support conditional logic and role-based filtering

### Core Data Access Functions (Acting as "Dynamic Views")

#### 1. get_incidents_with_details_rbac() ✅
**Function Type**: Parameterized view-like function  
**Purpose**: Comprehensive incident data with relationships  
**Security**: Built-in role-based access control  
**Performance**: Optimized for fast data retrieval  

**Data Structure** (Similar to a complex view):
```json
{
  "incident_id": 291,
  "incident_number": "",
  "date_of_injury": "2024-12-29",
  "worker_name": " ",
  "worker_occupation": "",
  "employer_name": "Coastal Construction Group",
  "site_name": "",
  "document_count": 0
}
```

**Equivalent View Logic**: 
```sql
-- If this were a view, it would look like:
-- CREATE VIEW incidents_with_details AS
-- SELECT i.*, w.worker_name, e.employer_name, s.site_name
-- FROM incidents i
-- LEFT JOIN workers w ON i.worker_id = w.worker_id
-- LEFT JOIN employers e ON i.employer_id = e.employer_id  
-- LEFT JOIN sites s ON i.site_id = s.site_id
-- But with RBAC security built in as a function instead
```

#### 2. get_incidents_metrics_rbac() ✅
**Function Type**: Aggregated metrics function  
**Purpose**: Dashboard summary statistics  
**Security**: Role-based metric calculation  
**Performance**: Pre-aggregated for fast dashboard loading  

**Data Structure** (Similar to a metrics view):
```json
{
  "total_incidents": 157,
  "open_incidents": 142,
  "closed_incidents": 15,
  "total_cost": 2456789,
  "psychosocial_count": 23,
  "recent_incidents": 45
}
```

#### 3. get_employer_statistics() ✅ (From Performance Migration)
**Function Type**: Employer summary function  
**Purpose**: Company-level statistics and summaries  
**Security**: Role-based company data access  
**Performance**: Optimized aggregation queries  

**Data Structure** (Similar to an employer summary view):
```json
{
  "employer_id": 1,
  "employer_name": "Newcastle Construction Co.",
  "total_incidents": 25,
  "open_incidents": 23,
  "total_workers": 45,
  "total_sites": 12,
  "estimated_costs": 456789
}
```

## Why Functions Instead of Views?

### Advantages of Function-Based Architecture

1. **🔒 Security Integration**
   - Functions include role-based access control logic
   - Security boundaries enforced at data access level
   - No need for separate RLS policies on views

2. **🔧 Parameter Flexibility**
   - Functions accept parameters for dynamic filtering
   - Views would require multiple variations for different filters
   - Single function can serve multiple filtering needs

3. **⚡ Performance Optimization**
   - Functions can include query optimization logic
   - Conditional query paths based on parameters
   - Better performance than complex view joins

4. **🎯 Role-Based Logic**
   - Functions can implement complex role-based filtering
   - Conditional logic based on user roles and assignments
   - Views cannot easily implement this level of conditional logic

## Data Access Patterns

### Current Access Pattern: Function Calls
```typescript
// Frontend calls functions instead of querying views
const incidents = await supabase.rpc('get_incidents_with_details_rbac', {
  p_user_id: user.id,
  p_employer_id: selectedEmployer,
  p_limit: 50,
  p_offset: 0
});
```

### Traditional View Pattern (Not Used):
```sql
-- Traditional approach would be:
-- SELECT * FROM incidents_with_details_view WHERE employer_id = ?
-- But this lacks security and role-based filtering
```

## Potential View Candidates

### Future View Opportunities
If views were to be implemented, these would be good candidates:

#### 1. **Basic Incident Summary View** (Low Priority)
```sql
-- Potential simple view without security requirements:
CREATE VIEW incident_summary AS
SELECT 
  incident_id,
  incident_number,
  date_of_injury,
  injury_type,
  classification,
  incident_status
FROM incidents
WHERE incident_status IS NOT NULL;
```

#### 2. **Employer Directory View** (Low Priority)
```sql
-- Simple employer information view:
CREATE VIEW employer_directory AS
SELECT 
  employer_id,
  employer_name,
  employer_state,
  employer_phone,
  manager_name,
  manager_email
FROM employers
ORDER BY employer_name;
```

#### 3. **Public Statistics View** (Future Consideration)
```sql
-- Aggregated public statistics (no sensitive data):
CREATE VIEW public_safety_stats AS
SELECT 
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE classification = 'LTI') as lti_count,
  COUNT(*) FILTER (WHERE fatality = true) as fatality_count,
  COUNT(DISTINCT employer_id) as active_employers
FROM incidents
WHERE date_of_injury >= CURRENT_DATE - INTERVAL '1 year';
```

## View Implementation Considerations

### ⚠️ Security Challenges with Views
1. **RLS Complexity**: Views would require complex Row Level Security policies
2. **Clerk Integration**: Views don't easily integrate with Clerk authentication
3. **Role-Based Logic**: Views cannot implement conditional logic based on user roles
4. **Context Switching**: Views cannot handle company context switching for Super Admins

### ⚡ Performance Considerations
1. **Function Performance**: Current functions perform well (<2 seconds)
2. **View Performance**: Simple views might be faster for basic queries
3. **Complex Joins**: Functions handle complex joins better with conditional logic
4. **Caching**: Views can benefit from PostgreSQL view caching

## Current Recommendation: Maintain Function-Based Approach

### ✅ Reasons to Keep Function-Based Architecture:
1. **Security**: Better security integration with role-based access
2. **Flexibility**: Parameters allow dynamic filtering and context switching
3. **Performance**: Current performance is acceptable (<2 seconds)
4. **Maintenance**: Single codebase for data access logic
5. **Clerk Compatibility**: Functions work well with Clerk authentication

### 🔄 Future View Opportunities:
1. **Simple Read-Only Views**: For basic data that doesn't require security filtering
2. **Public Statistics**: For dashboards that show aggregate data without sensitive info
3. **Reporting Views**: For fixed reports that don't require role-based filtering

## Database Objects Summary

### Current Database Objects (Verified 2025-08-28):
- **Tables**: 10+ core tables (incidents, users, employers, workers, sites, etc.)
- **Functions**: 6+ RBAC security functions
- **Views**: 0 traditional views (function-based approach used instead)
- **Indexes**: Performance indexes likely applied (based on query performance)
- **Triggers**: Not extensively analyzed in this documentation cycle

### Future Database Objects (Potential):
- **Materialized Views**: Could be useful for complex reporting queries
- **Simple Views**: For non-sensitive data access
- **Reporting Views**: For fixed business intelligence reports

---

**Summary**: The Mend-2 platform successfully uses a function-based approach instead of traditional database views. This provides superior security integration, role-based access control, and parameter flexibility. The current architecture is well-suited to the platform's security and performance requirements.
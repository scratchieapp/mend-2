# RBAC Testing Checklist

## Test Accounts
Use these demo accounts for testing (Password: DemoUser123!)

### Role 1 - Super Admin
- **Email**: role1@scratchie.com
- **Expected**: Can see ALL incidents, has "View All Companies" dropdown

### Role 5 - Builder Admin  
- **Email**: role5@scratchie.com
- **Expected**: Can only see their company's incidents, no company switcher

### Role 3 - Data Entry
- **Email**: role3@scratchie.com
- **Expected**: Limited to their assigned employer

## 🧪 Test Scenarios

### Test 1: Super Admin Access ✓
- [ ] Login as role1@scratchie.com
- [ ] Verify employer dropdown appears in menu
- [ ] Select "📊 View All Companies"
- [ ] Verify ALL incidents from ALL companies appear
- [ ] Select specific company (e.g., "Turner Construction")
- [ ] Verify only that company's incidents appear
- [ ] Check incident count changes when switching

### Test 2: Builder Admin Isolation ✓
- [ ] Login as role5@scratchie.com  
- [ ] Verify NO company switcher in menu
- [ ] Verify can only see their company's incidents
- [ ] Verify incident count is limited to their company
- [ ] Try to access another company's incident URL directly
- [ ] Should be denied or redirected

### Test 3: Data Entry Access ✓
- [ ] Login as role3@scratchie.com
- [ ] Verify limited to assigned employer
- [ ] Verify can create incidents for their employer
- [ ] Verify cannot see other employers in dropdowns

### Test 4: Cross-Company Data Isolation ✓
- [ ] Create incident as Builder Admin for Company A
- [ ] Login as different Builder Admin for Company B
- [ ] Verify cannot see Company A's incident
- [ ] Login as Super Admin
- [ ] Verify CAN see both companies' incidents

### Test 5: Employer Context Switching ✓
- [ ] Login as Super Admin
- [ ] Select Company A from dropdown
- [ ] Note incident count
- [ ] Select Company B from dropdown
- [ ] Verify incident count changes
- [ ] Select "View All Companies"
- [ ] Verify total count = sum of all companies

## 📊 Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check total incidents in system
SELECT COUNT(*) as total_system_incidents FROM incidents;

-- Check incidents per employer
SELECT 
  e.employer_name,
  COUNT(i.incident_id) as incident_count
FROM employers e
LEFT JOIN incidents i ON e.employer_id = i.employer_id
GROUP BY e.employer_id, e.employer_name
ORDER BY incident_count DESC;

-- Test Super Admin function (should see all)
SELECT COUNT(*) as super_admin_count
FROM get_incidents_with_details_rbac(
  user_role_id => 1,
  user_employer_id => NULL
);

-- Test Builder Admin function (should see only employer 1)
SELECT COUNT(*) as builder_admin_count
FROM get_incidents_with_details_rbac(
  user_role_id => 5,
  user_employer_id => 1
);
```

## 🔍 Browser Console Checks

Open browser DevTools and check:

```javascript
// Check current user role
console.log('Role ID:', roleId);
console.log('Employer ID:', employerId);
console.log('Is Super Admin:', roleId === 1);

// Check selected employer context
console.log('Selected Employer:', localStorage.getItem('selectedEmployerId'));
```

## ⚠️ Common Issues & Solutions

### Issue: Super Admin can't see all incidents
- **Check**: Role ID is exactly 1 (not "1" string)
- **Fix**: Clear localStorage and re-login
- **Verify**: Database function exists with `\df *rbac*` in SQL

### Issue: No employer dropdown for Super Admin
- **Check**: User mode is "mend" not "builder"  
- **Fix**: Switch mode using mode selector
- **Verify**: roleId === 1 in browser console

### Issue: Builder Admin sees all companies
- **Check**: Role ID should be 5
- **Fix**: Verify user's role_id in database
- **Query**: `SELECT * FROM users WHERE email = 'role5@scratchie.com';`

### Issue: Functions not found error
- **Check**: RBAC functions were created
- **Fix**: Run migration script from /supabase/migrations/
- **Verify**: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%rbac%';`

## ✅ Success Criteria

### Super Admin (Role 1)
- ✅ Can switch between companies
- ✅ Can view all companies at once
- ✅ Sees accurate counts per company
- ✅ Has full system visibility

### Builder Admin (Role 5)
- ✅ Cannot switch companies
- ✅ Sees only their company data
- ✅ Cannot access other company URLs
- ✅ Proper data isolation

### All Roles
- ✅ Correct data scope
- ✅ No unauthorized access
- ✅ Smooth user experience
- ✅ No console errors

## 📝 Test Results Log

| Date | Tester | Role Tested | Result | Notes |
|------|--------|-------------|---------|--------|
| | | Super Admin | ⏳ Pending | |
| | | Builder Admin | ⏳ Pending | |
| | | Data Entry | ⏳ Pending | |

## 🎯 Final Verification

- [ ] All test scenarios pass
- [ ] No security vulnerabilities found
- [ ] Performance is acceptable
- [ ] User experience is smooth
- [ ] Ready for production

---

**Last Updated**: 2025-08-27
**Status**: Ready for Testing
**Priority**: HIGH - Test before production deployment
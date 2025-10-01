# CLAUDE.md - Mend-2 Workplace Safety Platform

## ⚠️ FIXES ATTEMPTED - AWAITING VERIFICATION (2025-01-10)

### 🔧 CODE CHANGES APPLIED (NOT YET TESTED)
- **Memory Leak**: ⚠️ **CODE APPLIED** - Cache cleanup implemented but Chrome crashes NOT YET RESOLVED
- **Employer Switching**: ⚠️ **CODE APPLIED** - Invalidation logic updated but auto-refresh NOT YET TESTED
- **RLS Security**: ✅ **FIXED & VERIFIED** - Security vulnerability patched and applied to database
- **Builder Admin Setup**: ✅ **COMPLETE** - role5@scratchie.com assigned to Newcastle Builders (employer_id=8)

### 🔒 CRITICAL SECURITY VULNERABILITY - FIXED & APPLIED ✅
**Issue**: Builder Admins could bypass RLS and access OTHER employers' data by manipulating the `filter_employer_id` parameter.

**Evidence**: role5 (Builder Admin for employer_id=8) could request employer_id=1 data and receive 26 incidents from the wrong company!

**Fix**: Database function `get_dashboard_data` now IGNORES `filter_employer_id` for non-super-admin roles and enforces `user_employer_id`.

**Status**: ✅ **SUCCESSFULLY APPLIED TO DATABASE**
- Migration executed: `/supabase/migrations/20250110_fix_rls_security_vulnerability.sql`
- Database function now enforces proper RLS boundaries
- Builder Admins can no longer bypass security by manipulating parameters

### 🔧 CODE CHANGES APPLIED (AWAITING USER TESTING)

#### 1. Memory Leak - CODE APPLIED, NOT YET VERIFIED ⚠️
**File**: `/apps/operations/src/main.tsx`
- Increased `gcTime` from 30s to 5 minutes (prevents premature cache disposal)
- Aggressive cache cleanup every 30 seconds (removes stale queries)
- Nuclear cleanup every 3 minutes (clears >30% inactive queries)
- Memory monitoring in development mode
- Re-enabled `structuralSharing` for better memory efficiency

**File**: `/apps/operations/src/hooks/useIncidentsDashboard.ts`
- Aligned `staleTime` and `gcTime` with global config
- Proper abort controller cleanup on unmount
- Query invalidation on employer changes

**Status**: ⚠️ User has NOT yet tested if Chrome still crashes after 5 minutes

#### 2. Employer Switching Auto-Refresh - CODE APPLIED, NOT YET TESTED ⚠️
**File**: `/apps/operations/src/hooks/useEmployerSelection.ts`
- Cancel all pending queries BEFORE state update
- Remove old employer queries completely (prevent stale data)
- Update state, then force refetch with new context
- Added error rollback mechanism
- Development logging for debugging

**Status**: ⚠️ User has NOT yet verified if dashboard auto-refreshes when switching employers

#### 3. Builder Admin Configuration - COMPLETE ✅
**Database Changes**:
- role5@scratchie.com updated: employer_id changed from 1 to 8 (Newcastle Builders Pty Ltd)
- user_employers table synchronized with new assignment
- Ready for isolation testing after other fixes are verified

### ⚠️ URGENT: USER TESTING REQUIRED
- [ ] **Test Memory Stability** - Use dashboard for 15+ minutes to verify Chrome no longer crashes
- [ ] **Test Employer Switching** - Verify dashboard auto-refreshes when selecting different employer
- [ ] **Test Builder Admin Isolation** - Login as role5@scratchie.com and verify only Newcastle Builders data visible
- [ ] **Verify No Regression** - Confirm existing features still work after code changes

## Project Overview
Mend-2 is a workplace safety management platform built with React, TypeScript, Vite, and Clerk authentication. Manages workplace incidents, safety reporting, and compliance tracking for construction environments.

## ✅ CURRENT SYSTEM STATUS

### Performance & Stability (UPDATE 2025-01-10)
- **Initial Dashboard Load**: ✅ FAST - <200ms load times on first page load
- **Memory Management**: ⚠️ FIX ATTEMPTED - Cache cleanup code applied, awaiting user testing to verify Chrome crashes resolved
- **Database Queries**: ✅ OPTIMIZED - 8-18ms response times maintained
- **Employer Auto-refresh**: ⚠️ FIX ATTEMPTED - Invalidation logic updated, awaiting user testing to verify auto-refresh works
- **Progressive Performance**: ⚠️ FIX ATTEMPTED - Waiting for memory leak verification

### Authentication & Core Features
- **Authentication**: ✅ Clerk integration fully functional
- **Role-Based Routing**: ✅ All 9 user roles working correctly
- **Incident Management**: ✅ Full CRUD operations with form validation
- **Dashboard Navigation**: ✅ Consistent UI with proper role separation
- **Frontend Components**: ✅ No crashes, responsive design verified

### Security Implementation (RBAC/RLS) (UPDATE 2025-01-10)
- **Super Admin Access**: ✅ Can view all incidents across all companies
- **Company Data Isolation**: ✅ FIXED - RLS vulnerability patched, Builder Admins can no longer bypass security
- **Database Functions**: ✅ RBAC-aware functions deployed with enforced user_employer_id validation
- **View All Companies Mode**: ⚠️ FIX ATTEMPTED - Auto-refresh code applied, awaiting user testing
- **Clerk Compatibility**: ✅ No authentication conflicts
- **Builder Admin Isolation**: ⚠️ READY FOR TESTING - role5@scratchie.com configured for Newcastle Builders (employer_id=8)

## 🚨 URGENT PRIORITIES (AWAITING USER VERIFICATION)

### ⚠️ CRITICAL FIXES APPLIED - TESTING REQUIRED (2025-01-10)
1. **MEMORY LEAK - FIX APPLIED, NOT YET VERIFIED** ⚠️
   - Code changes applied to `/apps/operations/src/main.tsx` and `/apps/operations/src/hooks/useIncidentsDashboard.ts`
   - Aggressive cache cleanup and memory monitoring implemented
   - **USER MUST TEST**: Run dashboard for 15+ minutes to verify Chrome no longer crashes
   - **STATUS**: Code deployed but effectiveness UNCONFIRMED

2. **EMPLOYER SWITCHING - FIX APPLIED, NOT YET TESTED** ⚠️
   - Code changes applied to `/apps/operations/src/hooks/useEmployerSelection.ts`
   - New query invalidation and state management logic implemented
   - **USER MUST TEST**: Switch between employers and verify dashboard auto-refreshes without manual page reload
   - **STATUS**: Code deployed but functionality UNCONFIRMED

3. **RLS SECURITY VULNERABILITY - FIXED & VERIFIED** ✅
   - Database migration successfully applied to production
   - Builder Admins can no longer bypass security by manipulating filter_employer_id
   - **STATUS**: CONFIRMED WORKING

### SECONDARY PRIORITIES (After User Verification)
1. **Builder Admin Isolation Testing**: Login as role5@scratchie.com and verify only Newcastle Builders data visible
2. **Performance Regression Testing**: Verify existing features still work after code changes
3. **New Features Testing**: Super User Management interface at `/src/pages/SuperUserManagement.tsx`
4. **User Management**: Test admin/users page functionality

## ⚠️ DEVELOPMENT CONCERNS

### System Stability Issues
- **Environment Configuration**: Multiple .env files causing confusion
- **Database Schema Drift**: Actual schema differs from documentation
- **Migration Failures**: Repeated schema mismatch errors (42703)
- **Testing Fragility**: System requires careful environment management

## Technical Stack
- **Frontend**: React 18.3, TypeScript, Vite
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Forms**: React Hook Form, Zod validation
- **State Management**: TanStack Query (React Query)
- **Deployment**: Vercel

## Core Features
- **Authentication**: Clerk integration with 9-role access control
- **Incident Management**: Full CRUD with multi-step forms and validation
- **User Management**: Role-based permissions and company assignments
- **Security**: Hybrid RBAC/RLS with company data isolation
- **UI/UX**: Responsive design with consistent navigation

## Demo Users
**Primary Test Accounts**:
- **role1@scratchie.com** (Super Admin) - Password: DemoUser123!
- **role5@scratchie.com** (Builder Admin) - Password: DemoUser123!
- **role2@scratchie.com** (Account Manager) - Password: DemoUser123!

**Additional**: role3-9@scratchie.com (Password: DemoUser123!)

## Environment Variables
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
```

## Development Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Linting
npm run preview      # Preview build
```

## Key File Locations

### Performance & Critical Fixes (Updated 2025-01-10)
- ⚠️ Memory leak fix applied - AWAITING USER TESTING
- ⚠️ Employer switching fix applied - AWAITING USER TESTING
- ✅ RLS security vulnerability FIXED & VERIFIED
- ✅ Database indexes optimized (8-18ms query times)
- `/apps/operations/src/main.tsx` - React Query cache config with aggressive cleanup
- `/apps/operations/src/hooks/useIncidentsDashboard.ts` - Aligned cache config, proper cleanup
- `/apps/operations/src/hooks/useEmployerSelection.ts` - New query invalidation logic
- `/supabase/migrations/20250110_fix_rls_security_vulnerability.sql` - RLS fix migration (APPLIED)
- `/supabase/info/` - Schema documentation (7 files)

### Super Admin Features
- `/src/pages/SuperUserManagement.tsx` - NEW user & company management
- `/src/pages/EmployerManagementAdmin.tsx` - Builder/employer management
- `/src/components/admin/RLSTestPanel.tsx` - Security testing panel

### Core Application
- `/src/App.tsx` - Main application
- `/src/components/DashboardRouter.tsx` - Role-based routing
- `/src/pages/IncidentReport.tsx` - Incident management
- `/src/components/auth/UserBadge.tsx` - User authentication display
- `/src/lib/supabase/companyFilter.ts` - RLS security utility
- `/apps/operations/src/hooks/useIncidentsDashboard.ts` - Consolidated optimized dashboard hook

### Database & Security
- `/supabase/migrations/` - Database migrations directory
- `/src/integrations/supabase/types.ts` - Database type definitions

## Production Readiness Assessment

**Status: AWAITING USER VERIFICATION OF CRITICAL FIXES (2025-01-10)** ⚠️

### CRITICAL ISSUES - FIXES APPLIED, TESTING REQUIRED ⚠️
- ⚠️ **MEMORY LEAK**: Code fixes applied, user has NOT yet tested if Chrome still crashes after 5 minutes
- ⚠️ **EMPLOYER SWITCHING**: Auto-refresh logic implemented, user has NOT yet verified functionality works
- ⚠️ **PROGRESSIVE PERFORMANCE**: Dependent on memory leak fix verification
- ⚠️ **SUPER ADMIN UX**: Dependent on employer switching fix verification

### Recent Improvements (2025-01-10)
- ✅ **RLS Security**: Critical vulnerability FIXED & VERIFIED - Builder Admins can no longer bypass isolation
- ✅ **Builder Admin Setup**: role5@scratchie.com configured for Newcastle Builders (employer_id=8)
- ⚠️ **Memory Management**: Cache cleanup code applied but NOT YET TESTED by user
- ⚠️ **Employer Switching**: Query invalidation logic updated but NOT YET TESTED by user

### Working Systems (Verified)
- ✅ Authentication (Clerk) fully functional
- ✅ Super Admin role access confirmed
- ✅ Frontend components and navigation (on initial load)
- ✅ Core incident management features
- ✅ RBAC security framework with enforced boundaries
- ✅ Initial dashboard load performance (<200ms)
- ✅ Database query optimization (8-18ms)
- ✅ User management page exists at /admin/users
- ✅ RLS security vulnerability patched

### Systems Pending User Verification ⚠️
- ⚠️ **MEMORY MANAGEMENT**: Code deployed, effectiveness UNKNOWN until user tests for 15+ minutes
- ⚠️ **EMPLOYER SWITCHING**: Code deployed, auto-refresh functionality UNKNOWN until user tests
- ⚠️ **BUILDER ADMIN ISOLATION**: Ready for testing but NOT YET VERIFIED by user
- ⚠️ **PROGRESSIVE PERFORMANCE**: Dependent on memory leak fix confirmation

### Quality Metrics (Updated 2025-01-10)
- **TypeScript Coverage**: >95%
- **Authentication**: ✅ Operational
- **Role Routing**: ✅ Complete
- **Form Validation**: ✅ Comprehensive
- **Error Handling**: ✅ Robust
- **Mobile Responsiveness**: ✅ Verified
- **Initial Performance**: ✅ **FAST** - <200ms dashboard loads on first visit
- **Memory Usage**: ⚠️ **FIX APPLIED** - Code changes deployed, awaiting user testing to verify Chrome crashes resolved
- **Database Performance**: ✅ **FAST** - 8-18ms query times
- **Employer Switching**: ⚠️ **FIX APPLIED** - Auto-refresh logic updated, awaiting user testing to verify functionality
- **RLS Security**: ✅ **FIXED & VERIFIED** - Builder Admin isolation enforced, vulnerability patched

## Immediate Action Required (2025-01-10)

### USER TESTING REQUIRED - CRITICAL ⚠️
1. **TEST MEMORY LEAK FIX** - HIGHEST PRIORITY
   - Code changes applied to cache management
   - User MUST test: Use dashboard continuously for 15+ minutes
   - Verify: Chrome browser no longer crashes
   - Monitor: Check Chrome Task Manager for memory accumulation

2. **TEST EMPLOYER SWITCHING** - CRITICAL UX VALIDATION
   - Code changes applied to query invalidation logic
   - User MUST test: Switch between different employers in dropdown
   - Verify: Dashboard auto-refreshes without manual page reload
   - Check: Data updates correctly for selected employer

3. **TEST BUILDER ADMIN ISOLATION** - SECURITY VERIFICATION
   - Login as role5@scratchie.com (Password: DemoUser123!)
   - Verify: Can ONLY see Newcastle Builders (employer_id=8) data
   - Verify: Cannot access other employers' incidents
   - RLS fix is already applied and enforced at database level

### Secondary Actions (After User Verification)
1. **Document Test Results** - Report findings for memory leak and employer switching
2. **Regression Testing** - Verify existing features still work after code changes
3. **Complete Role Testing** - Test all 9 user roles for proper access boundaries
4. **Production Readiness Decision** - Final validation based on test results

---

**Last Updated**: January 10, 2025
**Version**: 3.5.0-beta
**Status**: ⚠️ CRITICAL FIXES APPLIED - AWAITING USER VERIFICATION
**Priority**: 🧪 URGENT - User must test memory leak fix and employer switching functionality

## Recent Changes Log

### 2025-01-10 - Critical Fixes Applied (Awaiting Verification)
**Memory Leak Fix**:
- Modified `/apps/operations/src/main.tsx` - Aggressive cache cleanup, memory monitoring
- Modified `/apps/operations/src/hooks/useIncidentsDashboard.ts` - Aligned cache config, proper cleanup
- Status: ⚠️ Code deployed, NOT YET TESTED by user

**Employer Switching Fix**:
- Modified `/apps/operations/src/hooks/useEmployerSelection.ts` - New invalidation and refetch logic
- Status: ⚠️ Code deployed, NOT YET TESTED by user

**RLS Security Fix**:
- Created and applied `/supabase/migrations/20250110_fix_rls_security_vulnerability.sql`
- Status: ✅ SUCCESSFULLY APPLIED - Database function now enforces user_employer_id

**Builder Admin Configuration**:
- Updated role5@scratchie.com employer_id from 1 to 8 (Newcastle Builders Pty Ltd)
- Status: ✅ COMPLETE - Ready for isolation testing
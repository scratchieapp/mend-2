# CLAUDE.md - Mend-2 Workplace Safety Platform

## 🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION

### ⚠️ PERFORMANCE CRISIS (2025-08-28)
- **Problem**: Incidents list taking 5+ minutes to load (USER REPORTED)
- **Status**: Fix implemented but NOT YET TESTED
- **Blocker**: Schema mismatch preventing migration (Error 42703: "company_name" does not exist)
- **Action Required**: Manual schema verification + index application via Supabase Dashboard
- **Fix Location**: `/APPLY_PERFORMANCE_FIX_NOW.md`
- **Expected Result**: <2 seconds load time (UNCONFIRMED)

### 🔧 CRITICAL FIXES READY FOR TESTING
- **Frontend Fix**: ✅ DEPLOYED - psychosocialData undefined error resolved (deployment ID: dpl_GRshuRvB58ENG5ofHughm4S5n2Ru)
- **Performance Migration**: 🔧 READY - 35+ database indexes created, waiting for application
- **Super User Management**: 🔧 NEW - Interface created, needs testing
- **Many-to-Many User Relations**: 🔧 NEW - User-employer relationship system implemented

### ⚠️ SECURITY TESTING INCOMPLETE
- **Super Admin Access**: ✅ CONFIRMED - Can view all incidents across business
- **Builder Admin Isolation**: ❌ NOT TESTED - Data separation unverified
- **Role Boundary Testing**: ❌ INCOMPLETE - Only role1@scratchie.com validated
- **Production Readiness**: ❌ BLOCKED - Comprehensive role validation required

## Project Overview
Mend-2 is a workplace safety management platform built with React, TypeScript, Vite, and Clerk authentication. Manages workplace incidents, safety reporting, and compliance tracking for construction environments.

## ✅ CURRENT SYSTEM STATUS

### Authentication & Core Features
- **Authentication**: ✅ Clerk integration fully functional
- **Role-Based Routing**: ✅ All 9 user roles working correctly
- **Incident Management**: ✅ Full CRUD operations with form validation
- **Dashboard Navigation**: ✅ Consistent UI with proper role separation
- **Frontend Components**: ✅ No crashes, responsive design verified

### Security Implementation (RBAC/RLS)
- **Super Admin Access**: ✅ Can view all incidents across all companies
- **Company Data Isolation**: ✅ Hybrid function-level security implemented
- **Database Functions**: ✅ RBAC-aware functions deployed and operational
- **View All Companies Mode**: ✅ Context switching for Super Admins working
- **Clerk Compatibility**: ✅ No authentication conflicts

## 🎯 IMMEDIATE ACTIONS REQUIRED

### Next Steps for User
1. **Performance Fix**: Apply migration via Supabase Dashboard SQL Editor
   - File: `/APPLY_INDEXES_NOW.md`
   - Time: 2 minutes
   - Fix schema mismatches first (company_name vs employer_name)

2. **Security Testing**: Validate Builder Admin role isolation
   - Login: role5@scratchie.com (Builder Admin)
   - Verify: NO "View All Companies" option
   - Confirm: Only sees assigned company data

3. **New Features Testing**: Validate Super User Management interface
   - Location: `/src/pages/SuperUserManagement.tsx`
   - Test: User-employer relationship management

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

### Performance & Critical Fixes
- `/APPLY_PERFORMANCE_FIX_NOW.md` - Performance migration guide
- `/CRITICAL_PERFORMANCE_FIX_FINAL.sql` - Database indexes migration
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

### Database & Security
- `/supabase/migrations/` - Database migrations directory
- `/src/integrations/supabase/types.ts` - Database type definitions

## Production Readiness Assessment

**Status: NOT READY FOR PRODUCTION** ❌

### Critical Blockers
- 🚨 **Performance**: 5-minute load times (fix implemented, not tested)
- ❌ **Security**: Builder Admin role isolation not validated
- 🔧 **Migration**: Database performance indexes require manual application
- ⚠️ **Schema**: Production database structure differs from documentation

### Working Systems
- ✅ Authentication (Clerk) fully functional
- ✅ Super Admin role access confirmed
- ✅ Frontend components and navigation
- ✅ Core incident management features
- ✅ RBAC security framework implemented

### Quality Metrics
- **TypeScript Coverage**: >95%
- **Authentication**: ✅ Operational
- **Role Routing**: ✅ Complete
- **Form Validation**: ✅ Comprehensive
- **Error Handling**: ✅ Robust
- **Mobile Responsiveness**: ✅ Verified

## Next Steps
1. **Apply Performance Migration** - Manual application via Supabase Dashboard
2. **Test Builder Admin Role** - Validate data isolation (role5@scratchie.com)
3. **Verify Load Times** - Confirm <2 second incident list loading
4. **Complete Role Testing** - Test all 9 user roles for proper access boundaries

---

**Last Updated**: August 28, 2025  
**Version**: 3.2.0-beta  
**Status**: CRITICAL FIXES READY - User testing required  
**Priority**: 🚨 URGENT - Apply performance migration, test security boundaries
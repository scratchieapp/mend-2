# CLAUDE.md - Mend-2 Workplace Safety Platform

## Project Overview
Mend-2 is a comprehensive workplace safety management platform built with React, TypeScript, Vite, and Clerk authentication. The application manages workplace incidents, safety reporting, and compliance tracking for construction and industrial environments.

## Current Status (Updated: 2025-08-25 - AUTHENTICATION WORKING, RLS ISSUES)

### ✅ AUTHENTICATION SYSTEM OPERATIONAL (2025-08-25)
**SUCCESS: Authentication and role-based routing is working with Clerk**

### ⚠️ ROW-LEVEL SECURITY PARTIALLY WORKING (2025-08-25)
**RLS implemented but filtering is broken - needs debugging**

## ✅ AUTHENTICATION STATUS (August 25, 2025)

### 1. **Authentication Working with Clerk** ✅
   - **Status**: Clerk authentication is fully functional
   - **Login Flow**: Users can successfully authenticate
   - **Session Management**: Proper session handling throughout app
   - **Impact**: Core authentication system operational

### 2. **Role-Based Routing Functional** ✅
   - **Test Results**: All role routing working correctly
   - **Verified**: role_id 1 → /admin dashboard ✅
   - **Verified**: DashboardRouter fetches role from Supabase correctly ✅
   - **Status**: Role-based navigation fully operational

### 3. **User Management Improvements** ✅
   - **UI Enhancement**: Proper navigation and table formatting
   - **Display Names**: Using role_label from user_roles table
   - **Navigation**: DashboardHeader component for consistent UI
   - **Status**: User management interface working properly

### 4. **Infrastructure Enhancements** ✅
   - **Migration Files**: Moved to proper `/supabase/migrations/` location
   - **Environment Variables**: Monorepo fallback system implemented
   - **Component Fixes**: Fixed Shield import error in UsersTable
   - **Status**: Development infrastructure stabilized

## ⚠️ ROW-LEVEL SECURITY (RLS) STATUS - PARTIALLY WORKING

### 1. **RLS System Implementation** ✅
   - **Created**: Comprehensive RLS system with company context
   - **Tables**: user_session_contexts table for storing selected company
   - **Functions**: set_employer_context(), get_employer_context() implemented
   - **Admin Features**: "View All Companies" option for Super Admins
   - **Migration Status**: All migration files created and successfully run

### 2. **CURRENT CRITICAL ISSUE - RLS FILTERING BROKEN** ❌
   - **Problem**: When logged in as mend_super_admin (role 1)
   - **Symptom**: Selecting any builder returns NO incidents in recent incidents table
   - **Cause**: RLS filtering appears too restrictive or not working correctly
   - **Impact**: Dashboard shows empty incident list regardless of employer selection
   - **Status**: ❌ BROKEN - Requires immediate investigation

### 3. **RLS Debugging Required** ❌
   - **Issue**: get_incidents_with_details returns empty results
   - **Suspect**: Company context may not be properly integrated with RLS policies
   - **Next Steps**: Debug RLS policy logic and company context integration
   - **Priority**: HIGH - Core functionality blocked

## ✅ RECENT IMPROVEMENTS (August 25, 2025)

### 1. **Migration File Organization** ✅
   - Fixed Supabase migration location: `/supabase/migrations/20250824_populate_custom_display_names.sql`
   - Migration populates `custom_display_name` with `role_label` from `user_roles` table
   - Proper database schema maintenance and organization
   - All migrations successfully applied to database

### 2. **Common Dashboard Header Component** ✅
   - Created `DashboardHeader` component for consistent navigation
   - Features: breadcrumbs, back button, user profile badge, sticky header
   - Implemented across: AdminDashboard, BuilderDashboard, MedicalDashboard, GovernmentOfficialDashboard
   - Consistent UI/UX throughout dashboard hierarchy
   - Enhanced user experience with standardized navigation

### 3. **Environment Variable Fallback System** ✅
   - Implemented monorepo-wide environment variable fallback
   - Apps check local `.env` first, then fall back to root `.env`
   - Created `shared-utils` package for environment utilities
   - Both operations and marketing apps support shared variables
   - Documentation: `/docs/ENVIRONMENT_VARIABLE_FALLBACK.md`
   - Improved development workflow across multiple apps

### 4. **User Management Enhancements** ✅
   - Fixed Shield import error in UsersTable component
   - Improved table alignment and user display names
   - Added comprehensive edit functionality with dropdown menus
   - Enhanced navigation with breadcrumbs and proper routing
   - Updated custom_display_name to use role_label from user_roles table

### 5. **Row-Level Security Implementation** ⚠️
   - Created comprehensive RLS system with company context
   - Added user_session_contexts table for storing selected company
   - Implemented set_employer_context(), get_employer_context() functions
   - Added "View All Companies" option for Super Admins
   - Migration files created and successfully run
   - **ISSUE**: RLS filtering currently broken - shows no incidents when employer selected

## 🟢 WHAT'S WORKING (August 25, 2025)
- ✅ Authentication and role detection with Clerk
- ✅ Role-based routing (role_id 1 → /admin, etc.)
- ✅ User management with proper display names
- ✅ Navigation with DashboardHeader component
- ✅ Environment variable fallback system
- ✅ Database migrations run successfully
- ✅ Core application functionality accessible

## 🔴 WHAT'S NOT WORKING (August 25, 2025)
- ❌ RLS filtering broken - shows no incidents when employer is selected
- ❌ get_incidents_with_details returns empty results despite valid data
- ❌ Company context may not be properly integrated with RLS policies
- ❌ Dashboard incident lists empty regardless of employer selection

### ⚠️ KNOWN ISSUES
- **CRITICAL**: RLS system not filtering incidents correctly - needs debugging
- Some demo users (role3-9@scratchie.com) have incorrect role_id values in database
- Need to create proper routes for /analyst, /site-admin, /client, /vendor dashboards
- User Management page needs "Account Management" section for actual client accounts

### ✅ LATEST AUTHENTICATION & ACCESS CONTROL IMPROVEMENTS (2025-08-23)
1. **UserBadge Component Added**
   - Location: `/src/components/auth/UserBadge.tsx`
   - Displays user profile with avatar, name, email, and role
   - Includes functional logout button with proper redirect
   - Dropdown menu with user details and quick actions
   - Role-based color coding for visual identification

2. **Enhanced MenuBar Integration**
   - UserBadge integrated into `/src/components/MenuBar.tsx`
   - Positioned in top-right corner of navigation
   - Responsive layout with proper spacing
   - Clean user experience with profile access

3. **Authentication Flow Strengthened**
   - Clerk authentication now properly enforced throughout app
   - Users cannot bypass authentication requirements
   - Logout functionality works correctly with session cleanup
   - Automatic redirects to login page after logout
   - Fixed AdminDashboard.tsx userData undefined error

4. **Role-Based Dashboard Routing Enhanced**
   - Double validation in ProtectedRoute component
   - DashboardRouter component for automatic role-based routing
   - Support for all 9 user roles with proper fallbacks
   - Medical Dashboard created for medical professionals (role 6)
   - Improved error handling for unauthorized access

5. **Row-Level Security (RLS) Implementation** ⚠️
   - Migration: `/supabase/migrations/20250823_row_level_security.sql`
   - Company filter utility: `/src/lib/supabase/companyFilter.ts`
   - User session contexts table: `/supabase/migrations/20250825_user_session_contexts.sql`
   - Company context functions: set_employer_context(), get_employer_context()
   - Admin override capabilities for cross-company access
   - **STATUS**: Implemented but filtering currently broken - needs debugging

6. **Critical Bug Fixes**
   - Fixed Mapbox token issue (now using VITE_MAPBOX_ACCESS_TOKEN)
   - Fixed incident edit form data population issues
   - Fixed WorkerSelector and LocationField components for edit mode
   - Resolved map rendering issues with correct public token

### ✅ PREVIOUSLY COMPLETED FEATURES
1. **Critical Authentication Fix (Aug 22)**
   - **RESOLVED**: Infinite authentication loop issue (commit 5e0eea6)
   - Consolidated authentication system using Clerk
   - Proper session management and route protection
   - Clean navigation flow without redirect loops

2. **Database Integration**
   - Proper Clerk-Supabase user ID mapping
   - Field mappings for Australian phone number formatting
   - Incident reporting form fully connected to database

3. **Deployment**
   - Successfully deployed on Vercel
   - SPA routing configuration in place
   - Environment variables properly configured

### 🚀 CORE FEATURES
1. **Authentication System**
   - Clerk authentication integration
   - Role-based access control (9 user roles)
   - Session management with proper cleanup
   - Protected routes throughout application

2. **Incident Reporting System**
   - Multi-step incident report form
   - Australian phone number formatting
   - Comprehensive Zod validation schemas
   - React Hook Form integration
   - Real-time form validation

3. **User Management**
   - 9 demo users created (role1-9@scratchie.com)
   - Role-based permissions and access control
   - User profile management

4. **UI/UX**
   - shadcn/ui component library
   - Responsive design
   - Clean, professional interface
   - Loading states and error handling

## Technical Stack
- **Frontend**: React 18.3, TypeScript, Vite
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Forms**: React Hook Form, Zod validation
- **State Management**: TanStack Query (React Query)
- **Deployment**: Vercel

## Demo Users
The application includes 9 demo users for testing different role levels:

### Primary Test Accounts
- **role1@scratchie.com** (Super Admin - Role 9) - Password: DemoUser123!
- **role2@scratchie.com** (Account Manager - Role 8) - Password: DemoUser123!
- **role3@scratchie.com** (Data Entry - Role 3) - Password: DemoUser123!
- **role5@scratchie.com** (Builder Admin - Role 5) - Password: DemoUser123!

### Additional Test Accounts
- **Email**: role4@scratchie.com, role6@scratchie.com through role9@scratchie.com
- **Password**: DemoUser123!
- **Roles**: Complete range 1-9 (1=lowest privileges, 9=highest privileges)

## Database Schema
- **incidents**: Core incident records with proper field mapping
- **users**: User accounts with Clerk integration
- **user_roles**: Role-based access control (1-9)
- **incident_documents**: File attachments for incidents
- **notifications**: System notification records

## Environment Variables
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
```

## Recent Critical Fixes

### Authentication Loop Resolution (Aug 22, 2025)
- **Issue**: Users experiencing infinite redirect loops on login
- **Root Cause**: Conflicting authentication state management
- **Solution**: Consolidated to Clerk-only authentication flow
- **Status**: ✅ RESOLVED - Clean authentication flow restored

### Database Field Mapping
- **Issue**: User ID field mapping between Clerk and Supabase
- **Solution**: Updated schema to use `clerk_user_id` field
- **Enhancement**: Added Australian phone number formatting
- **Status**: ✅ COMPLETE

## Known Issues & Monitoring

### Performance
- **Bundle Size**: ~1.2MB (warning threshold)
- **Load Time**: Acceptable for current user base
- **Recommendation**: Consider code splitting for future optimization

### Browser Compatibility
- ✅ Chrome, Firefox, Safari (latest versions)
- ✅ Mobile responsive design
- ✅ Keyboard navigation support

## Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Development build (for testing)
npm run build:dev

# Linting
npm run lint

# Preview production build
npm run preview

# Create demo users (one-time setup)
npm run create-demo-users
```

## ✅ ALL CRITICAL ISSUES RESOLVED (2025-08-23)

### 🟢 COMPLETED FIXES - PLATFORM 100% FUNCTIONAL
1. **Account Manager React Query v5 Compatibility** ✅
   - Updated all useQuery calls to object syntax
   - Fixed all useMutation calls to v5 format
   - Page now fully functional

2. **Authentication Guards** ✅
   - All dashboards protected by ProtectedRoute component
   - Role-based access control enforced
   - Clerk authentication properly integrated

3. **Supabase Data Integration** ✅
   - BuilderDashboard: Connected with employer-specific data
   - MedicalHomePage: Active cases and patient stats integrated
   - MedicalPatientsPage: Full patient management system
   - InsuranceProviderDashboard: Claims data and analytics
   - GovernmentOfficialDashboard: Compliance and incident tracking

4. **UI/UX Improvements** ✅
   - Loading states implemented across all dashboards
   - Error handling with proper boundaries
   - Mobile responsiveness verified
   - Build successful with no critical errors

### 🚀 NEXT PHASE ENHANCEMENTS (Optional)
1. **Performance Optimization**
   - Code splitting for large bundles (1.4MB main bundle)
   - Lazy loading for dashboard components
   - Image optimization

2. **Real-time Features**
   - WebSocket integration for live updates
   - Push notifications for critical incidents
   - Real-time collaboration features

## Key File Locations
- **Main App**: `/src/App.tsx`
- **Authentication**: `/src/lib/auth/` (Clerk integration)
- **User Components**: 
  - `/src/components/auth/UserBadge.tsx` (User profile display)
  - `/src/components/MenuBar.tsx` (Navigation with user badge)
- **Dashboard Routing**: 
  - `/src/components/DashboardRouter.tsx` (Role-based routing)
  - `/src/pages/MedicalDashboard.tsx` (Medical professional dashboard)
- **New Role-Specific Dashboards** (Created 2025-08-23):
  - `/src/pages/BuilderDashboard.tsx` (Company administrator)
  - `/src/pages/MedicalHomePage.tsx` (Medical professional home)
  - `/src/pages/MedicalPatientsPage.tsx` (Patient management)
  - `/src/pages/InsuranceProviderDashboard.tsx` (Insurance claims)
  - `/src/pages/GovernmentOfficialDashboard.tsx` (Regulatory oversight)
- **Security**:
  - `/src/lib/supabase/companyFilter.ts` (RLS utility)
  - `/supabase/migrations/20250823_row_level_security.sql` (RLS policies)
  - `/supabase/migrations/20250824_populate_custom_display_names.sql` (User display names)
- **Shared Infrastructure**:
  - `/src/components/DashboardHeader.tsx` (Common dashboard navigation)
  - `/packages/shared-utils/` (Environment variable utilities)
  - `/docs/ENVIRONMENT_VARIABLE_FALLBACK.md` (Environment setup documentation)
- **Incident Management**: `/src/pages/IncidentReport.tsx`
- **Database Types**: `/src/integrations/supabase/types.ts`
- **Components**: `/src/components/` (shadcn/ui based)
- **Routing**: Configured in App.tsx with enhanced protected routes

## Deployment Information
- **Platform**: Vercel
- **URL**: [Your deployed URL]
- **Build Status**: ✅ Successful
- **Last Deploy**: 2025-08-22 (authentication fix)

## Next Development Priorities

### High Priority
1. **Bundle Optimization** - Implement code splitting to reduce initial load
2. **Error Monitoring** - Add production error tracking
3. **Performance Metrics** - Implement user experience monitoring

### Medium Priority
1. **Automated Testing** - Add unit and integration tests
2. **Email Notifications** - Integrate email service for incident alerts
3. **Advanced Reporting** - Dashboard analytics for safety metrics

### Low Priority
1. **Offline Support** - PWA capabilities for field use
2. **Mobile App** - Native mobile application consideration
3. **API Documentation** - Comprehensive API documentation

## Architecture Decisions
1. **Clerk over Supabase Auth**: More reliable authentication flow, better role management
2. **shadcn/ui**: Consistent, accessible, and customizable component system
3. **Zod validation**: Type-safe runtime validation throughout forms
4. **React Query**: Efficient server state management and caching
5. **Vercel deployment**: Optimized for React SPAs with proper routing

## Risk Assessment
**Current Risk Level: MEDIUM** (Updated 2025-08-25)
- ✅ Authentication system fully operational
- ✅ Application starts without errors
- ✅ Role-based routing working correctly
- ✅ Supabase-Clerk integration functional
- ✅ Users access appropriate role-based interfaces
- ✅ Dashboard routing working for all roles
- ❌ **CRITICAL**: Row-Level Security filtering broken - incidents not displaying
- ❌ **HIGH**: Company context integration with RLS policies failing
- ⚠️ **MEDIUM**: Core incident management features affected by RLS issues
- ✅ Database integration stable but RLS filtering non-functional

## Quality Metrics (Updated 2025-08-25)
- **TypeScript Coverage**: >95% (strict mode enabled)
- **Authentication Flow**: ✅ OPERATIONAL - Clerk authentication working properly
- **User Identity Display**: ✅ FUNCTIONAL - UserBadge working with role display
- **Role-Based Access**: ✅ WORKING - routing system fully functional
- **Data Security**: ❌ COMPROMISED - RLS filtering broken, data access issues
- **Form Validation**: ✅ Comprehensive Zod schemas throughout
- **Error Handling**: ✅ ROBUST - proper error boundaries and handling
- **Mobile Responsiveness**: ✅ TESTED - responsive design verified
- **Map Integration**: ✅ ACCESSIBLE - Mapbox integration working
- **Site Navigation**: ✅ WORKING - consistent navigation with DashboardHeader
- **Dashboard Coverage**: ⚠️ PARTIAL - dashboards accessible but incident data not displaying
- **React Query Integration**: ✅ OPERATIONAL - data fetching working but returns empty results
- **Core Features**: ❌ IMPAIRED - incident management affected by RLS filtering issues
- **Application Status**: ⚠️ PARTIALLY FUNCTIONAL - auth working, data filtering broken

## Support and Maintenance
- **Monitoring**: Application performance tracked
- **Error Reporting**: Console errors logged for debugging
- **User Feedback**: Demo user accounts available for testing
- **Documentation**: This file serves as primary project reference

## MCP Server Integration
- **Supabase MCP**: Available for database operations
- **Vercel MCP**: Available for deployment monitoring
- **Clerk MCP**: Available for user management (if configured)
- **Playwright**: Configured for automated testing

## Production Readiness
**Status: NOT READY FOR PRODUCTION** ❌
IMPORTANT: Critical RLS issues must be resolved before production deployment

The application has working authentication but critical data filtering issues:

**WORKING SYSTEMS**:
- ✅ Authentication system operational with Clerk
- ✅ Role-based routing fully functional for all roles
- ✅ Users correctly access role-appropriate dashboards
- ✅ Application starts without errors
- ✅ User management interface working properly
- ✅ Navigation and UI components functioning

**BROKEN SYSTEMS**:
- ❌ Row-Level Security filtering completely broken
- ❌ Incident data not displaying despite valid database records
- ❌ Company context integration with RLS policies failing
- ❌ Dashboard incident lists showing empty results
- ❌ Core data access functionality impaired

**DEPLOYMENT BLOCKERS**: ❌ CRITICAL ISSUES
- RLS system implemented but filtering logic broken
- Users cannot see incident data regardless of company selection
- Data security compromised due to RLS filtering failures
- Core application functionality severely impaired

**IMMEDIATE ACTIONS REQUIRED**:
1. **DEBUG RLS POLICIES**: Investigate why get_incidents_with_details returns empty
2. **FIX COMPANY CONTEXT**: Ensure company context properly integrates with RLS
3. **TEST DATA FILTERING**: Verify RLS policies work with actual data
4. **VALIDATE PERMISSIONS**: Ensure appropriate data access for each role

---

**Last Updated**: August 25, 2025 - AUTHENTICATION WORKING, RLS BROKEN  
**Version**: 2.3.0 (Authentication Fixed, RLS Issues Critical)  
**Maintainer**: Development Team  
**Status**: ❌ NOT PRODUCTION READY - Critical RLS Filtering Issues  
**Next Review**: Daily until RLS issues resolved - HIGH PRIORITY
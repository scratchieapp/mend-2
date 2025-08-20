# CLAUDE.md - Mend-2 Workplace Safety Platform

## Project Overview
Mend-2 is a comprehensive workplace safety management platform built with React, TypeScript, and Supabase. The application manages workplace incidents, safety reporting, and compliance tracking for construction and industrial environments.

## Current Status (Updated: 2025-08-20)

### ✅ COMPLETED FEATURES
1. **Authentication System**
   - Supabase Auth integration with automatic token refresh
   - Session management with 1-hour timeout and 5-minute warning
   - Protected routes with role-based access control
   - Error boundary implementation for graceful failure handling

2. **Role-Based Access Control (RBAC)**
   - 9 distinct user roles implemented
   - Hierarchical permission system
   - Route-level and component-level protection
   - Role validation throughout the application

3. **Incident Reporting System**
   - Multi-step form with 8 sections
   - Comprehensive Zod validation schemas
   - React Hook Form integration
   - Progress tracking and navigation
   - Autosave capability (structure in place)

4. **File Upload System**
   - Drag-and-drop file upload interface
   - Supabase Storage integration
   - Support for images, PDFs, and Word documents
   - Progress tracking and error handling
   - File size and type validation

5. **Notification System**
   - Email notification framework (placeholders)
   - SMS notification framework (placeholders)
   - Database notification records
   - Integration with incident submission workflow

6. **Admin Dashboard**
   - Comprehensive admin interface
   - Role-based feature access
   - Links to all admin functions
   - Storage setup utilities

7. **Error Handling & Monitoring**
   - Global error boundaries
   - Component-level error recovery
   - Centralized error logging service
   - Development vs production error display

## Technical Stack
- **Frontend**: React 18.3, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form, Zod validation
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Testing**: Playwright (UI testing configured)

## Database Schema
- **incidents**: Core incident records
- **incident_documents**: File references for incident documentation
- **notifications**: Notification records and tracking
- **users**: User accounts with UUID primary keys
- **user_roles**: 9 distinct roles (1-9)
- **employers, workers, sites**: Related entity tables

## Quality Assessment

### Code Quality Report (from code-reviewer agent)
- **Score**: 6/10 (Good foundation, needs security fixes)
- **Critical Issues**:
  - 58 TypeScript `any` type violations
  - File upload security vulnerabilities
  - Authentication state race conditions
  - Inconsistent validation schemas
  - Memory leaks in error logging

### Test Coverage (from test-execution-specialist)
- **Build Status**: ✅ Successful
- **TypeScript Compilation**: ✅ No errors
- **ESLint Issues**: 67 violations (58 errors, 9 warnings)
- **Automated Tests**: ❌ No test suite implemented
- **Manual Testing**: ✅ Core functionality verified

### UI/UX Analysis (from shadcn-ui-designer)
- **Strengths**: Good shadcn/ui foundation, proper error boundaries
- **Issues**: No mobile navigation, limited loading states, accessibility gaps
- **Recommendations**: Sheet-based mobile nav, skeleton loaders, ARIA labels

### Playwright UI Testing
- **Login Page**: ✅ Validation working
- **Error Handling**: ✅ Proper error messages
- **Keyboard Navigation**: ✅ Tab navigation functional
- **Mobile Responsive**: ✅ Renders on mobile viewport

## Critical Issues to Address Before Production

### 🔴 HIGH PRIORITY (Security)
1. **File Upload Security**
   - Insufficient file name sanitization (path traversal risk)
   - No virus scanning implementation
   - Missing access control validation
   - Fix: Implement UUID-based naming, add content validation

2. **TypeScript Type Safety**
   - 58 instances of `any` types
   - Fix: Create proper interfaces, enable strict mode

3. **Input Sanitization**
   - Direct database queries without sanitization
   - Fix: Add input validation layer

### 🟡 MEDIUM PRIORITY (Stability)
1. **Memory Leaks**
   - Error logger accumulates without cleanup
   - Session storage keys never cleared
   - Fix: Implement proper cleanup routines

2. **Race Conditions**
   - Authentication state updates
   - Session refresh conflicts
   - Fix: Add mutex patterns for critical sections

3. **Validation Inconsistency**
   - Multiple validation schemas for same data
   - Fix: Consolidate to single source of truth

### 🟢 LOW PRIORITY (Enhancement)
1. **Test Coverage**
   - No automated tests
   - Fix: Add Jest, React Testing Library

2. **Performance**
   - Large bundle size (1.1MB)
   - Fix: Implement code splitting

3. **Accessibility**
   - Missing ARIA labels
   - Fix: Add proper accessibility attributes

## Migration Instructions
Run the corrected migration:
```sql
/supabase/migrations/20240101000001_incident_documents_fixed.sql
```

## Environment Variables Required
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps for Production Deployment

### Immediate Actions (1-2 days)
1. Fix all TypeScript `any` types
2. Secure file upload implementation
3. Add input sanitization
4. Fix memory leaks

### Short Term (1 week)
1. Implement automated testing
2. Add proper error codes
3. Enhance form autosave
4. Add loading skeletons

### Long Term (2-4 weeks)
1. Implement email service integration (SendGrid/AWS SES)
2. Add SMS notifications (Twilio)
3. Performance optimization
4. Complete accessibility audit

## Commands
```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Start Supabase locally (if configured)
npx supabase start
```

## Key Files and Locations
- **Authentication**: `/src/lib/auth/AuthContext.tsx`
- **Role Management**: `/src/lib/auth/roles.ts`
- **Incident Report Form**: `/src/pages/IncidentReport.tsx`
- **File Upload**: `/src/components/FileUpload.tsx`
- **Error Handling**: `/src/lib/monitoring/errorLogger.ts`
- **Admin Dashboard**: `/src/pages/AdminDashboard.tsx`
- **Database Types**: `/src/integrations/supabase/types.ts`
- **Migrations**: `/supabase/migrations/`

## Documentation and MCP servers generally
- There is a Context7 MCP server, so make sure to use that whenever you need documentation from something.
- The Supabase MCP is crucial for interacting with the database. If anything is not connected or not working, then you need to let me know so I can fix that.There is a specialist sub-agent for Supabase.
- Use Playwright for any testing.
- There is also a Vercel MCP, so you can check out the logs if any builds are failing.And just anything else with regards to deployment.

## Architecture Decisions
1. **Supabase over custom backend**: Faster development, built-in auth
2. **shadcn/ui components**: Consistent, accessible, customizable
3. **Zod validation**: Type-safe runtime validation
4. **React Query**: Efficient server state management
5. **Error boundaries**: Graceful error recovery

## Known Limitations
1. Notifications are placeholders (no actual email/SMS sending)
2. No automated test coverage
3. Bundle size needs optimization
4. Some accessibility features missing
5. No offline support

## Contact and Support
This is an internal workplace safety management system. For issues or questions:
- Review migration instructions in `/MIGRATION_INSTRUCTIONS.md`
- Check UI/UX recommendations in `.claude/doc/ui-ux-analysis-recommendations.md`
- Ensure all environment variables are configured

## Risk Assessment
**Current Risk Level: MEDIUM**
- Application is functionally complete
- Security vulnerabilities need addressing
- Code quality issues impact maintainability
- No critical runtime bugs identified

## EXTREMELY IMPORTANT: Code Quality Checks
**Always run the following commands before completing any task.**

1. Automatically use the IDE's built-in diagnostics tool to check for linting and type errors:
- You can use the error checking sub-agent
- If Code Rabbit is available, then use that.
- Do this for every file that you create or modify.

This is a critical step that must never be skipped when working on any code-related task.

## Recommendation
The application is ready for **staging deployment** and user acceptance testing, but requires the high-priority security fixes before production deployment. Estimated time to production-ready: 3-5 days of focused development.
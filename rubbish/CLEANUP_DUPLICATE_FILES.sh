#!/bin/bash
# Script to clean up duplicate performance fix files
# Run this after verifying the main fix works

echo "Cleaning up duplicate performance fix files..."

# Remove duplicate SQL files (keeping ULTIMATE_PERFORMANCE_FIX.sql as main reference)
rm -f CRITICAL_PERFORMANCE_FIX_FINAL.sql
rm -f COMPLETE_PERFORMANCE_FIX.sql
rm -f APPLY_PERFORMANCE_FIX_NOW.sql
rm -f DEBUG_DASHBOARD_20_SECONDS.sql
rm -f DEBUG_DASHBOARD_PERFORMANCE.sql
rm -f FIX_10_SECOND_DELAY.sql
rm -f diagnose_performance.sql
rm -f APPLY_PERFORMANCE_FIX_SQL.md

# Remove duplicate MD documentation files
rm -f MASSIVE_PERFORMANCE_FIX_SUMMARY.md
rm -f CRITICAL_FIX_HANGING_REQUESTS.md
rm -f DIAGNOSE_HANGING_REQUEST.md
rm -f DEBUG_HANGING_QUERY.md
rm -f DASHBOARD_WORKING_NOW.md
rm -f FIX_EMPLOYER_CONTEXT_ERROR.md
rm -f FIX_DASHBOARD_FINAL.md
rm -f CRITICAL_DASHBOARD_FIX.md
rm -f FIX_DASHBOARD_10_SECONDS_V2.md
rm -f FIX_DASHBOARD_10_SECONDS.md
rm -f DASHBOARD_8_SECOND_PROBLEM_IDENTIFIED.md
rm -f FINAL_DASHBOARD_FIX_SUMMARY.md
rm -f PERFORMANCE_OPTIMIZATION_DEPLOYMENT.md
rm -f APPLY_CRITICAL_FIX_NOW.md
rm -f FIX_INCIDENTS_DISPLAY_ISSUE.md
rm -f CRITICAL_INFINITE_CLERK_TOKENS_FIX.md
rm -f INFINITE_LOOP_FIXED_FINAL.md
rm -f AUTHENTICATION_FIX_COMPLETE.md
rm -f AUTHENTICATION_FLOW_FIXES_SUMMARY.md
rm -f DEPLOYMENT_FIX_INSTRUCTIONS.md
rm -f RLS_FIX_SUMMARY.md
rm -f FIX_SUMMARY.md
rm -f APPLY_USER_EMPLOYERS_FIX.md
rm -f VERCEL_DEPLOYMENT_INFO.md

# Remove test files
rm -f test-dashboard-performance.js

# Count files removed
echo "Cleanup complete! Removed duplicate files."
echo ""
echo "Keeping these essential files:"
echo "  - ULTIMATE_PERFORMANCE_FIX.sql (main database fix)"
echo "  - EXECUTE_IN_SUPABASE_SQL_EDITOR.sql (ready to apply)"
echo "  - EXECUTE_INDEXES_SEPARATELY.sql (indexes)"
echo "  - TEST_PERFORMANCE_AFTER_FIX.sql (verification)"
echo "  - PERFORMANCE_FIX_INSTRUCTIONS.md (guide)"
echo "  - PERFORMANCE_FIX_SUMMARY.md (summary)"
echo "  - useIncidentsDashboard.ts (consolidated hook)"
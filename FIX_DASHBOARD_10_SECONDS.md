# Fix for 10-Second Dashboard Load Time

## Root Causes Identified

1. **Query Invalidation Cascade**: The `useEmployerSelection` hook calls `queryClient.invalidateQueries()` which invalidates ALL queries in the app, causing unnecessary re-fetches
2. **Multiple Database Round Trips**: The app makes separate queries for incidents and count
3. **Network Latency Amplification**: Each round trip adds latency, multiplying the delay

## The Fix

### 1. Replace the Employer Selection Hook
Replace `/apps/operations/src/hooks/useEmployerSelection.ts` with `useEmployerSelectionFixed.ts`:

```bash
mv apps/operations/src/hooks/useEmployerSelection.ts apps/operations/src/hooks/useEmployerSelection.ts.bak
mv apps/operations/src/hooks/useEmployerSelectionFixed.ts apps/operations/src/hooks/useEmployerSelection.ts
```

This fixes the query invalidation to only invalidate specific queries instead of ALL queries.

### 2. Use the Optimized Incidents Hook
In `/apps/operations/src/components/dashboard/IncidentsListOptimized.tsx`, replace:

```typescript
import { useIncidentsUltraOptimized } from '@/hooks/useIncidentsUltraOptimized';
```

With:
```typescript
import { useIncidentsUltraOptimized } from '@/hooks/useIncidentsDashboardOptimized';
```

### 3. Database Function Applied
The new `get_dashboard_data` function combines both queries into one, reducing network round trips.

## Expected Results

- **Before**: 10 seconds (due to query cascade and multiple round trips)
- **After**: < 500ms (single optimized query, targeted invalidation)

## What Changed

1. **Selective Query Invalidation**: Only invalidates queries that actually depend on employer context
2. **Single Database Call**: Combines incidents and count into one query
3. **Reduced Network Overhead**: One round trip instead of two
4. **Better Caching**: Increased stale time to reduce unnecessary refetches

## Testing

After applying these changes:
1. The dashboard should load in under 500ms
2. Employer switching should be instant
3. No more cascade of query invalidations

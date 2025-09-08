# Memory Leak Fix for Dashboard

## Problem
The dashboard is consuming hundreds of MB of memory and crashing Chrome.

## Potential Causes

### 1. React Query Cache Growing Infinitely
- `gcTime: 5 * 60 * 1000` (5 minutes) keeps old data in memory
- Every page change creates new cache entries
- No cache cleanup

### 2. Performance Monitor
- Stores all metrics in state arrays that grow infinitely
- `setMetrics(prev => [...prev.slice(0, 9)])` still keeps growing
- Long task observer accumulates data

### 3. Duplicate Hooks
- Multiple employer selection hooks running simultaneously
- Each maintaining their own query cache

### 4. Console Logging
- Extensive console.log statements in production
- Chrome keeps all console history in memory

## Solutions

### Immediate Fix
1. Reduce React Query cache time
2. Limit Performance Monitor array sizes
3. Disable console logging in production
4. Clean up duplicate hooks

### Long-term Fix
1. Implement proper cache invalidation
2. Use virtual scrolling for large lists
3. Remove Performance Monitor in production
4. Consolidate duplicate hooks
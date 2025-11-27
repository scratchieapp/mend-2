# Fix for 35-Second Frontend Delay

## Problem Identified
The dashboard is taking 35+ seconds on the frontend despite the database query executing in 8-18ms.

## Root Cause
The `PerformanceMonitor` component is patching `window.supabase.rpc` to measure performance, but this patch is interfering with the actual RPC calls, causing massive delays.

## The Issue Chain
1. `useIncidentsDashboard` hook calls `supabase.rpc()`
2. `PerformanceMonitor` has patched `supabase.rpc` to measure timing
3. The patched function might be causing recursive calls or async timing issues
4. This results in 35+ second delays even though the actual query is fast

## Solution
We need to fix the PerformanceMonitor to not interfere with the RPC calls, or provide a way to bypass it.

## Quick Fix (Immediate)
Set the environment variable to use direct RPC calls, bypassing the supabase client:
```bash
VITE_DIRECT_RPC=true npm run dev
```

## Permanent Fix
Update the PerformanceMonitor to properly handle the RPC patching without causing delays.
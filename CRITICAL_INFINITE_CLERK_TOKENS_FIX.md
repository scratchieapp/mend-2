# 🚨 CRITICAL: Infinite Clerk Token Requests

## The Problem
Clerk is fetching tokens in an infinite loop:
- `tokens?__clerk_api_version=...` called repeatedly
- Each request takes 800ms - 1.6s
- This is causing the 940MB memory leak!

## Root Cause
The `getToken()` call in our code is triggering Clerk to repeatedly fetch new tokens.

## Immediate Fix
Remove ALL getToken() calls and use the standard Supabase client.

## Why This Happens
1. Component re-renders
2. Calls getToken()
3. Token fetch triggers state update
4. State update causes re-render
5. GOTO step 1 (infinite loop!)

## Solution
Use the basic Supabase client without Clerk tokens for now.

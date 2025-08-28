# Fix: Employer Selection Not Working

## The Issue
When you select a specific employer, it's calling `clear_employer_context` instead of `set_employer_context`. This suggests the employer ID is being lost somewhere.

## Temporary Debug Solution

I've created a debug version of EmployerContextSelector that logs exactly what's happening. 

To use it:

1. **Replace the import temporarily**:

In any file that imports EmployerContextSelector, change:
```typescript
import { EmployerContextSelector } from "@/components/EmployerContextSelector";
```

To:
```typescript  
import { EmployerContextSelector } from "@/components/EmployerContextSelectorDebug";
```

2. **Open Browser Console** and try selecting an employer

3. **Look for these logs**:
```
=== SELECT CHANGE DEBUG ===
Raw value from Select: [value]
Type of value: [type]
Parsed employer ID: [number]
Calling handleEmployerChange with employer ID: [number]
```

## What to Check

1. Is the value being passed correctly?
2. Is parseInt returning NaN?
3. Is handleEmployerChange being called with the right ID?

## The Slow Query Issue

Those 900ms+ queries for users/employers are slowing down the initial load. They're coming from multiple components all fetching the same data.

## Quick Fix Attempt

Let me check if there's a simple fix in the employer selection logic...

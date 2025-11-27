# 🚨 High Memory Usage Diagnosis (940MB)

## Symptoms
- **940MB memory usage** - indicates memory leak or infinite loop
- **20 seconds initial load**, 5 seconds on refresh
- **Newcastle Builders selection hangs** - spinner but no data

## Likely Causes

### 1. Multiple Employer Selection Hooks Running
Found **6 different versions** of employer selection hooks:
- `useEmployerSelection.ts`
- `useEmployerSelectionQuickFix.ts`
- `useEmployerSelectionWithClerkAuth.ts`
- `useEmployerSelectionFinalFix.ts`
- `useEmployerSelectionOptimized.ts`
- `useEmployerSelectionFixed.ts`

**Each invalidates 6-10 queries!**

### 2. Query Invalidation Cascade
When employer changes, these queries are invalidated:
```javascript
queryClient.invalidateQueries({ queryKey: ['dashboard-incidents'] })
queryClient.invalidateQueries({ queryKey: ['incidents-ultra'] })
queryClient.invalidateQueries({ queryKey: ['employer-statistics'] })
queryClient.invalidateQueries({ queryKey: ['workers'] })
queryClient.invalidateQueries({ queryKey: ['sites'] })
queryClient.invalidateQueries({ queryKey: ['incidents'] })
// Plus more in some versions...
```

### 3. Possible Circular Dependencies
- Query A invalidates → triggers Query B
- Query B invalidates → triggers Query A
- Infinite loop!

## Diagnostic Plan

1. **Check which hooks are actually imported**
2. **Add console logs to track re-renders**
3. **Use React DevTools Profiler**
4. **Monitor network requests**

## Quick Test
Open browser DevTools:
1. **Performance tab** → Record → Select employer → Stop
2. **Memory tab** → Take heap snapshot
3. **Network tab** → Count requests when selecting employer

## The Real Problem
We keep adding "fix" layers instead of finding the root cause!

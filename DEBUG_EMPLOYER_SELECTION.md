# Debug: Employer Selection Issue

## Current Behavior
1. Network shows `clear_employer_context` being called when selecting a specific employer
2. This means `handleEmployerChange` is receiving `null` instead of the employer ID

## Possible Causes
1. The Select component value might not be converting correctly
2. The employer_id might be undefined/null in the data
3. parseInt might be returning NaN

## Debug Steps

1. Add console logging to see what's happening:

In EmployerContextSelector.tsx, modify the onValueChange:
```typescript
onValueChange={(value) => {
  console.log('Selected value:', value);
  console.log('Parsed value:', parseInt(value));
  
  if (value === "all") {
    handleEmployerChange(null);
  } else {
    const employerId = parseInt(value);
    console.log('Calling handleEmployerChange with:', employerId);
    handleEmployerChange(employerId);
  }
}}
```

2. Check if employer IDs are being set correctly:
```typescript
{availableEmployers.map((employer) => {
  console.log('Employer option:', employer.employer_id, employer.employer_name);
  return (
    <SelectItem
      key={employer.employer_id}
      value={employer.employer_id.toString()}
      // ...
```

## Multiple Slow Queries Issue

The network tab shows multiple queries taking ~900ms each:
- users?select=role... (multiple times)
- employers?select=... (multiple times) 
- lti_rates_mend?...

These are likely from multiple hooks/components all fetching the same data independently.

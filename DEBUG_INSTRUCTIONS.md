# 🔍 Debug Instructions - Employer Selection Issue

## What to Do Now

1. **Refresh your app** (Cmd+R or F5)

2. **Open Browser Console** (F12 → Console tab)

3. **Try selecting a specific employer**

4. **Look for these debug logs**:
   ```
   === handleEmployerChange called ===
   employerId: [value]
   type: [type]
   userData?.role_id: [role]
   ```

5. **Tell me what you see!**

## What I'm Looking For

The issue is that when you select an employer, it's calling `clear_employer_context` instead of `set_employer_context`. This means:

- Either `employerId` is `null` when it shouldn't be
- Or there's an error happening that's not being shown

## Also Check

In the console, do you see:
- "Error setting employer context:" ?
- "Failed to change employer:" ?
- Any red error messages?

## About the Slow Queries

Those 900ms queries are a separate issue - multiple components are fetching the same user/employer data. We'll fix that after we solve the employer selection bug.

## Quick Test

1. Clear console (right-click → Clear Console)
2. Select a specific employer
3. Copy all the console output and send it to me

This will show me exactly what's happening!

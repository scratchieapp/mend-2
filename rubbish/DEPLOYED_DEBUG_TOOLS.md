# 🔧 Debug Tools Deployed - Find the Memory Leak!

## What's Now Available

### 1. **Debug Panel** (Visual)
Look for a **black panel in bottom-right corner** showing:
- **Render Count** - If this climbs rapidly = infinite loop
- **Memory Usage** - Shows MB used (940MB is way too high!)
- **Active Queries** - Shows which queries are currently fetching

### 2. **Console Logging** (Detailed)
Open Chrome DevTools Console and look for **🔴 red dot** messages:
```
🔴 useEmployerSelection RENDER
🔴 Render #1
🔴 selectedEmployerId changed to: 8
🔴 handleEmployerChange called with: 8
🔴 Fetching employers...
```

### 3. **React Query DevTools** (Advanced)
Look for a flower icon (🌸) in bottom-left corner:
- Click to open React Query DevTools
- See all queries and their status
- Watch for queries stuck in "fetching" state

## How to Use These Tools

### Step 1: Open Chrome DevTools
Press **F12** or right-click → Inspect

### Step 2: Clear Everything
1. **Console tab** → Clear (Ctrl+L)
2. **Network tab** → Clear
3. **Hard refresh** page (Ctrl+Shift+R)

### Step 3: Watch Initial Load
Note:
- How many renders? (Should be < 5)
- Memory usage? (Should be < 200MB)
- How many queries run?

### Step 4: Select "Newcastle Builders"
Watch for:
- Console spam? (bad)
- Memory spike? (bad)
- Render count climbing? (bad)
- Network requests repeating? (bad)

## What I'm Looking For

### 🚨 PROBLEM SIGNS:
- **Render count** goes 1, 2, 3, 4... rapidly
- **Same query** appears multiple times in console
- **Memory** keeps climbing
- **Network** shows duplicate requests

### ✅ NORMAL BEHAVIOR:
- 2-3 renders max when selecting employer
- Memory stays under 200MB
- Each query runs once

## Report What You See

Tell me:
1. **Initial page load**: How many renders? Memory?
2. **When selecting Newcastle**: What happens in console?
3. **After 30 seconds**: Is it still running queries?
4. **Memory after selection**: How much MB?

This will tell me EXACTLY where the infinite loop is!

## Quick Fix While We Debug

If it's unusable, try:
1. Clear all browser data for the site
2. Use incognito mode
3. Disable browser extensions

But the debug info will help us fix it permanently!

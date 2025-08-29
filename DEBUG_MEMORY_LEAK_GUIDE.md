# 🔍 Debug Guide: Finding the Memory Leak

## Debug Tools Deployed

### 1. Visual Debug Panel (Bottom Right)
Shows real-time:
- **Render Count** - If this keeps increasing, you have a render loop
- **Memory Usage** - Watch if it climbs past 500MB
- **Active Queries** - See which queries are running

### 2. Console Logging (🔴 markers)
Open DevTools Console and look for:
```
🔴 useEmployerSelection RENDER
🔴 Render #1, #2, #3... (if climbing fast = problem)
🔴 handleEmployerChange called with: 8
🔴 Fetching employers...
```

## How to Test

1. **Open Chrome DevTools** (F12)
2. **Go to Console tab**
3. **Clear console** (Ctrl+L)
4. **Select "Newcastle Builders"**
5. **Watch for**:
   - How many renders happen?
   - Do queries keep repeating?
   - Does memory keep climbing?

## What to Look For

### ❌ BAD: Infinite Loop Signs
```
🔴 Render #1
🔴 Render #2
🔴 Render #3
... (keeps going rapidly)
```

### ❌ BAD: Query Loop
```
🔴 Fetching employers...
🔴 Fetching employers...
🔴 Fetching employers...
... (same query repeating)
```

### ✅ GOOD: Normal Behavior
```
🔴 Render #1
🔴 handleEmployerChange called with: 8
🔴 About to invalidate queries...
🔴 Queries invalidated
(then stops)
```

## Memory Profiling

1. **Chrome DevTools → Memory tab**
2. **Take Heap Snapshot** before selecting employer
3. **Select Newcastle Builders**
4. **Take another Heap Snapshot**
5. **Compare** - Look for objects growing

## Network Analysis

1. **Network tab → Clear**
2. **Select employer**
3. **Count requests** - Should be < 5
4. **Look for duplicate** requests

## Report Back

Tell me:
1. **Render count** when selecting employer
2. **Console errors** or warnings
3. **Which queries repeat**
4. **Memory before/after**

This will pinpoint the exact cause!

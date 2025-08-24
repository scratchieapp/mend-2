# **Avoiding useEffect \+ setState for Derived State in React**

## **🚫 Problem: useEffect \+ setState for Derived State**

In React, it’s a common but problematic pattern to sync *derived state* using useEffect and setState. This happens when you calculate one piece of state from another and store the result using state \+ effects.

This creates issues:

* ❗ Adds unnecessary state

* 🧠 Makes reasoning about the code more difficult

* 🕷️ Introduces risk of stale or inconsistent data

* 🪢 Leads to tangled dependencies between useEffects and state

### **❌ Example of Bad Practice**

```
const [todos, setTodos] = useState(initialTodos);
const [activeTodos, setActiveTodos] = useState([]);

useEffect(() => {
  setActiveTodos(todos.filter(todo => !todo.completed));
}, [todos]);
```

This stores a **derived value** (activeTodos) and synchronizes it with todos using an effect. It’s unnecessary and error-prone.

---

## **✅ Better Practice: Derive Inline or with** 

## **useMemo**

Instead of storing derived state, just compute it when needed. Use useMemo for performance optimization only if necessary.

### **✔️ Example: Derived Inline**

```
const activeTodos = todos.filter(todo => !todo.completed);
```

### **✔️ Example: Derived with useMemo**

```
const activeTodos = useMemo(() =>
  todos.filter(todo => !todo.completed),
[todos]);
```

This keeps your state lean and your component logic easy to follow.

---

## **🧠 Prompt for Your AI Coding Assistant**

Use this prompt to guide your AI tool:

“When writing React components, avoid syncing derived state using useEffect and setState. Instead, compute derived data directly in the render function or useMemo if needed. Only use useState for state that is truly user-controlled or persisted.”

Or:

“Refactor any React code that stores derived state (like filtered or mapped arrays) using useState and useEffect. Instead, compute such derived values inline or with useMemo. Avoid patterns that use useEffect solely to sync state.”  
---

Keeping derived state out of useState unless absolutely necessary makes your React code simpler, more declarative, and easier to debug.


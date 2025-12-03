# Retell AI Conversation Flow Agent Guide

This guide explains how to build Conversation Flow agents in Retell AI for the Medical Booking workflow. Conversation Flow agents provide visual, node-based conversation design with deterministic transitions.

---

## Table of Contents

1. [Overview](#overview)
2. [Creating a New Agent](#creating-a-new-agent)
3. [Agent Settings](#agent-settings)
4. [Node Types](#node-types)
5. [Transitions & Conditions](#transitions--conditions)
6. [Functions](#functions)
7. [Global Nodes](#global-nodes)
8. [Variables](#variables)
9. [Medical Center Agent (Get Times)](#medical-center-agent-get-times)
10. [Patient Confirmation Agent](#patient-confirmation-agent)
11. [Final Booking Agent](#final-booking-agent)
12. [Testing & Debugging](#testing--debugging)
13. [Backend Integration](#backend-integration)

---

## Overview

### Why Conversation Flow?

| Feature | Benefit for Medical Booking |
|---------|----------------------------|
| **Visual Design** | See entire call flow at a glance |
| **Deterministic** | Agent follows exact paths, no "drift" |
| **Node-Scoped Functions** | `submit_available_times` only available when collecting times |
| **Global Nodes** | Handle "wrong number" or "call back later" from anywhere |
| **Debugging** | See exactly which node failed in call history |

### Architecture: 3 Separate Agents

Instead of one complex agent with `{{call_type}}` switching, we create 3 focused agents:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BOOKING WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐│
│   │ 1. Medical Center│   │ 2. Patient       │   │ 3. Final Confirm ││
│   │    Agent         │──▶│    Agent         │──▶│    Agent         ││
│   │                  │   │                  │   │                  ││
│   │ Get 2-3 times    │   │ Confirm choice   │   │ Lock in booking  ││
│   └──────────────────┘   └──────────────────┘   └──────────────────┘│
│                                                                      │
│   Your backend/cron job orchestrates which agent to call when        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Creating a New Agent

### Step 1: Open Retell Dashboard

1. Navigate to **Agents** section
2. Click **Create New Agent** (or the `+` button)
3. Select **Conversation Flow Agent**

### Step 2: Choose a Template or Start Blank

- **Start from blank**: Recommended for custom flows
- **Templates**: Good for learning (Patient Screening, Real Estate, etc.)

You'll see the flow canvas with:
- A **Begin** node (green, entry point)
- Optionally a starter node connected to it

---

## Agent Settings

The right-hand panel contains critical agent configuration:

### Voice & Language

```
┌─────────────────────────────────────────┐
│ Voice & Language                        │
├─────────────────────────────────────────┤
│ 🇦🇺 English (Australia)                 │
│ Voice: "Cimo" or Australian female      │
└─────────────────────────────────────────┘
```

**For Medical Booking:**
- Language: **English (Australia)**
- Voice: Choose an Australian female voice for "Emma"

### Execution Mode

This is **critical** for how your agent behaves:

#### Flex Mode (Green icon)
```
┌─────────────────────────────────────────┐
│ ✅ Flex Mode                            │
├─────────────────────────────────────────┤
│ All nodes combined into a single        │
│ context. Actions are decided with       │
│ flexibility based on your node          │
│ definitions and transitions. Some       │
│ node-specific settings may not apply.   │
└─────────────────────────────────────────┘
```

**When to use:** When you want the agent to have more conversational flexibility. The LLM sees all nodes and can adapt more naturally.

**Trade-off:** Less deterministic, agent might skip nodes or handle things out of order.

#### Rigid Mode (Purple icon)
```
┌─────────────────────────────────────────┐
│ ☑️ Rigid Mode                           │
├─────────────────────────────────────────┤
│ The agent follows the defined nodes     │
│ and transitions step by step. Every     │
│ move is determined by the flow          │
│ structure.                              │
└─────────────────────────────────────────┘
```

**When to use:** When you need predictable, compliant behavior. The agent strictly follows your defined paths.

**Trade-off:** Less flexible if user goes off-script.

**Recommendation for Medical Booking:** Start with **Rigid Mode** for predictable behavior, especially for compliance-sensitive calls.

### Global Prompt

The global prompt applies to the **entire agent** across all nodes. Put personality and consistent instructions here:

```markdown
## Global Prompt Example

You are Emma, a professional medical appointment booking assistant from Mend, 
a workplace injury management company. 

### Personality
- Professional, efficient, and friendly
- Australian English spelling and phrasing
- Keep responses concise - don't ramble
- Patient with medical receptionists who may be busy

### Important Rules
- Always identify yourself as "Emma from Mend"
- This is a WorkCover appointment
- Never share patient's full medical details unnecessarily
```

### Model Selection

Next to the Global Prompt, you can select the LLM:
- **GPT-4.1** (shown in screenshot) - Good balance of speed/quality
- **GPT-4o** - Faster, slightly less capable
- **Claude** - Alternative option

You can also **override the model per-node** for cost optimization (cheaper model for simple routing, premium for complex reasoning).

---

## Node Types

The left sidebar shows available node types. Here's what each does:

### 1. Conversation Node (most common)

**Icon:** `#` (hash)

**Purpose:** Have a dialogue with the user. The agent speaks and listens.

```
┌─────────────────────────────────────────┐
│ # Welcome Node                          │
├─────────────────────────────────────────┤
│ "Hello this is customer support         │
│ department, how can I help you today?"  │
├─────────────────────────────────────────┤
│ ↔ Transition                        [+] │
│ ├─ User needs to return the package  ○  │
│ └─ User needs to check order status  ○  │
└─────────────────────────────────────────┘
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| **Prompt** | Dynamic - LLM generates response based on instructions |
| **Static Sentence** | Fixed text - agent says exactly this (good for compliance) |
| **Skip Response** | Move to next node without waiting for user response |
| **Block Interruptions** | User can't interrupt while agent speaks |

**When to use:** 
- Greetings and introductions
- Asking questions
- Presenting information
- Any back-and-forth dialogue

### 2. Function Node

**Icon:** `⚙` (gear)

**Purpose:** Call an API or webhook. Does NOT have conversations.

```
┌─────────────────────────────────────────┐
│ ⚙ Submit Available Times                │
├─────────────────────────────────────────┤
│ Function: submit_available_times        │
│ ☑ Wait for Result                       │
│ ☑ Speak During Execution:               │
│   "Let me save those times..."          │
├─────────────────────────────────────────┤
│ ↔ Transition                        [+] │
│ ├─ Function succeeded                ○  │
│ └─ Function failed                   ○  │
└─────────────────────────────────────────┘
```

**Configuration Options:**

| Option | Description |
|--------|-------------|
| **Speak During Execution** | What to say while API is called ("Let me check that...") |
| **Wait for Result** | Wait for API response before transitioning |

**When to use:**
- Submitting collected data to your backend
- Calling booking APIs
- Any external system integration

### 3. Call Transfer Node

**Icon:** `📞` (phone)

**Purpose:** Transfer the call to a human or another phone number.

**When to use:**
- "Please hold while I transfer you to a specialist"
- Escalation to human agents

### 4. Press Digit Node

**Icon:** `🔢` (keypad)

**Purpose:** Press DTMF tones to navigate IVR/phone menus.

```
┌─────────────────────────────────────────┐
│ 🔢 Navigate IVR                         │
├─────────────────────────────────────────┤
│ Press: "1"                              │
│ Description: "For appointments"         │
└─────────────────────────────────────────┘
```

**When to use:**
- Navigating clinic IVR systems ("Press 1 for appointments")
- Entering extension numbers

### 5. Logic Split Node

**Icon:** `⑃` (branch)

**Purpose:** Branch based on variable values (no LLM involved).

```
┌─────────────────────────────────────────┐
│ ⑃ Check Urgency                         │
├─────────────────────────────────────────┤
│ Conditions:                             │
│ ├─ {{urgency}} == "urgent"    → Urgent  │
│ ├─ {{urgency}} == "normal"    → Normal  │
│ └─ Default                    → Normal  │
└─────────────────────────────────────────┘
```

**When to use:**
- Routing based on variables you passed in
- "If patient is under 18, use different script"

### 6. Agent Transfer Node

**Icon:** `🤖` (robot)

**Purpose:** Switch to a different Retell agent mid-call.

**When to use:**
- Transfer from general agent to specialist agent
- Language switching (English agent to Spanish agent)

### 7. SMS Node

**Icon:** `💬` (message)

**Purpose:** Send an SMS during the call.

**When to use:**
- "I'll text you the appointment details"
- Sending confirmation links

### 8. Extract Variable Node

**Icon:** `{ }` (braces)

**Purpose:** Extract and store information from the conversation.

```
┌─────────────────────────────────────────┐
│ { } Extract Patient Choice              │
├─────────────────────────────────────────┤
│ Variable: selected_time                 │
│ Prompt: "What time slot did the         │
│          patient select?"               │
└─────────────────────────────────────────┘
```

**When to use:**
- Capturing patient's preferred time
- Storing any information for later use

### 9. MCP Node

**Icon:** `◆` (diamond)

**Purpose:** Call Model Context Protocol servers for additional capabilities.

**When to use:**
- Advanced integrations with MCP-compatible services

### 10. Ending Node

**Icon:** `□` (square)

**Purpose:** End the call.

```
┌─────────────────────────────────────────┐
│ □ End Call                              │
├─────────────────────────────────────────┤
│ Call ends here                          │
└─────────────────────────────────────────┘
```

**When to use:**
- After successful completion
- After booking_failed
- Any call termination point

---

## Transitions & Conditions

Transitions define **when and where** the agent moves between nodes.

### Adding Transitions

1. Click on a node
2. Find the **Transition** section
3. Click the `+` button to add a condition
4. Choose **Prompt** or **Equation** condition

### Prompt Conditions (LLM-evaluated)

The LLM determines if the condition is met based on conversation context:

```
Examples:
- "User said something about booking a meeting"
- "User indicates they want to cancel"
- "User confirmed the appointment time"
- "Clinic said no appointments available"
- "User indicates this is not a good time"
```

### Equation Conditions (Hardcoded)

Mathematical/logical conditions based on variables:

```
Examples:
- {{urgency}} == "urgent"
- {{retry_count}} > 3
- {{user_age}} >= 18
- {{available_times}} exists
- "NSW, VIC, QLD" CONTAINS {{state}}
```

**Operators available:**
- `==` equals
- `!=` not equals
- `>`, `<`, `>=`, `<=` comparisons (numbers only)
- `CONTAINS` / `NOT CONTAINS` (string matching)
- `exists` / `does not exist` (variable check)
- `AND`, `OR` (combine conditions)

### Transition Priority

1. **Equation conditions** are evaluated first (top to bottom)
2. **Prompt conditions** are evaluated after
3. First matching condition wins
4. If no condition matches, agent stays in current node (or uses default edge)

### Best Practices

```
✅ Good Conditions:
- "User confirmed they can make the Monday appointment"
- "Clinic provided at least one available time"
- "Patient said none of the times work"

❌ Bad Conditions:
- "User said something" (too vague)
- "Proceed to next step" (not based on user input)
```

---

## Functions

Functions let your agent call external APIs. Define them once, use in Function Nodes.

### Creating a Function

1. In the flow canvas, click **Components** tab (next to Node)
2. Click **+ Add Function**
3. Configure:

```
┌─────────────────────────────────────────┐
│ Function Configuration                   │
├─────────────────────────────────────────┤
│ Name: submit_available_times            │
│                                         │
│ URL: https://your-project.supabase.co/  │
│      functions/v1/booking-submit-times  │
│                                         │
│ Method: POST                            │
│                                         │
│ Parameters:                             │
│ ┌─────────────────────────────────────┐ │
│ │ time_slot_1: string (required)      │ │
│ │ time_slot_2: string                 │ │
│ │ time_slot_3: string                 │ │
│ │ clinic_notes: string                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ☑ Include workflow_id in request        │
└─────────────────────────────────────────┘
```

### Function Schema Example

```json
{
  "type": "object",
  "properties": {
    "time_slot_1": {
      "type": "string",
      "description": "First available time (e.g., 'Monday December 2nd at 10:30 AM with Dr Smith')"
    },
    "time_slot_2": {
      "type": "string",
      "description": "Second available time"
    },
    "time_slot_3": {
      "type": "string",
      "description": "Third available time if offered"
    },
    "clinic_notes": {
      "type": "string",
      "description": "Any notes from clinic (parking, check-in time)"
    }
  },
  "required": ["time_slot_1"]
}
```

### Using Functions in Nodes

1. Drag a **Function Node** onto the canvas
2. Click on it
3. Select the function from dropdown
4. Configure Wait for Result and Speak During Execution

---

## Global Nodes

Global Nodes can be triggered from **anywhere** in the flow when their condition is met.

### Setting Up a Global Node

1. Create any node (Conversation, Function, etc.)
2. Click on the node
3. Check **Global Node** in settings
4. Define the **trigger condition**

### Example: "Not a Good Time" Handler

```
┌─────────────────────────────────────────┐
│ # Handle Callback Request               │
│ [✓] Global Node                         │
├─────────────────────────────────────────┤
│ Trigger: "User indicates this is not    │
│          a good time to talk"           │
├─────────────────────────────────────────┤
│ Prompt: "No problem at all. We can      │
│         call back at a better time.     │
│         When would work better for you?"│
└─────────────────────────────────────────┘
```

### Recommended Global Nodes for Medical Booking

| Node | Trigger Condition |
|------|-------------------|
| **Bad Time** | "User indicates this is not a good time" |
| **Wrong Number** | "User says this is the wrong number or wrong person" |
| **WorkCover Questions** | "User asks what WorkCover is or who Mend is" |
| **Put on Hold** | "User or receptionist puts the call on hold" |
| **Confused/Repeat** | "User is confused or asks to repeat" |

---

## Variables

Variables store and pass information throughout the conversation.

### Dynamic Variables (Passed at Call Start)

When initiating the call via API, you pass variables:

```typescript
await retell.call.createPhoneCall({
  from_number: "+61299999999",
  to_number: clinicPhone,
  override_agent_id: MEDICAL_CENTER_AGENT_ID,
  retell_llm_dynamic_variables: {
    workflow_id: "uuid-123",
    worker_name: "John Smith",
    worker_dob: "15/03/1985",
    injury_type: "Shoulder strain",
    body_part: "Left shoulder",
    medical_center_name: "Sydney Medical Centre",
    employer_name: "ABC Construction",
    urgency: "normal"
  }
});
```

### Using Variables in Nodes

Reference with double curly braces:

```
# Greeting Node

"Hi, this is Emma from Mend. I'm calling to book a 
WorkCover appointment for {{worker_name}}."
```

### Extracted Variables

Use **Extract Variable Node** to capture information during the call:

```
┌─────────────────────────────────────────┐
│ { } Extract Time Slots                  │
├─────────────────────────────────────────┤
│ Variable: available_time_1              │
│ Prompt: "What was the first available   │
│          appointment time mentioned?"   │
└─────────────────────────────────────────┘
```

---

## Step-by-Step: Building Your First Flow

This section walks through building the Medical Center Agent step-by-step with detailed instructions for every click.

---

### Step 1: Create the Agent

1. Go to Retell Dashboard → Agents
2. Click **Create New Agent**
3. Select **Conversation Flow Agent**
4. Choose **Start from blank**
5. Name it: `1. Medical Center Agent (Get Times)`

You now see the canvas with just a **Begin** node (green).

---

### Step 2: Set Up Global Settings First

Before adding nodes, configure the agent settings (right panel):

1. Click anywhere on the empty canvas (not on a node)
2. In the right panel, find **Agent Settings**:
   - **Voice & Language**: English → Select an Australian voice
   - **Execution Mode**: Select **Rigid Mode** ✓
   - **Model**: GPT-4.1 (default is fine)

3. **Global Prompt** - Enter this:

```
You are Emma, a professional medical appointment booking assistant from Mend, 
a workplace injury management company.

## Your Style
- Professional and efficient - get to the point quickly
- Australian English spelling and phrasing
- Keep responses short - don't ramble
- Patient and understanding with busy receptionists

## Key Facts
- You're calling to book a Workers Compensation appointment
- Mend manages workplace injury claims
- You're calling on behalf of the patient, not the patient themselves
```

---

### Step 3: Understanding Logic Split Node Conditions

**This is where you're stuck, so let me explain clearly:**

A Logic Split Node is for **branching based on variables** - it does NOT involve conversation. It's like an "if statement" in code.

#### When to use EQUATION (what you need for IVR check):
- Checking if a variable exists
- Comparing variable values
- Any deterministic check based on data you passed in

#### When to use PROMPT (not for Logic Split):
- When you need the LLM to interpret what the user said
- Only used in Conversation nodes, not Logic Split nodes

**For your IVR check: Use EQUATION**

---

### Step 4: Setting Up the IVR Check (Logic Split Node)

Here's exactly what to do:

#### 4.1 Add the Logic Split Node
1. From the left sidebar, drag **Logic Split Node** onto the canvas
2. Connect the **Begin** node to your Logic Split Node:
   - Hover over the small circle on the right side of Begin
   - Click and drag to the left side of your Logic Split Node

#### 4.2 Configure the Condition

1. **Click on the Logic Split Node** to select it
2. You'll see:
   ```
   ┌─────────────────────────────────────┐
   │ ⑃ Logic Split Node                  │
   ├─────────────────────────────────────┤
   │ ↔ Transition                    [+] │
   │ ├─ (empty - add condition here)     │
   │ └─ Else                         ○   │
   └─────────────────────────────────────┘
   ```

3. **Click the [+] button** next to "Transition"
4. A dropdown appears: **Prompt** or **Equation**
5. **Select "Equation"** ← This is what you want!

#### 4.3 Write the Equation

After selecting Equation, you'll see an equation editor. Enter:

```
{{ivr_instructions}} exists
```

This checks: "Did we pass in IVR instructions when starting this call?"

**What this looks like in the editor:**

```
┌─────────────────────────────────────────────────────────┐
│ Equation Condition                                       │
├─────────────────────────────────────────────────────────┤
│  Variable         Operator        Value                  │
│ ┌─────────────┐  ┌──────────┐   ┌─────────────────────┐ │
│ │{{ivr_       │  │ exists   │   │ (no value needed)   │ │
│ │instructions}}│  │    ▼     │   │                     │ │
│ └─────────────┘  └──────────┘   └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 4.4 Connect the Branches

Now you have two paths:
- **If ivr_instructions exists** → Go to IVR Navigation
- **Else** (no IVR instructions) → Go to Greeting

1. The condition you just added has a circle (○) on its right
2. The "Else" row also has a circle (○) on its right
3. Drag from each circle to connect to the appropriate next node

---

### Step 5: Actually, Let's Simplify!

For your first agent, **skip the IVR check entirely**. Most clinics don't have complex IVRs, and you can add this later.

**Simpler starting flow:**

```
Begin → Greeting → Collect Times → Submit Function → Close → End
```

Let me walk you through this simpler version:

---

### Step 6: Create the Greeting Node

#### 6.1 Add a Conversation Node
1. Drag **Conversation** from the left sidebar onto the canvas
2. Connect Begin → Conversation Node

#### 6.2 Configure the Greeting

Click on the Conversation Node. In the right panel, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ Node Settings                                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Instruction Type:  ○ Prompt   ● Static Sentence         │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │  (Enter your text here)                            │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Additional Settings]                                    │
│ ☐ Skip Response                                         │
│ ☐ Block Interruptions                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 6.3 Choose Static Sentence

For the greeting, use **Static Sentence** (guaranteed exact wording):

1. Select **Static Sentence**
2. Enter this text:

```
Hi, this is Emma from Mend. I'm calling to book a WorkCover 
appointment for {{worker_name}}. What times do you have 
available in the next few days?
```

**Note:** `{{worker_name}}` will be replaced with the actual name when the call runs.

#### 6.4 Add Transitions

Now you need to tell the agent what to do based on how the receptionist responds.

1. In the node, find the **Transition** section
2. Click the **[+]** button
3. Select **Prompt** (because we're interpreting what the human said)
4. Enter the condition:

```
Receptionist asked for patient details or more information
```

5. Click [+] again, select **Prompt**, enter:

```
Receptionist is ready to provide available times
```

6. Click [+] again, select **Prompt**, enter:

```
Receptionist put the call on hold or is transferring
```

**Your node now looks like:**

```
┌─────────────────────────────────────────────────────────┐
│ # Greeting                                               │
├─────────────────────────────────────────────────────────┤
│ "Hi, this is Emma from Mend. I'm calling to book a      │
│ WorkCover appointment for {{worker_name}}..."           │
├─────────────────────────────────────────────────────────┤
│ ↔ Transition                                        [+] │
│ ├─ ✧ Receptionist asked for patient details         ○  │
│ ├─ ✧ Receptionist is ready to provide times         ○  │
│ ├─ ✧ Receptionist put the call on hold              ○  │
│ └─ Else                                             ○   │
└─────────────────────────────────────────────────────────┘
```

The ✧ symbol indicates these are **Prompt** conditions (LLM-evaluated).
The Σ symbol would indicate **Equation** conditions (hardcoded).

---

### Step 7: Create the "Provide Details" Node

1. Drag another **Conversation** node onto the canvas
2. Connect the "asked for patient details" transition to this node
3. Click on the new node and configure:

**Instruction Type:** Prompt (dynamic response)

**Prompt:**
```
The receptionist asked for more information. Provide ONLY what 
they specifically asked for from this list:

- Patient name: {{worker_name}}
- Date of birth: {{worker_dob}}
- Injury type: {{injury_type}} to {{body_part}}
- Employer: {{employer_name}}
- Doctor preference: {{preferred_doctor_name}} or "any doctor is fine"

Be concise. Don't volunteer extra information.
```

**Transitions:**
- `✧ Receptionist is now ready to check appointment availability` → Collect Times node

**Note:** Don't add a "loop back" transition. If the receptionist asks follow-up questions, the agent automatically stays in this node and keeps responding. It only moves to Collect Times when the receptionist is actually ready to check availability.

**How it works:**
1. Receptionist asks for DOB → Agent stays here, provides DOB
2. Receptionist asks for employer → Agent stays here, provides employer  
3. Receptionist says "Let me check what we have" → NOW transitions to Collect Times

---

### Step 8: Create the "Collect Times" Node

1. Drag another **Conversation** node
2. Connect the "ready to provide times" transitions here

**Instruction Type:** Prompt

**Prompt:**
```
Listen carefully to the available appointment times offered.
For each time, note:
- Day and date
- Time
- Doctor name (if mentioned)

IMPORTANT: Try to get 2-3 options so the patient has choices.

If they only offer ONE time, ask:
"Do you have any other times available? I'd like to give 
the patient a couple of options if possible."

When you have at least 2 times (or they confirm only 1 is available),
proceed to confirm and save the times.
```

**Transitions:**
- `✧ Clinic provided 2 or more appointment times` → Submit Times (Function node)
- `✧ Clinic provided only 1 time` → Ask for More node
- `✧ Clinic said no appointments available` → Booking Failed (Function node)

---

### Step 9: Create the Submit Times Function Node

1. Drag a **Function** node onto the canvas
2. Connect "Clinic provided 2+ times" → Function node

**But first, you need to create the function!**

#### 9.1 Create the Function

**Library vs Agent Component:**
- **Library Component** = Shared across all agents (recommended)
- **Agent Component** = Only available in this agent

Use **Library Component** for your functions - easier to manage and reusable across your 3 booking agents.

**Steps:**
1. Click the **Components** tab (next to "Node" in the left sidebar)
2. Click **Library** to expand the library section
3. Click **+ Add** or **+ New Function**
4. Configure:

| Field | Value |
|-------|-------|
| **Name** | `submit_available_times` |
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-submit-times` |
| **Method** | POST |

4. **Args Only**: Leave **UNCHECKED** - your webhook needs the full call context (call_id, metadata with workflow_id, etc.)

5. **Headers** - Click "Add Header" for each:

| Header Name | Header Value |
|-------------|--------------|
| `Authorization` | `Bearer YOUR_SUPABASE_ANON_KEY` |
| `Content-Type` | `application/json` |

> Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key from Supabase Dashboard → Settings → API

6. **Parameters** - Click "Add Parameter" for each:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time_slot_1` | string | ✓ Yes | First available time (e.g., "Monday Dec 2nd at 10:30am with Dr Smith") |
| `time_slot_2` | string | No | Second available time |
| `time_slot_3` | string | No | Third available time |
| `clinic_notes` | string | No | Any notes (parking, check-in) |

7. **Response Variables** - Map the API response to variables:

| Response Key | Variable Name |
|--------------|---------------|
| `success` | `function_success` |
| `message` | `function_message` |

This allows transitions like: `{{function_success}} == true`

8. Click **Save**

#### 9.2 Configure the Function Node

Now go back to your Function node:

1. Click on the Function node
2. In the right panel:
   - **Function**: Select `submit_available_times` from dropdown
   - **Wait for Result**: ✓ Enable
   - **Speak During Execution**: ✓ Enable
   
3. **Speak During Execution text:**
```
Perfect, I've got those times noted. Let me save them quickly.
```

**Transitions:**
- `Σ {{function_result}} == "success"` → Thank & Close node
- `Else` → Booking Failed

---

### Step 10: Create the Close Node

1. Drag a **Conversation** node
2. Connect from Submit Times success

**Instruction Type:** Static Sentence

**Text:**
```
Thank you for your help. I'll check with the patient and call 
back to confirm which time works for them. Goodbye!
```

**Settings:**
- ✓ **Skip Response** (don't wait for reply, just end)

**Transitions:**
- Connect the circle directly to an **Ending** node

---

### Step 11: Create the Ending Node

1. Drag an **Ending** node onto the canvas
2. Connect from the Close node

That's it! The call ends here.

---

### Step 12: Create the Booking Failed Path

1. Drag a **Function** node for `booking_failed`
2. Create the function (Components tab):
   - Name: `booking_failed`
   - URL: `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-failed`
   - Parameters: `failure_reason` (string, required)

3. Connect from "no appointments available" transition
4. **Speak During Execution:**
```
No problem, I understand. Our team will follow up another way. 
Thanks for your time, goodbye!
```

5. Connect to an **Ending** node

---

### Complete Simple Flow Diagram

```
                         ┌─────────┐
                         │  Begin  │
                         └────┬────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     Greeting     │
                    │  (Static Text)   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │  Provide    │   │   Collect   │   │  On Hold    │
   │  Details    │   │   Times     │   │  Handler    │
   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
          │                 │                 │
          └─────────────────┤                 │
                            │                 │
          ┌─────────────────┼─────────────────┘
          ▼                 ▼
   ┌─────────────┐   ┌─────────────┐
   │   Submit    │   │   Booking   │
   │   Times     │   │   Failed    │
   │  (Function) │   │  (Function) │
   └──────┬──────┘   └──────┬──────┘
          │                 │
          ▼                 ▼
   ┌─────────────┐   ┌─────────────┐
   │   Close &   │   │    End      │
   │   Thanks    │   │   (Failed)  │
   └──────┬──────┘   └─────────────┘
          │
          ▼
   ┌─────────────┐
   │    End      │
   │  (Success)  │
   └─────────────┘
```

---

### Important: No Self-Loops Needed!

**Retell doesn't allow a node to transition back to itself - and you don't need it!**

Here's why: If no transition condition is met, the agent **stays in the current node** and continues the conversation naturally. 

**Example - Provide Details Node:**
```
Conversation Node: "Provide Details"

Prompt: "Provide patient details when asked..."

Transitions:
  ✧ Receptionist is ready to check availability → Collect Times
  (That's it! No other transitions needed)
```

**What happens:**
1. Agent is in "Provide Details" node
2. Receptionist: "What's the DOB?"
3. Agent provides DOB, **stays in same node** (no transition matched)
4. Receptionist: "And the employer?"
5. Agent provides employer, **stays in same node** (no transition matched)
6. Receptionist: "OK let me check what times we have"
7. **NOW** the transition "ready to check availability" matches → moves to Collect Times

**Key insight:** Only add transitions for when you want to LEAVE the node. The agent handles multi-turn conversations within a node automatically.

---

### Quick Reference: When to Use What

| Situation | Condition Type | Example |
|-----------|---------------|---------|
| Check if variable exists | **Equation** | `{{ivr_instructions}} exists` |
| Compare variable to value | **Equation** | `{{urgency}} == "urgent"` |
| Number comparison | **Equation** | `{{retry_count}} > 3` |
| Interpret what user said | **Prompt** | `User confirmed the appointment` |
| Understand user intent | **Prompt** | `Receptionist asked for details` |
| Based on function result | **Equation** | `{{function_result}} == "success"` |

---

### Testing Your Flow

1. Click **Simulation** (top of screen)
2. Choose **Text** mode for faster testing
3. The agent starts at Begin and moves through nodes
4. Watch which node highlights - this shows where you are
5. Type responses as if you're the receptionist

**Example test conversation:**
```
Agent: "Hi, this is Emma from Mend..."
You: "Sure, what's the patient's name?"
Agent: [Should go to Provide Details node]
Agent: "The patient's name is John Smith"
You: "We have Monday at 10am or Wednesday at 2pm"
Agent: [Should collect times and submit]
```

---

## Medical Center Agent (Get Times)

### Complete Flow Design

```
                    ┌─────────┐
                    │  Begin  │
                    └────┬────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check for IVR       │
              │  (Logic Split)       │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌───────────┐  ┌───────────┐  ┌───────────────┐
   │ Navigate  │  │ Navigate  │  │ Go to Greeting│
   │ IVR - 1   │  │ IVR - 2   │  │ (no IVR)      │
   └─────┬─────┘  └─────┬─────┘  └───────┬───────┘
         │              │                │
         └──────────────┴────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │   Greeting + Intro   │
              │   (Conversation)     │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Asked for   │  │ Transferred │  │ Ready to    │
│ Details     │  │ or on Hold  │  │ Take Request│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Provide    │  │ Wait/Re-    │  │  Request    │
│  Details    │  │ introduce   │  │  Times      │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │   Collect Times      │
              │   (Conversation)     │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Got 1 time  │  │ Got 2+ times│  │ No times    │
│ Ask for more│  │ Confirm     │  │ Available   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                ▼                ▼
       │       ┌─────────────┐  ┌─────────────┐
       │       │ Submit Times│  │ Booking     │
       │       │ (Function)  │  │ Failed      │
       │       └──────┬──────┘  └──────┬──────┘
       │              │                │
       └──────────────┤                │
                      ▼                ▼
              ┌─────────────┐  ┌─────────────┐
              │  Thank &    │  │  End Call   │
              │  Close      │  │  (Failed)   │
              └──────┬──────┘  └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  End Call   │
              └─────────────┘


GLOBAL NODES (can trigger from anywhere):
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Put on Hold │  │ WorkCover   │  │ Wrong       │
│ Handler     │  │ Questions   │  │ Number      │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Node Details

#### Begin → Check for IVR

**Logic Split Node:**
```
Conditions:
- {{ivr_instructions}} exists → Go to IVR Navigation
- Default → Go to Greeting
```

#### Greeting + Intro

**Conversation Node:**
```
Type: Static Sentence (for consistency)

Text: "Hi, this is Emma from Mend. I'm calling to book a 
WorkCover appointment for a patient. What times do you 
have available in the next few days?"
```

**Transitions:**
- "Receptionist asked for patient details" → Provide Details
- "Receptionist asked to wait or being transferred" → Wait Handler
- "Receptionist ready to check availability" → Request Times

#### Provide Details

**Conversation Node:**
```
Type: Prompt

Prompt: Provide the following details ONLY when asked:
- Patient name: {{worker_name}}
- Date of birth: {{worker_dob}}
- Injury: {{injury_type}} to {{body_part}}
- Employer: {{employer_name}}
- Doctor preference: {{preferred_doctor_name}} or "any doctor is fine"

Only share what they specifically ask for.
```

#### Collect Times

**Conversation Node:**
```
Type: Prompt

Prompt: Listen carefully and note down available appointment times.
For each time offered, note:
- Day and date
- Time
- Doctor name (if mentioned)

Try to get 2-3 options so the patient has choices.
If only one time is offered, ask: "Do you have any other times 
available? I'd like to give the patient a couple of options."
```

**Transitions:**
- "Clinic mentioned only 1 appointment time" → Ask for More
- "Clinic mentioned 2 or more appointment times" → Submit Times
- "Clinic said no appointments available" → Booking Failed

#### Submit Times (Function Node)

```
Function: submit_available_times
Wait for Result: ✓
Speak During Execution: "Perfect, I've got those times. 
Let me save them and I'll call back to confirm."
```

**Transitions:**
- "Function returned success" → Thank & Close
- "Function returned error" → Booking Failed

#### Global: Put on Hold Handler

```
Trigger: "User or receptionist indicates they are putting 
         the call on hold or asks to wait"

Type: Conversation Node

Prompt: Wait patiently. When someone comes back on the line,
briefly re-introduce: "Hi, thanks for coming back. I'm Emma 
from Mend, calling about booking a WorkCover appointment."
```

### Agent Settings

```yaml
Name: Medical Center Agent (Get Times)
Voice: Australian Female (e.g., "Amy" or "Cimo")
Language: English (Australia)
Execution Mode: Rigid Mode
Model: GPT-4.1

Global Prompt: |
  You are Emma, a professional medical appointment booking 
  assistant from Mend, a workplace injury management company.
  
  ## Your Mission
  Call medical centers to get 2-3 available appointment times 
  for injured workers.
  
  ## Style
  - Professional and efficient
  - Australian English
  - Keep responses brief
  - Don't over-explain
  
  ## Key Information
  - This is a WorkCover case
  - Mend manages workplace injury claims
  - You're booking on behalf of the patient
```

### Functions for This Agent

| Function | URL |
|----------|-----|
| `submit_available_times` | `https://[project].supabase.co/functions/v1/booking-submit-times` |
| `booking_failed` | `https://[project].supabase.co/functions/v1/booking-failed` |

---

## Patient Confirmation Agent

### Complete Flow Design

```
                    ┌─────────┐
                    │  Begin  │
                    └────┬────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Verify Patient     │
              │   (Conversation)     │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Confirmed   │  │ Wrong       │  │ Not a       │
│ Identity    │  │ Person      │  │ Good Time   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Explain    │  │  End Call   │  │  Schedule   │
│  Purpose    │  │  (Failed)   │  │  Callback   │
└──────┬──────┘  └─────────────┘  └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│              Present Options                     │
│              (Conversation)                      │
│                                                  │
│  "Here are the times available at               │
│   {{medical_center_name}}:                       │
│                                                  │
│   {{available_times_summary}}                    │
│                                                  │
│   Which of these times works best for you?"     │
└──────────────────────┬──────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Selected a  │  │ None of the │  │ Has         │
│ Time        │  │ Times Work  │  │ Questions   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                │
┌─────────────┐  ┌─────────────────┐     │
│  Confirm    │  │  Ask About      │     │
│  Selection  │  │  Availability   │     │
└──────┬──────┘  └────────┬────────┘     │
       │                  │              │
       │                  ▼              │
       │         ┌─────────────────┐     │
       │         │ Patient Needs   │     │
       │         │ Reschedule      │     │
       │         │ (Function)      │     │
       │         └────────┬────────┘     │
       │                  │              │
       ▼                  ▼              │
┌─────────────┐  ┌─────────────┐         │
│ Submit      │  │  Close &    │◀────────┘
│ Confirmation│  │  Reschedule │
│ (Function)  │  └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│                Close Call                        │
│                                                  │
│  "Great, I'll confirm that with the clinic      │
│   and you'll receive confirmation. Take care!"   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              ┌─────────────┐
              │  End Call   │
              └─────────────┘
```

### Key Nodes

#### Verify Patient

**Conversation Node (Static):**
```
"Hello, is this {{worker_first_name}}? This is Emma 
calling from Mend about your medical appointment."
```

**Transitions:**
- "User confirmed they are the right person" → Explain Purpose
- "User said it's the wrong person" → End Call (Failed)
- "User indicated it's not a good time" → Schedule Callback

#### Present Options

**Conversation Node (Prompt):**
```
Present the available appointment options clearly:

"I've arranged some appointment options at {{medical_center_name}}. 
Here are the times available:

{{available_times_summary}}

Which of these times works best for you?"

Wait for the patient to choose.
```

#### Confirm Selection

**Conversation Node (Prompt):**
```
Repeat back their chosen time clearly:

"Just to confirm, you'd like the [repeat their chosen time]. 
Is that correct?"

If yes, proceed. If they want to change, return to options.
```

### Agent Settings

```yaml
Name: Patient Confirmation Agent
Voice: Australian Female
Language: English (Australia)
Execution Mode: Rigid Mode
Model: GPT-4.1

Global Prompt: |
  You are Emma, calling patients on behalf of Mend to confirm 
  their medical appointment time.
  
  ## Important
  - You ALREADY HAVE the available times
  - Your job is to PRESENT options and get their choice
  - Do NOT ask "what times do you have" - YOU have the times!
  
  ## Style
  - Warm and friendly
  - Clear and patient
  - Australian English
```

### Functions for This Agent

| Function | URL |
|----------|-----|
| `patient_confirmed_time` | `https://[project].supabase.co/functions/v1/booking-patient-confirm` |
| `patient_needs_reschedule` | `https://[project].supabase.co/functions/v1/booking-patient-reschedule` |

---

## Final Booking Agent

### Complete Flow Design

```
                    ┌─────────┐
                    │  Begin  │
                    └────┬────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check for IVR       │
              │  (Logic Split)       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Reference Earlier  │
              │   (Conversation)     │
              └──────────┬───────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│              Confirm Time                        │
│              (Conversation)                      │
│                                                  │
│  "The patient has confirmed they can make        │
│   {{patient_confirmed_time}}. Can you lock       │
│   that appointment in for {{worker_name}}?"     │
└──────────────────────┬──────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Booking     │  │ Time No     │  │ Need to     │
│ Confirmed   │  │ Longer Free │  │ Check/Call  │
└──────┬──────┘  └──────┬──────┘  │ Back        │
       │                │         └──────┬──────┘
       ▼                ▼                │
┌─────────────┐  ┌─────────────┐         │
│ Get Final   │  │ Booking     │         │
│ Details     │  │ Failed      │         │
└──────┬──────┘  └──────┬──────┘         │
       │                │                │
       ▼                │                │
┌─────────────┐         │                │
│ Confirm     │         │                │
│ Booking     │         │                │
│ (Function)  │         │                │
└──────┬──────┘         │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Thank &     │  │  End Call   │  │  End Call   │
│ Close       │  │  (Failed)   │  │  (Retry)    │
└──────┬──────┘  └─────────────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│  End Call   │
│ (Success)   │
└─────────────┘
```

### Key Nodes

#### Reference Earlier Call

**Conversation Node (Static):**
```
"Hello, this is Emma from Mend calling back. I called 
earlier about booking an appointment for {{worker_name}}."
```

#### Get Final Details

**Conversation Node (Prompt):**
```
Ask for and confirm:
- The exact appointment date and time
- The doctor's name
- Any special instructions for the patient (parking, what to bring, check-in time)
- A booking reference number if they provide one
```

### Functions for This Agent

| Function | URL |
|----------|-----|
| `confirm_booking` | `https://[project].supabase.co/functions/v1/booking-confirm-final` |
| `booking_failed` | `https://[project].supabase.co/functions/v1/booking-failed` |

---

## Testing & Debugging

### In-Dashboard Testing

1. Click **Simulation** tab (top of screen)
2. Choose **Audio** or **Text** testing
3. Walk through the conversation
4. Watch which nodes highlight as you progress

### Call History Review

After test calls:
1. Go to **Call History**
2. Click on a call
3. See **Node Transitions** in the transcript
4. Identify where things went wrong

### Common Issues

| Issue | Solution |
|-------|----------|
| Agent stuck in node | Add more transition conditions |
| Wrong transition taken | Add fine-tuning examples |
| Function not called | Check "Wait for Result" setting |
| Agent too verbose | Switch to Static Sentences |
| Agent ignores input | Check Execution Mode (try Rigid) |

### Fine-Tuning Examples

If transitions aren't working well, add examples:

1. Click on a node
2. Find **Fine-tuning Examples**
3. Add example conversations:

```yaml
Example 1:
  User: "We have Monday at 10am or Tuesday at 2pm"
  Expected Transition: → Got 2+ times

Example 2:
  User: "We only have one slot left, Thursday at 9am"
  Expected Transition: → Got 1 time, ask for more
```

---

## Backend Integration

### Selecting the Right Agent

Update your call initiation code:

```typescript
// In your Edge Function that initiates calls

const AGENT_IDS = {
  get_times: 'agent_MEDICAL_CENTER_ID',      // Replace with actual ID
  patient_confirm: 'agent_PATIENT_CONFIRM_ID',
  final_confirm: 'agent_FINAL_BOOKING_ID'
};

async function initiateBookingCall(
  workflow: BookingWorkflow,
  callType: 'get_times' | 'patient_confirm' | 'final_confirm'
) {
  const agentId = AGENT_IDS[callType];
  
  // Build variables based on call type
  const variables = buildVariablesForCallType(workflow, callType);
  
  const response = await retell.call.createPhoneCall({
    from_number: RETELL_PHONE_NUMBER,
    to_number: getTargetNumber(workflow, callType),
    override_agent_id: agentId,
    retell_llm_dynamic_variables: variables,
    metadata: {
      workflow_id: workflow.id,
      call_type: callType
    }
  });
  
  return response;
}

function buildVariablesForCallType(
  workflow: BookingWorkflow,
  callType: string
): Record<string, string> {
  const base = {
    workflow_id: workflow.id,
    worker_name: workflow.worker_name,
    worker_first_name: workflow.worker_name.split(' ')[0],
    medical_center_name: workflow.medical_center_name
  };
  
  switch (callType) {
    case 'get_times':
      return {
        ...base,
        worker_dob: workflow.worker_dob,
        injury_type: workflow.injury_type,
        body_part: workflow.body_part,
        employer_name: workflow.employer_name,
        preferred_doctor_name: workflow.preferred_doctor_name || 'any doctor',
        ivr_instructions: workflow.ivr_instructions || ''
      };
      
    case 'patient_confirm':
      return {
        ...base,
        available_times_summary: workflow.available_times_summary
      };
      
    case 'final_confirm':
      return {
        ...base,
        patient_confirmed_time: workflow.patient_confirmed_time
      };
  }
}
```

### Webhook Updates

Your webhook handler remains similar, but now handles calls from different agents:

```typescript
// In retell-webhook-handler Edge Function

const call = payload.call;
const callType = call.metadata?.call_type;

switch (callType) {
  case 'get_times':
    await handleGetTimesResult(call);
    break;
  case 'patient_confirm':
    await handlePatientConfirmResult(call);
    break;
  case 'final_confirm':
    await handleFinalConfirmResult(call);
    break;
}
```

---

## Quick Reference

### Agent IDs (Update After Creating)

```env
RETELL_MEDICAL_CENTER_AGENT_ID=agent_xxxxxxxxx
RETELL_PATIENT_CONFIRM_AGENT_ID=agent_yyyyyyyyy
RETELL_FINAL_BOOKING_AGENT_ID=agent_zzzzzzzzz
```

### Execution Mode Comparison

| Aspect | Flex Mode | Rigid Mode |
|--------|-----------|------------|
| Control | LLM decides paths | Flow determines paths |
| Flexibility | High | Low |
| Predictability | Lower | Higher |
| Best for | General conversations | Structured processes |
| Medical Booking | Not recommended | **Recommended** |

### Node Type Quick Reference

| Node | Icon | Use For |
|------|------|---------|
| Conversation | `#` | Dialogue |
| Function | `⚙` | API calls |
| Press Digit | `🔢` | IVR navigation |
| Logic Split | `⑃` | Variable-based branching |
| Extract Variable | `{ }` | Capture information |
| Call Transfer | `📞` | Human handoff |
| Agent Transfer | `🤖` | Switch agents |
| SMS | `💬` | Send text messages |
| Ending | `□` | End call |

---

## Next Steps

1. **Create the 3 agents** in Retell dashboard
2. **Design each flow** following the diagrams above
3. **Configure functions** with your Supabase URLs
4. **Test each agent** individually with Simulation
5. **Update backend** to use new agent IDs
6. **Test end-to-end** with real workflows
7. **Add fine-tuning examples** based on testing results

---

## Troubleshooting

### Agent won't transition to next node

1. Check transition conditions are specific enough
2. Add more transition options for edge cases
3. Add a "default" transition for unhandled cases
4. Review call history to see what the user actually said

### Function not being called

1. Ensure Function Node is connected correctly
2. Check "Wait for Result" is enabled if you need the response
3. Verify function URL is correct
4. Check function parameters match what agent extracts

### Agent says unexpected things

1. Switch to **Rigid Mode**
2. Use **Static Sentences** instead of Prompts for critical lines
3. Check Global Prompt isn't conflicting with node instructions
4. Review for overlapping transition conditions


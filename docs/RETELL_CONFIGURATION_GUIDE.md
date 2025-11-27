# Retell AI Configuration Guide for Mend

## Your Current Setup Status

| Item | Status |
|------|--------|
| Phone Number | ✅ `+61 2 9136 2358` via Crazytel |
| SIP Trunking | ✅ Connected to Retell |
| Inbound Agent | ✅ Incident Reporting Agent |
| Outbound Agent | ✅ Booking Agent |
| Edge Functions | ✅ Created in Supabase |
| Environment Variables | ✅ Set in Vercel |

---

## PART 1: Dynamic Variables

### What Are Dynamic Variables?

Dynamic variables are **placeholders in your agent's prompt** that look like `{{variable_name}}`. They get replaced with real values when:
- **Outbound calls**: You pass values via the API when creating the call
- **Inbound calls**: System variables are available automatically

### Where to Add Them

**Dynamic variables go DIRECTLY IN YOUR PROMPT** - not in a separate settings panel.

### Step 1: Edit Your Booking Agent's Prompt

1. Go to **Retell Dashboard** → **Agents** → Click on your **Booking Agent**
2. Look for the **Prompt** section (the main text area)
3. Edit your prompt to include variables like this:

```
# IDENTITY
You are an automated assistant calling on behalf of Mend Services, a workplace rehabilitation provider in New South Wales, Australia.

# CONTEXT
You are calling {{medical_center_name}} to book a workers compensation appointment.

Patient Details:
- Name: {{worker_name}}
- Injury: {{injury_type}}
- Description: {{injury_description}}
- Date of Injury: {{date_of_injury}}
- Insurer: icare NSW

# YOUR TASK
1. Navigate any phone menu (IVR) to reach reception
2. Explain you are calling from Mend Services to book a workers comp appointment
3. Request the earliest available appointment
4. Confirm the booking details
5. Ask for an email address to send referral documents

# RECORDING DISCLOSURE
At the start of the call, say: "This call may be recorded for quality assurance purposes."

# RULES
- Always identify yourself as an automated assistant if asked
- Never provide medical advice
- Be polite and professional
```

### Step 2: Set Default Values (Optional)

1. In your agent settings, scroll down to find **"Default Dynamic Variables"**
2. Click **"Add Variable"** 
3. Add fallback values that will be used if no value is passed:

| Variable Name | Default Value |
|--------------|---------------|
| `worker_name` | `the patient` |
| `injury_type` | `a workplace injury` |
| `medical_center_name` | `the medical center` |

### Step 3: Test Dynamic Variables

1. In the Retell Dashboard, click **"Test"** on your agent
2. Before starting the test, you'll see a panel to enter test values
3. Fill in test values like:
   - `worker_name`: `John Smith`
   - `injury_type`: `Back strain`
   - `medical_center_name`: `Sydney CBD Medical Centre`
4. Start the test call and verify the agent uses these values

### Available System Variables (Automatic)

These are available automatically - no setup needed:

| Variable | What It Contains |
|----------|-----------------|
| `{{current_time_Australia/Sydney}}` | Current AEST/AEDT time |
| `{{direction}}` | `inbound` or `outbound` |
| `{{user_number}}` | The other party's phone number |
| `{{agent_number}}` | Your Retell phone number |
| `{{call_id}}` | Unique call identifier |

---

## PART 2: Functions (Tools)

### Where to Find Functions

1. Go to **Retell Dashboard** → **Agents** → Click on your agent
2. Scroll down to find the **"Functions"** section
3. Click **"+ Add"** to add a new function

### Functions for Booking Agent (Outbound)

#### Function 1: Press Digit (IVR Navigation)
This lets the agent navigate phone menus.

1. Click **"+ Add"**
2. Select **"Press Digit"** from the dropdown
3. That's it - it's pre-configured!

**The agent will automatically detect "Press 1 for appointments" and use this function.**

#### Function 2: End Call
Lets the agent end the call gracefully.

1. Click **"+ Add"**
2. Select **"End Call"** from the dropdown
3. Done!

#### Function 3: Custom Function - `confirm_booking`
This sends booking confirmations to your Supabase Edge Function.

1. Click **"+ Add"**
2. Select **"Custom Function"**
3. Fill in:

**Name:** `confirm_booking`

**Description:** 
```
Call this function when you have successfully confirmed an appointment booking with the medical center. Include all the details you received.
```

**HTTP Method:** `POST`

**Endpoint URL:**
```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler
```

**Parameters** (click JSON Form, then add each):

| Property Name | Type | Description |
|--------------|------|-------------|
| `doctor_name` | string | Name of the doctor |
| `appointment_datetime` | string | Date and time of the appointment |
| `clinic_name` | string | Name of the medical center |
| `clinic_address` | string | Address of the clinic |
| `clinic_email` | string | Email to send referral documents |
| `notes` | string | Any special instructions or notes |

**Or use this JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "doctor_name": {
      "type": "string",
      "description": "Name of the doctor"
    },
    "appointment_datetime": {
      "type": "string", 
      "description": "Date and time of the appointment in ISO format"
    },
    "clinic_name": {
      "type": "string",
      "description": "Name of the medical center"
    },
    "clinic_address": {
      "type": "string",
      "description": "Full address of the clinic"
    },
    "clinic_email": {
      "type": "string",
      "description": "Email address to send referral documents"
    },
    "notes": {
      "type": "string",
      "description": "Any special instructions or additional notes"
    }
  },
  "required": ["doctor_name", "appointment_datetime", "clinic_name"]
}
```

**Speech Behavior:**
- ✅ Speak during execution: ON (say "I'm just confirming those details...")
- ✅ Speak after execution: ON

5. Click **Save**

#### Function 4: Custom Function - `booking_failed`

1. Click **"+ Add"** → **"Custom Function"**
2. Fill in:

**Name:** `booking_failed`

**Description:**
```
Call this function when you could not book an appointment (no availability, refused, line disconnected, etc.)
```

**HTTP Method:** `POST`

**Endpoint URL:**
```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "reason": {
      "type": "string",
      "description": "Why the booking failed"
    },
    "next_availability": {
      "type": "string",
      "description": "When to try again, if mentioned by the clinic"
    }
  },
  "required": ["reason"]
}
```

### Functions for Incident Reporting Agent (Inbound)

#### Function 1: End Call
1. **"+ Add"** → **"End Call"**

#### Function 2: Call Transfer
For emergencies - transfers to your mobile.

1. **"+ Add"** → **"Transfer Call"**
2. Configure:
   - **Transfer Number:** Your mobile number (e.g., `+614xxxxxxxx`)
   - **Warm Transfer Message:** `I'm transferring you to a case manager who can help further.`

#### Function 3: Custom Function - `lookup_employer` (NEW - Real-time database lookup)

**Name:** `lookup_employer`

**Description:**
```
Call this function FIRST when the caller mentions their company or employer name. This validates the employer exists in our system and returns their employer ID. If not found, it will suggest similar company names or prompt to ask for the site name instead.
```

**HTTP Method:** `POST`

**Endpoint URL:**
```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/lookup-employer
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "employer_name": {
      "type": "string",
      "description": "The company or employer name mentioned by the caller"
    }
  },
  "required": ["employer_name"]
}
```

**Response Fields:**
- `found` (boolean): Whether the employer was found
- `employer_id` (number): The employer's ID in our system
- `employer_name` (string): The confirmed employer name
- `suggestions` (array): Alternative company names if not found
- `message` (string): Response message to relay to caller

**Speech Behavior:**
- ✅ Speak during execution: ON (say "Let me check our system...")
- ✅ Speak after execution: ON (relay the message from the response)

#### Function 4: Custom Function - `lookup_site` (NEW - Fallback site lookup)

**Name:** `lookup_site`

**Description:**
```
Call this function when the employer lookup fails or when the caller doesn't know their company name but knows the site/project name. This looks up the site and returns the associated employer information.
```

**HTTP Method:** `POST`

**Endpoint URL:**
```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/lookup-site
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "site_name": {
      "type": "string",
      "description": "The work site, project, or location name mentioned by the caller"
    },
    "city": {
      "type": "string",
      "description": "Optional: The city or suburb to help narrow down the search"
    }
  },
  "required": ["site_name"]
}
```

**Response Fields:**
- `found` (boolean): Whether the site was found
- `site_id` (number): The site's ID
- `site_name` (string): The confirmed site name
- `employer_id` (number): The associated employer's ID
- `employer_name` (string): The associated employer's name
- `suggestions` (array): Alternative site names if not found
- `message` (string): Response message to relay to caller

**Speech Behavior:**
- ✅ Speak during execution: ON (say "Let me look that up...")
- ✅ Speak after execution: ON (relay the message from the response)

#### Function 5: Custom Function - `submit_incident`

**Name:** `submit_incident`

**Description:**
```
Call this function when you have collected all the incident details from the caller. Make sure you have gathered the worker's name, employer, injury description, and contact details.
```

**HTTP Method:** `POST`

**Endpoint URL:**
```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler
```

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "caller_name": {
      "type": "string",
      "description": "Name of the person reporting the incident"
    },
    "caller_phone": {
      "type": "string",
      "description": "Phone number of the caller"
    },
    "caller_role": {
      "type": "string",
      "description": "Role of caller: supervisor, witness, injured_worker, or other"
    },
    "worker_name": {
      "type": "string",
      "description": "Full name of the injured worker"
    },
    "employer_name": {
      "type": "string",
      "description": "Name of the employer/company"
    },
    "site_name": {
      "type": "string",
      "description": "Work site or location name"
    },
    "injury_description": {
      "type": "string",
      "description": "Description of what happened and the injury"
    },
    "body_part_injured": {
      "type": "string",
      "description": "Which body part was injured"
    },
    "date_of_injury": {
      "type": "string",
      "description": "Date when the injury occurred"
    },
    "time_of_injury": {
      "type": "string",
      "description": "Time when the injury occurred"
    },
    "treatment_received": {
      "type": "string",
      "description": "Any first aid or medical treatment already received"
    },
    "severity": {
      "type": "string",
      "description": "Severity level: minor, moderate, or severe"
    }
  },
  "required": ["worker_name", "employer_name", "injury_description"]
}
```

---

## PART 3: Webhooks

Webhooks notify your system when calls start, end, or are analyzed.

### Where to Register Webhooks

You have TWO options:

#### Option A: Account-Level Webhook (Recommended)
Receives events for ALL your agents.

1. Go to **Retell Dashboard** → Click your profile/settings icon (top right)
2. Find **"Webhooks"** tab
3. Click **"Add Webhook"**
4. Enter:
   - **URL:** `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler`
   - **Events:** Select all three:
     - ✅ `call_started`
     - ✅ `call_ended`
     - ✅ `call_analyzed`
5. Save

#### Option B: Agent-Level Webhook
Different webhook URL per agent (overrides account-level).

1. Go to **Agents** → Click on specific agent
2. Scroll to **"Webhooks"** section
3. Enter the webhook URL

### What Webhook Events Contain

| Event | When It Fires | Contains |
|-------|---------------|----------|
| `call_started` | Call connects | Basic call info |
| `call_ended` | Call completes | Full transcript, duration, status |
| `call_analyzed` | ~30s after call ends | Sentiment analysis, call summary |

---

## PART 4: Update Your Prompts

### Incident Reporting Agent Prompt

Go to your Incident Reporting Agent and update the prompt to:

```
# IDENTITY
You are an automated incident reporting assistant for Mend Services, a workplace rehabilitation provider in New South Wales, Australia.

# RECORDING DISCLOSURE
Start every call by saying: "Thank you for calling Mend Services. This call is being recorded for quality and training purposes. How can I help you today?"

# YOUR TASK
You are receiving a call to report a workplace injury or incident. Your job is to:
1. Gather the details of the incident
2. Collect contact information
3. Submit the incident report

# INFORMATION TO COLLECT
Collect the following information (ask one or two questions at a time):

1. Caller's name and role (are they the injured worker, supervisor, or witness?)
2. Injured worker's full name
3. Employer/company name
4. Work site or location
5. What happened (injury description)
6. Which body part was injured
7. When did it happen (date and time)
8. What treatment has been given so far
9. How serious is the injury (minor, moderate, severe)
10. Best contact number

# AFTER COLLECTING INFORMATION
Once you have gathered the key details:
1. Summarize what you've collected
2. Ask the caller to confirm the details are correct
3. Call the submit_incident function
4. Let them know a case manager will be in touch within 24 hours

# EMERGENCY SITUATIONS
If the caller indicates:
- Someone needs immediate medical attention
- There has been a fatality
- The situation is urgent

Say: "This sounds urgent. Let me transfer you to a case manager immediately."
Then use the Transfer Call function.

# RULES
- Be empathetic and patient
- If asked if you're a robot, say "I'm an automated assistant. Would you prefer to speak with a person?"
- Never provide medical advice
- If the caller is distressed, offer to transfer to a human
```

---

## PART 5: Testing Checklist

### Test 1: Inbound Call (Incident Reporting)

1. Call your number: **+61 2 9136 2358**
2. The Incident Reporting agent should answer
3. Report a test incident with these details:
   - Caller: "John Smith, supervisor"
   - Worker: "Jane Doe"
   - Employer: "ABC Construction"
   - Site: "Sydney CBD project"
   - Injury: "She slipped and hurt her back"
   - Body part: "Lower back"
   - Date/time: "Today at 10am"
   - Treatment: "First aid kit, ice pack"
   - Severity: "Moderate"
   - Contact: "0412345678"
4. The agent should:
   - Summarize the details
   - Confirm with you
   - Call the `submit_incident` function
5. Check Supabase logs:
   ```bash
   supabase functions logs retell-webhook-handler
   ```

### Test 2: Outbound Call (Booking)

Use this curl command to trigger a test outbound call:

```bash
curl -X POST "https://api.retellai.com/v2/create-phone-call" \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_BOOKING_AGENT_ID",
    "from_number": "+61291362358",
    "to_number": "+61YOUR_MOBILE_NUMBER",
    "retell_llm_dynamic_variables": {
      "worker_name": "Test Worker",
      "injury_type": "Back strain",
      "injury_description": "Lower back injury from lifting",
      "date_of_injury": "25 November 2025",
      "medical_center_name": "Sydney CBD Medical Centre"
    }
  }'
```

This will call YOUR mobile. Answer it and pretend you're a medical receptionist to test the booking flow.

---

## PART 6: Troubleshooting

### "Function parameters not valid"
- Make sure your JSON schema has `"type": "object"` at the top level
- All property names should be lowercase with underscores

### "Webhook not receiving events"
- Check the webhook URL is exactly correct
- Verify your Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs retell-webhook-handler`

### "Dynamic variables showing as {{variable_name}}"
- The variable wasn't passed when creating the call
- Check spelling matches exactly (case-sensitive)
- Set a default value in agent settings

### "Agent not navigating IVR"
- Make sure "Press Digit" function is added
- Add this to your prompt: "When you hear a phone menu, listen carefully and press the appropriate number to reach reception or appointments."

---

## Quick Reference: Your Supabase Edge Function URL

```
https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler
```

Use this URL for:
- Custom function endpoints (confirm_booking, booking_failed, submit_incident)
- Account-level webhook
- Agent-level webhooks

---

**Last Updated:** November 25, 2025


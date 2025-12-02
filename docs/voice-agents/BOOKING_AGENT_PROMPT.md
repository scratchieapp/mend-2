# Medical Booking Agent - Retell AI Configuration

This document contains the system prompt and tool configurations for the Medical Appointment Booking Agent in Retell AI.

## Agent Overview

The Medical Booking Agent (named "Emma") handles the multi-step medical appointment booking process:

1. **Call 1: Medical Center** - Get available appointment times
2. **Call 2: Patient** - Confirm patient's preferred time
3. **Call 3: Medical Center** - Confirm final booking

## System Prompt

```
You are Emma, a professional medical appointment booking assistant from Mend, a workplace injury management company. Your role is to help book medical appointments for injured workers.

## CRITICAL: Check {{call_type}} First!

**BEFORE speaking, check the value of {{call_type}} and follow ONLY the matching script below:**

- If {{call_type}} is "get_times" → Follow "Call Type: get_times" script (calling MEDICAL CENTER to get times)
- If {{call_type}} is "patient_confirm" → Follow "Call Type: patient_confirm" script (calling PATIENT to confirm time)
- If {{call_type}} is "final_confirm" → Follow "Call Type: final_confirm" script (calling MEDICAL CENTER to finalize)

**DO NOT MIX SCRIPTS.** Each call type has a completely different purpose and opening.

## Context Variables (Provided at Runtime)
- {{workflow_id}} - Unique identifier for this booking workflow
- {{call_type}} - Current call type: "get_times", "patient_confirm", or "final_confirm" ← CHECK THIS FIRST!
- {{worker_name}} - Full name of the injured worker
- {{worker_first_name}} - Worker's first name
- {{worker_dob}} - Worker's date of birth
- {{injury_type}} - Type of injury
- {{injury_description}} - Description of the injury
- {{body_part}} - Affected body part
- {{date_of_injury}} - When the injury occurred
- {{medical_center_name}} - Name of the medical center
- {{medical_center_address}} - Address of the medical center
- {{doctor_preference}} - "any_doctor" or "specific_doctor"
- {{preferred_doctor_name}} - Specific doctor name (if applicable)
- {{employer_name}} - Worker's employer
- {{urgency}} - "urgent", "normal", or "low"
- {{urgency_context}} - Additional context for urgent cases
- {{available_times_summary}} - Summary of available times (for patient calls)
- {{available_times_json}} - JSON array of available times
- {{patient_confirmed_time}} - Patient's confirmed time (for final confirmation)
- {{patient_preferred_doctor}} - Patient's preferred doctor (if any)
- {{ivr_instructions}} - Special IVR navigation instructions for this clinic
- {{additional_notes}} - Any additional context

## Call Type: get_times (Calling Medical Center)

### Objective
Call the medical center to find 2-3 available appointment times for the injured worker.

### Conversation Flow
**Keep it simple and direct. Get to the appointment request quickly.**

1. **Brief Intro + Request**: "Hi, this is Emma from Mend. I need to book a WorkCover appointment for {{worker_name}}. What times do you have available in the next few days?"

2. **Only Provide Details IF Asked**:
   - Name: {{worker_name}}
   - Date of Birth: {{worker_dob}}  
   - Injury: {{injury_type}} to {{body_part}}
   - Employer: {{employer_name}}
   - Doctor preference: {{preferred_doctor_name}} or "any doctor is fine"

3. **Collect Multiple Times**: 
   - IMPORTANT: You need 2-3 available appointment options so the patient has choices
   - If they offer only one time, ask: "Do you have any other times available? I'd like to give the patient a couple of options."
   - For each time, note: date, time, and doctor name
   - If they truly only have one slot, accept it but try for more first

7. **Confirm & End**: Once you have the times, say "Thank you, I've noted those times. I'll check with the patient and call back to confirm. Goodbye." Then end the call.

### Success Criteria
- Obtained 2-3 available appointment times (minimum 2 if possible)
- Got doctor names for the appointments (if possible)
- Understood any special instructions (parking, check-in time, etc.)

### Important
- Do NOT end the call after getting just one time - always ask for more options
- After calling submit_available_times, say goodbye once and end the call immediately - do not repeat yourself

### Tools to Use
- `submit_available_times` - When you have collected available times
- `booking_failed` - If unable to get any times
- `press_dtmf` - For IVR navigation
- `end_call` - When call is complete

---

## Call Type: patient_confirm (Calling Patient)

⚠️ **IMPORTANT: You are calling the PATIENT (injured worker), NOT the medical center!**
- DO NOT ask "what times do you have available" - YOU already have the times!
- Your job is to PRESENT the options and ask which one works for THEM

### Objective
Call the patient (injured worker) to confirm which appointment time works for them from the times YOU already collected.

### Conversation Flow
1. **Greeting**: "Hello, is this {{worker_first_name}}? This is Emma calling from Mend about your medical appointment."

2. **Context**: "I'm calling because we've arranged some appointment options at {{medical_center_name}} for you."

3. **Present Options**: "Here are the times available:"
   {{available_times_summary}}

4. **Get Preference**: "Which of these times works best for you?"

5. **Confirm Selection**: Repeat back their chosen time clearly.

6. **Any Concerns**: "Is there anything you need to know about the appointment, like parking or what to bring?"

7. **Close**: "Great, I'll confirm this appointment with the clinic and you'll receive confirmation. Take care!"

### Success Criteria
- Patient confirmed one of the available times
- Patient's preferred doctor noted (if mentioned)
- Any special needs communicated

### If Patient Can't Make Any Times
- Use `patient_needs_reschedule` tool
- Ask for their general availability
- Note their preferences for the next call to the clinic

### Tools to Use
- `patient_confirmed_time` - When patient selects a time
- `patient_needs_reschedule` - If none of the times work
- `end_call` - When call is complete

---

## Call Type: final_confirm (Calling Medical Center to Confirm)

### Objective
Call the medical center back to confirm the final booking.

### Conversation Flow
1. **Greeting**: "Hello, this is Emma from Mend calling back to confirm an appointment."

2. **Reference Previous Call**: "I called earlier about booking an appointment for {{worker_name}}."

3. **Confirm Time**: "The patient has confirmed they can make {{patient_confirmed_time}}."

4. **Get Confirmation**: Ask them to confirm the booking is locked in.

5. **Get Details**: Confirm:
   - Final appointment date/time
   - Doctor's name
   - Clinic email (for sending confirmation)
   - Any special instructions for the patient

6. **Thank & Close**: "Thank you for your help. The patient will be there. Have a great day!"

### Success Criteria
- Booking confirmed by clinic
- Doctor name confirmed
- Any special instructions noted

### Tools to Use
- `confirm_booking` - When booking is confirmed
- `booking_failed` - If something goes wrong
- `end_call` - When call is complete

---

## General Guidelines

### Tone & Style
- Professional and efficient - get to the point quickly
- Don't over-explain or ask unnecessary questions upfront
- Only provide details when asked
- Patient and understanding with medical receptionists
- Australian English spelling and phrasing
- Keep responses short - don't ramble

### Handling IVR Systems
- If {{ivr_instructions}} is provided, follow those instructions
- Common options: Press 1 for appointments, Press 2 for reception
- If stuck, say "I'd like to speak to someone about booking an appointment"

### Handling Holds/Transfers
- Wait patiently on hold
- If transferred, re-introduce yourself briefly
- "Hi, I was transferred. I'm calling from Mend to book a medical appointment."

### Handling Resistance
- If asked about WorkCover: "Yes, this is a WorkCover case. Mend manages workplace injury claims."
- If asked for more details: Provide injury information but keep patient's full details minimal unless necessary
- If they can't help: "Is there someone else who could help with appointment bookings?"

### Error Handling
- If call drops: Don't retry automatically, mark as failed
- If no answer: Mark as failed, will be rescheduled
- If wrong number: Mark as failed immediately
- If voicemail: Leave a brief message and mark for callback
```

## Custom Functions (Tools)

Configure these tools in Retell AI for the booking agent.

**Base URL**: `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1`

> **Important**: Use simple, flat JSON schemas. Retell doesn't handle nested objects/arrays well in function parameters. For complex data like multiple appointment times, use **Post-Call Data Extraction** instead.

---

### 1. submit_available_times

**Description**: Submit the available appointment times collected from the medical center.

| Setting | Value |
|---------|-------|
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-submit-times` |
| **Speak During Execution** | ✅ Yes |
| **Execution Message** | "Perfect, I've got those times. I'll check with the patient and call back to confirm. Thanks, goodbye!" |
| **Speak After Execution** | ❌ No (prevents repetition) |

**Schema** (paste this in Retell):
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
      "description": "Second available time (e.g., 'Tuesday December 3rd at 2:00 PM with Dr Jones')"
    },
    "time_slot_3": {
      "type": "string",
      "description": "Third available time if offered"
    },
    "clinic_notes": {
      "type": "string",
      "description": "Any notes from clinic (parking, check-in time, what to bring)"
    }
  },
  "required": ["time_slot_1"]
}
```

**Response Variables**:
| Key | Value |
|-----|-------|
| success | success |
| message | message |

---

### 2. patient_confirmed_time

**Description**: Record the patient's confirmed appointment time.

| Setting | Value |
|---------|-------|
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-patient-confirm` |
| **Speak During Execution** | ✅ Yes |
| **Execution Message** | "Great, I'll confirm that with the clinic now. Take care, goodbye!" |
| **Speak After Execution** | ❌ No (prevents repetition) |

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "patient_confirmed_time": {
      "type": "string",
      "description": "The appointment time the patient confirmed (e.g., 'Monday December 2nd at 10:30 AM')"
    },
    "patient_preferred_doctor": {
      "type": "string",
      "description": "Doctor the patient prefers if mentioned"
    },
    "patient_notes": {
      "type": "string",
      "description": "Any notes from the patient"
    }
  },
  "required": ["patient_confirmed_time"]
}
```

**Response Variables**:
| Key | Value |
|-----|-------|
| success | success |
| message | message |
| confirmed_time | confirmed_time |

---

### 3. patient_needs_reschedule

**Description**: Patient cannot make any offered times.

| Setting | Value |
|---------|-------|
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-patient-reschedule` |
| **Speak During Execution** | ✅ Yes |
| **Execution Message** | "No worries, I'll find some other times and get back to you. Take care!" |
| **Speak After Execution** | ❌ No (prevents repetition) |

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "patient_availability_notes": {
      "type": "string",
      "description": "When the patient IS available (e.g., 'Only afternoons', 'Tuesdays work best')"
    },
    "reason": {
      "type": "string",
      "description": "Why the offered times don't work"
    }
  },
  "required": ["reason"]
}
```

**Response Variables**:
| Key | Value |
|-----|-------|
| success | success |
| message | message |

---

### 4. confirm_booking

**Description**: Confirm the final booking with the clinic.

| Setting | Value |
|---------|-------|
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-confirm-final` |
| **Speak During Execution** | ✅ Yes |
| **Execution Message** | "That's all confirmed. Thanks so much for your help. Goodbye!" |
| **Speak After Execution** | ❌ No (prevents repetition) |

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "booking_confirmed": {
      "type": "boolean",
      "description": "Whether the booking was successfully confirmed"
    },
    "confirmed_datetime": {
      "type": "string",
      "description": "The confirmed appointment date and time"
    },
    "confirmed_doctor_name": {
      "type": "string",
      "description": "The doctor's name"
    },
    "special_instructions": {
      "type": "string",
      "description": "Any instructions for the patient"
    }
  },
  "required": ["booking_confirmed", "confirmed_datetime"]
}
```

**Response Variables**:
| Key | Value |
|-----|-------|
| success | success |
| message | message |
| appointment_confirmed | appointment_confirmed |

---

### 5. booking_failed

**Description**: Mark the booking attempt as failed.

| Setting | Value |
|---------|-------|
| **URL** | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-failed` |
| **Speak During Execution** | ✅ Yes |
| **Execution Message** | "No problem, our team will follow up another way. Thanks, goodbye!" |
| **Speak After Execution** | ❌ No (prevents repetition) |

**Schema**:
```json
{
  "type": "object",
  "properties": {
    "failure_reason": {
      "type": "string",
      "description": "Why the booking failed"
    },
    "should_retry": {
      "type": "boolean",
      "description": "Whether to try again later"
    }
  },
  "required": ["failure_reason"]
}
```

**Response Variables**:
| Key | Value |
|-----|-------|
| success | success |
| message | message |

---

## Post-Call Data Extraction

Configure these in **Post-Call Data Extraction** section of your Retell agent. Click **+ Add** and select the appropriate type.

---

### Medical Center Calls (Getting Available Times)

**1. available_time_1** (Text)
| Field | Value |
|-------|-------|
| Name | `available_time_1` |
| Description | First available appointment time including day, date, time, and doctor name if mentioned |
| Format Example | Monday December 2nd at 10:30 AM with Dr Smith |

**2. available_time_2** (Text)
| Field | Value |
|-------|-------|
| Name | `available_time_2` |
| Description | Second available appointment time including day, date, time, and doctor name if mentioned |
| Format Example | Tuesday December 3rd at 2:00 PM with Dr Jones |

**3. available_time_3** (Text)
| Field | Value |
|-------|-------|
| Name | `available_time_3` |
| Description | Third available appointment time if offered, including day, date, time, and doctor name |
| Format Example | Wednesday December 4th at 9:00 AM |

**4. clinic_notes** (Text)
| Field | Value |
|-------|-------|
| Name | `clinic_notes` |
| Description | Any special instructions from the clinic such as parking info, what to bring, check-in time |
| Format Example | Arrive 15 minutes early, bring ID and Medicare card |

**5. times_collected** (Boolean)
| Field | Value |
|-------|-------|
| Name | `times_collected` |
| Description | Did the agent successfully collect at least one available appointment time from the clinic? |

---

### Patient Calls (Confirming Availability)

**1. patient_selected_time** (Text)
| Field | Value |
|-------|-------|
| Name | `patient_selected_time` |
| Description | Which appointment time the patient agreed to from the options presented |
| Format Example | Monday December 2nd at 10:30 AM |

**2. patient_preferred_doctor** (Text)
| Field | Value |
|-------|-------|
| Name | `patient_preferred_doctor` |
| Description | If the patient mentioned preferring a specific doctor |
| Format Example | Dr Smith |

**3. patient_notes** (Text)
| Field | Value |
|-------|-------|
| Name | `patient_notes` |
| Description | Any notes or special requests from the patient |
| Format Example | Needs wheelchair access, will bring carer |

**4. patient_confirmed** (Boolean)
| Field | Value |
|-------|-------|
| Name | `patient_confirmed` |
| Description | Did the patient confirm they can attend one of the offered appointment times? |

**5. needs_reschedule** (Boolean)
| Field | Value |
|-------|-------|
| Name | `needs_reschedule` |
| Description | Does the patient need different appointment times because none of the offered times work? |

**6. patient_availability** (Text)
| Field | Value |
|-------|-------|
| Name | `patient_availability` |
| Description | If the patient needs reschedule, when ARE they available? |
| Format Example | Only available afternoons, Tuesdays and Thursdays work best |

---

### Final Confirmation Calls (Confirming with Clinic)

**1. booking_confirmed** (Boolean)
| Field | Value |
|-------|-------|
| Name | `booking_confirmed` |
| Description | Did the clinic confirm the appointment booking? |

**2. confirmed_datetime** (Text)
| Field | Value |
|-------|-------|
| Name | `confirmed_datetime` |
| Description | The final confirmed appointment date and time |
| Format Example | Monday December 2nd at 10:30 AM |

**3. confirmed_doctor** (Text)
| Field | Value |
|-------|-------|
| Name | `confirmed_doctor` |
| Description | The doctor's name for the confirmed appointment |
| Format Example | Dr Smith |

**4. special_instructions** (Text)
| Field | Value |
|-------|-------|
| Name | `special_instructions` |
| Description | Any instructions the clinic gave for the patient |
| Format Example | Arrive 15 minutes early, bring Medicare card and referral |

**5. clinic_reference** (Text)
| Field | Value |
|-------|-------|
| Name | `clinic_reference` |
| Description | Any booking or reference number provided by the clinic |
| Format Example | REF-12345 |

---

The extracted data appears in `call.call_analysis.custom_analysis_data` in the webhook payload, which our `retell-webhook-handler` processes automatically.

---

### 6. press_dtmf

**Description**: Press a phone keypad button to navigate IVR/phone menus.

| Setting | Value |
|---------|-------|
| **Type** | Built-in Retell Function |
| **Speak During Execution** | **No** |
| **Execution Timeout** | 2 seconds |

**Parameters**:
```json
{
  "digit": {
    "type": "string",
    "description": "The digit to press (0-9, *, #)"
  }
}
```

**Response Variables**: None

**Notes**: This is a built-in Retell function. The agent should wait briefly after pressing to hear the IVR response.

---

### 7. end_call

**Description**: End the current call gracefully.

| Setting | Value |
|---------|-------|
| **Type** | Built-in Retell Function |
| **Speak During Execution** | **No** (agent should say goodbye before calling this) |
| **Execution Timeout** | 2 seconds |

**Parameters**:
```json
{
  "reason": {
    "type": "string",
    "description": "Reason for ending the call",
    "enum": ["completed", "voicemail", "no_answer", "wrong_number", "call_back_later"]
  }
}
```

**Response Variables**: None

**Notes**: Agent should deliver a natural closing before invoking this function.

---

## Webhook Payload Structure

When a custom function is called with **Args-only: No**, Retell sends the full call context. The webhook receives:

```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "call_abc123",
    "agent_id": "agent_xyz789",
    "call_type": "phone_call",
    "direction": "outbound",
    "from_number": "+61299999999",
    "to_number": "+61412345678",
    "start_timestamp": 1701388800000,
    "end_timestamp": 1701389100000,
    "transcript": "...",
    "transcript_object": [...],
    "recording_url": "https://...",
    "call_analysis": {
      "call_summary": "...",
      "user_sentiment": "positive",
      "call_successful": true,
      "custom_analysis_data": {
        // Function arguments appear here
        "available_times": [...],
        "clinic_notes": "..."
      }
    },
    "metadata": {
      "task_id": "uuid",
      "workflow_id": "uuid",
      "incident_id": 123,
      "task_type": "booking_get_times",
      "call_sequence": 1
    }
  }
}
```

The `custom_analysis_data` object contains the function arguments, which the webhook handler extracts to update the booking workflow.

---

## Quick Reference

| Function | Full URL |
|----------|----------|
| submit_available_times | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-submit-times` |
| patient_confirmed_time | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-patient-confirm` |
| patient_needs_reschedule | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-patient-reschedule` |
| confirm_booking | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-confirm-final` |
| booking_failed | `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/booking-failed` |

**All functions**: Speak During Execution ✅ | Speak After Execution ✅

---

## Retell AI Configuration Steps

1. **Create Agent**:
   - Name: "Medical Booking Agent"
   - Voice: Choose an Australian female voice (e.g., "Amy" or similar)
   - Language: English (Australia)

2. **Set System Prompt**:
   - Copy the system prompt above
   - Enable dynamic variables

3. **Configure Tools**:
   - Add each tool with the parameters specified
   - Set webhook URL to: `https://[your-project].supabase.co/functions/v1/retell-webhook-handler`

4. **LLM Settings**:
   - Model: GPT-4 or Claude (recommended for complex multi-step conversations)
   - Temperature: 0.7 (balanced between consistent and natural)
   - Response length: Medium

5. **Call Settings**:
   - End call on silence: 30 seconds
   - End call on user silence: 20 seconds
   - Answering machine detection: Enabled

## Environment Variables

Ensure these are set in your Supabase Edge Function environment:

```
RETELL_BOOKING_AGENT_ID=agent_xxxxxxxxx
RETELL_API_KEY=your_retell_api_key
RETELL_PHONE_NUMBER=10284766
```

## Testing Checklist

- [ ] Agent can navigate basic IVR menus
- [ ] Agent correctly identifies as Emma from Mend
- [ ] Agent collects at least 2 appointment options
- [ ] Agent handles "no availability" gracefully
- [ ] Agent successfully presents options to patient
- [ ] Agent handles patient declining all options
- [ ] Agent confirms final booking with clinic
- [ ] All webhook calls are received and processed
- [ ] Activity log shows all call activities
- [ ] Appointment record created on successful booking
- [ ] Call history shows start/end times for each call
- [ ] Patient retry scheduling works (30 min intervals)
- [ ] Calls are not made outside 7am-9:30pm AEST

---

## Enhanced Call Tracking

The booking workflow now includes detailed call tracking with:

### Call History Table
Every call attempt is logged with:
- Start and end times
- Duration
- Outcome (completed, no_answer, voicemail, busy, failed)
- Target (medical_center or patient)
- Extracted data from the call

### Patient Retry Logic
When a patient call fails (no answer, voicemail, busy):
1. System schedules a retry for 30 minutes later
2. Up to 3 attempts total
3. Respects calling hours (7am-9:30pm AEST)
4. Shows retry status in the UI with countdown

### Calling Hours
All outbound calls are restricted to:
- **Start:** 7:00 AM AEST
- **End:** 9:30 PM AEST

If a call needs to be made outside these hours, it will be automatically scheduled for the next valid time.

### Database Functions

| Function | Purpose |
|----------|---------|
| `record_booking_call_start` | Log when a call starts |
| `record_booking_call_end` | Log when a call ends with outcome |
| `schedule_patient_call_retry` | Schedule a patient retry (30 min) |
| `is_within_calling_hours` | Check if current time is valid |
| `get_next_valid_call_time` | Calculate next valid calling time |
| `get_booking_workflow_with_history` | Get workflow with full call history |
| `get_workflows_pending_patient_retry` | Find workflows ready for retry |

---

## Cron Job Setup

To automatically process patient retries, set up a cron job that calls the `process-patient-retries` Edge Function every 5-10 minutes:

### Using pg_cron (Supabase)

```sql
-- Run every 5 minutes during calling hours
SELECT cron.schedule(
  'process-patient-retries',
  '*/5 7-21 * * *',  -- Every 5 min between 7am-9pm
  $$
  SELECT net.http_post(
    url := 'https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/process-patient-retries',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Alternative: External Cron (e.g., cron-job.org, GitHub Actions)

```bash
curl -X POST \
  https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/process-patient-retries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## Workflow Status Reference

| Status | Description |
|--------|-------------|
| `initiated` | Workflow just created |
| `calling_medical_center` | First call to medical center in progress |
| `times_collected` | Available times received |
| `calling_patient` | Calling patient to confirm |
| `awaiting_patient_retry` | Patient unreachable, waiting for scheduled retry |
| `patient_confirmed` | Patient confirmed a time |
| `confirming_booking` | Final confirmation call in progress |
| `completed` | Booking successfully completed |
| `failed` | All retries exhausted |
| `cancelled` | User cancelled the workflow |


# Voice Agent Setup Guide

## Complete Implementation Guide for Retell AI Integration

This guide walks you through the complete setup of voice agents in the Mend platform.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Retell AI Configuration](#retell-ai-configuration)
4. [Supabase Edge Functions Deployment](#supabase-edge-functions-deployment)
5. [Environment Variables](#environment-variables)
6. [Testing](#testing)
7. [Going Live](#going-live)

---

## Prerequisites

### Required Accounts & Keys
- ✅ Retell AI account (sign up at https://www.retellai.com/)
- ✅ Supabase project (already configured: `rkzcybthcszeusrohbtc`)
- ✅ Australian phone number (Retell provides this)
- ✅ ElevenLabs account (for Australian voices - included with Retell)

### Required Tools
```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

---

## 1. Database Setup

### Step 1: Run Migration

```bash
cd /Users/jameskell/Cursor/mend-2

# Connect to Supabase
supabase login

# Link to your project
supabase link --project-ref rkzcybthcszeusrohbtc

# Run the migration
supabase db push supabase/migrations/20250115_voice_agent_tables.sql
```

### Step 2: Verify Tables Created

```sql
-- Run this in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('appointments', 'voice_tasks', 'voice_logs', 'medical_centers');
```

You should see all 4 tables.

### Step 3: Verify Sample Data

```sql
-- Check medical centers were seeded
SELECT id, name, suburb, preferred_provider
FROM medical_centers
WHERE preferred_provider = true;
```

You should see 4 medical centers (Sydney CBD, Parramatta, North Shore, Western Sydney).

---

## 2. Retell AI Configuration

### Step 1: Create Retell Account
1. Go to https://www.retellai.com/
2. Sign up with your Mend email
3. Select "Australia" as your region (for Australian phone number)

### Step 2: Get API Credentials
1. Navigate to Settings → API Keys
2. Copy your API Key → Save as `RETELL_API_KEY`
3. Generate Webhook Secret → Save as `RETELL_WEBHOOK_SECRET`

### Step 3: Get Australian Phone Number
1. Navigate to Phone Numbers
2. Click "Get Number"
3. Select "Australia (+61)"
4. Choose a Sydney number (recommended: +61 2 area code)
5. Save this number as `RETELL_PHONE_NUMBER`

### Step 4: Create Voice Agents

#### Agent 1: Medical Booking Agent

1. Click "Create Agent"
2. Agent Name: `Mend Booking Agent`
3. Voice Settings:
   - Provider: ElevenLabs
   - Voice: **Bella** (Australian English)
   - Stability: 0.7
   - Similarity: 0.8
   - Speed: 1.1x
4. LLM Configuration:
   - Model: GPT-4 Turbo
   - Temperature: 0.7
5. System Prompt:
   - Copy from `docs/retell-agent-prompts.md` → Section 1
6. Dynamic Variables:
   - Add all variables from prompt: `worker_name`, `injury_type`, etc.
7. Tools:
   - Add `press_dtmf`, `check_availability`, `confirm_booking` from prompts doc
8. Save Agent
9. Copy Agent ID → Save as `RETELL_BOOKING_AGENT_ID`

#### Agent 2: Wellness Check-In Agent

Repeat process with:
- Agent Name: `Mend Check-In Agent`
- Voice: **Zoe** (Australian English)
- Speed: 1.0x
- Prompt: Section 2 from prompts doc
- Save Agent ID as `RETELL_CHECKIN_AGENT_ID`

#### Agent 3: Appointment Reminder Agent

- Agent Name: `Mend Reminder Agent`
- Voice: **Nicole** (Australian English)
- Speed: 1.0x
- Prompt: Section 3 from prompts doc
- Save Agent ID as `RETELL_REMINDER_AGENT_ID`

#### Agent 4: Incident Reporter Agent

- Agent Name: `Mend Incident Reporter`
- Voice: **Bella** (Australian English, calm tone)
- Speed: 0.95x (slightly slower for clarity)
- Prompt: Section 4 from prompts doc
- Save Agent ID as `RETELL_INCIDENT_REPORTER_AGENT_ID`

### Step 5: Configure Webhook (Do this AFTER deploying Edge Functions)

1. In Retell Dashboard → Settings → Webhooks
2. Webhook URL: `https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler`
3. Events to subscribe:
   - ✅ call_started
   - ✅ call_ended
   - ✅ call_analyzed
4. Webhook Secret: Use the value you generated earlier
5. Test webhook (sends a test event)

---

## 3. Supabase Edge Functions Deployment

### Step 1: Install Dependencies

```bash
cd /Users/jameskell/Cursor/mend-2

# Link to Supabase project (if not done already)
supabase link --project-ref rkzcybthcszeusrohbtc
```

### Step 2: Set Environment Variables in Supabase

```bash
# Set secrets for Edge Functions
supabase secrets set RETELL_API_KEY=your_actual_retell_api_key
supabase secrets set RETELL_WEBHOOK_SECRET=your_actual_webhook_secret
supabase secrets set RETELL_PHONE_NUMBER=+61xxxxxxxxx
supabase secrets set RETELL_BOOKING_AGENT_ID=agent_xxxxx
supabase secrets set RETELL_CHECKIN_AGENT_ID=agent_yyyyy
supabase secrets set RETELL_REMINDER_AGENT_ID=agent_zzzzz
supabase secrets set RETELL_INCIDENT_REPORTER_AGENT_ID=agent_wwwww

# Also set Supabase service role key (get from Supabase dashboard)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SUPABASE_URL=https://rkzcybthcszeusrohbtc.supabase.co
```

### Step 3: Deploy Edge Functions

```bash
# Deploy webhook handler
supabase functions deploy retell-webhook-handler

# Deploy voice task creator
supabase functions deploy create-voice-task

# Deploy inbound incident processor
supabase functions deploy process-inbound-incident
```

### Step 4: Verify Deployment

```bash
# List deployed functions
supabase functions list

# Should show:
# - retell-webhook-handler
# - create-voice-task
# - process-inbound-incident
```

### Step 5: Test Edge Function

```bash
# Get your auth token from Supabase dashboard
export SUPABASE_TOKEN="your_anon_key_here"

# Test create-voice-task function
curl -X POST \
  'https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/create-voice-task' \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": 1,
    "task_type": "check_in"
  }'

# Should return: {"success": true, "task_id": "...", "call_id": "..."}
```

---

## 4. Environment Variables

### Local Development (.env)

Already added to your `.env` file. Replace placeholder values:

```bash
# Open .env file
nano .env

# Update these values with your actual keys:
RETELL_API_KEY=key_xxxxxxxxxxxxxxxxxx
RETELL_WEBHOOK_SECRET=whsec_yyyyyyyyyyyyyyyy
RETELL_PHONE_NUMBER=+61299999999  # Your actual Retell number
RETELL_BOOKING_AGENT_ID=agent_xxxxx
RETELL_CHECKIN_AGENT_ID=agent_yyyyy
RETELL_REMINDER_AGENT_ID=agent_zzzzz
RETELL_INCIDENT_REPORTER_AGENT_ID=agent_wwwww
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Get from Supabase Settings → API
```

### Vercel Production Environment

```bash
# Set environment variables in Vercel
vercel env add RETELL_API_KEY
# Paste your key when prompted
# Select: Production + Preview

vercel env add RETELL_WEBHOOK_SECRET
vercel env add RETELL_PHONE_NUMBER
vercel env add RETELL_BOOKING_AGENT_ID
vercel env add RETELL_CHECKIN_AGENT_ID
vercel env add RETELL_REMINDER_AGENT_ID
vercel env add RETELL_INCIDENT_REPORTER_AGENT_ID
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Or use Vercel Dashboard:
1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add each variable above
4. Select "Production" and "Preview" environments

---

## 5. Testing

### Test 1: Database Functions

```sql
-- Test creating a booking task
SELECT create_booking_voice_task(
  1,  -- incident_id (use a real one from your DB)
  '+61412345678',  -- target phone
  'Test Medical Center',  -- target name
  (SELECT id FROM medical_centers LIMIT 1),  -- medical_center_id
  5  -- priority
);
```

### Test 2: Voice Task Creation (Manual Trigger)

```bash
# Trigger a check-in call to your mobile
curl -X POST \
  'https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/create-voice-task' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": 1,
    "task_type": "check_in",
    "target_phone": "+61YOUR_MOBILE"
  }'

# You should receive a call within 30 seconds
```

### Test 3: Webhook Processing

1. Manually trigger a test call from Retell dashboard
2. Check Supabase logs:
   ```bash
   supabase functions logs retell-webhook-handler
   ```
3. Verify voice_logs table:
   ```sql
   SELECT * FROM voice_logs ORDER BY created_at DESC LIMIT 1;
   ```

### Test 4: Inbound Incident Reporting

1. Call your Retell phone number: `RETELL_PHONE_NUMBER`
2. The Incident Reporter agent should answer
3. Report a mock injury
4. Check database:
   ```sql
   SELECT * FROM incidents WHERE created_by = 'ai_agent' ORDER BY created_at DESC LIMIT 1;
   ```

### Test 5: Frontend Integration (After UI components built)

1. Log in as MEND_ACCOUNT_MANAGER
2. Open an incident
3. Click "Book Appointment via AI" button
4. Monitor voice_tasks table

---

## 6. Going Live

### Pre-Launch Checklist

- [ ] All 4 agents created in Retell with correct prompts
- [ ] Webhook URL configured and tested
- [ ] All environment variables set in Supabase and Vercel
- [ ] Database migration applied successfully
- [ ] Sample medical centers verified
- [ ] Edge Functions deployed and tested
- [ ] Retell phone number active
- [ ] Recording consent disclosure in first 5 seconds of all agents
- [ ] Australian voice selected for all agents
- [ ] Test calls completed successfully

### Soft Launch (Week 1)

1. **Day 1-2**: Test with internal team only
   - 5 check-in calls to team members
   - 2 booking calls to partner medical centers (pre-notify them)

2. **Day 3-5**: Pilot with 10 real incidents
   - Monitor all calls manually
   - Review transcripts for quality
   - Adjust prompts based on feedback

3. **Day 6-7**: Expand to 25 incidents
   - Track success metrics
   - Identify common failure patterns

### Full Launch (Week 2+)

1. Enable for all new incidents
2. Set up daily monitoring dashboard
3. Weekly prompt optimization reviews
4. Monthly analytics reports

### Monitoring

Create dashboard queries:

```sql
-- Daily voice agent stats
SELECT
  task_type,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  AVG(
    CASE
      WHEN vl.duration_seconds IS NOT NULL
      THEN vl.duration_seconds
    END
  ) as avg_duration_seconds
FROM voice_tasks vt
LEFT JOIN voice_logs vl ON vl.task_id = vt.id
WHERE vt.created_at >= CURRENT_DATE
GROUP BY task_type;
```

---

## 7. Troubleshooting

### Common Issues

**Issue: Webhook not receiving events**
- Solution: Check webhook URL is correct in Retell dashboard
- Verify HMAC signature secret matches

**Issue: Edge Function timeout**
- Solution: Check Supabase function logs for errors
- Verify all environment variables are set

**Issue: Call quality poor**
- Solution: Adjust voice stability/similarity in Retell
- Try different ElevenLabs voices

**Issue: IVR navigation failing**
- Solution: Test medical center IVR manually
- Update ivr_instructions in medical_centers table
- Adjust DTMF timing in prompt

**Issue: Sentiment extraction inaccurate**
- Solution: Review transcripts manually
- Adjust sentiment keywords in prompt
- Consider using Retell's built-in sentiment analysis

### Support Contacts

- Retell Support: support@retellai.com
- Retell Documentation: https://docs.retellai.com/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

## Success Metrics (Week 1 Targets)

- ✅ 70%+ booking success rate
- ✅ <2 minute average call duration (bookings)
- ✅ <1 minute average call duration (check-ins/reminders)
- ✅ 100% recording consent compliance
- ✅ Zero security incidents (webhook signature verification)
- ✅ 90%+ check-in call completion rate

---

## Next Steps After Launch

1. **Week 2-3**: Build appointment calendar UI
2. **Week 4**: Implement SMS fallback for failed calls
3. **Week 5-6**: Add multi-language support (Mandarin, Vietnamese, Arabic)
4. **Month 2**: Integrate with Google Calendar for medical professionals
5. **Month 3**: Build voice analytics dashboard
6. **Month 4**: A/B test prompt variations for optimization

---

**Last Updated**: January 15, 2025
**Version**: 1.0.0

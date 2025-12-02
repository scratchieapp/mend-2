# Quick Start: Voice Agents in 30 Minutes

## Get Your First Voice Agent Running Today

This guide gets you from zero to your first AI-powered phone call in 30 minutes.

---

## Step 1: Create Retell Account (5 minutes)

1. Go to https://www.retellai.com/
2. Click "Sign Up"
3. Use email: `your-mend-email@mendplatform.au`
4. Select region: **Australia**
5. Verify email

---

## Step 2: Get Your Phone Number (2 minutes)

1. In Retell dashboard → "Phone Numbers"
2. Click "Get Number"
3. Select **Australia (+61)**
4. Choose **Sydney** area code (+61 2)
5. Click "Purchase"
6. **Copy the number** → Save it

---

## Step 3: Get API Keys (2 minutes)

1. In Retell dashboard → "Settings" → "API"
2. Click "Create API Key"
3. **Copy the key** → Save as `RETELL_API_KEY`
4. Click "Generate Webhook Secret"
5. **Copy the secret** → Save as `RETELL_WEBHOOK_SECRET`

---

## Step 4: Create Your First Agent (10 minutes)

### Create Check-In Agent (Simplest to Test)

1. In Retell dashboard → "Agents" → "Create Agent"

2. **Basic Settings:**
   - Agent Name: `Mend Check-In Agent`
   - Description: `Wellness check-in calls for injured workers`

3. **Voice Settings:**
   - Provider: `ElevenLabs`
   - Voice: `Zoe` (Australian English)
   - Stability: `0.7`
   - Similarity: `0.8`
   - Speed: `1.0`

4. **LLM Configuration:**
   - Model: `GPT-4 Turbo`
   - Temperature: `0.7`

5. **System Prompt:**
   - Open `docs/retell-agent-prompts.md`
   - Copy the ENTIRE prompt from **Section 2: Wellness Check-In Agent**
   - Paste into System Prompt box

6. **Dynamic Variables:**
   Click "Add Variable" for each:
   - `worker_name` → Type: String
   - `injury_type` → Type: String
   - `date_of_injury` → Type: String
   - `incident_number` → Type: String

7. **Save Agent**
   - Click "Save"
   - **Copy the Agent ID** (looks like `agent_abc123xyz`)
   - Save as `RETELL_CHECKIN_AGENT_ID`

---

## Step 5: Deploy Database (3 minutes)

```bash
# Open terminal
cd /Users/jameskell/Cursor/mend-2

# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref rkzcybthcszeusrohbtc

# Deploy the migration
supabase db push supabase/migrations/20250115_voice_agent_tables.sql
```

**Verify**: Go to Supabase dashboard → Table Editor → You should see 4 new tables:
- `appointments`
- `voice_tasks`
- `voice_logs`
- `medical_centers`

---

## Step 6: Deploy Edge Function (3 minutes)

```bash
# Set environment secrets
supabase secrets set RETELL_API_KEY="paste_your_actual_key_here"
supabase secrets set RETELL_WEBHOOK_SECRET="paste_your_actual_secret_here"
supabase secrets set RETELL_CHECKIN_AGENT_ID="paste_agent_id_here"
supabase secrets set RETELL_PHONE_NUMBER="+61299999999"  # Your number from Step 2

# Get Supabase service role key from dashboard
# Supabase Dashboard → Settings → API → service_role key (secret)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="paste_service_role_key_here"
supabase secrets set SUPABASE_URL="https://rkzcybthcszeusrohbtc.supabase.co"

# Deploy the create-voice-task function
cd /Users/jameskell/Cursor/mend-2
supabase functions deploy create-voice-task

# Deploy the webhook handler
supabase functions deploy retell-webhook-handler
```

**Verify**:
```bash
supabase functions list
```
You should see both functions listed.

---

## Step 7: Configure Webhook in Retell (2 minutes)

1. In Retell dashboard → "Settings" → "Webhooks"
2. Webhook URL:
   ```
   https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/retell-webhook-handler
   ```
3. Select events:
   - ✅ `call_started`
   - ✅ `call_ended`
   - ✅ `call_analyzed`
4. Webhook Secret: (should auto-fill from Step 3)
5. Click "Save"
6. Click "Test Webhook" → Should show "Success"

---

## Step 8: Test Your First Call! (3 minutes)

### Get a Test Incident ID

```sql
-- Run in Supabase SQL Editor
SELECT incident_id, worker_name, injury_type
FROM incidents
LIMIT 1;
```

Copy the `incident_id` (e.g., `123`)

### Trigger a Test Call to Your Mobile

```bash
# Replace YOUR_MOBILE with your actual number (e.g., +61412345678)
# Replace INCIDENT_ID with the ID from above
# Replace YOUR_SUPABASE_ANON_KEY with key from .env file

curl -X POST \
  'https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/create-voice-task' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": INCIDENT_ID,
    "task_type": "check_in",
    "target_phone": "YOUR_MOBILE"
  }'
```

**You should receive a call within 30 seconds!**

The AI agent will:
1. Introduce herself as Emma from Mend
2. Mention the call is being recorded
3. Ask how you're feeling
4. Ask about pain level (1-10)
5. Ask if you need any support

### Verify It Worked

```sql
-- Check voice_tasks table
SELECT * FROM voice_tasks ORDER BY created_at DESC LIMIT 1;

-- Check voice_logs table (after call ends)
SELECT * FROM voice_logs ORDER BY created_at DESC LIMIT 1;

-- Check transcript
SELECT transcript FROM voice_logs ORDER BY created_at DESC LIMIT 1;
```

---

## Troubleshooting

### "Function not found" error
**Solution**: Make sure you deployed the function in the correct directory
```bash
cd /Users/jameskell/Cursor/mend-2
supabase functions deploy create-voice-task
```

### "Unauthorized" error
**Solution**: Check your Supabase anon key in the curl command matches your `.env` file

### No call received
**Solution**:
1. Check phone number format: Must include country code `+61`
2. Check Retell dashboard → Calls → Should show "in progress"
3. Check Supabase logs: `supabase functions logs create-voice-task`

### Webhook test fails
**Solution**:
1. Ensure webhook URL is correct (no trailing slash)
2. Verify webhook secret matches what you set in secrets
3. Check Edge Function is deployed: `supabase functions list`

---

## What to Do Next

### Test Other Use Cases (Day 2)

1. **Create Booking Agent**
   - Follow same process as Step 4
   - Use prompt from Section 1 of `retell-agent-prompts.md`
   - Test calling a medical center (call your mobile first!)

2. **Create Reminder Agent**
   - Follow same process
   - Use prompt from Section 3
   - Test reminder call

3. **Create Incident Reporter Agent**
   - Follow same process
   - Use prompt from Section 4
   - Call your Retell number to test inbound

### Build Frontend UI (Day 3-5)

Now that backend works, add the "Book Appointment via AI" button to your incident pages.

See: `apps/operations/src/hooks/useVoiceAgent.ts` for ready-to-use React hooks.

### Go Live (Week 2)

Once you've tested all 4 agents:
1. Add medical center phone numbers to `medical_centers` table
2. Enable auto-check-ins for new incidents
3. Train case managers
4. Monitor first 10 incidents closely

---

## Quick Reference

### Your Environment Variables

```bash
# Add these to .env file
RETELL_API_KEY=key_xxxxx...
RETELL_WEBHOOK_SECRET=whsec_yyyy...
RETELL_PHONE_NUMBER=+61299999999
RETELL_CHECKIN_AGENT_ID=agent_zzzzz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Key URLs

- **Retell Dashboard**: https://app.retellai.com/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc
- **Edge Functions**: https://rkzcybthcszeusrohbtc.supabase.co/functions/v1/

### Useful Commands

```bash
# Deploy all Edge Functions
supabase functions deploy create-voice-task
supabase functions deploy retell-webhook-handler
supabase functions deploy process-inbound-incident

# View function logs
supabase functions logs create-voice-task --tail

# Set a secret
supabase secrets set KEY_NAME="value"

# List secrets
supabase secrets list

# Run migration
supabase db push supabase/migrations/20250115_voice_agent_tables.sql
```

---

## Success! 🎉

If you received the test call, congratulations! You now have:
- ✅ Voice agent infrastructure deployed
- ✅ Database tables created
- ✅ Edge Functions live
- ✅ Your first AI-powered phone call completed

**Next**: Review `docs/VOICE_AGENT_SETUP.md` for full production setup.

---

**Need Help?**
- Retell docs: https://docs.retellai.com/
- Supabase docs: https://supabase.com/docs/guides/functions
- Check logs: `supabase functions logs retell-webhook-handler --tail`

**Questions?**
Review the comprehensive guides:
- `docs/VOICE_AGENT_SETUP.md` - Full setup guide
- `docs/retell-agent-prompts.md` - All agent prompts
- `docs/VOICE_AGENT_IMPLEMENTATION_SUMMARY.md` - Technical overview



# **Strategic Architecture for AI-Augmented Incident Management: Scaling Mend Services NSW**

## **1\. Executive Strategic Overview**

The objective of this comprehensive strategic report is to delineate a rigorous technical, operational, and regulatory framework for the integration of Voice AI Agents into the Mend Services NSW incident management ecosystem. The overarching business mandate is ambitious yet precise: to achieve a five-fold increase in revenue and turnover without a proportional increase in headcount, leveraging the "Human-in-the-Loop" (HITL) operational model. This target necessitates a paradigm shift from traditional, labor-intensive case management to a hybrid digital-human workflow where Artificial Intelligence (AI) absorbs the high-volume, low-variance administrative burden, thereby liberating human capital for high-value, high-variance clinical and relational interventions.

The premise of this strategy rests on the "Bifurcated Workflow" philosophy. In the context of the New South Wales (NSW) workers' compensation scheme, operational activities can be categorized into two distinct streams: Transactional Logistics and Relational Care. Currently, human Case Managers at Mend Services expend significant cognitive load and billable hours on transactional tasks—navigating Interactive Voice Response (IVR) systems, waiting on hold for medical receptionists, and confirming appointment availability. By delegating these logistical functions to autonomous AI agents powered by Retell AI and orchestrated via Supabase Edge Functions, Mend Services can invert the traditional cost structure of workplace rehabilitation.

This transformation is not merely an efficiency play; it is a direct response to the escalating cost pressures identified by the State Insurance Regulatory Authority (SIRA). With rehabilitation service costs in NSW rising by 68% over three years, largely driven by administrative overhead and prolonged claim durations, the market demands a solution that reduces latency in medical access.1 The proposed architecture utilizes the user's existing stack—Supabase for state management and Clerk for authentication—integrated with Retell AI’s advanced telephony capabilities to execute complex voice workflows. This report provides the blueprint for that execution, ensuring strict adherence to the *Surveillance Devices Act 2007* (NSW), the *Privacy Act 1988* (Cth), and the ethical guidelines set forth by the Australian Health Practitioner Regulation Agency (AHPRA).

## **2\. The NSW Rehabilitation Landscape: Operational Challenges & AI Opportunity**

### **2.1 The Crisis of Administrative Burden in Workers Compensation**

The operational environment for Workplace Rehabilitation Providers (WRPs) in New South Wales is characterized by rigorous regulatory oversight and intense pressure to demonstrate "durable return to work" outcomes. SIRA’s recent evaluations indicate that while rehabilitation is effective, the cost-to-outcome ratio is deteriorating. A significant portion of this cost inflation is attributable to the administrative friction inherent in the healthcare ecosystem.

Case managers, who are often qualified allied health professionals (Occupational Therapists, Psychologists, Exercise Physiologists), currently spend a disproportionate amount of time acting as administrative coordinators.2 The "bottlenecks" in this workflow are primarily communication-based:

1. **Medical Access Latency:** Finding a treating doctor or specialist with immediate availability often involves "phone tag" with multiple clinics.  
2. **Stakeholder Asynchrony:** Coordinating between the insurer (icare), the employer, the worker, and the doctor requires repetitive outbound communication.  
3. **Documentation Overhead:** Every interaction requires manual logging to satisfy SIRA’s invoicing and audit requirements.

These bottlenecks do not just cost money; they delay treatment. In the context of injury management, time is tissue. A delay of two days in booking an initial consultation can extend a claim’s duration by weeks due to the psychological entrenchment of the "sick role".4

### **2.2 The "5x Revenue" Hypothesis: Uncoupling Growth from Headcount**

To achieve a 5x increase in revenue without hiring additional staff, Mend Services must fundamentally alter its unit economics. In a traditional WRP model, revenue is linearly coupled with labor hours. A case manager can handle a finite caseload (typically 25-40 active files) because each file generates a fixed amount of administrative noise.

The AI-Augmented model decouples this relationship. By automating the outbound logistical calls, the AI agent effectively acts as a force multiplier. If the AI handles 80% of the outbound volume (appointments, routine check-ins, reminders), the human case manager can fundamentally increase their caseload capacity or focus intensely on the complex 20% of cases that drive high-cost outcomes.

**Table 1: Comparative Analysis of Operational Capacity**

| Operational Metric | Traditional Human-Centric Model | AI-Augmented "Mend" Model | Efficiency Gain |
| :---- | :---- | :---- | :---- |
| **Booking Initiation** | Manual dialing, wait times, voicemail tag. | API-triggered parallel dialing to multiple clinics. | **95% Time Reduction** |
| **Patient Check-in** | Manual calendar reminders, often missed due to workload. | Automated scheduled outbound calls with sentiment analysis. | **100% Adherence** |
| **Documentation** | Manual typing of case notes post-call. | Auto-generated JSON transcripts & summaries ingested by Supabase. | **80% Admin Reduction** |
| **Caseload Capacity** | \~35 Active Files per Manager. | \~100+ Active Files (focusing only on clinical decisions). | **\~3x \- 5x Capacity** |
| **Marginal Cost** | \~$15.00 per interaction (wage \+ overhead). | \~$0.20 \- $0.50 per interaction (AI telephony costs). | **\~97% Cost Reduction** |

This operational leverage allows Mend Services to aggressively tender for larger contracts from insurers like icare or self-insurers (e.g., Coles, Woolworths) 2, confident in the ability to absorb volume without breaking the existing workforce.

## **3\. Strategic Operational Model: The Bifurcated Workflow**

The central strategic innovation is the **Bifurcated Workflow**. This model dictates that communication channels be strictly segregated based on the *nature* of the interaction, rather than the *stakeholder* involved.

### **3.1 The Transactional Stream (AI-Driven)**

The Transactional Stream encompasses all tasks where the objective is logistical execution and data retrieval. These tasks are binary in their success criteria (e.g., "Is the appointment booked? Yes/No"). The AI Agent assumes total responsibility for this stream.

* **Medical Appointment Booking:** The AI navigates the medical system. It calls clinics, navigates IVRs ("Press 1 for Reception") 5, negotiates time slots, and confirms bookings.  
* **Provider Availability Checks:** When a referral is needed for a specialist (e.g., Orthopedic Surgeon), the AI performs a "sweep," calling five clinics in parallel to find the earliest availability.6  
* **Routine Administration:** Confirmation of attendance, reminders to patients about upcoming appointments, and simple "Day 3" recovery check-ins where the patient is stable.

### **3.2 The Relational Stream (Human-Driven)**

The Relational Stream encompasses tasks requiring empathy, complex negotiation, crisis de-escalation, and clinical judgment. The human Case Manager focuses exclusively here.

* **Crisis Intervention:** If the AI detects negative sentiment or high pain scores during a check-in, the call is immediately transferred to a human.  
* **Rapport Building:** The user's directive to "limit phone calls from humans to be to the patients themselves" is strategic genius in this context. It conditions the patient to associate human contact from Mend with *value* and *care*, rather than *administration*. When a Mend human calls, it is to ask "How are you really feeling?" rather than "Can you make Tuesday at 2 PM?"  
* **Clinical Strategy:** Decisions regarding Return to Work Plans, liability disputes, and employer negotiations remain strictly human domains, complying with AHPRA’s requirement for human oversight in clinical settings.7

### **3.3 The "Warm Handoff" Protocol**

Crucial to the success of this bifurcation is the seamless transition between streams. The system must support **Warm Transfers**.8 If an AI agent encounters resistance (e.g., a receptionist refuses to speak to a bot) or distress (e.g., a patient is crying), it must hold the line, dial the assigned Case Manager, whisper the context ("I have Mrs. Jones on the line, she is distressed about her pain medication"), and then bridge the call. This preserves the user experience and ensures safety, a critical requirement under the *Work Health and Safety Act 2011* (NSW).

## **4\. Technical Architecture: Supabase & Edge Orchestration**

The technical foundation of this strategy relies on a Serverless, Event-Driven Architecture. Using Supabase as the backend-as-a-service allows for rapid scalability and real-time state management, which is essential for managing asynchronous voice interactions.

### **4.1 System Architecture & Data Flow**

The architecture functions as a state machine where the database (Supabase) acts as the source of truth, and Edge Functions act as the orchestrators of external AI services (Retell).

1. **Event Trigger:** An event occurs in the Mend platform (e.g., a new Incident is logged via the Clerk-authenticated frontend, or a scheduled cron job fires for a check-in).  
2. **Orchestration:** A Supabase Database Webhook or Cron triggers a Supabase Edge Function (TypeScript/Deno).9  
3. **Context Construction:** The Edge Function queries the incidents and patients tables to gather context (Patient Name, Injury Description, Approved Insurer).  
4. **Voice Initiation:** The function makes an authenticated API call to Retell AI (/v2/create-phone-call) 11, passing the context as "Dynamic Variables".12  
5. **Interaction:** Retell AI (powered by underlying LLMs and Twilio telephony) executes the call. It navigates IVRs, speaks to the recipient, and executes tools.  
6. **State Update:** Upon call completion (or during tool usage), Retell sends a webhook back to a secured Supabase Edge Function.14  
7. **Persistence:** The webhook payload (transcript, recording URL, extracted JSON data) is verified and stored in the voice\_logs table.

### **4.2 Supabase Schema Design for Voice**

The database schema must be robust enough to handle the unstructured data returned by voice agents while maintaining the relational integrity required for reporting.

**Table Structure:**

* **incidents** (Existing): The core record.  
  * id (UUID)  
  * patient\_id (UUID)  
  * status (Enum: 'New', 'Triaging', 'Booked', 'Closed')  
  * case\_manager\_id (UUID \- Linked via Clerk)  
* **voice\_tasks** (New): A queue of calls to be made.  
  * id (UUID)  
  * incident\_id (UUID)  
  * task\_type (Enum: 'booking', 'check\_in', 'survey')  
  * priority (Int)  
  * scheduled\_at (Timestamp)  
  * status (Enum: 'pending', 'in\_progress', 'completed', 'failed')  
* **voice\_logs** (New): The immutable record of what happened.  
  * id (UUID)  
  * retell\_call\_id (Text \- Unique Index)  
  * task\_id (UUID)  
  * transcript (Text)  
  * recording\_url (Text)  
  * sentiment\_score (Float \- derived from Retell analysis 15)  
  * extracted\_data (JSONB): This is critical. It stores the structured output from the LLM, e.g., {"appointment\_time": "2023-10-27T14:00:00", "doctor\_name": "Dr. Smith"}.

### **4.3 Supabase Edge Function Logic (TypeScript/Deno)**

Supabase Edge Functions are preferred over third-party servers due to their proximity to the data and low cold-start times.9

Security & Webhook Verification:  
A critical security vulnerability in voice agents is the injection of fake call data via webhooks. To mitigate this, the Edge Function must verify the Retell signature. Retell signs requests using an HMAC-SHA256 signature in the x-retell-signature header.14  
Code Logic Description:  
The Edge Function acts as a gatekeeper. When a webhook arrives:

1. It retrieves the raw request body.  
2. It extracts the timestamp and signature from the headers.  
3. It re-computes the HMAC hash using the stored RETELL\_WEBHOOK\_SECRET (stored in Supabase Vault).  
4. It compares the computed hash with the received signature.  
5. If they match, it parses the JSON. If not, it returns a 401 Unauthorized immediately.  
   This ensures that only legitimate data from Retell enters the Mend database, protecting patient health records from tampering.

## **5\. Telephony Infrastructure & Regulatory Compliance**

Operating a voice agent in Australia requires strict adherence to telecommunications regulations managed by the Australian Communications and Media Authority (ACMA).

### **5.1 Caller ID Strategy and "Spam" Mitigation**

The success of outbound voice agents depends entirely on the "Answer Rate." If the call is flagged as "Scam Likely" or "Spam," the answer rate will drop below 10%, rendering the system useless.

The Challenge:  
Australian carriers (Telstra, Optus, Vodafone) and global aggregators (Twilio) have implemented strict rules to prevent Caller ID spoofing. You cannot simply present a generic number.17 Furthermore, calls from generic 1300/1800 numbers often suffer from lower trust when calling mobile phones.  
**The Strategic Solution:**

1. **Local Presence:** Mend must procure **Australian Mobile Numbers (+61 4...)** and **Local Geographic Numbers (02 for NSW)** via Twilio/Retell.  
   * **Mobile Numbers:** These have the highest answer rate for calls to patients, as they appear personal.  
   * **Local Landlines (02):** These are best for calling medical centers, as they signal a local business presence in NSW.  
2. **Regulatory Bundling:** To acquire these numbers, Mend must submit a "Regulatory Bundle" to Twilio, including the Australian Business Number (ABN) and business address.17 This verifies the entity and prevents the numbers from being flagged as spam by carrier algorithms.  
3. **Sharding:** Do not use a single number for 10,000 calls. Acquire a pool of numbers and rotate them to prevent "fatigue" where a number gets flagged by spam-blocking apps like Hiya or Truecaller.

### **5.2 Recording Laws: Surveillance Devices Act 2007 (NSW)**

New South Wales has some of the strictest surveillance laws in the world. Under the *Surveillance Devices Act 2007* (NSW), it is an offense to record a private conversation without the consent of **all parties** (Section 7).19

**Compliance Mechanism:**

* **The "Announcement" Protocol:** The AI Agent *must* be configured to state the recording disclosure in the first sentence of the call.  
  * *Script:* "Hi, I am an automated assistant calling from Mend Services. This call is being recorded for quality assurance."  
* **The "Opt-Out" Tool:** The agent must have a tool or logic path to handle objections. If the recipient says, "I do not consent to being recorded," the agent must logically trigger a "Stop Recording" API call to Retell (if supported) or politely terminate the call and flag the task for a human callback.  
* **Implied Consent:** In NSW, if a party continues the conversation after being notified of the recording, consent is generally implied.19 However, the notification is non-negotiable.

### **5.3 Privacy Act 1988 (Cth) & Data Sovereignty**

As a provider dealing with health data, Mend is subject to the *Privacy Act 1988* and the Australian Privacy Principles (APPs).

* **APP 8 (Cross-border disclosure):** Retell AI processes voice data. While Retell may use US-based LLMs (like OpenAI or Anthropic), Mend must ensure that its Privacy Collection Statement explicitly informs patients that "Voice data may be processed by third-party providers for administrative purposes".21  
* **Data Minimization:** To reduce risk, the "recording\_url" stored in Supabase should have a Time-To-Live (TTL). Once the transcript and structured data are verified by a human, the raw audio file should be deleted or moved to a "Cold Storage" bucket with strict access controls, rather than remaining accessible via the operational dashboard.

## **6\. Voice Agent Design: Linguistics, Prompts, and Tools**

To achieve the "5x" goal, the AI must be more than a chatbot; it must be a competent operational agent. This requires sophisticated Prompt Engineering and "Tool Use" configuration.

### **6.1 Linguistics and Persona Design**

The persona must be calibrated to the audience.

* **Audience A: Medical Receptionists.** They are busy, often stressed, and act as gatekeepers. The AI must sound professional, concise, and authoritative. It should use local terminology (e.g., "GP," "Bulk Bill," "Workers Comp," "Referral") rather than US terminology ("PCP," "Co-pay").  
* **Audience B: Patients.** They are injured and potentially vulnerable. The AI must sound empathetic, patient, and clear.

Prompt Strategy: Sectional Prompting 22  
The system prompt should be structured into distinct sections to prevent "hallucination" and ensure adherence to the workflow.

# **IDENTITY**

You are "Alex," the Operational Coordinator for Mend Services NSW. You are helpful, efficient, and professional.

# **CONTEXT**

You are calling a medical clinic to book an Initial Consultation for a Workers Compensation patient.

* Patient Name: {{patient\_name}}  
* Injury: {{injury\_description}}  
* Insurer: icare NSW  
* Approval Number: {{approval\_number}}

# **TASK**

1. Navigate the IVR if present.  
2. Speak to the receptionist.  
3. Request an appointment for "Dr. {{preferred\_doctor}}" or the "Next Available Doctor."  
4. Negotiate a time between {{date\_start}} and {{date\_end}}.  
5. Confirm the booking and ask for an email address to send the referral paperwork.

# **GUARDRAILS**

* You MUST identify yourself as an automated assistant if asked.  
* You CANNOT provide medical advice.  
* If the receptionist gets frustrated, use the transfer\_call tool immediately.

### **6.2 Tool Definitions & Functional Competence**

The AI's power comes from its ability to *do* things, not just talk. We define specific tools that the LLM can invoke.6

**Tool 1: check\_availability**

* *Function:* Checks the internal database for preferred times or triggers a logic flow to ask the receptionist for specific dates.  
* *Integration:* Connects via webhook to a Supabase Edge Function that might query a specialized scheduling API if available (e.g., HealthEngine API, though direct scraping is often restricted, so voice negotiation is the primary fallback).

**Tool 2: confirm\_booking**

* *Function:* Locks in the appointment details.  
* *Payload:* {"doctor\_name": "string", "appointment\_time": "ISO8601", "clinic\_notes": "string"}.  
* *Action:* This triggers a database update in Supabase, changing the Incident status to 'Booked' and sending a confirmation SMS to the patient.

Tool 3: navigate\_ivr 5

* *Function:* Sends DTMF tones.  
* *Logic:* If the AI hears "Press 1 for appointments," it invokes this tool with the argument "1". This solves the "Robot talking to Robot" standoff.

Tool 4: transfer\_call (Warm Transfer) 8

* *Function:* Bridges the call to a human agent.  
* *Scenario:* Used in "Crisis" or "Blocker" scenarios. The AI dials the specific Case Manager's mobile number, announces the transfer ("I have the clinic on the line, they need your credit card"), and connects them.

### **6.3 Handling "The Loop" of Phone Tag**

A major inefficiency is the callback game.

* **Scenario:** The AI calls, leaves a voicemail. The Clinic calls back.  
* **Solution:** The "Inbound" Agent. We configure the purchased 02 Number to route inbound calls to an AI Receptionist.  
  * *Prompt:* "Thanks for calling Mend Services. Are you returning a call about a booking?"  
  * *Logic:* The AI identifies the caller via Caller ID (matched in medical\_centers table), retrieves the active voice\_task for that clinic, and resumes the negotiation exactly where the outbound agent left off. This closes the loop without human intervention.

## **7\. Data Security, Privacy, and Governance**

### **7.1 Data Protection Architecture**

Given the sensitive nature of health data, "Security by Design" is mandatory.

* **Role-Based Access Control (RBAC):** Supabase Row Level Security (RLS) policies must be strict. Only the assigned Case Manager (verified via Clerk ID) can access the recordings/transcripts for their specific patients.  
* **Encryption:** Data at rest in Supabase is encrypted. Retell AI also encrypts data. The transmission is secured via TLS 1.2+.  
* **PII Redaction:** Retell AI offers PII redaction features.23 This should be enabled to scrub names, credit card numbers, and Medicare numbers from the text transcripts and logs, ensuring that the "manageable" data is de-identified where possible.

### **7.2 AHPRA & Ethical AI Use**

The Australian Health Practitioner Regulation Agency (AHPRA) has issued guidance that practitioners must not abrogate responsibility to AI.7

* **The "Human Oversight" Rule:** The AI cannot be the final decision-maker on clinical pathways.  
* **Implementation:** The system must include a "Review Step." When the AI books an appointment or gathers check-in data, it creates a "Draft Action" in the Mend Dashboard. The Case Manager must click "Approve" or "Acknowledge" to finalize the record. This ensures that a registered professional remains accountable for the case management, satisfying professional indemnity insurance requirements.7

## **8\. Implementation Roadmap & Change Management**

To transition from the current state to the AI-augmented state without operational shock, a phased deployment is recommended.

### **Phase 1: Data Collection & "Shadow Mode" (Weeks 1-4)**

* **Objective:** Calibrate the LLM on real operational data.  
* **Action:** Record calls made by human staff (with consent). Feed these recordings into Retell/Whisper to generate transcripts.  
* **Analysis:** Identify the most common "refusals" from receptionists and the specific phrasing used by successful Case Managers. Use this to fine-tune the System Prompt.  
* **Technical:** Set up Supabase Edge Functions and the Database Schema.

### **Phase 2: The "Confirmation" Pilot (Weeks 5-8)**

* **Objective:** Test the Outbound AI on low-risk tasks.  
* **Action:** Deploy the AI to call clinics merely to *confirm* existing appointments booked by humans.  
* **Risk:** Low. If the AI fails, the appointment still exists.  
* **Metric:** Measure the "Success Rate" of the AI navigating the IVR and reaching a human.

### **Phase 3: The "Booking" Rollout (Weeks 9-12)**

* **Objective:** Activate the high-value transaction agent.  
* **Action:** Enable the AI to perform initial bookings for a small cohort of "friendly" clinics.  
* **Metric:** Time-to-booking. Compare AI speed vs. Human benchmark.

### **Phase 4: Full Scale & Patient Check-ins (Month 4+)**

* **Objective:** Revenue scaling.  
* **Action:** Turn on the "Patient Check-in" agent.  
* **Operational Shift:** Direct human staff to stop making routine calls and focus entirely on relationship building and complex case strategy.

## **9\. Financial Projection & ROI Analysis**

The financial implications of this strategy are transformative for the business model.

### **9.1 Cost Analysis: Human vs. AI**

* **Human Cost:** A Case Manager earns approx. $40-$50/hour. A 15-minute booking task (including hold time and notes) costs the business roughly **$12.50 \- $15.00** in direct labor.  
* **AI Cost:** Retell AI costs roughly $0.15 \- $0.25 per minute. An automated call, which skips hold times (by parallel dialing or efficient IVR navigation) and transcribes instantly, might take 3-4 minutes of billable AI time. Total cost: **\~$1.00**.

### **9.2 The Revenue Multiplier**

* **Capacity Increase:** By removing the 15-minute logistical tasks, a Case Manager gains roughly 4-5 hours of capacity per day.  
* **Revenue Impact:** This capacity allows the Case Manager to handle a caseload that is **3x to 5x larger** than the current standard.  
* **SIRA Metrics:** The improved speed of medical access (AI books instantly, 24/7) leads to faster treatment and better Return to Work (RTW) rates. High RTW rates are the primary metric insurers use to allocate referrals. Therefore, the AI strategy acts as a **marketing engine**, driving more volume to Mend Services because the outcomes are superior.

## **10\. Conclusion**

The strategy outlined in this report presents a robust pathway for Mend Services NSW to achieve its goal of 5x revenue growth without headcount expansion. By integrating Retell AI via Supabase Edge Functions, the organization can automate the high-volume, low-value transactions that currently constrain growth. This is not merely an automation of tasks; it is a strategic restructuring of the rehabilitation value chain.

The bifurcated workflow ensures that technology handles the logistics while humans handle the care, aligning perfectly with the "biopsychosocial" model of health. With strict adherence to NSW regulatory frameworks—specifically the *Surveillance Devices Act* and *Privacy Act*—Mend Services can deploy this technology safely and ethically. The result will be a scalable, efficient, and highly profitable operation that sets a new standard for workplace rehabilitation in Australia.

#### **Works cited**

1. Workers' comp rehab costs spiral \- Insurance News, accessed on November 25, 2025, [https://www.insurancenews.com.au/daily/workers-comp-rehab-costs-spiral](https://www.insurancenews.com.au/daily/workers-comp-rehab-costs-spiral)  
2. INQUIRY INTO NSW WORKERS COMPENSATION SCHEME, accessed on November 25, 2025, [https://www.parliament.nsw.gov.au/lcdocs/submissions/35658/0114\_Mend%20Services.pdf](https://www.parliament.nsw.gov.au/lcdocs/submissions/35658/0114_Mend%20Services.pdf)  
3. Rehabilitation \- icare, accessed on November 25, 2025, [https://www.icare.nsw.gov.au/-/media/icare/unique-media/about-us/publications/files/investigation---what-good-rehabilitation-looks-like.pdf](https://www.icare.nsw.gov.au/-/media/icare/unique-media/about-us/publications/files/investigation---what-good-rehabilitation-looks-like.pdf)  
4. Barriers to Return to Work \- A Research-to-Practice Brief From RETAIN Technical Assistance Provider, accessed on November 25, 2025, [https://www.air.org/sites/default/files/RETAIN-Barriers-to-Return-to-Work-Issue-Brief-July-2020.pdf](https://www.air.org/sites/default/files/RETAIN-Barriers-to-Return-to-Work-Issue-Brief-July-2020.pdf)  
5. Platform Changelogs \- Retell AI, accessed on November 25, 2025, [https://www.retellai.com/changelog](https://www.retellai.com/changelog)  
6. Function Calling Overview \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/build/single-multi-prompt/function-calling](https://docs.retellai.com/build/single-multi-prompt/function-calling)  
7. Ahpra introduces AI guidance for health practitioners \- MinterEllison, accessed on November 25, 2025, [https://www.minterellison.com/articles/ahpra-introduces-ai-guidelines-for-health-practitioners](https://www.minterellison.com/articles/ahpra-introduces-ai-guidelines-for-health-practitioners)  
8. Power your AI agent With Call Transfer \- Retell AI, accessed on November 25, 2025, [https://www.retellai.com/features/call-transfer](https://www.retellai.com/features/call-transfer)  
9. Edge Functions | Supabase Docs, accessed on November 25, 2025, [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)  
10. Trigger Supabase edge functions from database changes \- Sequin, accessed on November 25, 2025, [https://sequinstream.com/docs/guides/supabase-function](https://sequinstream.com/docs/guides/supabase-function)  
11. Outbound Calls (Make Calls) \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/deploy/outbound-call](https://docs.retellai.com/deploy/outbound-call)  
12. Create Retell LLM \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/api-references/create-retell-llm](https://docs.retellai.com/api-references/create-retell-llm)  
13. Dynamic Variables \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/build/dynamic-variables](https://docs.retellai.com/build/dynamic-variables)  
14. Secure the webhook \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/features/secure-webhook](https://docs.retellai.com/features/secure-webhook)  
15. Sentiment Analysis \- Retell AI, accessed on November 25, 2025, [https://www.retellai.com/glossary/sentiment-analysis](https://www.retellai.com/glossary/sentiment-analysis)  
16. Receiving webhooks with Supabase Edge Functions | Svix Blog, accessed on November 25, 2025, [https://www.svix.com/blog/receive-webhooks-with-supabase-edge-functions/](https://www.svix.com/blog/receive-webhooks-with-supabase-edge-functions/)  
17. Australia: Regulatory Guidelines | Twilio, accessed on November 25, 2025, [https://www.twilio.com/en-us/guidelines/au/regulatory](https://www.twilio.com/en-us/guidelines/au/regulatory)  
18. Notice: Telstra Australian Caller ID Restrictions \- Reducing Scam Calls Industry Code (November 2021\) \- Twilio Help Center, accessed on November 25, 2025, [https://help.twilio.com/articles/4407966601115-Notice-Telstra-Australian-Caller-ID-Restrictions-Reducing-Scam-Calls-Industry-Code-November-2021](https://help.twilio.com/articles/4407966601115-Notice-Telstra-Australian-Caller-ID-Restrictions-Reducing-Scam-Calls-Industry-Code-November-2021)  
19. NSW Recording Laws: What Businesses Need To Know \- Sprintlaw, accessed on November 25, 2025, [https://sprintlaw.com.au/articles/nsw-recording-laws-compliance-essentials-for-businesses/](https://sprintlaw.com.au/articles/nsw-recording-laws-compliance-essentials-for-businesses/)  
20. Recording Conversations At Work (NSW) \- Armstrong Legal, accessed on November 25, 2025, [https://www.armstronglegal.com.au/commercial-law/nsw/employment-law/recording-conversations-work/](https://www.armstronglegal.com.au/commercial-law/nsw/employment-law/recording-conversations-work/)  
21. AI Voice Agents in Australia: Privacy Compliance \- Callin.io, accessed on November 25, 2025, [https://callin.io/ai-voice-agents-in-australia-privacy-compliance/](https://callin.io/ai-voice-agents-in-australia-privacy-compliance/)  
22. Prompt Engineering Guide \- Retell AI, accessed on November 25, 2025, [https://docs.retellai.com/build/prompt-engineering-guide](https://docs.retellai.com/build/prompt-engineering-guide)  
23. Secure AI Conversations with Retell AI PII Redaction Tool, accessed on November 25, 2025, [https://www.retellai.com/blog/introducing-retell-ai-pii-redaction-data-security-made-easy](https://www.retellai.com/blog/introducing-retell-ai-pii-redaction-data-security-made-easy)  
24. Meeting your professional obligations when using Artificial Intelligence in healthcare \- Australian Health Practitioner Regulation Agency, accessed on November 25, 2025, [https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx)
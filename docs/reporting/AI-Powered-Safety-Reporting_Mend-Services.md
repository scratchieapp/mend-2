

# **Automated Injury Management Intelligence: A Strategic Framework for Mend Services**

## **Revision 1.1:**

The original strategic report, **Automated Injury Management Intelligence: A Strategic Framework for Mend Services**, has been updated to reflect the operational reality of the MEND platform, specifically the consolidation of the 'site' and 'project' concepts and the need for a hybrid data ingestion model for operational hours.

Here is the revised strategic framework document, with critical architectural and operational changes incorporated.

---

# **Automated Injury Management Intelligence: A Strategic Framework for Mend Services (Revised)**

## **Executive Summary (Revised for Platform Reality)**

The construction industry is moving towards a data-driven model for Occupational Health and Safety (OHS) reporting. For Mend Services, this transition leverages a Supabase (PostgreSQL) backend and Large Language Model (LLM) integration to deliver "on-demand" insight.

This revised report incorporates two crucial updates based on the MEND platform's architecture:

1. **Unified Entity Model:** The platform uses a single **sites** entity, which is flexible enough to manage both long-term operations (like quick service restaurants) and fixed-term contracts (like construction projects). The multi-tiered hierarchy suggested in the original research has been consolidated.  
2. **Flexible Data Ingestion:** The strategy for operational metrics now explicitly supports both **rigorous manual entry** (with validation) and **future automated API integration** with enterprise systems like **Procore** and **HammerTech**, ensuring data integrity regardless of the client's maturity.

By moving beyond the limitations of manual data entry and unverified estimates, Mend Services can empower employers with real-time, predictive, and actionable safety intelligence.

---

## **1\. The Imperative for Digital Transformation in Safety Reporting**

*(Sections 1.1, 1.2, and 1.3 remain conceptually sound and are not re-written, but the underlying data model they refer to has been updated below.)*

The transition from the "Document Paradigm" to a "Data-as-a-Service" ecosystem remains the core value proposition. The ability to transform narrative text (e.g., witness statements) into diagnostic, actionable insights via LLM integration is key to generating "insightful reports".

---

## **2\. Architectural Foundations: The Supabase & Postgres Ecosystem (Revised)**

To deliver insightful reports "on call," the data architecture must be rigorous. The revised strategy adheres to the platform's reality of a unified sites model.

### **2.1 The Schema Strategy: Reflecting Operational Reality (Revised)**

The data model is simplified, with all location and project-specific reporting fields consolidated into the sites table.

#### **2.1.1 The sites Table (The Unified Topology)**

The core entity must serve both location tracking and project metadata requirements. This table must strictly enforce mandatory reporting dimensions.

| Column | Data Type | Purpose for Reporting |
| :---- | :---- | :---- |
| id | UUID | Primary key. |
| company\_id | UUID | Foreign key to companies (Enforces Row Level Security). |
| name | TEXT | Site/Project Name (e.g., 'Kurnell' or 'Store \#45'). |
| **state** | ENUM (jurisdiction\_state) | **Critical for jurisdictional segmentation** (e.g., comparing NSW vs. VIC performance). |
| **is\_project\_based** | BOOLEAN | Differentiates fixed-term sites (construction) from ongoing operations (QSR, retail). |
| start\_date, end\_date | DATE | Allows filtering by project lifecycle stages (crucial for construction). |

**Insight Implication:** By embedding the jurisdictional state directly onto the sites entity, cross-jurisdictional benchmarking (e.g., NSW LTIFR 5.1 vs. VIC LTIFR 10.7) can be achieved via direct queries on a single, unified table.

---

### **2.1.2 The monthly\_site\_metrics Table (The Flexible Denominator)**

This table solves the central data integrity flaw of relying on the manual "20% estimate" for subcontractor hours. The revised strategy allows for both the immediate manual input requirement and the future need for enterprise integration.

| Column | Data Type | Purpose for Reporting |
| :---- | :---- | :---- |
| site\_id | UUID | Foreign key to sites. |
| reporting\_month | DATE | The month the data covers. |
| employee\_hours | NUMERIC | Verified internal hours. |
| subcontractor\_hours | NUMERIC | Verified external hours (The crucial denominator). |
| **is\_estimated** | BOOLEAN | **Data Quality Flag:** TRUE if manually estimated; FALSE if verified/API-sourced. |
| **data\_source** | ENUM (metrics\_data\_source) | **New Column:** Tracks if the data is from 'Manual Input', 'Procore API', 'HammerTech API', or 'Payroll System'. |

#### **Mechanism: The Dual-Path Validation Logic**

The architecture must support two parallel data ingestion paths:

1. **Manual Entry (Initial/Fallback):** For clients not yet integrated, the platform enforces a **"Gatekeeper"** mechanism. The system requires inputting actual, verified hours and defaults the **data\_source** to 'Manual Input'. If a manual estimate is used, the is\_estimated \= true flag is set, providing necessary transparency and caveats in the final report.  
2. **Automated API Integration (Enterprise Scale):** For strategic integrations (e.g., **Procore, HammerTech**), a dedicated API receives the validated hours. The **data\_source** is automatically flagged ('Procore API') and **is\_estimated** defaults to FALSE. This automated, reliable stream of data is what enables high-confidence, predictive analytics and is necessary for solving the scaling challenge.

### **2.1.3 The incidents Taxonomy (The Numerator)**

(This section is consistent with the original research and remains unchanged.)

The use of standardized ENUMs for classifying incidents (severity, nature\_of\_injury, mechanism) remains vital for enabling the LLM to provide standardized and scalable insights. The table links directly to the new unified sites table.

---

## **5\. Strategic Intelligence: The Executive & Board Report**

The consolidated data model and the improved data integrity from the **Dual-Path Validation Logic** directly translate into powerful executive reporting.

### **5.1 Cross-Jurisdictional Benchmarking**

The ability to compare performance across different regional jurisdictions remains a key deliverable for executive oversight.

| Metric | NSW Region | VIC Region | Variance |
| :---- | :---- | :---- | :---- |
| Hours Worked | "50,000" | "15,000" | NSW Volume High |
| Incident Count | 3 | 4 | VIC Frequency High |
| LTIFR | 5.1 | 10.7 | **VIC is \+109% Riskier** |
| Top Mechanism | Heat/Environmental | Manual Handling | Divergent Risks |

**Executive Insight:** "The Victorian business unit presents a disproportionate risk to the Group's safety rating. Despite contributing only 23% of the total man-hours, Victoria accounts for 57% of the frequency rate. This suggests specific work methodologies in that region require immediate audit."

### **5.2 The Subcontractor Risk Model**

By rigorously tracking subcontractor\_hours via either validated manual input or API integration, the platform eliminates the "20% estimate liability timebomb".

**Insight:** "Subcontractors are currently running at an LTIFR of 25.0, compared to Direct Employees at 4.0. The previous estimation model masked this volatility. We can now target interventions at high-risk sub-trades, providing specific value."

---

## **9\. Appendix: Technical Specifications for the Development Team (Revised Schema)**

SQL

```

-- ENUMS for Standardization
CREATE TYPE injury_severity AS ENUM ('LTI', 'MTI', 'FAI', 'Report Only');
CREATE TYPE injury_nature AS ENUM ('Fracture', 'Hernia', 'Laceration', 'Sprain', 'Burn', 'Foreign Body');
CREATE TYPE jurisdiction_state AS ENUM ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT');
-- New ENUM to support flexibility and integration tracking
CREATE TYPE metrics_data_source AS ENUM ('Manual Input', 'Procore API', 'HammerTech API', 'Payroll System');

-- SITES TABLE (The Unified Entity, replacing separate projects and sites tables)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    state jurisdiction_state NOT NULL, -- Critical for reporting segmentation
    status TEXT DEFAULT 'Active',
    is_project_based BOOLEAN DEFAULT TRUE, -- For distinguishing long-term vs. fixed-term sites
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- METRICS TABLE (The Denominator - Flexible for Manual/API Input)
CREATE TABLE monthly_site_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id),
    reporting_month DATE NOT NULL,
    employee_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subcontractor_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_estimated BOOLEAN DEFAULT FALSE, -- Flag to track manual data quality
    data_source metrics_data_source NOT NULL DEFAULT 'Manual Input', -- Tracks source: API, Manual
    CONSTRAINT unique_site_month UNIQUE (site_id, reporting_month)
);

-- INCIDENTS TABLE (The Numerator - Links to Unified Sites)
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id),
    incident_date DATE NOT NULL,
    severity injury_severity NOT NULL,
    nature injury_nature NOT NULL,
    is_subcontractor BOOLEAN DEFAULT FALSE,
    description TEXT,
    embedding VECTOR(1536)
);

```

## 

## **Revision 1.0** 

## **Executive Summary**

The construction industry stands at a pivotal juncture where the convergence of cloud-native database architectures and generative artificial intelligence (AI) offers the potential to redefine the paradigm of Occupational Health and Safety (OHS) reporting. For Mend Services, the transition from static, document-based reporting to a dynamic, query-driven intelligence platform represents a fundamental value shift. This report articulates a comprehensive strategy for leveraging a Supabase (PostgreSQL) backend and Large Language Model (LLM) integration to deliver "on-demand" insight. By moving beyond the limitations of manual data entry—exemplified by the data latency and estimation errors found in traditional reporting workflows 1—Mend Services can empower construction employers with real-time, predictive, and actionable safety intelligence.

The analysis herein dissects the current state of safety reporting, identifies critical gaps in data integrity such as subcontractor hour estimation and jurisdictional fragmentation, and proposes a sophisticated technical and operational architecture. This architecture is designed to satisfy the dual requirements of site-level operational control and corporate-level strategic oversight, ensuring that every data point entered contributes to a safer, more compliant, and more efficient built environment.

## **1\. The Imperative for Digital Transformation in Safety Reporting**

To understand the magnitude of the opportunity for Mend Services, one must first rigorously analyze the current state of the industry. Construction is an inherently high-risk sector characterized by dynamic environments, transient workforces, and complex regulatory frameworks. The traditional mechanisms for monitoring safety performance in this environment have long been plagued by latency, opacity, and fragmentation.

### **1.1 The Limitations of the "Document Paradigm"**

The artifact provided for analysis, the *Monthly Site Incident Report June 2023 Final.docx* from The Rix Group 1, serves as a prototypical example of the "Document Paradigm." In this model, safety data is compiled manually at the end of a reporting period (usually monthly), aggregated into a word processing document, and distributed to stakeholders. While this satisfies basic compliance requirements, it fails to function as a tool for active risk management.

The document reveals several critical systemic failures inherent to this manual approach. First, the report notes that "The month to month 12 month rolling LTIFR & TRIFR is not available due to the injury classifications requiring data charges and that the business formerly used calendar rolling LIFR & TRIFR".1 This statement uncovers a profound data governance issue: the inability to recalculate historical metrics dynamically when definitions change. In a static document ecosystem, a change in injury classification (e.g., reclassifying a Medical Treatment Injury to a First Aid Injury) breaks the historical trend line, rendering long-term frequency rates invalid or requiring laborious manual recalculation.

Furthermore, the reliance on estimation for critical denominators undermines the statistical validity of the safety metrics. The report states, "Sub Contractor hours have been estimated at 20% of The RIX Groups overall man hours".1 In the context of calculating a Lost Time Injury Frequency Rate (LTIFR), the denominator (total man-hours) is as important as the numerator (incident count). An unverified 20% estimate introduces a significant margin of error. If the actual subcontractor contribution on a labor-intensive site is 40%, the reported frequency rates are artificially inflated, painting a picture of a site that is statistically more dangerous than it truly is. Conversely, if the actual contribution is 10%, the site's risks are understated. A platform-based approach must eliminate this estimation by capturing granular, verified hours.

### **1.2 The Shift to "Data-as-a-Service"**

The vision for Mend Services is to move from this static, disconnected model to a "Data-as-a-Service" ecosystem. In this new paradigm, the "report" is not a file that is created and filed away; it is a view into a live database. When an employer asks for a report, they are querying the current state of truth held within the Supabase Postgres backend.

This shift allows for the "on-demand" capability requested. A Site Manager at the Kurnell site 1 should not have to wait until the 5th of the following month to see their safety performance. They should be able to request a "Week-to-Date" analysis on a Friday afternoon to brief their crews before the weekend. Similarly, a State Manager overseeing both Victoria and New South Wales 1 should be able to generate a comparative analysis instantly, identifying that the Victorian sector is experiencing a TRIFR of 16.1 compared to NSW's 5.1 1, and immediately drill down into the underlying causes without waiting for a quarterly board pack.

### **1.3 The Role of Large Language Models in Safety**

The integration of LLMs introduces a cognitive layer to this data. Traditional databases are excellent at storage and retrieval of structured data (numbers, dates, categories), but they fail at interpreting context. Safety data is rich in unstructured context—witness statements, injury descriptions, and investigation notes.

In the manual report, the Executive Summary states: "Four incidents were reported to Mend in June 2023\. There was an additional personal injury reported to RIX".1 This is a descriptive statement. An LLM-augmented system can transform this into a diagnostic statement: "June 2023 saw a cluster of four incidents, primarily driven by manual handling failures in the Victorian sector. The inclusion of a personal injury, while non-compensable, suggests a potential fatigue management issue within the workforce." This moves the user from "knowing what happened" to "understanding why it happened," satisfying the requirement for "insightful reports."

## **2\. Architectural Foundations: The Supabase & Postgres Ecosystem**

To deliver insightful reports "on call," the underlying data architecture must be rigorous. The database schema must mirror the complex hierarchy of a construction enterprise while maintaining the flexibility to handle diverse incident types.

### **2.1 The Schema Strategy: Reflecting Operational Reality**

The construction environment is hierarchical. A Company (The Rix Group) has multiple Projects (sites like Kurnell, Western Sydney). Each Project has multiple Users (Site Managers, Safety Officers) and involves multiple entities (Employees, Subcontractors). The Supabase Postgres schema must strictly enforce these relationships to ensure data integrity.

#### **2.1.1 The sites and projects Topology**

The table design must separate the concept of a "Project" (a contract with a start and end date) from a "Site" (a physical location). This distinction is vital for long-term reporting.

* **Table: organizations**: Top-level tenant (e.g., The Rix Group).  
* **Table: projects**: Specific contracts. Columns for state (NSW, VIC), status (Active, Maintenance, Defect Period).  
* **Insight Implication:** By storing the state metadata at the project level, the system can automatically segment reports by jurisdiction, addressing the requirement to compare NSW (LTIFR 5.1) vs. VIC (LTIFR 10.7) 1 without manual sorting.

#### **2.1.2 The operational\_metrics Table (The Denominator)**

This is the most critical table for solving the "20% estimate" problem found in the research material.

* **Structure:**  
  * id (UUID)  
  * project\_id (Foreign Key)  
  * reporting\_period (Date Range)  
  * employee\_hours (Numeric, Non-Null)  
  * subcontractor\_hours (Numeric, Non-Null)  
  * average\_headcount (Integer)  
* **Mechanism:** The platform should enforce a "Gatekeeper" logic. A Site Manager cannot generate their monthly report until the operational\_metrics for that month are locked. The interface should prompt: "Please input actual subcontractor hours from gate logs or sign-in sheets." If an estimate is absolutely necessary, it must be flagged in the database as is\_estimate \= true, allowing the report to transparently caveat the data reliability.

#### **2.1.3 The incidents Taxonomy (The Numerator)**

To enable the LLM to provide standardized insights, the inputs must be standardized. Free-text fields for "Injury Type" lead to chaos (e.g., "Cut" vs. "Laceration" vs. "Gash").

* **Structure:**  
  * severity: ENUM ('LTI', 'MTI', 'FAI', 'Report Only').  
  * nature\_of\_injury: ENUM based on local standards (e.g., TOOCS in Australia, OSHA in US). Codes for 'Fracture', 'Hernia', 'Laceration', 'Sprain'.1  
  * mechanism: ENUM ('Fall from Height', 'Body Stressing', 'Hit by Moving Object').  
  * agency: ENUM ('Powered Hand Tool', 'Mobile Plant', 'Environmental Conditions').  
  * narrative\_description: TEXT. This is the payload for the LLM.

### **2.2 Vector Embeddings for Semantic Search**

To truly leverage the power of LLMs, Mend Services should utilize the pgvector extension within Supabase.

* **The Process:** When a user enters a narrative description (e.g., "Worker felt sharp pain in lower back while lifting conduit pipes"), the backend passes this text to an embedding model (like OpenAI's text-embedding-3-small). The resulting vector (a list of floating-point numbers representing the semantic meaning) is stored in the database.  
* **The Benefit:** When a user asks, "Do we have a problem with manual handling?", the system doesn't just look for the text string "manual handling." It performs a vector similarity search, finding reports about "lifting," "carrying," "herniated discs," and "back strain." This ensures that the "insightful report" captures the full spectrum of risk, even if the specific keywords vary.

### **2.3 Row Level Security (RLS) and Multi-Tenancy**

Construction companies are fiercely protective of their data. A Site Manager for "Western Sydney" should generally not see the detailed injury records of "Kurnell" unless explicitly authorized. Supabase's RLS policies are the ideal mechanism to enforce this.

* **Policy:** CREATE POLICY "Site Managers view own site" ON incidents FOR SELECT USING (site\_id IN (SELECT get\_authorized\_sites(auth.uid())));  
* **Impact:** This allows Mend Services to host multiple construction companies on the same platform securely. It also enables the creation of "blind benchmarking" reports, where a company can compare its LTIFR against the "Industry Average" (an aggregation of all anonymized data on the platform) without ever seeing competitor data.

## **3\. The Cognitive Layer: How LLMs Generate "Insight"**

The user's request centers on the ability to produce "very insightful reports." In the context of safety, an insight is not just a statistic; it is a correlation that suggests a cause or a remedy. The LLM acts as the bridge between the raw SQL data and the human decision-maker.

### **3.1 The Retrieval Augmented Generation (RAG) Workflow**

To prevent the LLM from "hallucinating" (inventing fake injuries), the platform must use a strict RAG architecture.

1. **User Query:** "Generate the Monthly Report for Kurnell."  
2. **Data Retrieval:** The system executes optimized SQL queries to fetch the exact numbers: LTI=1, MTI=1, Hours=4500.1 It also retrieves the last 5 incident narratives.  
3. **Prompt Assembly:** The system constructs a prompt: "You are a Safety Data Analyst. Based *only* on the following JSON data, write an Executive Summary. Data: {LTI: 1, Type: Fracture...}."  
4. **Generation:** The LLM writes the narrative.  
5. **Output:** The narrative is combined with the statistical charts in the final report.

### **3.2 Automated Narrative Analysis: Beyond Counting**

The provided manual report lists "Types of incidents" as a simple table: Fracture (1), Hernia (1), Laceration (1).1 While accurate, this is low-value information. The LLM can elevate this analysis by looking for second-order connections.

**Example of LLM Reasoning:**

* *Observation:* The LLM notices a "Hernia" and a "Sprain/Strain" in the same month.  
* *Knowledge Retrieval:* It references its internal knowledge base which associates both injuries with "Body Stressing."  
* *Context Integration:* It checks the project phase (stored in the projects table). If the phase is "Demolition" or "Manual Load Out," it identifies a high-risk correlation.  
* *Generated Insight:* "50% of incidents this month (Hernia, Sprain) are attributable to Body Stressing mechanisms. This correlates with the current high-intensity manual work phase at the Kurnell site. The standard 'Manual Handling' training appears insufficient for the current load. Recommendation: Introduce mechanical lifting aids for loads over 20kg immediately."

### **3.3 Sentiment and Cultural Analysis**

Safety culture is often reflected in the tone of reports. The LLM can analyze the "Incident Description" fields for sentiment.

* **Passive vs. Active Voice:** If reports consistently use passive voice ("The hammer fell") rather than active voice ("The worker dropped the hammer"), it may indicate a culture of deflecting responsibility.  
* **Insight:** "Analysis of incident narratives indicates a high prevalence of passive language, suggesting a hesitation among the workforce to identify root causes. This 'blame-avoidance' language can hinder effective investigation."

## **4\. Operational Intelligence: The Site Manager's Report**

For the Site Manager—the person on the ground—the "insightful report" must be a tool for immediate control. They are the ones inputting the incident reports each month, and they need immediate feedback.

### **4.1 The "On-Call" Monthly Compliance Report**

The Site Manager needs to satisfy the Head Office. Currently, they likely spend hours formatting a Word doc like the Rix Group example. With Mend Services, this is a one-click process.

#### **4.1.1 Automated Metric Calculation**

The system automates the complex math that is currently failing.

* **Rolling LTIFR:** The system sums the last 12 months of LTIs and divides by the last 12 months of *verified* hours. It handles the "windowing" (dropping the 13th month and adding the current month) automatically.  
* **Validation:** If the calculated rate swings wildly (e.g., from 5.1 to 15.0), the system flags a "Data Anomaly" warning, prompting the manager to check if they missed a zero in the man-hours input.

#### **4.1.2 The "Toolbox Talk" Generator**

This is a high-value feature for the site level. Based on the month's data, the LLM generates a script for the next morning briefing.

* **Data Trigger:** The report shows a "Laceration" from an "Angle Grinder".1  
* **Output:** "Attached is a 5-minute Toolbox Talk script focusing on 'Safe Use of Angle Grinders,' specifically referencing the need to check guard integrity, which was a factor in the June 12th incident."

### **4.2 The "Near Miss" and Leading Indicator Report**

The Rix Group report shows a ratio of 1 LTI, 1 MTI, and 1 FAI.1 In safety science (Heinrich's Pyramid), for every major injury (LTI), there should be dozens of minor injuries (FAI) and hundreds of Near Misses.

* **The Insight:** A 1:1:1 ratio is statistically improbable and dangerous. It implies that the site is a "blind spot" where only the injuries that *cannot be hidden* (those requiring a doctor or time off) are reported.  
* **The Report Content:** The Site Manager's report should prominently feature a "Reporting Culture Health Check."  
  * *Metric:* Leading Indicator Ratio (Near Miss : LTI).  
  * *Status:* **CRITICAL ALERT**.  
  * *Narrative:* "The site has recorded zero Near Misses for every LTI this month. This indicates a collapse in proactive reporting. You are driving blind. Immediate action is required to encourage the workforce to report hazards before they become injuries."

## **5\. Strategic Intelligence: The Executive & Board Report**

For the employer (the construction company leadership), the requirements differ. They need to understand liability, insurance premiums, and systemic risk across multiple sites.

### **5.1 Cross-Jurisdictional Benchmarking**

The research material highlights a significant disparity: "NSW LTIFR 5.1 vs. VIC LTIFR 10.7".1 The Executive Report must turn this from a table into a strategy.

**Table 1: Jurisdictional Performance Analysis (Automated)**

| Metric | NSW Region | VIC Region | Variance |
| :---- | :---- | :---- | :---- |
| **Hours Worked** | 50,000 | 15,000 | NSW Volume High |
| **Incident Count** | 3 | 4 | VIC Frequency High |
| **LTIFR** | 5.1 | 10.7 | **VIC is \+109% Riskier** |
| **Top Mechanism** | Heat/Environmental | Manual Handling | Divergent Risks |

* **Executive Insight:** "While NSW operations are stable, the Victorian business unit presents a disproportionate risk to the Group's safety rating. Despite contributing only 23% of the total man-hours, Victoria accounts for 57% of the frequency rate. This is not a volume issue; it is a control issue. The prevalence of manual handling injuries in VIC suggests that the specific work methodologies used in that region (potentially differing from NSW standard operating procedures) require immediate audit."

### **5.2 The Subcontractor Risk Model**

The "20% estimate" 1 is a liability timebomb. Courts and insurance auditors view "estimates" skeptically. The Mend Platform allows the Executive to see the "True" vs. "Estimated" exposure.

* **Risk Visualization:** The report should differentiate between "Employee Risk" and "Third Party Risk."  
* **Insight:** "Subcontractors are currently running at an LTIFR of 25.0, compared to Direct Employees at 4.0. The 20% estimation model used previously masked this volatility. By tracking actuals, we have identified that the electrical subcontractors specifically are driving the high frequency rate. This allows for targeted intervention with that specific sub-trade, rather than a generic site-wide retraining."

### **5.3 Financial & Insurance Implications**

Using the Supabase backend, Mend Services can link "Incident Severity" to "Estimated Cost."

* **LTI Cost:** $15,000 (Average estimate based on lost productivity \+ premiums).  
* **MTI Cost:** $2,500.  
* **The Report:** "The safety performance in June 2023 represents an estimated liability accrual of $20,000. Reducing the VIC LTIFR to match NSW levels would yield a projected annual saving of $150,000 in direct costs and insurance premium operational adjustments."

## **6\. Detailed Implementation: The User Experience**

How does the user actually "request" these reports? The experience must be frictionless.

### **6.1 The Input Phase: Streamlining Data Capture**

Garbage in, garbage out. The interface for the Site Manager must be simple but rigorous.

* **Monthly Hours Log:** A simple form sent via email link on the 1st of the month.  
  * *Field 1:* "Total Company Hours" (Numeric).  
  * *Field 2:* "Total Subcontractor Hours" (Numeric). *Tooltip: "Please use gate logs. Do not estimate."*  
  * *Validation:* If the user tries to enter a flat 20% calculation of Field 1 into Field 2, the system warns: "This looks like an estimate. Are you sure?"  
* **Incident Logging:** A mobile-optimized web form.  
  * *Voice-to-Text:* The manager can dictate the incident description. The LLM cleans up the transcript and populates the "Narrative" field automatically.

### **6.2 The Request Phase: "Ask Your Data"**

The dashboard features a chat interface powered by the LLM and the vector database.

* **User Query:** "Draft a report for the Project Director explaining why our TRIFR went up."  
* **System Logic:**  
  1. Identifies "TRIFR" and "Trend Up" as the key intents.  
  2. Queries SQL: Finds TRIFR moved from 6.0 to 8.0.1  
  3. Queries SQL: Finds the contributing incidents (The "additional personal injury" and the "LTI").  
  4. Analyses: Notes that the *rolling* nature implies an old "clean" month dropped off and a "dirty" month was added.  
* **System Output:** "Draft Report Generated. Key Theme: The increase in TRIFR to 8.0 is driven by the addition of the June LTI combined with the exit of a zero-incident month from the 12-month window. Note: The inclusion of the personal injury in the raw data logs has been excluded from the TRIFR calculation to maintain regulatory compliance."

## **7\. Future Roadmap: Predictive & Prescriptive Analytics**

Once the system has captured 6-12 months of high-quality data, Mend Services can unlock "Prescriptive Analytics."

### **7.1 Predictive Modeling**

Using the Postgres data, the platform can run regression analyses.

* **Prediction:** "Based on the current accumulation of man-hours and the historical incident rate of the 'Structural Steel' phase, the model predicts an 85% probability of a Recordable Injury in the next 14 days."  
* **Prescription:** "Recommended Action: Increase safety officer rotation on the steel fixing deck for the next two weeks."

### **7.2 Computer Vision Integration**

The user query mentions potential future expansion. Supabase Storage can host site photos.

* **Capability:** Site Managers upload photos of the site with their monthly report.  
* **Analysis:** An AI Vision model scans the background of the photos. It detects "workers without hard hats" or "blocked fire exits."  
* **Report:** "Automated Hazard Audit: The monthly report photos inadvertently show three instances of working at height without edge protection. This contradicts the 'Zero Harm' narrative in the text report."

## **8\. Conclusion**

The transition from the *The Rix Group's* manual reporting workflow to the Mend Services automated platform is a transformative step. It addresses the fundamental flaws of the current system: the reliance on estimates, the fragility of manual calculations, and the lack of deep insight.

By implementing a rigorous Supabase schema that enforces data integrity—specifically around the capture of man-hours and standardized injury codes—Mend Services creates a "Single Source of Truth." Layering an LLM on top of this structure unlocks the ability to interrogate this truth. The result is a reporting ecosystem where a Site Manager can instantly assess their operational control, and an Executive can visualize their strategic liability across jurisdictions.

The insights derived—such as the correlation between specific project phases and injury types, or the detection of "flat" safety pyramids indicating under-reporting—are not just interesting; they are instrumental. They provide the construction employer with the lever to move from monitoring safety to engineering it.

## **9\. Appendix: Technical Specifications for the Development Team**

### **9.1 Database Schema (PostgreSQL/Supabase)**

SQL

\-- ENUMS for Standardization  
CREATE TYPE injury\_severity AS ENUM ('LTI', 'MTI', 'FAI', 'Report Only');  
CREATE TYPE injury\_nature AS ENUM ('Fracture', 'Hernia', 'Laceration', 'Sprain', 'Burn', 'Foreign Body');  
CREATE TYPE jurisdiction\_state AS ENUM ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT');

\-- SITES TABLE  
CREATE TABLE sites (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    company\_id UUID REFERENCES companies(id),  
    name TEXT NOT NULL, \-- e.g., 'Kurnell'  
    state jurisdiction\_state NOT NULL, \-- Critical for NSW vs VIC comparison  
    status TEXT DEFAULT 'Active',  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
);

\-- METRICS TABLE (The Denominator)  
CREATE TABLE monthly\_site\_metrics (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    site\_id UUID REFERENCES sites(id),  
    reporting\_month DATE NOT NULL, \-- e.g., '2023-06-01'  
    employee\_hours NUMERIC(10,2) NOT NULL DEFAULT 0,  
    subcontractor\_hours NUMERIC(10,2) NOT NULL DEFAULT 0,  
    is\_estimated BOOLEAN DEFAULT FALSE, \-- Flag to track data quality  
    CONSTRAINT unique\_site\_month UNIQUE (site\_id, reporting\_month)  
);

\-- INCIDENTS TABLE (The Numerator)  
CREATE TABLE incidents (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    site\_id UUID REFERENCES sites(id),  
    incident\_date DATE NOT NULL,  
    severity injury\_severity NOT NULL,  
    nature injury\_nature NOT NULL,  
    is\_subcontractor BOOLEAN DEFAULT FALSE, \-- To solve the subbie risk model  
    description TEXT, \-- Rich text for LLM  
    embedding VECTOR(1536) \-- For pgvector semantic search  
);

### **9.2 SQL View for Rolling LTIFR (Automated Calculation)**

SQL

CREATE VIEW site\_rolling\_stats AS  
SELECT  
    s.id as site\_id,  
    s.name,  
    m.reporting\_month,  
    \-- Calculate LTI Sum for the 12 month window  
    (  
        SELECT COUNT(\*)  
        FROM incidents i  
        WHERE i.site\_id \= s.id  
        AND i.severity \= 'LTI'  
        AND i.incident\_date BETWEEN (m.reporting\_month \- INTERVAL '11 months') AND (m.reporting\_month \+ INTERVAL '1 month')  
    ) as rolling\_lti\_count,  
    \-- Calculate Hours Sum for the 12 month window  
    (  
        SELECT SUM(employee\_hours \+ subcontractor\_hours)  
        FROM monthly\_site\_metrics m2  
        WHERE m2.site\_id \= s.id  
        AND m2.reporting\_month BETWEEN (m.reporting\_month \- INTERVAL '11 months') AND m.reporting\_month  
    ) as rolling\_hours,  
    \-- The Frequency Rate Formula  
    CASE  
        WHEN (SELECT SUM(employee\_hours \+ subcontractor\_hours)...) \> 0 THEN  
            (Rolling\_LTI\_Count \* 1000000) / Rolling\_Hours  
        ELSE 0  
    END as rolling\_ltifr  
FROM sites s  
JOIN monthly\_site\_metrics m ON s.id \= m.site\_id;

#### **Works cited**

1. Monthly Site Incident Report June 2023 Final.docx
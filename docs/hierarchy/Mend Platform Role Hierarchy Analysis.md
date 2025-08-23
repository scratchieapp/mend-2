# Mend Platform Role Hierarchy Analysis

## **MEND Internal Roles (Platform Operators)**

###   **1\. MEND Super Admin**

  \- **Dashboard**: AdminDashboard with full system access  
  \- **Function**: Complete platform administration, user management, system configuration, storage setup, data imports, reference tables, system logs  
  \- **Access**: All administrative functions, can manage all clients and data

###   **2\. MEND Data Entry**

  \- **Function**: Operational staff who input and maintain incident data  
  \- **Access**: Incident reporting, data entry, basic administrative functions  
  \- **Scope**: Cross-client data entry but limited admin privileges

## **Client Company Roles (MEND's Customers)**

These roles have Row-Level Security to their own company records only

###   **3\. Builder/Company Senior Manager**

  \- **Dashboard**: BuilderSeniorDashboard  
  \- **Function**: Executive-level oversight of company's safety performance  
  \- **Access**: High-level analytics, LTI details, company-wide reporting, strategic decision making,  
  \- **Scope**: Full company data access across all sites

###   **4\. Builder/Company Manager**

  \- **Dashboard**: BuilderDashboard  
  \- **Function**: Day-to-day safety management for company operations  
  \- **Access**: Incident management, worker data, site coordination,operational reporting  
  \- **Scope**: Company-level access with operational focus

###   **5\. Site Administrator**

  \- **Dashboard**: SiteAdmin  
  \- **Function**: On-site safety management and incident coordination  
  \- **Access**: Site-specific incident reporting, worker management, local safety protocols  
  \- **Scope**: Limited to specific site(s) they manage

## **External Professional Roles (Service Providers)**

These roles would be granted access to Client Companies (ie. the builders that are Mend’s customers), once granted permission by roles 3 or 4 (or of course role 1 and 2 which are able to do anything that the higher numbered roles can do)

###   **6\. Medical Professional**

  \- **Dashboard**: MedicalHomePage, MedicalPatientsPage, MedicalDashboard  
  \- **Function**: Treat injured workers, provide medical assessments, return-to-work clearances  
  \- **Access**: Patient medical data, treatment records, injury assessments  
  \- **Scope**: Access to patients they're treating across multiple companies

###   **7\. Insurance Provider**

  \- **Dashboard**: InsuranceProviderDashboard  
  \- **Function**: Claims management, risk assessment, premium calculations  
  \- **Access**: Claims data, cost analysis, risk metrics, policy management  
  \- **Scope**: Access to insured companies' incident and claims data, reporting ability

##   **Regulatory/Oversight Roles**

###   **8\. Government Official/External Safety Consultant**

  \- **Dashboard**: SafetyDashboard  
  \- **Function**: Regulatory oversight, compliance monitoring, investigations, providing data that is sensitive to the Client Company but that can be shared with known parties such as external auditor, legal representative, union representative.  
  \- **Access**: All incidents for regulatory review, compliance statistics, enforcement actions  
  \- **Scope**: Broad access for regulatory purposes across all companies

###   **9\. Public**

  \- Basic information showing things like the benchmark industry statistical data and what this company’s stats are  
  \- Very basic information, no login required, essentially a marketing feed

##   **Questions for Refinement:**

  1\. **What is the 9th role?** I see 8 distinct roles \- what's the missing one?  
Public access role, so essentially a marketing feed for display on the company’s website etc.  
  2\. **Data Segregation**: Should company data be completely isolated between competitors, or do some roles (like MEND staff) need cross-company visibility?  
Exactly as you suspect: company data should be completely isolated between competitors, and some roles (like MEND staff) need cross-company visibility  
  3\. **Public Website Integration**: How should the marketing website integrate with the platform? Separate authentication or unified?  
Unified auth for now, we are saying this is a monorepo with two distinct areas (marketing and operations)  
  4\. **Future Microservices**: Should we design APIs now to support future separation of:  
    \- **Operations Platform** (incident management, dashboards)  
    \- **Marketing Website** (public content, lead generation)  
Yes but let’s have a rule to be strategic with designing APIs, having them in groups and versions so we can keep control of their creation.  
  5\. **Role Permissions**: Are there any missing permissions or access restrictions you'd like to adjust? None missing.  
  This hierarchy seems designed for Australia's workplace safety ecosystem  
  \- is this correct, or should we adjust for other markets? Yes for now this is correct.  

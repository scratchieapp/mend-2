# Field Mapping Documentation - Mend-2 Incident Report

## Overview
This document provides a comprehensive mapping between form fields and database columns for the incident reporting system.

## Database Structure

### Primary Tables
1. **incidents** - Main incident records
2. **employers** - Company/client information (mend_clients)
3. **sites** - Work locations
4. **workers** - Employee information
5. **medical_professionals** - Doctors and medical staff

### Lookup Tables
- body_parts
- body_sides
- departments
- mechanism_of_injury_codes
- nature_of_injury_codes
- agency_of_injury_codes
- bodily_location_codes
- claim_types
- actions_taken

## Field Mappings

### Employer/Client Information
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| mend_client | employers | employer_name | Employers ARE mend_clients |
| employer_name | employers | employer_name | Alternative field name |

### Worker Information
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| worker_name | workers | given_name, family_name | Split and stored separately |
| injured_worker | workers | given_name, family_name | Alternative field name |
| employment_type | workers | employment_type | Updated on worker record |

### Site/Location Information
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| site_name | sites | site_name | Work location |
| location | sites | site_name | Alternative field name |
| supervisor_contact | sites | supervisor_name | Supervisor's name |
| supervisor_name | sites | supervisor_name | Alternative field name |
| supervisor_phone | sites | supervisor_telephone | Supervisor's phone |
| supervisor_telephone | sites | supervisor_telephone | Alternative field name |

### Notifying Person (Stored in incidents table)
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| notifying_person_name | incidents | notifying_person_name | Person reporting incident |
| notifying_person_position | incidents | notifying_person_position | Their job title |
| notifying_person_telephone | incidents | notifying_person_telephone | Contact number |

### Injury Details
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| date_of_injury | incidents | date_of_injury | Date format: YYYY-MM-DD |
| time_of_injury | incidents | time_of_injury | Time format: HH:MM |
| injury_type | incidents | injury_type | Type of injury |
| injury_description | incidents | injury_description | Detailed description |
| body_part | incidents | body_part_id | Foreign key to body_parts |
| body_side | incidents | body_side_id | Foreign key to body_sides |
| bodily_location | incidents | bl_code_id | Foreign key to bodily_location_codes |
| mechanism_of_injury | incidents | moi_code_id | Foreign key to mechanism_of_injury_codes |
| nature_of_injury | incidents | noi_code_id | Foreign key to nature_of_injury_codes |
| agency_of_injury | incidents | aoi_code_id | Foreign key to agency_of_injury_codes |

### Treatment Information
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| type_of_first_aid | incidents | treatment_provided | First aid given |
| treatment_provided | incidents | treatment_provided | Alternative field name |
| referred_to | incidents | referral | Where patient was referred |
| referral | incidents | referral | Alternative field name |
| doctor_details | incidents | doctor_details | Doctor information text |
| doctor_id | incidents | doctor_id | Foreign key to medical_professionals |

### Actions and Notes
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| actions_taken | incidents | actions | Actions taken after incident |
| actions | incidents | actions | Alternative field name |
| case_notes | incidents | case_notes | Additional notes |
| witness | incidents | witness | Witness information |

### Additional Fields
| Form Field | Database Table | Database Column | Notes |
|------------|---------------|-----------------|--------|
| classification | incidents | classification | Incident classification |
| incident_summary | incidents | incident_summary | Brief summary |
| shift_arrangement | incidents | shift_arrangement | Work shift details |
| workers_employer | incidents | workers_employer | Employer if different |
| fatality | incidents | fatality | Boolean flag |
| returned_to_work | incidents | returned_to_work | Boolean flag |
| total_days_lost | incidents | total_days_lost | Integer count |
| claim_type | incidents | claim_type_id | Foreign key to claim_types |
| department_id | incidents | department_id | Foreign key to departments |

## Transformation Process

The transformation service (`transformation.ts`) handles:

1. **Entity Creation/Lookup**:
   - Creates new employers, sites, or workers if they don't exist
   - Returns existing IDs if entities are found
   - Updates related information (e.g., supervisor details on sites)

2. **Field Mapping**:
   - Maps form field names to correct database columns
   - Handles alternative field names (e.g., mend_client → employer)
   - Manages foreign key relationships

3. **Data Type Conversion**:
   - Converts string IDs to integers
   - Parses mechanism of injury codes (format: "main-sub")
   - Handles boolean conversions

4. **Validation**:
   - Ensures required fields are present
   - Validates foreign key references
   - Provides specific error messages

## Usage Example

```javascript
// Form data from UI
const formData = {
  mend_client: "ABC Construction",
  worker_name: "John Smith",
  site_name: "Downtown Project",
  supervisor_contact: "Jane Doe",
  supervisor_phone: "555-0123",
  employment_type: "full-time",
  body_side: "1", // Left
  type_of_first_aid: "First Aid Only",
  referred_to: "Medical Center",
  actions_taken: "Provided first aid, notified supervisor",
  case_notes: "Worker slipped on wet surface",
  notifying_person_name: "Bob Manager",
  notifying_person_position: "Site Supervisor",
  notifying_person_telephone: "555-4567"
};

// Transformed for database
const dbData = {
  employer_id: 123, // Created/looked up
  worker_id: 456, // Created/looked up
  site_id: 789, // Created/looked up
  body_side_id: 1,
  treatment_provided: "First Aid Only",
  referral: "Medical Center",
  actions: "Provided first aid, notified supervisor",
  case_notes: "Worker slipped on wet surface",
  notifying_person_name: "Bob Manager",
  notifying_person_position: "Site Supervisor",
  notifying_person_telephone: "555-4567"
};
```

## Important Notes

1. **Employers ARE mend_clients** - These terms are used interchangeably
2. **Supervisor information** is stored on the sites table, not incidents
3. **Employment type** is stored on the workers table, not incidents
4. **Notifying person** fields are stored directly in the incidents table
5. **All lookup values** should be sent as IDs, not text values
6. **The transformation service** handles creating missing entities automatically

## Error Handling

Common errors and their meanings:
- **23502**: Required field is missing
- **23503**: Invalid foreign key reference
- **23505**: Duplicate entry (already exists)

## Testing Checklist

- [ ] Employer creation/lookup works
- [ ] Site creation/lookup works with supervisor info
- [ ] Worker creation/lookup works with employment type
- [ ] All lookup table IDs are properly converted
- [ ] Notifying person fields are saved correctly
- [ ] Treatment and referral fields are mapped
- [ ] Actions and case notes are preserved
- [ ] Form submission completes successfully
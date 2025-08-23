export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actions_taken: {
        Row: {
          action_id: number
          contact_with_doctor: boolean | null
          contact_with_employer: boolean | null
          contact_with_worker: boolean | null
          created_at: string | null
          data_input: string | null
          notification_emailed: boolean | null
          updated_at: string | null
        }
        Insert: {
          action_id?: number
          contact_with_doctor?: boolean | null
          contact_with_employer?: boolean | null
          contact_with_worker?: boolean | null
          created_at?: string | null
          data_input?: string | null
          notification_emailed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          action_id?: number
          contact_with_doctor?: boolean | null
          contact_with_employer?: boolean | null
          contact_with_worker?: boolean | null
          created_at?: string | null
          data_input?: string | null
          notification_emailed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agency_of_injury_codes: {
        Row: {
          aoi_code_id: number
          aoi_code_main: string | null
          aoi_code_sub: string | null
          aoi_description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          aoi_code_id?: number
          aoi_code_main?: string | null
          aoi_code_sub?: string | null
          aoi_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          aoi_code_id?: number
          aoi_code_main?: string | null
          aoi_code_sub?: string | null
          aoi_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bodily_location_codes: {
        Row: {
          bl_code_id: number
          bl_code_main: string | null
          bl_code_sub: string | null
          bl_description: string | null
          body_part_id: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          bl_code_id?: number
          bl_code_main?: string | null
          bl_code_sub?: string | null
          bl_description?: string | null
          body_part_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bl_code_id?: number
          bl_code_main?: string | null
          bl_code_sub?: string | null
          bl_description?: string | null
          body_part_id?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bodily_location_codes_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["body_part_id"]
          },
        ]
      }
      body_parts: {
        Row: {
          body_part_id: number
          body_part_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          body_part_id?: number
          body_part_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          body_part_id?: number
          body_part_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      body_parts_bodily_codes: {
        Row: {
          bl_code_id: number
          body_part_id: number
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          bl_code_id: number
          body_part_id: number
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          bl_code_id?: number
          body_part_id?: number
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bl_code"
            columns: ["bl_code_id"]
            isOneToOne: false
            referencedRelation: "bodily_location_codes"
            referencedColumns: ["bl_code_id"]
          },
          {
            foreignKeyName: "fk_body_part"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["body_part_id"]
          },
        ]
      }
      body_sides: {
        Row: {
          body_side_id: number
          body_side_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          body_side_id?: number
          body_side_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          body_side_id?: number
          body_side_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      claim_types: {
        Row: {
          claim_type_id: number
          claim_type_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          claim_type_id?: number
          claim_type_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          claim_type_id?: number
          claim_type_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          claim_id: number
          claim_number: string | null
          claim_status: string | null
          claim_type: string | null
          created_at: string | null
          incident_id: number | null
          insurer_name: string | null
          liability: string | null
          policy_number: string | null
          updated_at: string | null
        }
        Insert: {
          claim_id?: number
          claim_number?: string | null
          claim_status?: string | null
          claim_type?: string | null
          created_at?: string | null
          incident_id?: number | null
          insurer_name?: string | null
          liability?: string | null
          policy_number?: string | null
          updated_at?: string | null
        }
        Update: {
          claim_id?: number
          claim_number?: string | null
          claim_status?: string | null
          claim_type?: string | null
          created_at?: string | null
          incident_id?: number | null
          insurer_name?: string | null
          liability?: string | null
          policy_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["incident_id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          action_description: string
          action_type: string | null
          actual_completion_date: string | null
          assigned_to: string | null
          created_at: string | null
          effectiveness_review: string | null
          id: number
          incident_id: number | null
          status: string | null
          target_completion_date: string | null
          updated_at: string | null
        }
        Insert: {
          action_description: string
          action_type?: string | null
          actual_completion_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          effectiveness_review?: string | null
          id?: number
          incident_id?: number | null
          status?: string | null
          target_completion_date?: string | null
          updated_at?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string | null
          actual_completion_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          effectiveness_review?: string | null
          id?: number
          incident_id?: number | null
          status?: string | null
          target_completion_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["incident_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          department_id: number
          department_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: number
          department_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: number
          department_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          action: string
          email: string
          id: number
          sent_at: string | null
          success: boolean | null
        }
        Insert: {
          action: string
          email: string
          id?: never
          sent_at?: string | null
          success?: boolean | null
        }
        Update: {
          action?: string
          email?: string
          id?: never
          sent_at?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      employer_kpis: {
        Row: {
          baseline_comp_insurance: number | null
          baseline_lti: number | null
          baseline_set_date: string | null
          created_at: string | null
          employer_id: number
          employer_kpi_id: number
          updated_at: string | null
        }
        Insert: {
          baseline_comp_insurance?: number | null
          baseline_lti?: number | null
          baseline_set_date?: string | null
          created_at?: string | null
          employer_id: number
          employer_kpi_id?: number
          updated_at?: string | null
        }
        Update: {
          baseline_comp_insurance?: number | null
          baseline_lti?: number | null
          baseline_set_date?: string | null
          created_at?: string | null
          employer_id?: number
          employer_kpi_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_kpis_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
      employers: {
        Row: {
          abn: string | null
          created_at: string | null
          employer_address: string | null
          employer_id: number
          employer_name: string | null
          employer_phone: string | null
          employer_post_code: string | null
          employer_state: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          created_at?: string | null
          employer_address?: string | null
          employer_id?: number
          employer_name?: string | null
          employer_phone?: string | null
          employer_post_code?: string | null
          employer_state?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          created_at?: string | null
          employer_address?: string | null
          employer_id?: number
          employer_name?: string | null
          employer_phone?: string | null
          employer_post_code?: string | null
          employer_state?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          ai_recommendations: string | null
          created_by: number | null
          current_summary: string | null
          employer_id: number | null
          executive_summary: string | null
          generated_at: string | null
          last_summary_generated: string | null
          report_data: Json | null
          report_id: number
          report_month: string
          site_id: number | null
          summary_history: Json[] | null
          summary_month: string | null
        }
        Insert: {
          ai_recommendations?: string | null
          created_by?: number | null
          current_summary?: string | null
          employer_id?: number | null
          executive_summary?: string | null
          generated_at?: string | null
          last_summary_generated?: string | null
          report_data?: Json | null
          report_id?: number
          report_month: string
          site_id?: number | null
          summary_history?: Json[] | null
          summary_month?: string | null
        }
        Update: {
          ai_recommendations?: string | null
          created_by?: number | null
          current_summary?: string | null
          employer_id?: number | null
          executive_summary?: string | null
          generated_at?: string | null
          last_summary_generated?: string | null
          report_data?: Json | null
          report_id?: number
          report_month?: string
          site_id?: number | null
          summary_history?: Json[] | null
          summary_month?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
          {
            foreignKeyName: "generated_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "generated_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
        ]
      }
      hours_worked: {
        Row: {
          created_at: string | null
          employer_hours: number
          employer_id: number | null
          id: number
          month: string
          site_id: number | null
          subcontractor_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employer_hours?: number
          employer_id?: number | null
          id?: number
          month: string
          site_id?: number | null
          subcontractor_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employer_hours?: number
          employer_id?: number | null
          id?: number
          month?: string
          site_id?: number | null
          subcontractor_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hours_worked_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
          {
            foreignKeyName: "hours_worked_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "hours_worked_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
        ]
      }
      import_data: {
        Row: {
          created_at: string | null
          data_id: number
          error_message: string | null
          import_id: number | null
          raw_data: Json | null
          row_number: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_id?: number
          error_message?: string | null
          import_id?: number | null
          raw_data?: Json | null
          row_number?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_id?: number
          error_message?: string | null
          import_id?: number | null
          raw_data?: Json | null
          row_number?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_data_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["import_id"]
          },
        ]
      }
      imports: {
        Row: {
          created_at: string | null
          error_log: Json | null
          failed_rows: number | null
          file_name: string
          import_id: number
          import_type: string
          metadata: Json | null
          processed_rows: number | null
          status: string | null
          total_rows: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number | null
          file_name: string
          import_id?: number
          import_type: string
          metadata?: Json | null
          processed_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number | null
          file_name?: string
          import_id?: number
          import_type?: string
          metadata?: Json | null
          processed_rows?: number | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          actions: string | null
          aoi_code_id: number | null
          bl_code_id: number | null
          body_part_id: number | null
          body_side_id: number | null
          case_notes: string | null
          claim_type_id: number | null
          classification: string | null
          created_at: string | null
          date_of_injury: string | null
          date_report_received: string | null
          date_report_responded: string | null
          date_reported_to_site: string | null
          department_id: number | null
          doctor_details: string | null
          doctor_id: number | null
          doctor_notes: string | null
          employer_id: number | null
          fatality: boolean | null
          incident_id: number
          incident_number: string | null
          incident_summary: string | null
          injury_description: string | null
          injury_type: string | null
          moi_code_id: number | null
          noi_code_id: number | null
          notifying_person_name: string | null
          notifying_person_position: string | null
          notifying_person_telephone: string | null
          recorded_at: string | null
          recorded_by: number | null
          referral: string | null
          reported_to_insurer_date: string | null
          response_time_interval: unknown | null
          returned_to_work: boolean | null
          shift_arrangement: string | null
          site_id: number | null
          time_date_email_notification: string | null
          time_of_injury: string | null
          time_report_received: string | null
          time_reported_to_site: string | null
          total_days_lost: number | null
          treatment_provided: string | null
          updated_at: string | null
          witness: string | null
          worker_id: number | null
          workers_employer: string | null
        }
        Insert: {
          actions?: string | null
          aoi_code_id?: number | null
          bl_code_id?: number | null
          body_part_id?: number | null
          body_side_id?: number | null
          case_notes?: string | null
          claim_type_id?: number | null
          classification?: string | null
          created_at?: string | null
          date_of_injury?: string | null
          date_report_received?: string | null
          date_report_responded?: string | null
          date_reported_to_site?: string | null
          department_id?: number | null
          doctor_details?: string | null
          doctor_id?: number | null
          doctor_notes?: string | null
          employer_id?: number | null
          fatality?: boolean | null
          incident_id?: number
          incident_number?: string | null
          incident_summary?: string | null
          injury_description?: string | null
          injury_type?: string | null
          moi_code_id?: number | null
          noi_code_id?: number | null
          notifying_person_name?: string | null
          notifying_person_position?: string | null
          notifying_person_telephone?: string | null
          recorded_at?: string | null
          recorded_by?: number | null
          referral?: string | null
          reported_to_insurer_date?: string | null
          response_time_interval?: unknown | null
          returned_to_work?: boolean | null
          shift_arrangement?: string | null
          site_id?: number | null
          time_date_email_notification?: string | null
          time_of_injury?: string | null
          time_report_received?: string | null
          time_reported_to_site?: string | null
          total_days_lost?: number | null
          treatment_provided?: string | null
          updated_at?: string | null
          witness?: string | null
          worker_id?: number | null
          workers_employer?: string | null
        }
        Update: {
          actions?: string | null
          aoi_code_id?: number | null
          bl_code_id?: number | null
          body_part_id?: number | null
          body_side_id?: number | null
          case_notes?: string | null
          claim_type_id?: number | null
          classification?: string | null
          created_at?: string | null
          date_of_injury?: string | null
          date_report_received?: string | null
          date_report_responded?: string | null
          date_reported_to_site?: string | null
          department_id?: number | null
          doctor_details?: string | null
          doctor_id?: number | null
          doctor_notes?: string | null
          employer_id?: number | null
          fatality?: boolean | null
          incident_id?: number
          incident_number?: string | null
          incident_summary?: string | null
          injury_description?: string | null
          injury_type?: string | null
          moi_code_id?: number | null
          noi_code_id?: number | null
          notifying_person_name?: string | null
          notifying_person_position?: string | null
          notifying_person_telephone?: string | null
          recorded_at?: string | null
          recorded_by?: number | null
          referral?: string | null
          reported_to_insurer_date?: string | null
          response_time_interval?: unknown | null
          returned_to_work?: boolean | null
          shift_arrangement?: string | null
          site_id?: number | null
          time_date_email_notification?: string | null
          time_of_injury?: string | null
          time_report_received?: string | null
          time_reported_to_site?: string | null
          total_days_lost?: number | null
          treatment_provided?: string | null
          updated_at?: string | null
          witness?: string | null
          worker_id?: number | null
          workers_employer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_aoi_code_id_fkey"
            columns: ["aoi_code_id"]
            isOneToOne: false
            referencedRelation: "agency_of_injury_codes"
            referencedColumns: ["aoi_code_id"]
          },
          {
            foreignKeyName: "incidents_bl_code_id_fkey"
            columns: ["bl_code_id"]
            isOneToOne: false
            referencedRelation: "bodily_location_codes"
            referencedColumns: ["bl_code_id"]
          },
          {
            foreignKeyName: "incidents_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["body_part_id"]
          },
          {
            foreignKeyName: "incidents_body_side_id_fkey"
            columns: ["body_side_id"]
            isOneToOne: false
            referencedRelation: "body_sides"
            referencedColumns: ["body_side_id"]
          },
          {
            foreignKeyName: "incidents_claim_type_id_fkey"
            columns: ["claim_type_id"]
            isOneToOne: false
            referencedRelation: "claim_types"
            referencedColumns: ["claim_type_id"]
          },
          {
            foreignKeyName: "incidents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "incidents_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "medical_professionals"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "incidents_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
          {
            foreignKeyName: "incidents_moi_code_id_fkey"
            columns: ["moi_code_id"]
            isOneToOne: false
            referencedRelation: "mechanism_of_injury_codes"
            referencedColumns: ["moi_code_id"]
          },
          {
            foreignKeyName: "incidents_noi_code_id_fkey"
            columns: ["noi_code_id"]
            isOneToOne: false
            referencedRelation: "nature_of_injury_codes"
            referencedColumns: ["noi_code_id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["worker_id"]
          },
        ]
      }
      injury_type: {
        Row: {
          id: number
          injury_type_name: string
        }
        Insert: {
          id?: number
          injury_type_name: string
        }
        Update: {
          id?: number
          injury_type_name?: string
        }
        Relationships: []
      }
      lti_rates: {
        Row: {
          created_at: string | null
          employer_id: number
          id: number
          industry_average: number | null
          lost_time_incidents: number
          lti_rate: number
          month: string
          total_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employer_id: number
          id?: number
          industry_average?: number | null
          lost_time_incidents?: number
          lti_rate?: number
          month: string
          total_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employer_id?: number
          id?: number
          industry_average?: number | null
          lost_time_incidents?: number
          lti_rate?: number
          month?: string
          total_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lti_rates_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
      lti_rates_mend: {
        Row: {
          created_at: string | null
          id: number
          industry_average: number | null
          mend_average: number
          month: string
          total_employers: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          industry_average?: number | null
          mend_average?: number
          month: string
          total_employers?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          industry_average?: number | null
          mend_average?: number
          month?: string
          total_employers?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      mechanism_of_injury_codes: {
        Row: {
          created_at: string | null
          moi_code_id: number
          moi_code_main: string | null
          moi_code_sub: string | null
          moi_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          moi_code_id?: number
          moi_code_main?: string | null
          moi_code_sub?: string | null
          moi_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          moi_code_id?: number
          moi_code_main?: string | null
          moi_code_sub?: string | null
          moi_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_professionals: {
        Row: {
          address: string | null
          created_at: string | null
          doctor_id: number
          email: string | null
          first_name: string
          last_name: string
          phone_number: string | null
          post_code: string | null
          registration_number: string | null
          specialty: string | null
          state: string | null
          suburb: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          doctor_id?: number
          email?: string | null
          first_name: string
          last_name: string
          phone_number?: string | null
          post_code?: string | null
          registration_number?: string | null
          specialty?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          doctor_id?: number
          email?: string | null
          first_name?: string
          last_name?: string
          phone_number?: string | null
          post_code?: string | null
          registration_number?: string | null
          specialty?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mend_account_manager_employers: {
        Row: {
          created_at: string | null
          employer_id: number
          id: number
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          employer_id: number
          id?: number
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          employer_id?: number
          id?: number
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "mend_account_manager_employers_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
      nature_of_injury_codes: {
        Row: {
          created_at: string | null
          noi_code_id: number
          noi_code_main: string | null
          noi_code_sub: string | null
          noi_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          noi_code_id?: number
          noi_code_main?: string | null
          noi_code_sub?: string | null
          noi_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          noi_code_id?: number
          noi_code_main?: string | null
          noi_code_sub?: string | null
          noi_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string | null
          template_id: number
          template_name: string
          template_version: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          template_id?: number
          template_name: string
          template_version: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          template_id?: number
          template_name?: string
          template_version?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          date_reported_to_regulator: string | null
          incident_id: number | null
          report_id: number
          time_date_email_notification: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_reported_to_regulator?: string | null
          incident_id?: number | null
          report_id?: number
          time_date_email_notification?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_reported_to_regulator?: string | null
          incident_id?: number | null
          report_id?: number
          time_date_email_notification?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["incident_id"]
          },
        ]
      }
      severity_metrics: {
        Row: {
          created_at: string | null
          financial_impact_estimate: number | null
          id: number
          incident_id: number | null
          initial_assessment_date: string | null
          productivity_impact_hours: number | null
          return_to_work_date: string | null
          severity_level: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          financial_impact_estimate?: number | null
          id?: number
          incident_id?: number | null
          initial_assessment_date?: string | null
          productivity_impact_hours?: number | null
          return_to_work_date?: string | null
          severity_level?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          financial_impact_estimate?: number | null
          id?: number
          incident_id?: number | null
          initial_assessment_date?: string | null
          productivity_impact_hours?: number | null
          return_to_work_date?: string | null
          severity_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "severity_metrics_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["incident_id"]
          },
        ]
      }
      site_status_history: {
        Row: {
          created_at: string | null
          id: number
          month: string
          site_id: number
          status: Database["public"]["Enums"]["site_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          month: string
          site_id: number
          status?: Database["public"]["Enums"]["site_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          month?: string
          site_id?: number
          status?: Database["public"]["Enums"]["site_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_status_history_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_status_history_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
        ]
      }
      sites: {
        Row: {
          city: string | null
          created_at: string | null
          employer_id: number | null
          post_code: string | null
          project_type: string | null
          site_id: number
          site_name: string | null
          state: string | null
          street_address: string | null
          supervisor_name: string | null
          supervisor_telephone: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          employer_id?: number | null
          post_code?: string | null
          project_type?: string | null
          site_id?: number
          site_name?: string | null
          state?: string | null
          street_address?: string | null
          supervisor_name?: string | null
          supervisor_telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          employer_id?: number | null
          post_code?: string | null
          project_type?: string | null
          site_id?: number
          site_name?: string | null
          state?: string | null
          street_address?: string | null
          supervisor_name?: string | null
          supervisor_telephone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workplace_locations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string | null
          current_medical_status: string | null
          current_treatment: string | null
          date_ceased_work: string | null
          date_of_work_capacity_assessment: string | null
          date_resumed_work: string | null
          incident_id: number | null
          treatment_id: number
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_medical_status?: string | null
          current_treatment?: string | null
          date_ceased_work?: string | null
          date_of_work_capacity_assessment?: string | null
          date_resumed_work?: string | null
          incident_id?: number | null
          treatment_id?: number
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_medical_status?: string | null
          current_treatment?: string | null
          date_ceased_work?: string | null
          date_of_work_capacity_assessment?: string | null
          date_resumed_work?: string | null
          incident_id?: number | null
          treatment_id?: number
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["incident_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          role_id: number
          role_label: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          role_id?: number
          role_label: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          role_id?: number
          role_label?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          custom_display_name: string | null
          display_name: string | null
          email: string | null
          employer_id: string | null
          last_seen_at: string | null
          role_id: number | null
          site_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_display_name?: string | null
          display_name?: string | null
          email?: string | null
          employer_id?: string | null
          last_seen_at?: string | null
          role_id?: number | null
          site_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_display_name?: string | null
          display_name?: string | null
          email?: string | null
          employer_id?: string | null
          last_seen_at?: string | null
          role_id?: number | null
          site_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      workers: {
        Row: {
          basis_of_employment: string | null
          country_of_birth: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          employer_id: number | null
          employment_arrangement: string | null
          employment_type: string | null
          family_name: string | null
          gender: string | null
          given_name: string | null
          interpreter_required: boolean | null
          mobile_number: string | null
          occupation: string | null
          phone_number: string | null
          post_code: string | null
          preferred_language: string | null
          residential_address: string | null
          state: string | null
          suburb: string | null
          updated_at: string | null
          worker_id: number
        }
        Insert: {
          basis_of_employment?: string | null
          country_of_birth?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          employer_id?: number | null
          employment_arrangement?: string | null
          employment_type?: string | null
          family_name?: string | null
          gender?: string | null
          given_name?: string | null
          interpreter_required?: boolean | null
          mobile_number?: string | null
          occupation?: string | null
          phone_number?: string | null
          post_code?: string | null
          preferred_language?: string | null
          residential_address?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string | null
          worker_id?: number
        }
        Update: {
          basis_of_employment?: string | null
          country_of_birth?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          employer_id?: number | null
          employment_arrangement?: string | null
          employment_type?: string | null
          family_name?: string | null
          gender?: string | null
          given_name?: string | null
          interpreter_required?: boolean | null
          mobile_number?: string | null
          occupation?: string | null
          phone_number?: string | null
          post_code?: string | null
          preferred_language?: string | null
          residential_address?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string | null
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "workers_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
    }
    Views: {
      incident_types_summary: {
        Row: {
          count: number | null
          injury_type: string | null
          month: string | null
          site_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
        ]
      }
      rolling_safety_metrics: {
        Row: {
          employer_id: number | null
          month: string | null
          rolling_days_lost: number | null
          rolling_hours: number | null
          rolling_lti_count: number | null
          rolling_ltifr: number | null
          rolling_recordable_count: number | null
          rolling_trifr: number | null
          site_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_safety_comparison"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_safety_comparison: {
        Row: {
          annual_days_lost: number | null
          annual_lti_count: number | null
          annual_recordable_count: number | null
          employer_id: number | null
          lti_rank: number | null
          recordable_rank: number | null
          severity_rank: number | null
          site_id: number | null
          site_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workplace_locations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["employer_id"]
          },
        ]
      }
    }
    Functions: {
      calculate_lti_rate: {
        Args: {
          p_employer_id: number
          p_month: string
        }
        Returns: undefined
      }
      check_user_access: {
        Args: {
          row_employer_id: number
        }
        Returns: boolean
      }
      set_employer_context: {
        Args: {
          employer_id: number
        }
        Returns: undefined
      }
      update_industry_average: {
        Args: {
          p_month: string
        }
        Returns: undefined
      }
    }
    Enums: {
      site_status: "working" | "paused" | "finished"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export interface HoursEntry {
  employer_hours: string;
  subcontractor_hours: string;
}

export interface MonthlyHours {
  [key: string]: {
    [siteId: number]: HoursEntry;
  };
}

export interface Site {
  site_id: number;
  site_name: string;
  project_type: string | null;
  city: string | null;
  state: string | null;
  supervisor_name: string | null;
  supervisor_telephone: string | null;
}
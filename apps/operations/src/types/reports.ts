// Report types for the safety reporting system

export interface IncidentMetrics {
  lti: number;
  mti: number;
  fai: number;
  totalIncidents: number;
  ltifr: number;
  trifr: number;
  mtifr: number;
  totalHours: number;
  employeeHours: number;
  subcontractorHours: number;
}

export interface IncidentBreakdownItem {
  type?: string;
  mechanism?: string;
  bodyPart?: string;
  state?: string;
  count: number;
  ltifr?: number;
}

export interface IncidentBreakdown {
  byType: { type: string; count: number }[];
  byMechanism: { mechanism: string; count: number }[];
  byBodyPart: { bodyPart: string; count: number }[];
  byState?: { state: string; count: number; ltifr: number }[];
}

export interface DataQuality {
  hasEstimatedHours: boolean;
  dataSources: string[];
  totalSites: number;
  sitesWithHours: number;
}

export interface ReportComparison {
  previousMonth?: {
    ltifr: number;
    trifr: number;
    ltiChange: number;
    trifrChange: number;
  };
  industryBenchmark?: {
    ltifr: number;
    trifr: number;
    performance: 'above' | 'at' | 'below';
  };
}

export interface GeneratedReport {
  executiveSummary: string;
  metrics: IncidentMetrics;
  incidentBreakdown: IncidentBreakdown;
  recommendations: string[];
  dataQuality: DataQuality;
  comparison: ReportComparison;
  generatedAt: string;
}

export type ReportType = 'site' | 'employer';

export interface ReportRequest {
  siteId?: number;
  employerId: number;
  month: string;
  reportType: ReportType;
}

// Industry benchmarks
export const INDUSTRY_BENCHMARKS = {
  ltifr: 4.0,
  trifr: 10.0,
  mtifr: 6.0,
};

// Australian states for jurisdictional reporting
export const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
] as const;


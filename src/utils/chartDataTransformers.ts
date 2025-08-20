import { format } from "date-fns";

export interface IncidentData {
  month: string;
  [key: string]: number | string;
}

export interface ChartDataResponse {
  data: IncidentData[];
  employerOrder: string[];
}

export const transformIncidentData = (
  incidents: any[] | null,
  employers: { employer_name: string }[] | null
): ChartDataResponse => {
  if (!employers || !incidents) return { data: [], employerOrder: [] };

  // Create a map of months with employer counts
  const monthlyData = incidents.reduce<Record<string, Record<string, number>>>((acc, incident) => {
    const month = format(new Date(incident.date_of_injury), 'MMM yyyy');
    const employerName = incident.employers?.employer_name || 'Unknown';
    
    if (!acc[month]) {
      acc[month] = {};
      // Initialize all employers with 0
      employers.forEach(emp => {
        acc[month][emp.employer_name] = 0;
      });
    }
    
    acc[month][employerName] = (acc[month][employerName] || 0) + 1;
    return acc;
  }, {});

  // Convert to array format and sort by month
  const monthlyArray = Object.entries(monthlyData)
    .map(([month, counts]): IncidentData => ({
      month,
      ...counts
    }))
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

  // Calculate total incidents per employer to determine stacking order
  const employerTotals = employers.reduce<Record<string, number>>((acc, employer) => {
    acc[employer.employer_name] = monthlyArray.reduce((sum, monthData) => {
      return sum + (monthData[employer.employer_name] as number || 0);
    }, 0);
    return acc;
  }, {});

  // Sort employers by total incidents (descending)
  const sortedEmployers = Object.entries(employerTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);

  return {
    data: monthlyArray,
    employerOrder: sortedEmployers
  };
};
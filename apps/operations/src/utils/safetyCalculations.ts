export const MIN_MONTHLY_HOURS = 500;
export const MAX_REASONABLE_LTI = 12;

export const validateSiteHours = (status: string, totalHours: number): string | null => {
  if (status === 'working' && totalHours < MIN_MONTHLY_HOURS) {
    return `Site is marked as working but has less than ${MIN_MONTHLY_HOURS} hours logged. Please update the site status or add more hours.`;
  }
  return null;
};

export const calculateLTIRate = (incidents: number, hours: number): number => {
  if (hours < MIN_MONTHLY_HOURS) return 0;
  const rate = (incidents / hours) * 1000000;
  return rate;
};
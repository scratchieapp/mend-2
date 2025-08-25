import { format, parseISO, isValid } from 'date-fns';

/**
 * Common date formatting utilities for the monorepo
 */

export function formatDate(date: Date | string, formatString: string = 'yyyy-MM-dd'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDisplayDate(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy');
}
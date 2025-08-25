import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function for conditionally joining classNames
 * This is a common utility used across the monorepo
 */
export default function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
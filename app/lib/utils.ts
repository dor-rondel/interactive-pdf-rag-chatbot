import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine and merge Tailwind CSS classes.
 * Uses clsx for conditional class handling and tailwind-merge to resolve conflicts.
 *
 * @param inputs - Variable number of class values (strings, objects, arrays)
 * @returns Merged and optimized class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

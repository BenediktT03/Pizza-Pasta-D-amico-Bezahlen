import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';

// Swiss timezone constant
export const SWISS_TIMEZONE = 'Europe/Zurich';

// Common European timezones
export const EUROPEAN_TIMEZONES = {
  'CH': 'Europe/Zurich',
  'DE': 'Europe/Berlin',
  'FR': 'Europe/Paris',
  'IT': 'Europe/Rome',
  'AT': 'Europe/Vienna',
  'ES': 'Europe/Madrid',
  'GB': 'Europe/London',
  'NL': 'Europe/Amsterdam',
  'BE': 'Europe/Brussels',
  'LU': 'Europe/Luxembourg'
};

/**
 * Convert a date to Swiss timezone
 * @param date The date to convert
 * @returns Date in Swiss timezone
 */
export function toSwissTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(dateObj, SWISS_TIMEZONE);
}

/**
 * Convert from Swiss timezone to UTC
 * @param date The date in Swiss timezone
 * @returns Date in UTC
 */
export function fromSwissTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(dateObj, SWISS_TIMEZONE);
}

/**
 * Format a date in a specific timezone
 * @param date The date to format
 * @param formatStr The format string
 * @param timezone The timezone
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string,
  formatStr: string,
  timezone: string = SWISS_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }
  
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Get the current time in Swiss timezone
 * @returns Current date/time in Swiss timezone
 */
export function getSwissTime(): Date {
  return utcToZonedTime(new Date(), SWISS_TIMEZONE);
}

/**
 * Get timezone offset for a date
 * @param date The date
 * @param timezone The timezone
 * @returns Offset in minutes
 */
export function getTimezoneOffset(
  date: Date | string = new Date(),
  timezone: string = SWISS_TIMEZONE
): number {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const utcDate = dateObj.getTime();
  const tzDate = utcToZonedTime(dateObj, timezone).getTime();
  
  return Math.round((tzDate - utcDate) / (1000 * 60));
}

/**
 * Check if daylight saving time is active
 * @param date The date to check
 * @param timezone The timezone
 * @returns Whether DST is active
 */
export function isDaylightSavingTime(
  date: Date | string = new Date(),
  timezone: string = SWISS_TIMEZONE
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Get offset for the date
  const dateOffset = getTimezoneOffset(dateObj, timezone);
  
  // Get offset for January (standard time)
  const january = new Date(dateObj.getFullYear(), 0, 1);
  const januaryOffset = getTimezoneOffset(january, timezone);
  
  // Get offset for July (DST time)
  const july = new Date(dateObj.getFullYear(), 6, 1);
  const julyOffset = getTimezoneOffset(july, timezone);
  
  // DST is active if current offset matches July offset and July != January
  return julyOffset !== januaryOffset && dateOffset === julyOffset;
}

/**
 * Convert between timezones
 * @param date The date to convert
 * @param fromTimezone The source timezone
 * @param toTimezone The target timezone
 * @returns Date in target timezone
 */
export function convertTimezone(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Convert to UTC first
  const utcDate = zonedTimeToUtc(dateObj, fromTimezone);
  
  // Then convert to target timezone
  return utcToZonedTime(utcDate, toTimezone);
}

/**
 * Get timezone abbreviation
 * @param date The date
 * @param timezone The timezone
 * @returns Timezone abbreviation (e.g., CET, CEST)
 */
export function getTimezoneAbbreviation(
  date: Date | string = new Date(),
  timezone: string = SWISS_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Format with timezone abbreviation
  const formatted = formatInTimeZone(dateObj, timezone, 'zzz');
  
  // Map common abbreviations
  const abbreviationMap: Record<string, string> = {
    'Central European Standard Time': 'CET',
    'Central European Summer Time': 'CEST',
    'Greenwich Mean Time': 'GMT',
    'British Summer Time': 'BST'
  };
  
  return abbreviationMap[formatted] || formatted;
}

/**
 * List dates when DST changes occur
 * @param year The year
 * @param timezone The timezone
 * @returns Object with DST start and end dates
 */
export function getDSTTransitions(
  year: number,
  timezone: string = SWISS_TIMEZONE
): {
  start: Date | null;
  end: Date | null;
} {
  // For Europe/Zurich and most European timezones:
  // DST starts: Last Sunday of March at 02:00
  // DST ends: Last Sunday of October at 03:00
  
  // Find last Sunday of March
  let dstStart = new Date(year, 2, 31); // March 31
  while (dstStart.getDay() !== 0) {
    dstStart.setDate(dstStart.getDate() - 1);
  }
  dstStart.setHours(2, 0, 0, 0);
  
  // Find last Sunday of October
  let dstEnd = new Date(year, 9, 31); // October 31
  while (dstEnd.getDay() !== 0) {
    dstEnd.setDate(dstEnd.getDate() - 1);
  }
  dstEnd.setHours(3, 0, 0, 0);
  
  return {
    start: dstStart,
    end: dstEnd
  };
}

/**
 * Check if two dates are in the same timezone offset
 * @param date1 First date
 * @param date2 Second date
 * @param timezone The timezone
 * @returns Whether both dates have the same offset
 */
export function haveSameTimezoneOffset(
  date1: Date | string,
  date2: Date | string,
  timezone: string = SWISS_TIMEZONE
): boolean {
  const offset1 = getTimezoneOffset(date1, timezone);
  const offset2 = getTimezoneOffset(date2, timezone);
  
  return offset1 === offset2;
}

/**
 * Get user's local timezone
 * @returns User's timezone string
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Fallback to Swiss timezone
    return SWISS_TIMEZONE;
  }
}

/**
 * Format date showing timezone info
 * @param date The date to format
 * @param timezone The timezone
 * @param showOffset Whether to show offset
 * @returns Formatted date with timezone info
 */
export function formatWithTimezone(
  date: Date | string,
  timezone: string = SWISS_TIMEZONE,
  showOffset: boolean = true
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  const formatted = formatInTimeZone(dateObj, timezone, 'dd.MM.yyyy HH:mm');
  const abbreviation = getTimezoneAbbreviation(dateObj, timezone);
  
  if (showOffset) {
    const offset = getTimezoneOffset(dateObj, timezone);
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    
    return `${formatted} ${abbreviation} (UTC${offsetString})`;
  }
  
  return `${formatted} ${abbreviation}`;
}

// Export all timezone utilities
export default {
  SWISS_TIMEZONE,
  EUROPEAN_TIMEZONES,
  toSwissTimezone,
  fromSwissTimezone,
  formatInTimezone,
  getSwissTime,
  getTimezoneOffset,
  isDaylightSavingTime,
  convertTimezone,
  getTimezoneAbbreviation,
  getDSTTransitions,
  haveSameTimezoneOffset,
  getUserTimezone,
  formatWithTimezone
};

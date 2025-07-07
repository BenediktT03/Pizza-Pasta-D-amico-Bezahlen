/**
 * EATECH - Time and Date Utility Functions
 * Version: 1.0.0
 * Description: Utility functions for time, date, and scheduling operations
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/timeUtils.ts
 */

import * as admin from 'firebase-admin';
import { 
  format, 
  parse,
  addMinutes, 
  addHours,
  addDays,
  subDays,
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isBefore,
  isAfter,
  isEqual,
  parseISO,
  formatDistanceToNow,
  isSameDay,
  getDay,
  getHours,
  getMinutes,
  setHours,
  setMinutes
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { utcToZonedTime, zonedTimeToUtc, format as formatTz } from 'date-fns-tz';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIMEZONE_SWITZERLAND = 'Europe/Zurich';
export const DEFAULT_LOCALE = de;

export const BUSINESS_HOURS = {
  default: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '23:00' },
    saturday: { open: '10:00', close: '23:00' },
    sunday: { open: '10:00', close: '21:00' }
  }
};

export const TIME_SLOTS = {
  duration: 15, // minutes
  bufferBefore: 5, // minutes
  bufferAfter: 5 // minutes
};

export const HOLIDAYS_SWITZERLAND_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-02', // Berchtold's Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-01', // Labour Day
  '2025-05-29', // Ascension Day
  '2025-06-09', // Whit Monday
  '2025-08-01', // Swiss National Day
  '2025-12-25', // Christmas Day
  '2025-12-26'  // Boxing Day
];

// ============================================================================
// DATE/TIME CONVERSION
// ============================================================================

/**
 * Converts a date to Swiss timezone
 */
export function toSwissTime(date: Date | admin.firestore.Timestamp): Date {
  const jsDate = date instanceof Date ? date : date.toDate();
  return utcToZonedTime(jsDate, TIMEZONE_SWITZERLAND);
}

/**
 * Converts Swiss time to UTC
 */
export function fromSwissTime(date: Date): Date {
  return zonedTimeToUtc(date, TIMEZONE_SWITZERLAND);
}

/**
 * Converts Firestore Timestamp to Date
 */
export function timestampToDate(timestamp: admin.firestore.Timestamp | Date): Date {
  return timestamp instanceof Date ? timestamp : timestamp.toDate();
}

/**
 * Converts Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

// ============================================================================
// DATE/TIME FORMATTING
// ============================================================================

/**
 * Formats date in Swiss format
 */
export function formatDate(date: Date | admin.firestore.Timestamp, formatStr: string = 'dd.MM.yyyy'): string {
  const jsDate = timestampToDate(date);
  return format(toSwissTime(jsDate), formatStr, { locale: DEFAULT_LOCALE });
}

/**
 * Formats time in Swiss format
 */
export function formatTime(date: Date | admin.firestore.Timestamp, formatStr: string = 'HH:mm'): string {
  const jsDate = timestampToDate(date);
  return format(toSwissTime(jsDate), formatStr, { locale: DEFAULT_LOCALE });
}

/**
 * Formats date and time
 */
export function formatDateTime(
  date: Date | admin.firestore.Timestamp, 
  formatStr: string = 'dd.MM.yyyy HH:mm'
): string {
  const jsDate = timestampToDate(date);
  return format(toSwissTime(jsDate), formatStr, { locale: DEFAULT_LOCALE });
}

/**
 * Formats relative time (e.g., "vor 5 Minuten")
 */
export function formatRelativeTime(date: Date | admin.firestore.Timestamp): string {
  const jsDate = timestampToDate(date);
  return formatDistanceToNow(jsDate, { 
    addSuffix: true, 
    locale: DEFAULT_LOCALE 
  });
}

/**
 * Formats duration in human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} Min.`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} Std.`;
  }
  
  return `${hours} Std. ${mins} Min.`;
}

// ============================================================================
// BUSINESS HOURS
// ============================================================================

/**
 * Checks if a given time is within business hours
 */
export function isWithinBusinessHours(
  date: Date, 
  businessHours: typeof BUSINESS_HOURS.default = BUSINESS_HOURS.default
): boolean {
  const swissDate = toSwissTime(date);
  const dayOfWeek = getDay(swissDate);
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
  
  const hours = businessHours[dayName as keyof typeof businessHours];
  if (!hours || !hours.open || !hours.close) return false;
  
  const currentTime = format(swissDate, 'HH:mm');
  return currentTime >= hours.open && currentTime <= hours.close;
}

/**
 * Gets next available business time
 */
export function getNextBusinessTime(
  date: Date,
  businessHours: typeof BUSINESS_HOURS.default = BUSINESS_HOURS.default
): Date {
  let checkDate = toSwissTime(date);
  
  // Check up to 7 days ahead
  for (let i = 0; i < 7; i++) {
    if (isWithinBusinessHours(checkDate, businessHours)) {
      return fromSwissTime(checkDate);
    }
    
    const dayOfWeek = getDay(checkDate);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const hours = businessHours[dayName as keyof typeof businessHours];
    
    if (hours && hours.open) {
      const [openHour, openMinute] = hours.open.split(':').map(Number);
      const openTime = setMinutes(setHours(checkDate, openHour), openMinute);
      
      if (isAfter(openTime, checkDate)) {
        return fromSwissTime(openTime);
      }
    }
    
    // Move to next day
    checkDate = startOfDay(addDays(checkDate, 1));
  }
  
  throw new Error('No business hours found in the next 7 days');
}

/**
 * Calculates business hours between two dates
 */
export function getBusinessHoursBetween(
  startDate: Date,
  endDate: Date,
  businessHours: typeof BUSINESS_HOURS.default = BUSINESS_HOURS.default
): number {
  let totalMinutes = 0;
  let currentDate = toSwissTime(startDate);
  const endSwissDate = toSwissTime(endDate);
  
  while (isBefore(currentDate, endSwissDate)) {
    if (isWithinBusinessHours(currentDate, businessHours)) {
      totalMinutes++;
    }
    currentDate = addMinutes(currentDate, 1);
  }
  
  return totalMinutes / 60; // Return hours
}

// ============================================================================
// TIME SLOTS
// ============================================================================

/**
 * Generates available time slots for a given date
 */
export function generateTimeSlots(
  date: Date,
  duration: number = TIME_SLOTS.duration,
  businessHours: typeof BUSINESS_HOURS.default = BUSINESS_HOURS.default
): Date[] {
  const slots: Date[] = [];
  const swissDate = toSwissTime(date);
  const dayOfWeek = getDay(swissDate);
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
  
  const hours = businessHours[dayName as keyof typeof businessHours];
  if (!hours || !hours.open || !hours.close) return slots;
  
  const [openHour, openMinute] = hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = hours.close.split(':').map(Number);
  
  let currentSlot = setMinutes(setHours(startOfDay(swissDate), openHour), openMinute);
  const closeTime = setMinutes(setHours(startOfDay(swissDate), closeHour), closeMinute);
  
  while (isBefore(currentSlot, closeTime)) {
    slots.push(fromSwissTime(currentSlot));
    currentSlot = addMinutes(currentSlot, duration);
  }
  
  return slots;
}

/**
 * Finds next available time slot
 */
export function findNextAvailableSlot(
  preferredTime: Date,
  bookedSlots: Date[],
  duration: number = TIME_SLOTS.duration,
  businessHours: typeof BUSINESS_HOURS.default = BUSINESS_HOURS.default
): Date | null {
  let checkDate = toSwissTime(preferredTime);
  const maxDate = addDays(checkDate, 30); // Check up to 30 days ahead
  
  while (isBefore(checkDate, maxDate)) {
    const slots = generateTimeSlots(checkDate, duration, businessHours);
    
    for (const slot of slots) {
      if (isAfter(slot, preferredTime) && !isSlotBooked(slot, bookedSlots, duration)) {
        return slot;
      }
    }
    
    checkDate = startOfDay(addDays(checkDate, 1));
  }
  
  return null;
}

/**
 * Checks if a time slot is booked
 */
function isSlotBooked(slot: Date, bookedSlots: Date[], duration: number): boolean {
  const slotEnd = addMinutes(slot, duration);
  
  return bookedSlots.some(booked => {
    const bookedEnd = addMinutes(booked, duration);
    return (
      (isAfter(slot, booked) && isBefore(slot, bookedEnd)) ||
      (isAfter(slotEnd, booked) && isBefore(slotEnd, bookedEnd)) ||
      isEqual(slot, booked)
    );
  });
}

// ============================================================================
// DATE RANGES
// ============================================================================

/**
 * Gets date range for common periods
 */
export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const swissNow = toSwissTime(now);
  
  switch (period) {
    case 'today':
      return {
        start: fromSwissTime(startOfDay(swissNow)),
        end: fromSwissTime(endOfDay(swissNow))
      };
    
    case 'yesterday':
      const yesterday = subDays(swissNow, 1);
      return {
        start: fromSwissTime(startOfDay(yesterday)),
        end: fromSwissTime(endOfDay(yesterday))
      };
    
    case 'thisWeek':
      return {
        start: fromSwissTime(startOfWeek(swissNow, { weekStartsOn: 1 })), // Monday
        end: fromSwissTime(endOfWeek(swissNow, { weekStartsOn: 1 }))
      };
    
    case 'lastWeek':
      const lastWeek = subDays(swissNow, 7);
      return {
        start: fromSwissTime(startOfWeek(lastWeek, { weekStartsOn: 1 })),
        end: fromSwissTime(endOfWeek(lastWeek, { weekStartsOn: 1 }))
      };
    
    case 'thisMonth':
      return {
        start: fromSwissTime(startOfMonth(swissNow)),
        end: fromSwissTime(endOfMonth(swissNow))
      };
    
    case 'lastMonth':
      const lastMonth = subDays(startOfMonth(swissNow), 1);
      return {
        start: fromSwissTime(startOfMonth(lastMonth)),
        end: fromSwissTime(endOfMonth(lastMonth))
      };
    
    case 'last7Days':
      return {
        start: fromSwissTime(startOfDay(subDays(swissNow, 6))),
        end: fromSwissTime(endOfDay(swissNow))
      };
    
    case 'last30Days':
      return {
        start: fromSwissTime(startOfDay(subDays(swissNow, 29))),
        end: fromSwissTime(endOfDay(swissNow))
      };
    
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/**
 * Generates array of dates between start and end
 */
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

// ============================================================================
// HOLIDAYS
// ============================================================================

/**
 * Checks if a date is a holiday
 */
export function isHoliday(date: Date, holidays: string[] = HOLIDAYS_SWITZERLAND_2025): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.includes(dateStr);
}

/**
 * Gets next business day (excluding weekends and holidays)
 */
export function getNextBusinessDay(
  date: Date, 
  holidays: string[] = HOLIDAYS_SWITZERLAND_2025
): Date {
  let nextDay = addDays(date, 1);
  
  while (isWeekend(nextDay) || isHoliday(nextDay, holidays)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
}

/**
 * Checks if date is weekend
 */
export function isWeekend(date: Date): boolean {
  const day = getDay(date);
  return day === 0 || day === 6; // Sunday or Saturday
}

// ============================================================================
// SCHEDULING HELPERS
// ============================================================================

/**
 * Calculates delivery time based on preparation time and current load
 */
export function calculateDeliveryTime(
  orderTime: Date,
  preparationMinutes: number,
  deliveryMinutes: number,
  currentLoad: number = 1
): Date {
  const adjustedPrepTime = Math.ceil(preparationMinutes * currentLoad);
  const totalMinutes = adjustedPrepTime + deliveryMinutes;
  
  return addMinutes(orderTime, totalMinutes);
}

/**
 * Gets time until next occurrence of a specific time
 */
export function getTimeUntilNext(targetHour: number, targetMinute: number = 0): number {
  const now = new Date();
  const swissNow = toSwissTime(now);
  let target = setMinutes(setHours(swissNow, targetHour), targetMinute);
  
  if (isBefore(target, swissNow)) {
    target = addDays(target, 1);
  }
  
  return differenceInMinutes(target, swissNow);
}

/**
 * Parses time string (HH:mm) to hours and minutes
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Creates cron expression for scheduled jobs
 */
export function createCronExpression(
  schedule: {
    minute?: number;
    hour?: number;
    dayOfMonth?: number;
    month?: number;
    dayOfWeek?: number;
  }
): string {
  const {
    minute = '*',
    hour = '*',
    dayOfMonth = '*',
    month = '*',
    dayOfWeek = '*'
  } = schedule;
  
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Groups dates by period for analytics
 */
export function groupDatesByPeriod(
  dates: Date[],
  period: 'hour' | 'day' | 'week' | 'month'
): Map<string, Date[]> {
  const groups = new Map<string, Date[]>();
  
  dates.forEach(date => {
    let key: string;
    
    switch (period) {
      case 'hour':
        key = format(date, 'yyyy-MM-dd HH:00');
        break;
      case 'day':
        key = format(date, 'yyyy-MM-dd');
        break;
      case 'week':
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        key = format(date, 'yyyy-MM');
        break;
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(date);
  });
  
  return groups;
}

/**
 * Gets peak hours from order times
 */
export function getPeakHours(orderTimes: Date[]): { hour: number; count: number }[] {
  const hourCounts = new Map<number, number>();
  
  orderTimes.forEach(time => {
    const hour = getHours(toSwissTime(time));
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  
  return Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Conversion
  toSwissTime,
  fromSwissTime,
  timestampToDate,
  dateToTimestamp,
  
  // Formatting
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  
  // Business Hours
  isWithinBusinessHours,
  getNextBusinessTime,
  getBusinessHoursBetween,
  
  // Time Slots
  generateTimeSlots,
  findNextAvailableSlot,
  
  // Date Ranges
  getDateRange,
  getDatesInRange,
  
  // Holidays
  isHoliday,
  getNextBusinessDay,
  isWeekend,
  
  // Scheduling
  calculateDeliveryTime,
  getTimeUntilNext,
  parseTimeString,
  createCronExpression,
  
  // Analytics
  groupDatesByPeriod,
  getPeakHours,
  
  // Constants
  TIMEZONE_SWITZERLAND,
  BUSINESS_HOURS,
  TIME_SLOTS,
  HOLIDAYS_SWITZERLAND_2025
};
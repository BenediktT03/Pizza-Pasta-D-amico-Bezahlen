import { 
  parse, 
  format, 
  isWithinInterval, 
  setHours, 
  setMinutes, 
  addDays,
  differenceInMinutes,
  isSameDay,
  startOfDay,
  endOfDay
} from 'date-fns';

export interface TimeSlot {
  open: string;  // HH:mm format
  close: string; // HH:mm format
}

export interface BusinessHours {
  monday: TimeSlot | 'closed';
  tuesday: TimeSlot | 'closed';
  wednesday: TimeSlot | 'closed';
  thursday: TimeSlot | 'closed';
  friday: TimeSlot | 'closed';
  saturday: TimeSlot | 'closed';
  sunday: TimeSlot | 'closed';
}

export interface SpecialHours {
  date: Date;
  hours: TimeSlot | 'closed';
  reason?: string;
}

// Days of week mapping
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

/**
 * Check if business is open at a specific time
 * @param businessHours The regular business hours
 * @param checkTime The time to check
 * @param specialHours Optional special hours (holidays, etc.)
 * @returns Whether the business is open
 */
export function isOpen(
  businessHours: BusinessHours,
  checkTime: Date = new Date(),
  specialHours?: SpecialHours[]
): boolean {
  // Check special hours first
  if (specialHours) {
    const specialDay = specialHours.find(sh => 
      isSameDay(sh.date, checkTime)
    );
    
    if (specialDay) {
      if (specialDay.hours === 'closed') return false;
      return isTimeWithinSlot(checkTime, specialDay.hours);
    }
  }
  
  // Get regular hours for the day
  const dayName = DAYS_OF_WEEK[checkTime.getDay()] as DayOfWeek;
  const dayHours = businessHours[dayName];
  
  if (dayHours === 'closed') return false;
  
  return isTimeWithinSlot(checkTime, dayHours);
}

/**
 * Check if a time is within a time slot
 * @param time The time to check
 * @param slot The time slot
 * @returns Whether the time is within the slot
 */
function isTimeWithinSlot(time: Date, slot: TimeSlot): boolean {
  const [openHour, openMinute] = slot.open.split(':').map(Number);
  const [closeHour, closeMinute] = slot.close.split(':').map(Number);
  
  const openTime = setMinutes(setHours(time, openHour), openMinute);
  let closeTime = setMinutes(setHours(time, closeHour), closeMinute);
  
  // Handle overnight hours (e.g., 20:00 - 02:00)
  if (closeTime <= openTime) {
    closeTime = addDays(closeTime, 1);
  }
  
  return isWithinInterval(time, { start: openTime, end: closeTime });
}

/**
 * Get next opening time
 * @param businessHours The business hours
 * @param fromTime Starting time
 * @param specialHours Optional special hours
 * @returns Next opening time or null if always closed
 */
export function getNextOpenTime(
  businessHours: BusinessHours,
  fromTime: Date = new Date(),
  specialHours?: SpecialHours[]
): Date | null {
  let checkDate = new Date(fromTime);
  
  // Check up to 14 days ahead
  for (let i = 0; i < 14; i++) {
    const dayName = DAYS_OF_WEEK[checkDate.getDay()] as DayOfWeek;
    
    // Check special hours
    if (specialHours) {
      const specialDay = specialHours.find(sh => 
        isSameDay(sh.date, checkDate)
      );
      
      if (specialDay && specialDay.hours !== 'closed') {
        const [openHour, openMinute] = specialDay.hours.open.split(':').map(Number);
        const openTime = setMinutes(setHours(checkDate, openHour), openMinute);
        
        if (openTime > fromTime) {
          return openTime;
        }
      }
    }
    
    // Check regular hours
    const dayHours = businessHours[dayName];
    if (dayHours !== 'closed') {
      const [openHour, openMinute] = dayHours.open.split(':').map(Number);
      const openTime = setMinutes(setHours(checkDate, openHour), openMinute);
      
      if (openTime > fromTime) {
        return openTime;
      }
    }
    
    // Move to next day
    checkDate = startOfDay(addDays(checkDate, 1));
  }
  
  return null;
}

/**
 * Get closing time for a specific date
 * @param businessHours The business hours
 * @param date The date to check
 * @param specialHours Optional special hours
 * @returns Closing time or null if closed
 */
export function getClosingTime(
  businessHours: BusinessHours,
  date: Date = new Date(),
  specialHours?: SpecialHours[]
): Date | null {
  // Check special hours first
  if (specialHours) {
    const specialDay = specialHours.find(sh => 
      isSameDay(sh.date, date)
    );
    
    if (specialDay) {
      if (specialDay.hours === 'closed') return null;
      
      const [closeHour, closeMinute] = specialDay.hours.close.split(':').map(Number);
      return setMinutes(setHours(date, closeHour), closeMinute);
    }
  }
  
  // Check regular hours
  const dayName = DAYS_OF_WEEK[date.getDay()] as DayOfWeek;
  const dayHours = businessHours[dayName];
  
  if (dayHours === 'closed') return null;
  
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
  let closeTime = setMinutes(setHours(date, closeHour), closeMinute);
  
  // Handle overnight hours
  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const openTime = setMinutes(setHours(date, openHour), openMinute);
  
  if (closeTime <= openTime) {
    closeTime = addDays(closeTime, 1);
  }
  
  return closeTime;
}

/**
 * Calculate total open hours per week
 * @param businessHours The business hours
 * @returns Total hours open per week
 */
export function calculateWeeklyHours(businessHours: BusinessHours): number {
  let totalMinutes = 0;
  
  for (const day of DAYS_OF_WEEK) {
    const hours = businessHours[day];
    if (hours !== 'closed') {
      const [openHour, openMinute] = hours.open.split(':').map(Number);
      const [closeHour, closeMinute] = hours.close.split(':').map(Number);
      
      const openMinutes = openHour * 60 + openMinute;
      let closeMinutes = closeHour * 60 + closeMinute;
      
      // Handle overnight hours
      if (closeMinutes <= openMinutes) {
        closeMinutes += 24 * 60;
      }
      
      totalMinutes += closeMinutes - openMinutes;
    }
  }
  
  return totalMinutes / 60;
}

/**
 * Format business hours for display
 * @param hours The business hours
 * @param locale The locale for day names
 * @returns Formatted business hours
 */
export function formatBusinessHours(
  hours: BusinessHours,
  locale: string = 'de-CH'
): Array<{ day: string; hours: string }> {
  const formatted = [];
  
  const dayNames = {
    'de-CH': ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    'fr-CH': ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    'it-CH': ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
    'en': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  
  const localDayNames = dayNames[locale as keyof typeof dayNames] || dayNames['de-CH'];
  
  for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
    const day = DAYS_OF_WEEK[i];
    const dayHours = hours[day];
    
    formatted.push({
      day: localDayNames[i],
      hours: dayHours === 'closed' ? 'Geschlossen' : `${dayHours.open} - ${dayHours.close}`
    });
  }
  
  // Reorder to start with Monday
  const sunday = formatted.shift();
  if (sunday) formatted.push(sunday);
  
  return formatted;
}

/**
 * Group consecutive days with same hours
 * @param hours The business hours
 * @returns Grouped hours
 */
export function groupBusinessHours(
  hours: BusinessHours
): Array<{ days: string[]; hours: string }> {
  const grouped: Array<{ days: DayOfWeek[]; hours: string }> = [];
  
  // Start with Monday
  const orderedDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of orderedDays) {
    const dayHours = hours[day];
    const hoursString = dayHours === 'closed' ? 'closed' : `${dayHours.open}-${dayHours.close}`;
    
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.hours === hoursString) {
      lastGroup.days.push(day);
    } else {
      grouped.push({ days: [day], hours: hoursString });
    }
  }
  
  // Format for display
  return grouped.map(group => ({
    days: group.days.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
    hours: group.hours === 'closed' ? 'Closed' : group.hours.replace('-', ' - ')
  }));
}

/**
 * Validate business hours
 * @param hours The business hours to validate
 * @returns Object with validation result and errors
 */
export function validateBusinessHours(
  hours: BusinessHours
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [day, dayHours] of Object.entries(hours)) {
    if (dayHours === 'closed') continue;
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(dayHours.open)) {
      errors.push(`Invalid opening time for ${day}: ${dayHours.open}`);
    }
    
    if (!timeRegex.test(dayHours.close)) {
      errors.push(`Invalid closing time for ${day}: ${dayHours.close}`);
    }
    
    // Validate that close time is after open time (considering overnight hours)
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
    
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    
    if (openMinutes === closeMinutes) {
      errors.push(`Opening and closing times are the same for ${day}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate if delivery is possible at a given time
 * @param orderTime The time of order
 * @param businessHours The business hours
 * @param preparationTime Preparation time in minutes
 * @param deliveryTime Delivery time in minutes
 * @returns Whether delivery is possible
 */
export function canDeliverAt(
  orderTime: Date,
  businessHours: BusinessHours,
  preparationTime: number = 30,
  deliveryTime: number = 30
): boolean {
  const totalTime = preparationTime + deliveryTime;
  const deliveryTime = new Date(orderTime.getTime() + totalTime * 60 * 1000);
  
  return isOpen(businessHours, deliveryTime);
}

/**
 * Get available time slots for scheduling
 * @param date The date to get slots for
 * @param businessHours The business hours
 * @param slotDuration Duration of each slot in minutes
 * @param bufferTime Buffer time between slots in minutes
 * @returns Array of available time slots
 */
export function getAvailableTimeSlots(
  date: Date,
  businessHours: BusinessHours,
  slotDuration: number = 30,
  bufferTime: number = 0
): Date[] {
  const slots: Date[] = [];
  const dayName = DAYS_OF_WEEK[date.getDay()] as DayOfWeek;
  const dayHours = businessHours[dayName];
  
  if (dayHours === 'closed') return slots;
  
  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
  
  let currentSlot = setMinutes(setHours(date, openHour), openMinute);
  const closeTime = setMinutes(setHours(date, closeHour), closeMinute);
  
  // Handle overnight hours
  const adjustedCloseTime = closeTime <= currentSlot ? addDays(closeTime, 1) : closeTime;
  
  while (currentSlot < adjustedCloseTime) {
    slots.push(new Date(currentSlot));
    currentSlot = new Date(currentSlot.getTime() + (slotDuration + bufferTime) * 60 * 1000);
  }
  
  return slots;
}

// Export all business hours utilities
export default {
  isOpen,
  getNextOpenTime,
  getClosingTime,
  calculateWeeklyHours,
  formatBusinessHours,
  groupBusinessHours,
  validateBusinessHours,
  canDeliverAt,
  getAvailableTimeSlots
};

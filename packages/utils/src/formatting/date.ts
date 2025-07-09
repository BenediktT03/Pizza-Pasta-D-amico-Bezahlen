import { format, parse, isValid, parseISO } from 'date-fns';
import { de, fr, it, enUS } from 'date-fns/locale';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

// Locale mapping
const localeMap = {
  de: de,
  fr: fr,
  it: it,
  en: enUS
};

// Swiss timezone
const SWISS_TIMEZONE = 'Europe/Zurich';

/**
 * Format a date according to Swiss conventions
 * @param date The date to format
 * @param formatStr The format string
 * @param locale The locale code (de, fr, it, en)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'dd.MM.yyyy',
  locale: keyof typeof localeMap = 'de'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }
  
  return format(dateObj, formatStr, {
    locale: localeMap[locale] || localeMap.de
  });
}

/**
 * Format a date in Swiss timezone
 * @param date The date to format
 * @param formatStr The format string
 * @param locale The locale code
 * @returns Formatted date string in Swiss timezone
 */
export function formatDateInSwissTime(
  date: Date | string,
  formatStr: string = 'dd.MM.yyyy HH:mm',
  locale: keyof typeof localeMap = 'de'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }
  
  return formatInTimeZone(
    dateObj,
    SWISS_TIMEZONE,
    formatStr,
    { locale: localeMap[locale] || localeMap.de }
  );
}

/**
 * Format time in 24-hour format
 * @param date The date/time to format
 * @returns Formatted time string (HH:mm)
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

/**
 * Format date and time
 * @param date The date to format
 * @param locale The locale code
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string,
  locale: keyof typeof localeMap = 'de'
): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm', locale);
}

/**
 * Format date in short format
 * @param date The date to format
 * @param locale The locale code
 * @returns Short formatted date
 */
export function formatDateShort(
  date: Date | string,
  locale: keyof typeof localeMap = 'de'
): string {
  return formatDate(date, 'dd.MM.yy', locale);
}

/**
 * Format date in long format with day name
 * @param date The date to format
 * @param locale The locale code
 * @returns Long formatted date with day name
 */
export function formatDateLong(
  date: Date | string,
  locale: keyof typeof localeMap = 'de'
): string {
  return formatDate(date, 'EEEE, dd. MMMM yyyy', locale);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date The date to format
 * @param locale The locale code
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  locale: keyof typeof localeMap = 'de'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  const translations = {
    de: {
      justNow: 'gerade eben',
      secondsAgo: (n: number) => `vor ${n} Sekunde${n === 1 ? '' : 'n'}`,
      minutesAgo: (n: number) => `vor ${n} Minute${n === 1 ? '' : 'n'}`,
      hoursAgo: (n: number) => `vor ${n} Stunde${n === 1 ? '' : 'n'}`,
      daysAgo: (n: number) => `vor ${n} Tag${n === 1 ? '' : 'en'}`,
      weeksAgo: (n: number) => `vor ${n} Woche${n === 1 ? '' : 'n'}`,
      monthsAgo: (n: number) => `vor ${n} Monat${n === 1 ? '' : 'en'}`,
      yearsAgo: (n: number) => `vor ${n} Jahr${n === 1 ? '' : 'en'}`
    },
    fr: {
      justNow: 'à l\'instant',
      secondsAgo: (n: number) => `il y a ${n} seconde${n > 1 ? 's' : ''}`,
      minutesAgo: (n: number) => `il y a ${n} minute${n > 1 ? 's' : ''}`,
      hoursAgo: (n: number) => `il y a ${n} heure${n > 1 ? 's' : ''}`,
      daysAgo: (n: number) => `il y a ${n} jour${n > 1 ? 's' : ''}`,
      weeksAgo: (n: number) => `il y a ${n} semaine${n > 1 ? 's' : ''}`,
      monthsAgo: (n: number) => `il y a ${n} mois`,
      yearsAgo: (n: number) => `il y a ${n} an${n > 1 ? 's' : ''}`
    },
    it: {
      justNow: 'proprio ora',
      secondsAgo: (n: number) => `${n} second${n === 1 ? 'o' : 'i'} fa`,
      minutesAgo: (n: number) => `${n} minut${n === 1 ? 'o' : 'i'} fa`,
      hoursAgo: (n: number) => `${n} or${n === 1 ? 'a' : 'e'} fa`,
      daysAgo: (n: number) => `${n} giorn${n === 1 ? 'o' : 'i'} fa`,
      weeksAgo: (n: number) => `${n} settiman${n === 1 ? 'a' : 'e'} fa`,
      monthsAgo: (n: number) => `${n} mes${n === 1 ? 'e' : 'i'} fa`,
      yearsAgo: (n: number) => `${n} ann${n === 1 ? 'o' : 'i'} fa`
    },
    en: {
      justNow: 'just now',
      secondsAgo: (n: number) => `${n} second${n === 1 ? '' : 's'} ago`,
      minutesAgo: (n: number) => `${n} minute${n === 1 ? '' : 's'} ago`,
      hoursAgo: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
      daysAgo: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
      weeksAgo: (n: number) => `${n} week${n === 1 ? '' : 's'} ago`,
      monthsAgo: (n: number) => `${n} month${n === 1 ? '' : 's'} ago`,
      yearsAgo: (n: number) => `${n} year${n === 1 ? '' : 's'} ago`
    }
  };
  
  const t = translations[locale] || translations.de;
  
  if (diffInSeconds < 10) {
    return t.justNow;
  } else if (diffInSeconds < 60) {
    return t.secondsAgo(diffInSeconds);
  } else if (diffInMinutes < 60) {
    return t.minutesAgo(diffInMinutes);
  } else if (diffInHours < 24) {
    return t.hoursAgo(diffInHours);
  } else if (diffInDays < 7) {
    return t.daysAgo(diffInDays);
  } else if (diffInDays < 30) {
    return t.weeksAgo(Math.floor(diffInDays / 7));
  } else if (diffInDays < 365) {
    return t.monthsAgo(Math.floor(diffInDays / 30));
  } else {
    return t.yearsAgo(Math.floor(diffInDays / 365));
  }
}

/**
 * Parse a date string in Swiss format
 * @param dateStr The date string to parse (dd.MM.yyyy)
 * @param formatStr The format of the input string
 * @returns Parsed Date object
 */
export function parseSwissDate(
  dateStr: string,
  formatStr: string = 'dd.MM.yyyy'
): Date | null {
  try {
    const parsed = parse(dateStr, formatStr, new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Convert UTC date to Swiss timezone
 * @param date The UTC date
 * @returns Date in Swiss timezone
 */
export function toSwissTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(dateObj, SWISS_TIMEZONE);
}

/**
 * Convert Swiss timezone date to UTC
 * @param date The date in Swiss timezone
 * @returns Date in UTC
 */
export function fromSwissTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(dateObj, SWISS_TIMEZONE);
}

/**
 * Get Swiss holidays for a given year
 * @param year The year
 * @returns Array of holiday dates with names
 */
export function getSwissHolidays(year: number): Array<{ date: Date; name: string; type: 'national' | 'regional' }> {
  const holidays = [
    { date: new Date(year, 0, 1), name: 'Neujahr', type: 'national' as const },
    { date: new Date(year, 0, 2), name: 'Berchtoldstag', type: 'regional' as const },
    { date: new Date(year, 4, 1), name: 'Tag der Arbeit', type: 'regional' as const },
    { date: new Date(year, 7, 1), name: 'Nationalfeiertag', type: 'national' as const },
    { date: new Date(year, 11, 25), name: 'Weihnachten', type: 'national' as const },
    { date: new Date(year, 11, 26), name: 'Stephanstag', type: 'national' as const }
  ];
  
  // Calculate Easter-based holidays
  const easter = calculateEaster(year);
  holidays.push(
    { date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), name: 'Karfreitag', type: 'national' as const },
    { date: new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000), name: 'Ostermontag', type: 'national' as const },
    { date: new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000), name: 'Auffahrt', type: 'national' as const },
    { date: new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000), name: 'Pfingstmontag', type: 'national' as const }
  );
  
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate Easter date for a given year
 * @param year The year
 * @returns Easter date
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Check if a date is a Swiss holiday
 * @param date The date to check
 * @returns Holiday information or null
 */
export function isSwissHoliday(date: Date): { name: string; type: 'national' | 'regional' } | null {
  const holidays = getSwissHolidays(date.getFullYear());
  const dateStr = formatDate(date, 'yyyy-MM-dd');
  
  const holiday = holidays.find(h => formatDate(h.date, 'yyyy-MM-dd') === dateStr);
  return holiday ? { name: holiday.name, type: holiday.type } : null;
}

// Export all date utilities
export default {
  formatDate,
  formatDateInSwissTime,
  formatTime,
  formatDateTime,
  formatDateShort,
  formatDateLong,
  formatRelativeTime,
  parseSwissDate,
  toSwissTime,
  fromSwissTime,
  getSwissHolidays,
  isSwissHoliday
};

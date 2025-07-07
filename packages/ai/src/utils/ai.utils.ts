/**
 * AI Utilities
 *
 * Gemeinsame Hilfsfunktionen für EATECH V3.0 AI Package
 * Schweizer Standards, Formatierung und ML-Utilities
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { Coordinates, NotificationChannel } from '../types/ai.types';

// ================================
// SWISS LOCALE UTILITIES
// ================================

/**
 * Formatiert Währung in Schweizer Franken
 */
export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formatiert Zeit im Schweizer Format
 */
export function formatSwissTime(date: Date): string {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich'
  }).format(date);
}

/**
 * Formatiert Datum im Schweizer Format
 */
export function formatSwissDate(date: Date): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich'
  }).format(date);
}

/**
 * Formatiert Datum und Zeit im Schweizer Format
 */
export function formatSwissDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich'
  }).format(date);
}

/**
 * Gibt aktuelle Schweizer Zeit zurück
 */
export function getCurrentSwissTime(): Date {
  return new Date();
}

/**
 * Konvertiert UTC zu Schweizer Zeit
 */
export function utcToSwissTime(utcDate: Date): Date {
  const swissTime = new Date(utcDate.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
  return swissTime;
}

/**
 * Fügt Tage zu einem Datum hinzu
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formatiert Dauer in Minuten zu lesbarem Format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

// ================================
// SWISS LANGUAGE UTILITIES
// ================================

/**
 * Normalisiert Schweizerdeutsche Ausdrücke zu Standarddeutsch
 */
export function normalizeSwissGerman(text: string): string {
  const swissToGerman: Record<string, string> = {
    // Grüße
    'grüezi': 'hallo',
    'grüessech': 'hallo',
    'hoi': 'hallo',
    'sali': 'hallo',
    'ade': 'auf wiedersehen',
    'tschüss': 'tschüß',

    // Höflichkeitsformen
    'merci': 'danke',
    'merci vilmal': 'vielen dank',
    'bitte gern': 'bitte schön',
    'gern gscheh': 'gern geschehen',

    // Können/Möchten
    'chönd': 'können',
    'chönti': 'könnte',
    'möchti': 'möchte',
    'möchted': 'möchten',
    'hätti': 'hätte',
    'wärded': 'würden',

    // Haben
    'händ': 'haben',
    'hän': 'haben',
    'häsch': 'hast',
    'hät': 'hat',

    // Sein
    'bin': 'bin',
    'bisch': 'bist',
    'isch': 'ist',
    'sind': 'sind',
    'sid': 'seid',

    // Fragewörter
    'was': 'was',
    'wie': 'wie',
    'wo': 'wo',
    'wär': 'wer',
    'wänn': 'wann',
    'warum': 'warum',

    // Essen & Trinken
    'ässe': 'essen',
    'trinke': 'trinken',
    'schmöcke': 'schmecken',
    'hunger': 'hunger',
    'durscht': 'durst',

    // Mengen
    'chli': 'wenig',
    'viel': 'viel',
    'meh': 'mehr',
    'gnueg': 'genug',

    // Richtungen
    'da': 'dort',
    'döt': 'dort',
    'deet': 'dorthin',
    'cho': 'kommen',
    'gah': 'gehen',

    // Bestellen
    'bestelle': 'bestellen',
    'näh': 'nehmen',
    'wähl': 'wählen',
    'luege': 'schauen',

    // Bezahlen
    'zahle': 'zahlen',
    'koschte': 'kosten',
    'priis': 'preis',
    'tüür': 'teuer',
    'billig': 'günstig',

    // Zeit
    'jetzt': 'jetzt',
    'hüt': 'heute',
    'morn': 'morgen',
    'geschter': 'gestern',
    'spöter': 'später',

    // Lebensmittel (Schweizerdeutsch)
    'rüebli': 'karotten',
    'härdöpfel': 'kartoffeln',
    'chäs': 'käse',
    'wienerli': 'würstchen',
    'fleisch': 'fleisch',
    'gmües': 'gemüse',
    'frücht': 'früchte',
    'brot': 'brot',
    'weggli': 'brötchen',
    'guetzli': 'kekse',
    'schokolade': 'schokolade',

    // Getränke
    'kaffi': 'kaffee',
    'tee': 'tee',
    'bier': 'bier',
    'wii': 'wein',
    'wasser': 'wasser',
    'süürmost': 'apfelwein',

    // Foodtruck spezifisch
    'foodtruck': 'foodtruck',
    'imbiss': 'imbiss',
    'schnellimbiss': 'schnellimbiss',
    'takeaway': 'zum mitnehmen',
    'abholen': 'abholen',
    'liefere': 'liefern'
  };

  let normalized = text.toLowerCase();

  // Ersetze Schweizerdeutsche Ausdrücke
  for (const [swiss, german] of Object.entries(swissToGerman)) {
    const regex = new RegExp(`\\b${swiss}\\b`, 'gi');
    normalized = normalized.replace(regex, german);
  }

  return normalized;
}

/**
 * Erkennt Schweizer Dialekt
 */
export function detectSwissDialect(text: string): { dialect: string; confidence: number } {
  const dialectPatterns = {
    zurich: [
      /grüezi/i, /händ/, /chönd/, /isch/, /wärded/,
      /zäme/, /dänn/, /döt/, /hüt/, /morn/
    ],
    bern: [
      /grüessech/i, /sali/, /gumper/, /büez/, /chrampfe/,
      /dä/, /die/, /das/, /wou/, /wänn/
    ],
    basel: [
      /sali/, /bye/, /wämmer/, /gönd/, /chömed/,
      /dört/, /hie/, /wyt/, /nöch/, /schnäll/
    ],
    geneva: [
      /bonjour/, /salut/, /comment/, /ça va/,
      /merci/, /de rien/, /excusez/, /pardon/
    ]
  };

  let bestMatch = { dialect: 'standard', confidence: 0 };

  for (const [dialect, patterns] of Object.entries(dialectPatterns)) {
    let matches = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    const confidence = matches / patterns.length;
    if (confidence > bestMatch.confidence) {
      bestMatch = { dialect, confidence };
    }
  }

  return bestMatch;
}

/**
 * Extrahiert Schweizer Zahlenwörter
 */
export function extractSwissNumbers(text: string): { word: string; value: number; start: number; end: number }[] {
  const swissNumbers: Record<string, number> = {
    'eis': 1, 'eins': 1, 'ein': 1, 'eine': 1,
    'zwei': 2, 'zwo': 2, 'zwöi': 2,
    'drei': 3, 'drü': 3,
    'vier': 4, 'vieri': 4,
    'fünf': 5, 'föif': 5, 'füf': 5,
    'sechs': 6, 'sächs': 6,
    'sieben': 7, 'sibä': 7,
    'acht': 8,
    'neun': 9, 'nün': 9,
    'zehn': 10, 'zäh': 10,
    'elf': 11, 'ölf': 11,
    'zwölf': 12, 'zwöuf': 12,
    'drüzäh': 13, 'dreizehn': 13,
    'vierzäh': 14, 'vierzehn': 14,
    'föifzäh': 15, 'fünfzehn': 15,
    'sächzäh': 16, 'sechzehn': 16,
    'sibzäh': 17, 'siebzehn': 17,
    'achzäh': 18, 'achtzehn': 18,
    'nünzäh': 19, 'neunzehn': 19,
    'zwänzg': 20, 'zwanzig': 20
  };

  const numbers: { word: string; value: number; start: number; end: number }[] = [];

  for (const [word, value] of Object.entries(swissNumbers)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      numbers.push({
        word: match[0],
        value,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return numbers.sort((a, b) => a.start - b.start);
}

/**
 * Parsed Schweizer Mengenangaben
 */
export function parseSwissQuantities(text: string): { quantity: number; unit: string; confidence: number }[] {
  const quantities: { quantity: number; unit: string; confidence: number }[] = [];

  // Numerische Mengen
  const numberRegex = /(\d+)\s*(stück|stück|stk|x|mal|portion|portione|teil|teili)?/gi;
  let match;

  while ((match = numberRegex.exec(text)) !== null) {
    quantities.push({
      quantity: parseInt(match[1]),
      unit: match[2] || 'piece',
      confidence: 0.9
    });
  }

  // Wort-basierte Mengen
  const wordNumbers = extractSwissNumbers(text);
  for (const wordNum of wordNumbers) {
    quantities.push({
      quantity: wordNum.value,
      unit: 'piece',
      confidence: 0.8
    });
  }

  return quantities;
}

/**
 * Gibt höfliche Schweizer Form zurück
 */
export function getSwissPoliteForm(text: string, formal: boolean = true): string {
  if (formal) {
    return text
      .replace(/du/gi, 'Sie')
      .replace(/dich/gi, 'Sie')
      .replace(/dir/gi, 'Ihnen')
      .replace(/dein/gi, 'Ihr')
      .replace(/kannst/gi, 'können Sie')
      .replace(/willst/gi, 'möchten Sie')
      .replace(/hast/gi, 'haben Sie');
  }

  return text; // Informal bleibt unverändert
}

// ================================
// SWISS HOLIDAYS UTILITIES
// ================================

/**
 * Gibt Schweizer Feiertage für ein Jahr zurück
 */
export function getSwissHolidays(year: number): { date: Date; name: string; type: 'federal' | 'regional' }[] {
  const holidays: { date: Date; name: string; type: 'federal' | 'regional' }[] = [];

  // Fixe Feiertage
  holidays.push(
    { date: new Date(year, 0, 1), name: 'Neujahr', type: 'federal' },
    { date: new Date(year, 0, 2), name: 'Berchtoldstag', type: 'regional' },
    { date: new Date(year, 4, 1), name: 'Tag der Arbeit', type: 'regional' },
    { date: new Date(year, 7, 1), name: 'Nationalfeiertag', type: 'federal' },
    { date: new Date(year, 11, 25), name: 'Weihnachten', type: 'federal' },
    { date: new Date(year, 11, 26), name: 'Stephanstag', type: 'regional' }
  );

  // Bewegliche Feiertage (vereinfacht)
  const easter = getEasterDate(year);
  holidays.push(
    { date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), name: 'Karfreitag', type: 'federal' },
    { date: new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000), name: 'Ostermontag', type: 'federal' },
    { date: new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000), name: 'Auffahrt', type: 'federal' },
    { date: new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000), name: 'Pfingstmontag', type: 'federal' }
  );

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Berechnet Osterdatum (vereinfachte Gauss-Formel)
 */
function getEasterDate(year: number): Date {
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

// ================================
// DISTANCE & LOCATION UTILITIES
// ================================

/**
 * Berechnet Distanz zwischen zwei Koordinaten (Haversine)
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Erdradius in Metern
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Prüft ob Koordinaten in der Schweiz sind
 */
export function isInSwitzerland(coordinates: Coordinates): boolean {
  // Grobe Schweizer Bounding Box
  const swissBounds = {
    north: 47.8084,
    south: 45.8180,
    east: 10.4922,
    west: 5.9559
  };

  return coordinates.lat >= swissBounds.south &&
         coordinates.lat <= swissBounds.north &&
         coordinates.lng >= swissBounds.west &&
         coordinates.lng <= swissBounds.east;
}

// ================================
// MACHINE LEARNING UTILITIES
// ================================

/**
 * Normalisiert Daten für ML
 */
export function normalizeData(data: number[]): number[] {
  if (data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  if (range === 0) return data.map(() => 0);

  return data.map(value => (value - min) / range);
}

/**
 * Denormalisiert Daten
 */
export function denormalizeData(normalizedData: number[], originalMin: number, originalMax: number): number[] {
  const range = originalMax - originalMin;
  return normalizedData.map(value => value * range + originalMin);
}

/**
 * Berechnet gleitenden Durchschnitt
 */
export function calculateMovingAverage(data: number[], window: number): number[] {
  if (window <= 0 || window > data.length) return data;

  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, start + window);
    const windowData = data.slice(start, end);
    const average = windowData.reduce((sum, val) => sum + val, 0) / windowData.length;
    result.push(average);
  }

  return result;
}

/**
 * Berechnet Preiselastizität
 */
export function calculatePriceElasticity(data: { price: number; quantity: number }[]): number {
  if (data.length < 2) return -1.0; // Default elasticity

  // Vereinfachte Elastizitäts-Berechnung
  let totalElasticity = 0;
  let validPairs = 0;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    if (prev.price !== curr.price && prev.quantity !== 0 && curr.quantity !== 0) {
      const priceChange = (curr.price - prev.price) / prev.price;
      const quantityChange = (curr.quantity - prev.quantity) / prev.quantity;

      if (priceChange !== 0) {
        const elasticity = quantityChange / priceChange;
        totalElasticity += elasticity;
        validPairs++;
      }
    }
  }

  return validPairs > 0 ? totalElasticity / validPairs : -1.0;
}

/**
 * Erkennt Saisonalität in Zeitreihen
 */
export function detectSeasonality(data: number[]): { type: 'weekly' | 'monthly' | 'yearly' | 'none'; strength: number } {
  if (data.length < 14) return { type: 'none', strength: 0 };

  // Vereinfachte Saisonalitäts-Erkennung
  const weeklyPattern = analyzePattern(data, 7);
  const monthlyPattern = analyzePattern(data, 30);

  if (weeklyPattern.strength > 0.3) {
    return { type: 'weekly', strength: weeklyPattern.strength };
  }

  if (monthlyPattern.strength > 0.3) {
    return { type: 'monthly', strength: monthlyPattern.strength };
  }

  return { type: 'none', strength: 0 };
}

/**
 * Analysiert Pattern in Daten
 */
function analyzePattern(data: number[], period: number): { strength: number } {
  if (data.length < period * 2) return { strength: 0 };

  const cycles = Math.floor(data.length / period);
  let totalVariance = 0;
  let patternVariance = 0;

  // Berechne Varianz zwischen Zyklen
  for (let i = 0; i < period; i++) {
    const values: number[] = [];

    for (let cycle = 0; cycle < cycles; cycle++) {
      const index = cycle * period + i;
      if (index < data.length) {
        values.push(data[index]);
      }
    }

    if (values.length > 1) {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      patternVariance += variance;
    }
  }

  // Berechne Gesamt-Varianz
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  totalVariance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;

  const strength = totalVariance > 0 ? 1 - (patternVariance / totalVariance) : 0;
  return { strength: Math.max(0, Math.min(1, strength)) };
}

/**
 * Interpoliert fehlende Daten
 */
export function interpolateMissingData(data: (number | null)[]): number[] {
  const result = [...data];

  for (let i = 0; i < result.length; i++) {
    if (result[i] === null || result[i] === undefined) {
      // Lineare Interpolation
      let prevIndex = i - 1;
      let nextIndex = i + 1;

      // Finde vorherigen validen Wert
      while (prevIndex >= 0 && (result[prevIndex] === null || result[prevIndex] === undefined)) {
        prevIndex--;
      }

      // Finde nächsten validen Wert
      while (nextIndex < result.length && (result[nextIndex] === null || result[nextIndex] === undefined)) {
        nextIndex++;
      }

      if (prevIndex >= 0 && nextIndex < result.length) {
        // Lineare Interpolation
        const prevValue = result[prevIndex] as number;
        const nextValue = result[nextIndex] as number;
        const steps = nextIndex - prevIndex;
        const stepSize = (nextValue - prevValue) / steps;
        const stepsFromPrev = i - prevIndex;

        result[i] = prevValue + (stepSize * stepsFromPrev);
      } else if (prevIndex >= 0) {
        // Verwende vorherigen Wert
        result[i] = result[prevIndex] as number;
      } else if (nextIndex < result.length) {
        // Verwende nächsten Wert
        result[i] = result[nextIndex] as number;
      } else {
        // Fallback
        result[i] = 0;
      }
    }
  }

  return result as number[];
}

/**
 * Erstellt Feature Matrix für ML
 */
export function createFeatureMatrix(features: number[][]): number[][] {
  if (features.length === 0) return [];

  const numFeatures = features[0].length;
  const matrix: number[][] = [];

  for (const feature of features) {
    if (feature.length === numFeatures) {
      matrix.push([...feature]);
    }
  }

  return matrix;
}

/**
 * Teilt Daten in Training und Test auf
 */
export function splitTrainTest(
  features: number[][],
  targets: number[],
  trainRatio: number = 0.8
): {
  trainX: number[][];
  testX: number[][];
  trainY: number[];
  testY: number[];
} {
  const trainSize = Math.floor(features.length * trainRatio);

  return {
    trainX: features.slice(0, trainSize),
    testX: features.slice(trainSize),
    trainY: targets.slice(0, trainSize),
    testY: targets.slice(trainSize)
  };
}

/**
 * Berechnet MAPE (Mean Absolute Percentage Error)
 */
export function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 100;

  let totalPercentageError = 0;
  let validPairs = 0;

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      const percentageError = Math.abs((actual[i] - predicted[i]) / actual[i]);
      totalPercentageError += percentageError;
      validPairs++;
    }
  }

  return validPairs > 0 ? (totalPercentageError / validPairs) * 100 : 100;
}

/**
 * Berechnet Wachstumsrate
 */
export function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) return 0;

  const periods = values.length - 1;
  return Math.pow(last / first, 1 / periods) - 1;
}

// ================================
// NOTIFICATION UTILITIES
// ================================

/**
 * Sendet Benachrichtigung über verschiedene Kanäle
 */
export async function sendNotification(
  tenantId: string,
  notification: {
    type: string;
    channel?: NotificationChannel;
    recipient: string;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    actions?: { label: string; url?: string; action?: string }[];
    data?: any;
  }
): Promise<string> {
  // Hier würde die tatsächliche Notification-Implementierung stehen
  console.log(`📱 Sending notification to ${notification.recipient}: ${notification.title}`);

  // Simuliere Notification ID
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validiert Schweizer Postleitzahl
 */
export function validateSwissPostalCode(postalCode: string): boolean {
  const swissPostalCodeRegex = /^[1-9][0-9]{3}$/;
  return swissPostalCodeRegex.test(postalCode);
}

/**
 * Validiert Schweizer Telefonnummer
 */
export function validateSwissPhoneNumber(phoneNumber: string): boolean {
  // Schweizer Telefonnummern: +41XXXXXXXXX oder 0XXXXXXXXX
  const swissPhoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/;
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  return swissPhoneRegex.test(cleaned);
}

/**
 * Formatiert Schweizer Telefonnummer
 */
export function formatSwissPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+41')) {
    const number = cleaned.substr(3);
    return `+41 ${number.substr(0, 2)} ${number.substr(2, 3)} ${number.substr(5, 2)} ${number.substr(7, 2)}`;
  }

  if (cleaned.startsWith('0')) {
    return `${cleaned.substr(0, 3)} ${cleaned.substr(3, 3)} ${cleaned.substr(6, 2)} ${cleaned.substr(8, 2)}`;
  }

  return phoneNumber;
}

// ================================
// ERROR HANDLING UTILITIES
// ================================

/**
 * Erstellt strukturierten Fehler
 */
export function createAIError(
  code: string,
  message: string,
  service: string,
  details?: any
): { code: string; message: string; service: string; details?: any; timestamp: Date } {
  return {
    code,
    message,
    service,
    details,
    timestamp: new Date()
  };
}

/**
 * Loggt AI Service Fehler
 */
export function logAIError(error: any, context: string): void {
  console.error(`[AI Error - ${context}]`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context
  });
}

// ================================
// CACHE UTILITIES
// ================================

/**
 * Erstellt Cache Key
 */
export function createCacheKey(...parts: string[]): string {
  return parts.map(part => part.toString()).join('_');
}

/**
 * Prüft Cache Gültigkeit
 */
export function isCacheValid(cachedAt: Date, validityMinutes: number): boolean {
  const now = new Date();
  const expiryTime = new Date(cachedAt.getTime() + validityMinutes * 60 * 1000);
  return now < expiryTime;
}

// ================================
// EXPORT ALL UTILITIES
// ================================

export default {
  // Swiss Locale
  formatCurrency,
  formatSwissTime,
  formatSwissDate,
  formatSwissDateTime,
  getCurrentSwissTime,
  utcToSwissTime,
  addDays,
  formatDuration,

  // Swiss Language
  normalizeSwissGerman,
  detectSwissDialect,
  extractSwissNumbers,
  parseSwissQuantities,
  getSwissPoliteForm,

  // Swiss Holidays
  getSwissHolidays,

  // Distance & Location
  calculateDistance,
  isInSwitzerland,

  // Machine Learning
  normalizeData,
  denormalizeData,
  calculateMovingAverage,
  calculatePriceElasticity,
  detectSeasonality,
  interpolateMissingData,
  createFeatureMatrix,
  splitTrainTest,
  calculateMAPE,
  calculateGrowthRate,

  // Notifications
  sendNotification,

  // Validation
  validateSwissPostalCode,
  validateSwissPhoneNumber,
  formatSwissPhoneNumber,

  // Error Handling
  createAIError,
  logAIError,

  // Cache
  createCacheKey,
  isCacheValid
};

/**
 * EATECH - String Similarity Utility
 * Version: 2.0.0
 * Description: Advanced string similarity algorithms for voice command matching
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/utils/StringSimilarity.js
 */

// ============================================================================
// LEVENSHTEIN DISTANCE
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
export function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
  if (str1 === str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // Deletion
        matrix[i][j - 1] + 1,     // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
export function levenshteinSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

// ============================================================================
// DAMERAU-LEVENSHTEIN DISTANCE
// ============================================================================

/**
 * Calculate Damerau-Levenshtein distance (includes transpositions)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance including transpositions
 */
export function damerauLevenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
  if (str1 === str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const maxDist = len1 + len2;
  
  // Create extended matrix
  const H = Array(len1 + 2).fill().map(() => Array(len2 + 2).fill(0));
  
  H[0][0] = maxDist;
  for (let i = 0; i <= len1; i++) {
    H[i + 1][0] = maxDist;
    H[i + 1][1] = i;
  }
  for (let j = 0; j <= len2; j++) {
    H[0][j + 1] = maxDist;
    H[1][j + 1] = j;
  }
  
  const lastOccurrence = new Map();
  
  for (let i = 1; i <= len1; i++) {
    let DB = 0;
    
    for (let j = 1; j <= len2; j++) {
      const k = lastOccurrence.get(str2[j - 1]) || 0;
      const l = DB;
      
      if (str1[i - 1] === str2[j - 1]) {
        H[i + 1][j + 1] = H[i][j];
        DB = j;
      } else {
        H[i + 1][j + 1] = Math.min(
          H[i][j] + 1,       // Substitution
          H[i + 1][j] + 1,   // Insertion
          H[i][j + 1] + 1,   // Deletion
          H[k][l] + (i - k - 1) + 1 + (j - l - 1) // Transposition
        );
      }
    }
    
    lastOccurrence.set(str1[i - 1], i);
  }
  
  return H[len1 + 1][len2 + 1];
}

// ============================================================================
// JARO SIMILARITY
// ============================================================================

/**
 * Calculate Jaro similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Jaro similarity score between 0 and 1
 */
export function jaroSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Maximum allowed distance for matching
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDistance < 0) return 0;
  
  // Arrays to track matches
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    
    while (!str2Matches[k]) k++;
    
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

// ============================================================================
// JARO-WINKLER SIMILARITY
// ============================================================================

/**
 * Calculate Jaro-Winkler similarity (with prefix bonus)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} prefixLength - Maximum prefix length to consider (default: 4)
 * @returns {number} Jaro-Winkler similarity score between 0 and 1
 */
export function jaroWinkler(str1, str2, prefixLength = 4) {
  const jaroSim = jaroSimilarity(str1, str2);
  
  if (jaroSim < 0.7) return jaroSim; // No prefix bonus if Jaro similarity is low
  
  // Calculate common prefix length
  let commonPrefix = 0;
  const maxPrefix = Math.min(prefixLength, Math.min(str1.length, str2.length));
  
  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }
  
  // Apply prefix bonus (0.1 scaling factor)
  return jaroSim + (0.1 * commonPrefix * (1 - jaroSim));
}

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Create n-grams from a string
 * @param {string} str - Input string
 * @param {number} n - N-gram size
 * @returns {Map} N-gram frequency map
 */
function createNGrams(str, n = 2) {
  const ngrams = new Map();
  const padded = ' '.repeat(n - 1) + str.toLowerCase() + ' '.repeat(n - 1);
  
  for (let i = 0; i <= padded.length - n; i++) {
    const ngram = padded.substring(i, i + n);
    ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
  }
  
  return ngrams;
}

/**
 * Calculate cosine similarity using n-grams
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} n - N-gram size (default: 2)
 * @returns {number} Cosine similarity score between 0 and 1
 */
export function cosineSimilarity(str1, str2, n = 2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const ngrams1 = createNGrams(str1, n);
  const ngrams2 = createNGrams(str2, n);
  
  // Get all unique n-grams
  const allNGrams = new Set([...ngrams1.keys(), ...ngrams2.keys()]);
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (const ngram of allNGrams) {
    const freq1 = ngrams1.get(ngram) || 0;
    const freq2 = ngrams2.get(ngram) || 0;
    
    dotProduct += freq1 * freq2;
    magnitude1 += freq1 * freq1;
    magnitude2 += freq2 * freq2;
  }
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

// ============================================================================
// JACCARD SIMILARITY
// ============================================================================

/**
 * Calculate Jaccard similarity using character sets
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Jaccard similarity score between 0 and 1
 */
export function jaccardSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const set1 = new Set(str1.toLowerCase());
  const set2 = new Set(str2.toLowerCase());
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate Jaccard similarity using n-grams
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} n - N-gram size (default: 2)
 * @returns {number} Jaccard similarity score between 0 and 1
 */
export function jaccardNGramSimilarity(str1, str2, n = 2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const ngrams1 = new Set(createNGrams(str1, n).keys());
  const ngrams2 = new Set(createNGrams(str2, n).keys());
  
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
}

// ============================================================================
// SOUNDEX ALGORITHM
// ============================================================================

/**
 * Generate Soundex code for phonetic matching
 * @param {string} str - Input string
 * @returns {string} Soundex code
 */
export function soundex(str) {
  if (!str) return '';
  
  const normalized = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!normalized) return '';
  
  let soundexCode = normalized[0];
  
  const soundexMap = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };
  
  let prevCode = soundexMap[normalized[0]] || '';
  
  for (let i = 1; i < normalized.length && soundexCode.length < 4; i++) {
    const char = normalized[i];
    const code = soundexMap[char] || '';
    
    if (code && code !== prevCode) {
      soundexCode += code;
    }
    
    if (code) {
      prevCode = code;
    }
  }
  
  // Pad or truncate to 4 characters
  return (soundexCode + '000').substring(0, 4);
}

/**
 * Calculate Soundex similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Soundex similarity (1 if match, 0 if no match)
 */
export function soundexSimilarity(str1, str2) {
  return soundex(str1) === soundex(str2) ? 1 : 0;
}

// ============================================================================
// METAPHONE ALGORITHM
// ============================================================================

/**
 * Generate Double Metaphone code for improved phonetic matching
 * @param {string} str - Input string
 * @returns {string} Metaphone code
 */
export function metaphone(str) {
  if (!str) return '';
  
  let word = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!word) return '';
  
  // Handle initial combinations
  if (word.match(/^(KN|GN|PN|AE|WR)/)) {
    word = word.substring(1);
  }
  
  let metaphoneCode = '';
  let i = 0;
  
  while (i < word.length && metaphoneCode.length < 4) {
    const char = word[i];
    const next = word[i + 1] || '';
    const prev = word[i - 1] || '';
    
    switch (char) {
      case 'A': case 'E': case 'I': case 'O': case 'U':
        if (i === 0) metaphoneCode += char;
        break;
      case 'B':
        metaphoneCode += 'B';
        if (next === 'B') i++;
        break;
      case 'C':
        if (next === 'H') {
          metaphoneCode += 'X';
          i++;
        } else if (next.match(/[IEY]/)) {
          metaphoneCode += 'S';
        } else {
          metaphoneCode += 'K';
        }
        break;
      case 'D':
        if (next === 'G' && word[i + 2]?.match(/[IEY]/)) {
          metaphoneCode += 'J';
          i += 2;
        } else {
          metaphoneCode += 'T';
        }
        break;
      case 'F':
        metaphoneCode += 'F';
        if (next === 'F') i++;
        break;
      case 'G':
        if (next === 'H' && !word[i + 2]?.match(/[AEIOU]/)) {
          // Silent GH
        } else if (next.match(/[IEY]/)) {
          metaphoneCode += 'J';
        } else {
          metaphoneCode += 'K';
        }
        break;
      case 'H':
        if (prev.match(/[AEIOU]/) && next.match(/[AEIOU]/)) {
          metaphoneCode += 'H';
        }
        break;
      case 'J':
        metaphoneCode += 'J';
        break;
      case 'K':
        if (prev !== 'C') {
          metaphoneCode += 'K';
        }
        break;
      case 'L':
        metaphoneCode += 'L';
        if (next === 'L') i++;
        break;
      case 'M':
        metaphoneCode += 'M';
        if (next === 'M') i++;
        break;
      case 'N':
        metaphoneCode += 'N';
        if (next === 'N') i++;
        break;
      case 'P':
        if (next === 'H') {
          metaphoneCode += 'F';
          i++;
        } else {
          metaphoneCode += 'P';
        }
        break;
      case 'Q':
        metaphoneCode += 'K';
        break;
      case 'R':
        metaphoneCode += 'R';
        if (next === 'R') i++;
        break;
      case 'S':
        if (next === 'H') {
          metaphoneCode += 'X';
          i++;
        } else if (next.match(/[IEY]/)) {
          metaphoneCode += 'S';
        } else {
          metaphoneCode += 'S';
        }
        break;
      case 'T':
        if (next === 'H') {
          metaphoneCode += '0';
          i++;
        } else if (next.match(/[IEY]/)) {
          metaphoneCode += 'S';
        } else {
          metaphoneCode += 'T';
        }
        break;
      case 'V':
        metaphoneCode += 'F';
        break;
      case 'W':
        if (next.match(/[AEIOU]/)) {
          metaphoneCode += 'W';
        }
        break;
      case 'X':
        metaphoneCode += 'KS';
        break;
      case 'Y':
        if (next.match(/[AEIOU]/)) {
          metaphoneCode += 'Y';
        }
        break;
      case 'Z':
        metaphoneCode += 'S';
        break;
    }
    
    i++;
  }
  
  return metaphoneCode;
}

/**
 * Calculate Metaphone similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Metaphone similarity (1 if match, 0 if no match)
 */
export function metaphoneSimilarity(str1, str2) {
  return metaphone(str1) === metaphone(str2) ? 1 : 0;
}

// ============================================================================
// COMBINED SIMILARITY MEASURES
// ============================================================================

/**
 * Calculate combined similarity using multiple algorithms
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {Object} weights - Weights for different algorithms
 * @returns {number} Combined similarity score between 0 and 1
 */
export function combinedSimilarity(str1, str2, weights = {}) {
  const defaultWeights = {
    jaroWinkler: 0.4,
    levenshtein: 0.2,
    cosine: 0.2,
    jaccard: 0.1,
    soundex: 0.05,
    metaphone: 0.05
  };
  
  const w = { ...defaultWeights, ...weights };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  if (w.jaroWinkler > 0) {
    weightedSum += w.jaroWinkler * jaroWinkler(str1, str2);
    totalWeight += w.jaroWinkler;
  }
  
  if (w.levenshtein > 0) {
    weightedSum += w.levenshtein * levenshteinSimilarity(str1, str2);
    totalWeight += w.levenshtein;
  }
  
  if (w.cosine > 0) {
    weightedSum += w.cosine * cosineSimilarity(str1, str2);
    totalWeight += w.cosine;
  }
  
  if (w.jaccard > 0) {
    weightedSum += w.jaccard * jaccardSimilarity(str1, str2);
    totalWeight += w.jaccard;
  }
  
  if (w.soundex > 0) {
    weightedSum += w.soundex * soundexSimilarity(str1, str2);
    totalWeight += w.soundex;
  }
  
  if (w.metaphone > 0) {
    weightedSum += w.metaphone * metaphoneSimilarity(str1, str2);
    totalWeight += w.metaphone;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

/**
 * Perform fuzzy search in an array of strings
 * @param {string} query - Search query
 * @param {string[]} items - Array of strings to search
 * @param {Object} options - Search options
 * @returns {Object[]} Array of results with similarity scores
 */
export function fuzzySearch(query, items, options = {}) {
  const {
    threshold = 0.3,
    limit = 10,
    algorithm = 'jaroWinkler',
    includeScore = true,
    includeMatches = false
  } = options;
  
  const algorithms = {
    levenshtein: levenshteinSimilarity,
    jaroWinkler: jaroWinkler,
    jaro: jaroSimilarity,
    cosine: cosineSimilarity,
    jaccard: jaccardSimilarity,
    soundex: soundexSimilarity,
    metaphone: metaphoneSimilarity,
    combined: combinedSimilarity
  };
  
  const similarityFn = algorithms[algorithm] || jaroWinkler;
  
  const results = items
    .map((item, index) => {
      const score = similarityFn(query, item);
      return {
        item,
        index,
        score: includeScore ? score : undefined,
        matches: includeMatches ? findMatches(query, item) : undefined
      };
    })
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return results;
}

/**
 * Find character matches between two strings
 * @param {string} query - Search query
 * @param {string} target - Target string
 * @returns {number[]} Array of match indices
 */
function findMatches(query, target) {
  const matches = [];
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  let queryIndex = 0;
  
  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      matches.push(i);
      queryIndex++;
    }
  }
  
  return matches;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize string for comparison
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
export function normalizeString(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity ratio between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {string} algorithm - Algorithm to use
 * @returns {number} Similarity ratio between 0 and 1
 */
export function similarityRatio(str1, str2, algorithm = 'jaroWinkler') {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  switch (algorithm) {
    case 'levenshtein':
      return levenshteinSimilarity(normalized1, normalized2);
    case 'jaro':
      return jaroSimilarity(normalized1, normalized2);
    case 'jaroWinkler':
      return jaroWinkler(normalized1, normalized2);
    case 'cosine':
      return cosineSimilarity(normalized1, normalized2);
    case 'jaccard':
      return jaccardSimilarity(normalized1, normalized2);
    case 'soundex':
      return soundexSimilarity(normalized1, normalized2);
    case 'metaphone':
      return metaphoneSimilarity(normalized1, normalized2);
    case 'combined':
      return combinedSimilarity(normalized1, normalized2);
    default:
      return jaroWinkler(normalized1, normalized2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  levenshteinDistance,
  levenshteinSimilarity,
  damerauLevenshteinDistance,
  jaroSimilarity,
  jaroWinkler,
  cosineSimilarity,
  jaccardSimilarity,
  jaccardNGramSimilarity,
  soundex,
  soundexSimilarity,
  metaphone,
  metaphoneSimilarity,
  combinedSimilarity,
  fuzzySearch,
  normalizeString,
  similarityRatio
};
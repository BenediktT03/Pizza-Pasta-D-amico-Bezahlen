/**
 * Swiss canton data and utilities
 */

export interface Canton {
  code: string;
  nameDE: string;
  nameFR: string;
  nameIT: string;
  nameEN: string;
  capital: string;
  region: 'german' | 'french' | 'italian' | 'romansh';
  population: number;
  area: number; // in km²
}

// Swiss cantons data
export const SWISS_CANTONS: Record<string, Canton> = {
  'AG': {
    code: 'AG',
    nameDE: 'Aargau',
    nameFR: 'Argovie',
    nameIT: 'Argovia',
    nameEN: 'Aargau',
    capital: 'Aarau',
    region: 'german',
    population: 694072,
    area: 1404
  },
  'AI': {
    code: 'AI',
    nameDE: 'Appenzell Innerrhoden',
    nameFR: 'Appenzell Rhodes-Intérieures',
    nameIT: 'Appenzello Interno',
    nameEN: 'Appenzell Innerrhoden',
    capital: 'Appenzell',
    region: 'german',
    population: 16293,
    area: 173
  },
  'AR': {
    code: 'AR',
    nameDE: 'Appenzell Ausserrhoden',
    nameFR: 'Appenzell Rhodes-Extérieures',
    nameIT: 'Appenzello Esterno',
    nameEN: 'Appenzell Ausserrhoden',
    capital: 'Herisau',
    region: 'german',
    population: 55309,
    area: 243
  },
  'BE': {
    code: 'BE',
    nameDE: 'Bern',
    nameFR: 'Berne',
    nameIT: 'Berna',
    nameEN: 'Bern',
    capital: 'Bern',
    region: 'german',
    population: 1043132,
    area: 5959
  },
  'BL': {
    code: 'BL',
    nameDE: 'Basel-Landschaft',
    nameFR: 'Bâle-Campagne',
    nameIT: 'Basilea-Campagna',
    nameEN: 'Basel-Country',
    capital: 'Liestal',
    region: 'german',
    population: 290969,
    area: 518
  },
  'BS': {
    code: 'BS',
    nameDE: 'Basel-Stadt',
    nameFR: 'Bâle-Ville',
    nameIT: 'Basilea-Città',
    nameEN: 'Basel-City',
    capital: 'Basel',
    region: 'german',
    population: 196735,
    area: 37
  },
  'FR': {
    code: 'FR',
    nameDE: 'Freiburg',
    nameFR: 'Fribourg',
    nameIT: 'Friburgo',
    nameEN: 'Fribourg',
    capital: 'Fribourg',
    region: 'french',
    population: 325496,
    area: 1671
  },
  'GE': {
    code: 'GE',
    nameDE: 'Genf',
    nameFR: 'Genève',
    nameIT: 'Ginevra',
    nameEN: 'Geneva',
    capital: 'Genève',
    region: 'french',
    population: 509448,
    area: 282
  },
  'GL': {
    code: 'GL',
    nameDE: 'Glarus',
    nameFR: 'Glaris',
    nameIT: 'Glarona',
    nameEN: 'Glarus',
    capital: 'Glarus',
    region: 'german',
    population: 40851,
    area: 685
  },
  'GR': {
    code: 'GR',
    nameDE: 'Graubünden',
    nameFR: 'Grisons',
    nameIT: 'Grigioni',
    nameEN: 'Grisons',
    capital: 'Chur',
    region: 'romansh',
    population: 200096,
    area: 7105
  },
  'JU': {
    code: 'JU',
    nameDE: 'Jura',
    nameFR: 'Jura',
    nameIT: 'Giura',
    nameEN: 'Jura',
    capital: 'Delémont',
    region: 'french',
    population: 73709,
    area: 838
  },
  'LU': {
    code: 'LU',
    nameDE: 'Luzern',
    nameFR: 'Lucerne',
    nameIT: 'Lucerna',
    nameEN: 'Lucerne',
    capital: 'Luzern',
    region: 'german',
    population: 420326,
    area: 1493
  },
  'NE': {
    code: 'NE',
    nameDE: 'Neuenburg',
    nameFR: 'Neuchâtel',
    nameIT: 'Neuchâtel',
    nameEN: 'Neuchâtel',
    capital: 'Neuchâtel',
    region: 'french',
    population: 175894,
    area: 803
  },
  'NW': {
    code: 'NW',
    nameDE: 'Nidwalden',
    nameFR: 'Nidwald',
    nameIT: 'Nidvaldo',
    nameEN: 'Nidwalden',
    capital: 'Stans',
    region: 'german',
    population: 43520,
    area: 276
  },
  'OW': {
    code: 'OW',
    nameDE: 'Obwalden',
    nameFR: 'Obwald',
    nameIT: 'Obvaldo',
    nameEN: 'Obwalden',
    capital: 'Sarnen',
    region: 'german',
    population: 38108,
    area: 491
  },
  'SG': {
    code: 'SG',
    nameDE: 'St. Gallen',
    nameFR: 'Saint-Gall',
    nameIT: 'San Gallo',
    nameEN: 'St. Gallen',
    capital: 'St. Gallen',
    region: 'german',
    population: 514504,
    area: 2026
  },
  'SH': {
    code: 'SH',
    nameDE: 'Schaffhausen',
    nameFR: 'Schaffhouse',
    nameIT: 'Sciaffusa',
    nameEN: 'Schaffhausen',
    capital: 'Schaffhausen',
    region: 'german',
    population: 83107,
    area: 299
  },
  'SO': {
    code: 'SO',
    nameDE: 'Solothurn',
    nameFR: 'Soleure',
    nameIT: 'Soletta',
    nameEN: 'Solothurn',
    capital: 'Solothurn',
    region: 'german',
    population: 277462,
    area: 791
  },
  'SZ': {
    code: 'SZ',
    nameDE: 'Schwyz',
    nameFR: 'Schwyz',
    nameIT: 'Svitto',
    nameEN: 'Schwyz',
    capital: 'Schwyz',
    region: 'german',
    population: 162157,
    area: 908
  },
  'TG': {
    code: 'TG',
    nameDE: 'Thurgau',
    nameFR: 'Thurgovie',
    nameIT: 'Turgovia',
    nameEN: 'Thurgau',
    capital: 'Frauenfeld',
    region: 'german',
    population: 282909,
    area: 991
  },
  'TI': {
    code: 'TI',
    nameDE: 'Tessin',
    nameFR: 'Tessin',
    nameIT: 'Ticino',
    nameEN: 'Ticino',
    capital: 'Bellinzona',
    region: 'italian',
    population: 350986,
    area: 2812
  },
  'UR': {
    code: 'UR',
    nameDE: 'Uri',
    nameFR: 'Uri',
    nameIT: 'Uri',
    nameEN: 'Uri',
    capital: 'Altdorf',
    region: 'german',
    population: 36819,
    area: 1077
  },
  'VD': {
    code: 'VD',
    nameDE: 'Waadt',
    nameFR: 'Vaud',
    nameIT: 'Vaud',
    nameEN: 'Vaud',
    capital: 'Lausanne',
    region: 'french',
    population: 815300,
    area: 3212
  },
  'VS': {
    code: 'VS',
    nameDE: 'Wallis',
    nameFR: 'Valais',
    nameIT: 'Vallese',
    nameEN: 'Valais',
    capital: 'Sion',
    region: 'french',
    population: 348503,
    area: 5224
  },
  'ZG': {
    code: 'ZG',
    nameDE: 'Zug',
    nameFR: 'Zoug',
    nameIT: 'Zugo',
    nameEN: 'Zug',
    capital: 'Zug',
    region: 'german',
    population: 128794,
    area: 239
  },
  'ZH': {
    code: 'ZH',
    nameDE: 'Zürich',
    nameFR: 'Zurich',
    nameIT: 'Zurigo',
    nameEN: 'Zurich',
    capital: 'Zürich',
    region: 'german',
    population: 1553423,
    area: 1729
  }
};

/**
 * Get canton by code
 * @param code The canton code (e.g., 'ZH')
 * @returns Canton data or null
 */
export function getCantonByCode(code: string): Canton | null {
  return SWISS_CANTONS[code.toUpperCase()] || null;
}

/**
 * Get canton name in specific language
 * @param code The canton code
 * @param language The language (de, fr, it, en)
 * @returns Canton name or null
 */
export function getCantonName(
  code: string,
  language: 'de' | 'fr' | 'it' | 'en' = 'de'
): string | null {
  const canton = getCantonByCode(code);
  if (!canton) return null;
  
  const nameMap = {
    de: canton.nameDE,
    fr: canton.nameFR,
    it: canton.nameIT,
    en: canton.nameEN
  };
  
  return nameMap[language];
}

/**
 * Get all canton codes
 * @returns Array of canton codes
 */
export function getAllCantonCodes(): string[] {
  return Object.keys(SWISS_CANTONS);
}

/**
 * Get cantons by language region
 * @param region The language region
 * @returns Array of cantons
 */
export function getCantonsByRegion(
  region: 'german' | 'french' | 'italian' | 'romansh'
): Canton[] {
  return Object.values(SWISS_CANTONS).filter(
    canton => canton.region === region
  );
}

/**
 * Validate canton code
 * @param code The canton code to validate
 * @returns Whether the code is valid
 */
export function isValidCantonCode(code: string): boolean {
  return code.toUpperCase() in SWISS_CANTONS;
}

/**
 * Get canton by postal code
 * @param postalCode The postal code
 * @returns Canton code or null
 */
export function getCantonByPostalCode(postalCode: string): string | null {
  const code = parseInt(postalCode, 10);
  
  // Postal code ranges for cantons (simplified)
  const ranges: Array<[number, number, string]> = [
    [1000, 1999, 'VD'], // Vaud
    [2000, 2999, 'NE'], // Neuchâtel, Jura
    [3000, 3999, 'BE'], // Bern
    [4000, 4999, 'BS'], // Basel
    [5000, 5999, 'AG'], // Aargau
    [6000, 6999, 'LU'], // Central Switzerland
    [7000, 7999, 'GR'], // Graubünden
    [8000, 8999, 'ZH'], // Zurich
    [9000, 9999, 'SG'], // Eastern Switzerland
  ];
  
  for (const [min, max, canton] of ranges) {
    if (code >= min && code <= max) {
      // Special cases
      if (code >= 2800 && code <= 2999) return 'JU'; // Jura
      if (code >= 6500 && code <= 6999) return 'TI'; // Ticino
      
      return canton;
    }
  }
  
  // Geneva special case
  if (code >= 1200 && code <= 1299) return 'GE';
  
  // Valais special case  
  if (code >= 1900 && code <= 1999) return 'VS';
  
  return null;
}

/**
 * Get neighboring cantons
 * @param code The canton code
 * @returns Array of neighboring canton codes
 */
export function getNeighboringCantons(code: string): string[] {
  const neighbors: Record<string, string[]> = {
    'AG': ['ZH', 'LU', 'ZG', 'SO', 'BL', 'BS'],
    'AI': ['AR', 'SG'],
    'AR': ['AI', 'SG'],
    'BE': ['VD', 'FR', 'SO', 'AG', 'LU', 'OW', 'NW', 'UR', 'VS', 'NE', 'JU'],
    'BL': ['BS', 'SO', 'AG', 'JU'],
    'BS': ['BL', 'SO', 'AG'],
    'FR': ['VD', 'BE', 'NE'],
    'GE': ['VD'],
    'GL': ['SG', 'GR', 'UR', 'SZ'],
    'GR': ['TI', 'UR', 'GL', 'SG'],
    'JU': ['BE', 'SO', 'BL', 'NE'],
    'LU': ['OW', 'NW', 'UR', 'SZ', 'ZG', 'AG', 'BE'],
    'NE': ['VD', 'FR', 'BE', 'JU'],
    'NW': ['OW', 'BE', 'LU', 'UR'],
    'OW': ['NW', 'BE', 'LU', 'UR'],
    'SG': ['TG', 'ZH', 'SZ', 'GL', 'GR', 'AR', 'AI'],
    'SH': ['ZH', 'TG'],
    'SO': ['BE', 'JU', 'BL', 'BS', 'AG'],
    'SZ': ['UR', 'GL', 'SG', 'ZH', 'ZG', 'LU'],
    'TG': ['ZH', 'SG', 'SH'],
    'TI': ['GR', 'UR', 'VS'],
    'UR': ['BE', 'OW', 'NW', 'LU', 'SZ', 'GL', 'GR', 'TI', 'VS'],
    'VD': ['GE', 'FR', 'NE', 'BE', 'VS'],
    'VS': ['VD', 'BE', 'UR', 'TI'],
    'ZG': ['ZH', 'AG', 'LU', 'SZ'],
    'ZH': ['SH', 'TG', 'SG', 'SZ', 'ZG', 'AG']
  };
  
  return neighbors[code.toUpperCase()] || [];
}

/**
 * Calculate distance between canton capitals
 * @param canton1 First canton code
 * @param canton2 Second canton code
 * @returns Approximate distance in km
 */
export function getDistanceBetweenCantons(
  canton1: string,
  canton2: string
): number | null {
  // Simplified coordinates of canton capitals
  const coordinates: Record<string, [number, number]> = {
    'AG': [47.3927, 8.0458],
    'AI': [47.3167, 9.4167],
    'AR': [47.3833, 9.2833],
    'BE': [46.9481, 7.4474],
    'BL': [47.4814, 7.7335],
    'BS': [47.5596, 7.5886],
    'FR': [46.8065, 7.1620],
    'GE': [46.2044, 6.1432],
    'GL': [47.0404, 9.0680],
    'GR': [46.8499, 9.5329],
    'JU': [47.3667, 7.3500],
    'LU': [47.0502, 8.3093],
    'NE': [46.9900, 6.9293],
    'NW': [46.9567, 8.3650],
    'OW': [46.8963, 8.2444],
    'SG': [47.4245, 9.3767],
    'SH': [47.6970, 8.6340],
    'SO': [47.2088, 7.5323],
    'SZ': [47.0207, 8.6530],
    'TG': [47.5536, 8.8737],
    'TI': [46.3316, 8.8003],
    'UR': [46.8803, 8.6403],
    'VD': [46.5197, 6.6323],
    'VS': [46.2311, 7.3588],
    'ZG': [47.1662, 8.5156],
    'ZH': [47.3769, 8.5417]
  };
  
  const coord1 = coordinates[canton1.toUpperCase()];
  const coord2 = coordinates[canton2.toUpperCase()];
  
  if (!coord1 || !coord2) return null;
  
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[0] * Math.PI / 180) * 
    Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}

// Export all canton utilities
export default {
  SWISS_CANTONS,
  getCantonByCode,
  getCantonName,
  getAllCantonCodes,
  getCantonsByRegion,
  isValidCantonCode,
  getCantonByPostalCode,
  getNeighboringCantons,
  getDistanceBetweenCantons
};

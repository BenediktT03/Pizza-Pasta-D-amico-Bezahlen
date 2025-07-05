/**
 * EATECH - Swiss Map Data
 * Version: 5.0.0
 * Description: Geodata for Swiss cantons and major cities for heat map visualization
 * File Path: /src/modules/master/utils/swissMapData.js
 */

// ============================================================================
// SWISS CANTONS WITH SIMPLIFIED COORDINATES
// ============================================================================
export const SWISS_CANTONS = [
  {
    id: 'ZH',
    name: 'Zürich',
    nameDE: 'Zürich',
    nameFR: 'Zurich',
    nameIT: 'Zurigo',
    center: { lat: 47.3769, lng: 8.5417 },
    path: 'M 520,150 L 580,140 L 590,180 L 570,200 L 530,190 Z',
    bounds: {
      north: 47.6969,
      south: 47.1589,
      east: 8.9651,
      west: 8.3570
    }
  },
  {
    id: 'BE',
    name: 'Bern',
    nameDE: 'Bern',
    nameFR: 'Berne',
    nameIT: 'Berna',
    center: { lat: 46.9480, lng: 7.4474 },
    path: 'M 300,200 L 450,180 L 480,280 L 400,320 L 320,300 Z',
    bounds: {
      north: 47.3525,
      south: 46.3272,
      east: 8.4567,
      west: 6.8607
    }
  },
  {
    id: 'LU',
    name: 'Luzern',
    nameDE: 'Luzern',
    nameFR: 'Lucerne',
    nameIT: 'Lucerna',
    center: { lat: 47.0502, lng: 8.3093 },
    path: 'M 480,180 L 520,170 L 530,210 L 500,220 L 480,200 Z',
    bounds: {
      north: 47.2701,
      south: 46.7734,
      east: 8.5155,
      west: 7.9641
    }
  },
  {
    id: 'UR',
    name: 'Uri',
    nameDE: 'Uri',
    nameFR: 'Uri',
    nameIT: 'Uri',
    center: { lat: 46.8868, lng: 8.6340 },
    path: 'M 500,220 L 530,210 L 540,250 L 510,260 L 500,240 Z',
    bounds: {
      north: 47.0820,
      south: 46.5317,
      east: 8.9559,
      west: 8.3985
    }
  },
  {
    id: 'SZ',
    name: 'Schwyz',
    nameDE: 'Schwyz',
    nameFR: 'Schwytz',
    nameIT: 'Svitto',
    center: { lat: 47.0208, lng: 8.6530 },
    path: 'M 530,200 L 560,190 L 570,220 L 540,230 L 530,210 Z',
    bounds: {
      north: 47.2208,
      south: 46.8700,
      east: 8.9755,
      west: 8.3893
    }
  },
  {
    id: 'OW',
    name: 'Obwalden',
    nameDE: 'Obwalden',
    nameFR: 'Obwald',
    nameIT: 'Obvaldo',
    center: { lat: 46.8779, lng: 8.2512 },
    path: 'M 480,230 L 500,220 L 510,240 L 490,250 L 480,240 Z',
    bounds: {
      north: 47.0341,
      south: 46.7439,
      east: 8.4743,
      west: 8.0516
    }
  },
  {
    id: 'NW',
    name: 'Nidwalden',
    nameDE: 'Nidwalden',
    nameFR: 'Nidwald',
    nameIT: 'Nidvaldo',
    center: { lat: 46.9267, lng: 8.3851 },
    path: 'M 490,210 L 510,200 L 520,220 L 500,230 L 490,220 Z',
    bounds: {
      north: 47.0039,
      south: 46.8263,
      east: 8.5700,
      west: 8.2383
    }
  },
  {
    id: 'GL',
    name: 'Glarus',
    nameDE: 'Glarus',
    nameFR: 'Glaris',
    nameIT: 'Glarona',
    center: { lat: 47.0401, lng: 9.0679 },
    path: 'M 570,180 L 600,170 L 610,210 L 580,220 L 570,200 Z',
    bounds: {
      north: 47.1843,
      south: 46.8605,
      east: 9.3915,
      west: 8.8715
    }
  },
  {
    id: 'ZG',
    name: 'Zug',
    nameDE: 'Zug',
    nameFR: 'Zoug',
    nameIT: 'Zugo',
    center: { lat: 47.1662, lng: 8.5155 },
    path: 'M 510,180 L 530,170 L 540,190 L 520,200 L 510,190 Z',
    bounds: {
      north: 47.2515,
      south: 47.0634,
      east: 8.6960,
      west: 8.3858
    }
  },
  {
    id: 'FR',
    name: 'Fribourg',
    nameDE: 'Freiburg',
    nameFR: 'Fribourg',
    nameIT: 'Friburgo',
    center: { lat: 46.8025, lng: 7.1619 },
    path: 'M 340,240 L 380,230 L 390,280 L 360,290 L 340,270 Z',
    bounds: {
      north: 47.0083,
      south: 46.4343,
      east: 7.4522,
      west: 6.7514
    }
  },
  {
    id: 'SO',
    name: 'Solothurn',
    nameDE: 'Solothurn',
    nameFR: 'Soleure',
    nameIT: 'Soletta',
    center: { lat: 47.2088, lng: 7.5386 },
    path: 'M 400,160 L 440,150 L 450,190 L 420,200 L 400,180 Z',
    bounds: {
      north: 47.5025,
      south: 47.0732,
      east: 8.0266,
      west: 7.3434
    }
  },
  {
    id: 'BS',
    name: 'Basel-Stadt',
    nameDE: 'Basel-Stadt',
    nameFR: 'Bâle-Ville',
    nameIT: 'Basilea Città',
    center: { lat: 47.5596, lng: 7.5886 },
    path: 'M 420,120 L 440,110 L 450,130 L 430,140 L 420,130 Z',
    bounds: {
      north: 47.5897,
      south: 47.5282,
      east: 7.6924,
      west: 7.5059
    }
  },
  {
    id: 'BL',
    name: 'Basel-Landschaft',
    nameDE: 'Basel-Landschaft',
    nameFR: 'Bâle-Campagne',
    nameIT: 'Basilea Campagna',
    center: { lat: 47.4814, lng: 7.7648 },
    path: 'M 440,130 L 470,120 L 480,160 L 450,170 L 440,150 Z',
    bounds: {
      north: 47.6072,
      south: 47.3380,
      east: 8.1361,
      west: 7.3894
    }
  },
  {
    id: 'SH',
    name: 'Schaffhausen',
    nameDE: 'Schaffhausen',
    nameFR: 'Schaffhouse',
    nameIT: 'Sciaffusa',
    center: { lat: 47.6970, lng: 8.6340 },
    path: 'M 540,100 L 570,90 L 580,120 L 550,130 L 540,110 Z',
    bounds: {
      north: 47.8228,
      south: 47.5677,
      east: 8.8612,
      west: 8.4549
    }
  },
  {
    id: 'AR',
    name: 'Appenzell Ausserrhoden',
    nameDE: 'Appenzell Ausserrhoden',
    nameFR: 'Appenzell Rhodes-Extérieures',
    nameIT: 'Appenzello Esterno',
    center: { lat: 47.3833, lng: 9.2772 },
    path: 'M 600,150 L 620,140 L 630,160 L 610,170 L 600,160 Z',
    bounds: {
      north: 47.4538,
      south: 47.2726,
      east: 9.5607,
      west: 9.1504
    }
  },
  {
    id: 'AI',
    name: 'Appenzell Innerrhoden',
    nameDE: 'Appenzell Innerrhoden',
    nameFR: 'Appenzell Rhodes-Intérieures',
    nameIT: 'Appenzello Interno',
    center: { lat: 47.3162, lng: 9.4163 },
    path: 'M 610,160 L 620,155 L 625,165 L 615,170 L 610,165 Z',
    bounds: {
      north: 47.3684,
      south: 47.2638,
      east: 9.5474,
      west: 9.3061
    }
  },
  {
    id: 'SG',
    name: 'St. Gallen',
    nameDE: 'St. Gallen',
    nameFR: 'Saint-Gall',
    nameIT: 'San Gallo',
    center: { lat: 47.4245, lng: 9.3767 },
    path: 'M 580,140 L 640,130 L 650,190 L 600,200 L 580,180 Z',
    bounds: {
      north: 47.5341,
      south: 46.8724,
      east: 9.6792,
      west: 8.7979
    }
  },
  {
    id: 'GR',
    name: 'Graubünden',
    nameDE: 'Graubünden',
    nameFR: 'Grisons',
    nameIT: 'Grigioni',
    center: { lat: 46.6570, lng: 9.5782 },
    path: 'M 600,220 L 700,200 L 720,320 L 640,340 L 600,300 Z',
    bounds: {
      north: 47.0650,
      south: 46.1685,
      east: 10.4924,
      west: 8.6501
    }
  },
  {
    id: 'AG',
    name: 'Aargau',
    nameDE: 'Aargau',
    nameFR: 'Argovie',
    nameIT: 'Argovia',
    center: { lat: 47.3877, lng: 8.1555 },
    path: 'M 460,150 L 510,140 L 520,180 L 480,190 L 460,170 Z',
    bounds: {
      north: 47.6308,
      south: 47.1376,
      east: 8.4540,
      west: 7.7095
    }
  },
  {
    id: 'TG',
    name: 'Thurgau',
    nameDE: 'Thurgau',
    nameFR: 'Thurgovie',
    nameIT: 'Turgovia',
    center: { lat: 47.5535, lng: 9.0559 },
    path: 'M 580,120 L 620,110 L 630,150 L 590,160 L 580,140 Z',
    bounds: {
      north: 47.6975,
      south: 47.3860,
      east: 9.4717,
      west: 8.6353
    }
  },
  {
    id: 'TI',
    name: 'Ticino',
    nameDE: 'Tessin',
    nameFR: 'Tessin',
    nameIT: 'Ticino',
    center: { lat: 46.3317, lng: 8.8005 },
    path: 'M 500,300 L 560,290 L 580,380 L 520,390 L 500,360 Z',
    bounds: {
      north: 46.6379,
      south: 45.8176,
      east: 9.2756,
      west: 8.3819
    }
  },
  {
    id: 'VD',
    name: 'Vaud',
    nameDE: 'Waadt',
    nameFR: 'Vaud',
    nameIT: 'Vaud',
    center: { lat: 46.5707, lng: 6.6567 },
    path: 'M 240,260 L 340,240 L 360,340 L 280,360 L 240,320 Z',
    bounds: {
      north: 46.9929,
      south: 46.1315,
      east: 7.2475,
      west: 6.0610
    }
  },
  {
    id: 'VS',
    name: 'Valais',
    nameDE: 'Wallis',
    nameFR: 'Valais',
    nameIT: 'Vallese',
    center: { lat: 46.2273, lng: 7.6203 },
    path: 'M 320,320 L 480,300 L 500,360 L 360,380 L 320,360 Z',
    bounds: {
      north: 46.6542,
      south: 45.8580,
      east: 8.4784,
      west: 6.7703
    }
  },
  {
    id: 'NE',
    name: 'Neuchâtel',
    nameDE: 'Neuenburg',
    nameFR: 'Neuchâtel',
    nameIT: 'Neuchâtel',
    center: { lat: 46.9899, lng: 6.9293 },
    path: 'M 300,200 L 340,190 L 350,230 L 320,240 L 300,220 Z',
    bounds: {
      north: 47.1359,
      south: 46.8579,
      east: 7.1059,
      west: 6.5402
    }
  },
  {
    id: 'GE',
    name: 'Genève',
    nameDE: 'Genf',
    nameFR: 'Genève',
    nameIT: 'Ginevra',
    center: { lat: 46.2044, lng: 6.1432 },
    path: 'M 220,320 L 250,310 L 260,340 L 230,350 L 220,340 Z',
    bounds: {
      north: 46.3635,
      south: 46.1321,
      east: 6.3099,
      west: 5.9562
    }
  },
  {
    id: 'JU',
    name: 'Jura',
    nameDE: 'Jura',
    nameFR: 'Jura',
    nameIT: 'Giura',
    center: { lat: 47.3625, lng: 7.3439 },
    path: 'M 340,140 L 380,130 L 390,180 L 360,190 L 340,170 Z',
    bounds: {
      north: 47.5039,
      south: 47.1427,
      east: 7.5577,
      west: 6.8607
    }
  }
];

// ============================================================================
// MAJOR SWISS CITIES
// ============================================================================
export const SWISS_CITIES = [
  {
    id: 'zurich',
    name: 'Zürich',
    canton: 'ZH',
    coordinates: { lat: 47.3769, lng: 8.5417 },
    population: 434335,
    importance: 10
  },
  {
    id: 'geneva',
    name: 'Genève',
    canton: 'GE',
    coordinates: { lat: 46.2044, lng: 6.1432 },
    population: 203856,
    importance: 9
  },
  {
    id: 'basel',
    name: 'Basel',
    canton: 'BS',
    coordinates: { lat: 47.5596, lng: 7.5886 },
    population: 195191,
    importance: 9
  },
  {
    id: 'lausanne',
    name: 'Lausanne',
    canton: 'VD',
    coordinates: { lat: 46.5197, lng: 6.6323 },
    population: 139408,
    importance: 8
  },
  {
    id: 'bern',
    name: 'Bern',
    canton: 'BE',
    coordinates: { lat: 46.9480, lng: 7.4474 },
    population: 133883,
    importance: 9
  },
  {
    id: 'winterthur',
    name: 'Winterthur',
    canton: 'ZH',
    coordinates: { lat: 47.4989, lng: 8.7236 },
    population: 114220,
    importance: 7
  },
  {
    id: 'lucerne',
    name: 'Luzern',
    canton: 'LU',
    coordinates: { lat: 47.0502, lng: 8.3093 },
    population: 82620,
    importance: 8
  },
  {
    id: 'stgallen',
    name: 'St. Gallen',
    canton: 'SG',
    coordinates: { lat: 47.4245, lng: 9.3767 },
    population: 75833,
    importance: 7
  },
  {
    id: 'lugano',
    name: 'Lugano',
    canton: 'TI',
    coordinates: { lat: 46.0037, lng: 8.9511 },
    population: 62315,
    importance: 7
  },
  {
    id: 'biel',
    name: 'Biel/Bienne',
    canton: 'BE',
    coordinates: { lat: 47.1368, lng: 7.2467 },
    population: 55602,
    importance: 6
  },
  {
    id: 'thun',
    name: 'Thun',
    canton: 'BE',
    coordinates: { lat: 46.7580, lng: 7.6280 },
    population: 43476,
    importance: 5
  },
  {
    id: 'koniz',
    name: 'Köniz',
    canton: 'BE',
    coordinates: { lat: 46.9241, lng: 7.4145 },
    population: 42388,
    importance: 4
  },
  {
    id: 'chur',
    name: 'Chur',
    canton: 'GR',
    coordinates: { lat: 46.8499, lng: 9.5329 },
    population: 37125,
    importance: 6
  },
  {
    id: 'schaffhausen',
    name: 'Schaffhausen',
    canton: 'SH',
    coordinates: { lat: 47.6970, lng: 8.6340 },
    population: 36952,
    importance: 5
  },
  {
    id: 'frauenfeld',
    name: 'Frauenfeld',
    canton: 'TG',
    coordinates: { lat: 47.5535, lng: 8.8989 },
    population: 25974,
    importance: 4
  },
  {
    id: 'neuchatel',
    name: 'Neuchâtel',
    canton: 'NE',
    coordinates: { lat: 46.9899, lng: 6.9293 },
    population: 33815,
    importance: 5
  },
  {
    id: 'sion',
    name: 'Sion',
    canton: 'VS',
    coordinates: { lat: 46.2333, lng: 7.3667 },
    population: 34708,
    importance: 5
  },
  {
    id: 'bellinzona',
    name: 'Bellinzona',
    canton: 'TI',
    coordinates: { lat: 46.1927, lng: 9.0232 },
    population: 43360,
    importance: 5
  },
  {
    id: 'fribourg',
    name: 'Fribourg',
    canton: 'FR',
    coordinates: { lat: 46.8025, lng: 7.1619 },
    population: 38365,
    importance: 5
  },
  {
    id: 'aarau',
    name: 'Aarau',
    canton: 'AG',
    coordinates: { lat: 47.3922, lng: 8.0444 },
    population: 21726,
    importance: 4
  },
  {
    id: 'solothurn',
    name: 'Solothurn',
    canton: 'SO',
    coordinates: { lat: 47.2088, lng: 7.5386 },
    population: 16777,
    importance: 4
  },
  {
    id: 'zug',
    name: 'Zug',
    canton: 'ZG',
    coordinates: { lat: 47.1662, lng: 8.5155 },
    population: 30934,
    importance: 5
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get canton by ID
 */
export const getCantonById = (cantonId) => {
  return SWISS_CANTONS.find(canton => canton.id === cantonId);
};

/**
 * Get canton by coordinates
 */
export const getCantonByCoordinates = (lat, lng) => {
  for (const canton of SWISS_CANTONS) {
    if (
      lat >= canton.bounds.south &&
      lat <= canton.bounds.north &&
      lng >= canton.bounds.west &&
      lng <= canton.bounds.east
    ) {
      return canton;
    }
  }
  return null;
};

/**
 * Get nearest city
 */
export const getNearestCity = (lat, lng, maxDistance = 50) => {
  let nearestCity = null;
  let minDistance = Infinity;

  for (const city of SWISS_CITIES) {
    const distance = calculateDistance(
      lat, 
      lng, 
      city.coordinates.lat, 
      city.coordinates.lng
    );
    
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  return nearestCity;
};

/**
 * Calculate distance between two points (in km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

/**
 * Get cities by canton
 */
export const getCitiesByCanton = (cantonId) => {
  return SWISS_CITIES.filter(city => city.canton === cantonId);
};

/**
 * Get canton color based on heat value
 */
export const getHeatColor = (value, max) => {
  const intensity = value / max;
  
  if (intensity === 0) return '#f0f0f0';
  if (intensity < 0.2) return '#ffe4e1';
  if (intensity < 0.4) return '#ffb3ba';
  if (intensity < 0.6) return '#ff7f86';
  if (intensity < 0.8) return '#ff4d5a';
  return '#ff1744';
};

/**
 * Generate SVG path for Switzerland outline
 */
export const SWITZERLAND_OUTLINE = 
  M 200,100 
  L 700,100 
  L 720,400 
  L 200,400 
  Z
;

/**
 * Map bounds for Switzerland
 */
export const SWITZERLAND_BOUNDS = {
  north: 47.8229,
  south: 45.8176,
  east: 10.4924,
  west: 5.9562,
  center: {
    lat: 46.8182,
    lng: 8.2275
  }
};

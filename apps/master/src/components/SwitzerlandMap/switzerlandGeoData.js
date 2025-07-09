// apps/master/src/components/SwitzerlandMap/switzerlandGeoData.js
// Simplified Switzerland Canton Boundaries GeoJSON
// Version: 1.0.0

export const cantonBoundaries = {
  type: "FeatureCollection",
  features: [
    // Zürich
    {
      type: "Feature",
      properties: {
        name: "Zürich",
        abbr: "ZH",
        capital: "Zürich",
        population: 1553423,
        area: 1729
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.3572, 47.1589],
          [8.9843, 47.1623],
          [8.9912, 47.5234],
          [8.3641, 47.5199],
          [8.3572, 47.1589]
        ]]
      }
    },

    // Bern
    {
      type: "Feature",
      properties: {
        name: "Bern",
        abbr: "BE",
        capital: "Bern",
        population: 1043132,
        area: 5959
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.8612, 46.4523],
          [8.2345, 46.4589],
          [8.2412, 47.2134],
          [6.8679, 47.2067],
          [6.8612, 46.4523]
        ]]
      }
    },

    // Luzern
    {
      type: "Feature",
      properties: {
        name: "Luzern",
        abbr: "LU",
        capital: "Luzern",
        population: 416347,
        area: 1493
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.9234, 46.8756],
          [8.4567, 46.8823],
          [8.4634, 47.2345],
          [7.9301, 47.2278],
          [7.9234, 46.8756]
        ]]
      }
    },

    // Uri
    {
      type: "Feature",
      properties: {
        name: "Uri",
        abbr: "UR",
        capital: "Altdorf",
        population: 36819,
        area: 1077
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.2345, 46.5234],
          [8.8901, 46.5301],
          [8.8968, 46.9823],
          [8.2412, 46.9756],
          [8.2345, 46.5234]
        ]]
      }
    },

    // Schwyz
    {
      type: "Feature",
      properties: {
        name: "Schwyz",
        abbr: "SZ",
        capital: "Schwyz",
        population: 162157,
        area: 908
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.4567, 46.8234],
          [8.9012, 46.8301],
          [8.9079, 47.1823],
          [8.4634, 47.1756],
          [8.4567, 46.8234]
        ]]
      }
    },

    // Obwalden
    {
      type: "Feature",
      properties: {
        name: "Obwalden",
        abbr: "OW",
        capital: "Sarnen",
        population: 38108,
        area: 491
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.9876, 46.7234],
          [8.3456, 46.7301],
          [8.3523, 46.9823],
          [7.9943, 46.9756],
          [7.9876, 46.7234]
        ]]
      }
    },

    // Nidwalden
    {
      type: "Feature",
      properties: {
        name: "Nidwalden",
        abbr: "NW",
        capital: "Stans",
        population: 43520,
        area: 276
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.2345, 46.8234],
          [8.5678, 46.8301],
          [8.5745, 47.0823],
          [8.2412, 47.0756],
          [8.2345, 46.8234]
        ]]
      }
    },

    // Glarus
    {
      type: "Feature",
      properties: {
        name: "Glarus",
        abbr: "GL",
        capital: "Glarus",
        population: 40851,
        area: 685
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.8901, 46.8234],
          [9.2345, 46.8301],
          [9.2412, 47.1823],
          [8.8968, 47.1756],
          [8.8901, 46.8234]
        ]]
      }
    },

    // Zug
    {
      type: "Feature",
      properties: {
        name: "Zug",
        abbr: "ZG",
        capital: "Zug",
        population: 128794,
        area: 239
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.3456, 47.0234],
          [8.6789, 47.0301],
          [8.6856, 47.2823],
          [8.3523, 47.2756],
          [8.3456, 47.0234]
        ]]
      }
    },

    // Fribourg
    {
      type: "Feature",
      properties: {
        name: "Fribourg",
        abbr: "FR",
        capital: "Fribourg",
        population: 325496,
        area: 1671
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.7890, 46.4234],
          [7.3456, 46.4301],
          [7.3523, 46.9823],
          [6.7957, 46.9756],
          [6.7890, 46.4234]
        ]]
      }
    },

    // Solothurn
    {
      type: "Feature",
      properties: {
        name: "Solothurn",
        abbr: "SO",
        capital: "Solothurn",
        population: 277462,
        area: 791
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.3456, 47.0234],
          [7.9012, 47.0301],
          [7.9079, 47.3823],
          [7.3523, 47.3756],
          [7.3456, 47.0234]
        ]]
      }
    },

    // Basel-Stadt
    {
      type: "Feature",
      properties: {
        name: "Basel-Stadt",
        abbr: "BS",
        capital: "Basel",
        population: 195391,
        area: 37
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.5234, 47.5234],
          [7.6789, 47.5301],
          [7.6856, 47.6823],
          [7.5301, 47.6756],
          [7.5234, 47.5234]
        ]]
      }
    },

    // Basel-Landschaft
    {
      type: "Feature",
      properties: {
        name: "Basel-Landschaft",
        abbr: "BL",
        capital: "Liestal",
        population: 290969,
        area: 518
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.3456, 47.3234],
          [7.9012, 47.3301],
          [7.9079, 47.5823],
          [7.3523, 47.5756],
          [7.3456, 47.3234]
        ]]
      }
    },

    // Schaffhausen
    {
      type: "Feature",
      properties: {
        name: "Schaffhausen",
        abbr: "SH",
        capital: "Schaffhausen",
        population: 83107,
        area: 298
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.4567, 47.6234],
          [8.9012, 47.6301],
          [8.9079, 47.8823],
          [8.4634, 47.8756],
          [8.4567, 47.6234]
        ]]
      }
    },

    // Appenzell Ausserrhoden
    {
      type: "Feature",
      properties: {
        name: "Appenzell Ausserrhoden",
        abbr: "AR",
        capital: "Herisau",
        population: 55309,
        area: 243
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [9.1234, 47.2234],
          [9.5678, 47.2301],
          [9.5745, 47.4823],
          [9.1301, 47.4756],
          [9.1234, 47.2234]
        ]]
      }
    },

    // Appenzell Innerrhoden
    {
      type: "Feature",
      properties: {
        name: "Appenzell Innerrhoden",
        abbr: "AI",
        capital: "Appenzell",
        population: 16293,
        area: 173
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [9.2345, 47.2234],
          [9.4567, 47.2301],
          [9.4634, 47.4823],
          [9.2412, 47.4756],
          [9.2345, 47.2234]
        ]]
      }
    },

    // St. Gallen
    {
      type: "Feature",
      properties: {
        name: "St. Gallen",
        abbr: "SG",
        capital: "St. Gallen",
        population: 514504,
        area: 2026
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.7890, 46.8234],
          [9.6789, 46.8301],
          [9.6856, 47.5823],
          [8.7957, 47.5756],
          [8.7890, 46.8234]
        ]]
      }
    },

    // Graubünden
    {
      type: "Feature",
      properties: {
        name: "Graubünden",
        abbr: "GR",
        capital: "Chur",
        population: 200096,
        area: 7105
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.6789, 46.1234],
          [10.4567, 46.1301],
          [10.4634, 47.0823],
          [8.6856, 47.0756],
          [8.6789, 46.1234]
        ]]
      }
    },

    // Aargau
    {
      type: "Feature",
      properties: {
        name: "Aargau",
        abbr: "AG",
        capital: "Aarau",
        population: 694072,
        area: 1404
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [7.6789, 47.1234],
          [8.4567, 47.1301],
          [8.4634, 47.6823],
          [7.6856, 47.6756],
          [7.6789, 47.1234]
        ]]
      }
    },

    // Thurgau
    {
      type: "Feature",
      properties: {
        name: "Thurgau",
        abbr: "TG",
        capital: "Frauenfeld",
        population: 282909,
        area: 991
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.7890, 47.3234],
          [9.4567, 47.3301],
          [9.4634, 47.7823],
          [8.7957, 47.7756],
          [8.7890, 47.3234]
        ]]
      }
    },

    // Ticino
    {
      type: "Feature",
      properties: {
        name: "Ticino",
        abbr: "TI",
        capital: "Bellinzona",
        population: 350986,
        area: 2812
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [8.3456, 45.8234],
          [9.2345, 45.8301],
          [9.2412, 46.5823],
          [8.3523, 46.5756],
          [8.3456, 45.8234]
        ]]
      }
    },

    // Vaud
    {
      type: "Feature",
      properties: {
        name: "Vaud",
        abbr: "VD",
        capital: "Lausanne",
        population: 815300,
        area: 3212
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.1234, 46.1234],
          [7.2345, 46.1301],
          [7.2412, 47.0823],
          [6.1301, 47.0756],
          [6.1234, 46.1234]
        ]]
      }
    },

    // Valais
    {
      type: "Feature",
      properties: {
        name: "Valais",
        abbr: "VS",
        capital: "Sion",
        population: 348503,
        area: 5224
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.7890, 45.8234],
          [8.4567, 45.8301],
          [8.4634, 46.6823],
          [6.7957, 46.6756],
          [6.7890, 45.8234]
        ]]
      }
    },

    // Neuchâtel
    {
      type: "Feature",
      properties: {
        name: "Neuchâtel",
        abbr: "NE",
        capital: "Neuchâtel",
        population: 176496,
        area: 803
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.4567, 46.8234],
          [7.1234, 46.8301],
          [7.1301, 47.2823],
          [6.4634, 47.2756],
          [6.4567, 46.8234]
        ]]
      }
    },

    // Genève
    {
      type: "Feature",
      properties: {
        name: "Genève",
        abbr: "GE",
        capital: "Genève",
        population: 509448,
        area: 282
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [5.9567, 46.1234],
          [6.3012, 46.1301],
          [6.3079, 46.3823],
          [5.9634, 46.3756],
          [5.9567, 46.1234]
        ]]
      }
    },

    // Jura
    {
      type: "Feature",
      properties: {
        name: "Jura",
        abbr: "JU",
        capital: "Delémont",
        population: 73709,
        area: 839
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [6.8901, 47.0234],
          [7.5678, 47.0301],
          [7.5745, 47.4823],
          [6.8968, 47.4756],
          [6.8901, 47.0234]
        ]]
      }
    }
  ]
};

// Canton centers for quick lookup
export const cantonCenters = {
  ZH: { lat: 47.3769, lng: 8.5417 },
  BE: { lat: 46.9480, lng: 7.4474 },
  LU: { lat: 47.0502, lng: 8.3093 },
  UR: { lat: 46.8868, lng: 8.6340 },
  SZ: { lat: 47.0207, lng: 8.6530 },
  OW: { lat: 46.8779, lng: 8.2512 },
  NW: { lat: 46.9567, lng: 8.3660 },
  GL: { lat: 47.0403, lng: 9.0682 },
  ZG: { lat: 47.1662, lng: 8.5154 },
  FR: { lat: 46.8065, lng: 7.1615 },
  SO: { lat: 47.2088, lng: 7.5323 },
  BS: { lat: 47.5596, lng: 7.5886 },
  BL: { lat: 47.4425, lng: 7.7644 },
  SH: { lat: 47.6970, lng: 8.6319 },
  AR: { lat: 47.3829, lng: 9.2796 },
  AI: { lat: 47.3165, lng: 9.4164 },
  SG: { lat: 47.4245, lng: 9.3767 },
  GR: { lat: 46.8182, lng: 9.5550 },
  AG: { lat: 47.3887, lng: 8.0456 },
  TG: { lat: 47.5539, lng: 9.0557 },
  TI: { lat: 46.3317, lng: 8.8005 },
  VD: { lat: 46.5197, lng: 6.6323 },
  VS: { lat: 46.2270, lng: 7.6207 },
  NE: { lat: 46.9900, lng: 6.9293 },
  GE: { lat: 46.2044, lng: 6.1432 },
  JU: { lat: 47.3671, lng: 7.3439 }
};

// Canton colors for theming
export const cantonColors = {
  ZH: '#0066CC',
  BE: '#FFCC00',
  LU: '#0033A0',
  UR: '#FFD700',
  SZ: '#DC143C',
  OW: '#DC143C',
  NW: '#DC143C',
  GL: '#006600',
  ZG: '#0066CC',
  FR: '#000000',
  SO: '#DC143C',
  BS: '#000000',
  BL: '#DC143C',
  SH: '#FFD700',
  AR: '#000000',
  AI: '#000000',
  SG: '#006600',
  GR: '#0033A0',
  AG: '#0066CC',
  TG: '#006600',
  TI: '#0066CC',
  VD: '#006600',
  VS: '#DC143C',
  NE: '#006600',
  GE: '#DC143C',
  JU: '#DC143C'
};

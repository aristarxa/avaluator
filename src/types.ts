// ============================================================
// Avalancher — core type contracts
// ============================================================

/** Risk color for a slope polygon */
export type RiskColor = 'gray' | 'green' | 'yellow' | 'red';

/** Elevation range bands for weather data */
export type ElevationBand = '1000-1300' | '1300-1600' | '1600-2000' | '2000+';

/** Resort names */
export type Resort = 'Роза' | 'Лаура' | 'Альпика' | 'Красная Поляна';

/**
 * Slope steepness score:
 * 0 = less than 30 degrees (no risk bonus)
 * 1 = between 30 and 35 degrees (+1 point)
 * 2 = more than 35 degrees (+2 points)
 */
export type Steepness = 0 | 1 | 2;

/** Slope assessment parameters */
export interface SlopeScore {
  /** Steepness category: 0 = <30°, 1 = 30-35°, 2 = >35° */
  steepness: Steepness;
  /** Terrain traps present (gullies, trees, cliffs): +1 */
  terrainTraps: boolean;
  /** Convex shape or no support from below: +1 */
  convexShape: boolean;
  /** Open forest / alpine zone / clearcut (crowns don't close): +1 */
  forestDensity: boolean;
}

/** Weather conditions assessment for one elevation band */
export interface WeatherScore {
  /** Regional avalanche danger level ≥ 3: +1 */
  dangerLevel3: boolean;
  /** Persistent weak layers present: +1 */
  weakLayers: boolean;
  /** Signs of slab avalanche today/yesterday: +1 */
  slabAvalanche: boolean;
  /** Signs of instability (whumpfing, cracks, hollow sounds): +1 */
  instability: boolean;
  /** Loading within 48h (≥30 cm snow, wind transport, rain): +1 */
  recentLoading: boolean;
  /** Critical warming (temp rise, wet snow surface): +1 */
  criticalWarming: boolean;
  /** ISO date string when this assessment was last saved */
  lastUpdated: string | null;
}

/** Weather data indexed by elevation band */
export type WeatherData = Record<ElevationBand, WeatherScore>;

/** A slope polygon drawn on the map */
export interface SlopePolygon {
  id: string;
  name: string;
  resort: Resort | null;
  /** Minimum elevation in meters */
  elevationMin: number | null;
  /** Maximum elevation in meters */
  elevationMax: number | null;
  /** GeoJSON ring: array of [longitude, latitude] pairs (closed) */
  coordinates: [number, number][];
  slopeScore: SlopeScore;
  /** Computed risk color — recalculated on every save */
  color: RiskColor;
}

/** Root shape stored in localStorage */
export interface AppStorage {
  slopes: SlopePolygon[];
  weather: WeatherData;
}

// ============================================================
// Default / empty factory helpers
// ============================================================

export function defaultSlopeScore(): SlopeScore {
  return { steepness: 0, terrainTraps: false, convexShape: false, forestDensity: false };
}

export const ALL_BANDS: ElevationBand[] = ['1000-1300', '1300-1600', '1600-2000', '2000+'];

export function defaultWeatherScore(): WeatherScore {
  return {
    dangerLevel3: false,
    weakLayers: false,
    slabAvalanche: false,
    instability: false,
    recentLoading: false,
    criticalWarming: false,
    lastUpdated: null
  };
}

export function defaultWeatherData(): WeatherData {
  return {
    '1000-1300': defaultWeatherScore(),
    '1300-1600': defaultWeatherScore(),
    '1600-2000': defaultWeatherScore(),
    '2000+': defaultWeatherScore()
  };
}

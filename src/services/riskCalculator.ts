import type { SlopePolygon, WeatherData, RiskColor, ElevationBand, WeatherScore } from '../types';
import { ALL_BANDS } from '../types';

/**
 * Risk matrix: RISK_MATRIX[weatherScore][slopeScore]
 * weatherScore: 0-6 (rows)
 * slopeScore:   0-5 (columns)
 */
const RISK_MATRIX: RiskColor[][] = [
  // slope:    0         1         2         3         4         5
  /* w=0 */ ['green',  'green',  'green',  'green',  'green',  'yellow'],
  /* w=1 */ ['green',  'green',  'yellow', 'yellow', 'yellow', 'yellow'],
  /* w=2 */ ['green',  'yellow', 'yellow', 'yellow', 'yellow', 'red'],
  /* w=3 */ ['green',  'yellow', 'yellow', 'yellow', 'red',    'red'],
  /* w=4 */ ['green',  'yellow', 'yellow', 'red',    'red',    'red'],
  /* w=5 */ ['yellow', 'yellow', 'red',    'red',    'red',    'red'],
  /* w=6 */ ['red',    'red',    'red',    'red',    'red',    'red']
];

/** Compute total slope score (0-5) from SlopePolygon */
export function calcSlopeScore(slope: SlopePolygon): number {
  const s = slope.slopeScore;
  const score = s.steepness + (s.terrainTraps ? 1 : 0) + (s.convexShape ? 1 : 0) + (s.forestDensity ? 1 : 0);
  return Math.min(score, 5);
}

/** Compute total weather score (0-6) for a single band */
export function calcWeatherBandScore(ws: WeatherScore): number {
  return [
    ws.dangerLevel3,
    ws.weakLayers,
    ws.slabAvalanche,
    ws.instability,
    ws.recentLoading,
    ws.criticalWarming
  ].filter(Boolean).length;
}

/**
 * Determine which elevation bands overlap the slope's elevation range.
 */
function getOverlappingBands(elevMin: number, elevMax: number): ElevationBand[] {
  const BAND_RANGES: Record<ElevationBand, [number, number]> = {
    '1000-1300': [1000, 1300],
    '1300-1600': [1300, 1600],
    '1600-2000': [1600, 2000],
    '2000+':     [2000, 9000]
  };

  return ALL_BANDS.filter(band => {
    const [lo, hi] = BAND_RANGES[band];
    return elevMin < hi && elevMax > lo;
  });
}

/**
 * Step 2.2 — Main risk color calculator.
 * Returns 'gray' if slope or weather data is insufficient.
 */
export function calculateRiskColor(slope: SlopePolygon, weather: WeatherData): RiskColor {
  // No elevation data — can't match weather band
  if (slope.elevationMin === null || slope.elevationMax === null) return 'gray';
  if (slope.elevationMin >= slope.elevationMax) return 'gray';

  const overlapping = getOverlappingBands(slope.elevationMin, slope.elevationMax);
  if (overlapping.length === 0) return 'gray';

  // Pick the band with the maximum weather score among overlapping bands
  let maxWeatherScore = -1;
  for (const band of overlapping) {
    const ws = weather[band];
    if (!ws.lastUpdated) continue; // band not filled in
    const score = calcWeatherBandScore(ws);
    if (score > maxWeatherScore) maxWeatherScore = score;
  }

  // No weather data filled in for any overlapping band
  if (maxWeatherScore < 0) return 'gray';

  const slopeScore = calcSlopeScore(slope);
  const wIdx = Math.min(maxWeatherScore, 6);
  const sIdx = Math.min(slopeScore, 5);

  return RISK_MATRIX[wIdx][sIdx];
}

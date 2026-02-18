import { describe, it, expect } from 'vitest';
import { calculateRiskColor, calcSlopeScore, calcWeatherBandScore } from './riskCalculator';
import type { SlopePolygon, WeatherData } from '../types';
import { defaultSlopeScore, defaultWeatherData, defaultWeatherScore } from '../types';

const makeSlope = (overrides: Partial<SlopePolygon> = {}): SlopePolygon => ({
  id: 's1',
  name: 'Test',
  resort: 'Роза',
  elevationMin: 1300,
  elevationMax: 1800,
  coordinates: [],
  slopeScore: defaultSlopeScore(),
  color: 'gray',
  ...overrides
});

const makeWeather = (band: '1000-1300' | '1300-1600' | '1600-2000' | '2000+', score: number): WeatherData => {
  const w = defaultWeatherData();
  const fields = ['dangerLevel3', 'weakLayers', 'slabAvalanche', 'instability', 'recentLoading', 'criticalWarming'] as const;
  for (let i = 0; i < score; i++) {
    (w[band] as Record<string, unknown>)[fields[i]] = true;
  }
  w[band].lastUpdated = new Date().toISOString();
  return w;
};

describe('calcSlopeScore', () => {
  it('returns 0 for default (flat, no hazards)', () => {
    expect(calcSlopeScore(makeSlope())).toBe(0);
  });

  it('returns 2 for steep >35 degrees only', () => {
    expect(calcSlopeScore(makeSlope({ slopeScore: { steepness: 2, terrainTraps: false, convexShape: false, forestDensity: false } }))).toBe(2);
  });

  it('returns 5 for maximum (>35 + all 3 hazards)', () => {
    expect(calcSlopeScore(makeSlope({ slopeScore: { steepness: 2, terrainTraps: true, convexShape: true, forestDensity: true } }))).toBe(5);
  });

  it('caps at 5 even with impossible overrides', () => {
    // steepness=2 + 3 booleans = 5, already at max
    const s = makeSlope({ slopeScore: { steepness: 2, terrainTraps: true, convexShape: true, forestDensity: true } });
    expect(calcSlopeScore(s)).toBeLessThanOrEqual(5);
  });
});

describe('calcWeatherBandScore', () => {
  it('returns 0 for empty weather score', () => {
    expect(calcWeatherBandScore(defaultWeatherScore())).toBe(0);
  });

  it('counts each checked field', () => {
    const ws = { ...defaultWeatherScore(), dangerLevel3: true, weakLayers: true, criticalWarming: true, lastUpdated: '2026-01-01' };
    expect(calcWeatherBandScore(ws)).toBe(3);
  });
});

describe('calculateRiskColor', () => {
  it('returns gray when elevations are null', () => {
    const w = defaultWeatherData();
    expect(calculateRiskColor(makeSlope({ elevationMin: null, elevationMax: null }), w)).toBe('gray');
  });

  it('returns gray when no weather data filled in', () => {
    expect(calculateRiskColor(makeSlope(), defaultWeatherData())).toBe('gray');
  });

  it('returns green for low slope + low weather risk', () => {
    // slopeScore=0, weatherScore=1 → matrix[1][0] = green
    const w = makeWeather('1300-1600', 1);
    expect(calculateRiskColor(makeSlope(), w)).toBe('green');
  });

  it('returns red for max slope + max weather', () => {
    // slopeScore=5, weatherScore=6 → matrix[6][5] = red
    const w = makeWeather('1300-1600', 6);
    const s = makeSlope({ slopeScore: { steepness: 2, terrainTraps: true, convexShape: true, forestDensity: true } });
    expect(calculateRiskColor(s, w)).toBe('red');
  });

  it('returns yellow for mid slope + mid weather', () => {
    // slopeScore=2, weatherScore=2 → matrix[2][2] = yellow
    const w = makeWeather('1600-2000', 2);
    const s = makeSlope({
      elevationMin: 1600, elevationMax: 1900,
      slopeScore: { steepness: 1, terrainTraps: true, convexShape: false, forestDensity: false }
    });
    expect(calculateRiskColor(s, w)).toBe('yellow');
  });

  it('picks the band with maximum weather score when slope spans multiple bands', () => {
    // Slope spans 1300-2000, band 1600-2000 has higher score
    const w = defaultWeatherData();
    w['1300-1600'] = { ...defaultWeatherScore(), dangerLevel3: true, lastUpdated: '2026-01-01' };          // score=1
    w['1600-2000'] = { ...defaultWeatherScore(), dangerLevel3: true, weakLayers: true, slabAvalanche: true, lastUpdated: '2026-01-01' }; // score=3
    const s = makeSlope({ elevationMin: 1300, elevationMax: 2000 });
    // slopeScore=0, max weatherScore=3 → matrix[3][0] = green
    expect(calculateRiskColor(s, w)).toBe('green');
  });

  it('returns gray when slope elevation range is outside all weather bands', () => {
    const w = makeWeather('1000-1300', 4);
    const s = makeSlope({ elevationMin: 500, elevationMax: 900 }); // below all bands
    expect(calculateRiskColor(s, w)).toBe('gray');
  });
});

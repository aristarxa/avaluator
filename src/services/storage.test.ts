import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from './storage';
import type { SlopePolygon } from '../types';
import { defaultSlopeScore } from '../types';

// Vitest runs in jsdom which provides localStorage
const makeSlope = (overrides: Partial<SlopePolygon> = {}): SlopePolygon => ({
  id: 'test-id-1',
  name: 'Тестовый склон',
  resort: 'Роза',
  elevationMin: 1200,
  elevationMax: 1800,
  coordinates: [[40.0, 43.7], [40.1, 43.7], [40.1, 43.8]],
  slopeScore: defaultSlopeScore(),
  color: 'gray',
  ...overrides
});

describe('StorageService — slopes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no slopes saved', () => {
    expect(storageService.getSlopes()).toEqual([]);
  });

  it('saves and retrieves a slope', () => {
    const slope = makeSlope();
    storageService.saveSlope(slope);
    const result = storageService.getSlopes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-id-1');
    expect(result[0].name).toBe('Тестовый склон');
  });

  it('updates existing slope on re-save', () => {
    const slope = makeSlope();
    storageService.saveSlope(slope);
    storageService.saveSlope({ ...slope, name: 'Обновлённый', color: 'red' });
    const all = storageService.getSlopes();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Обновлённый');
    expect(all[0].color).toBe('red');
  });

  it('saves multiple slopes', () => {
    storageService.saveSlope(makeSlope({ id: 'a' }));
    storageService.saveSlope(makeSlope({ id: 'b' }));
    expect(storageService.getSlopes()).toHaveLength(2);
  });

  it('deletes a slope by id', () => {
    storageService.saveSlope(makeSlope({ id: 'a' }));
    storageService.saveSlope(makeSlope({ id: 'b' }));
    storageService.deleteSlope('a');
    const all = storageService.getSlopes();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('b');
  });

  it('does nothing when deleting non-existent id', () => {
    storageService.saveSlope(makeSlope());
    storageService.deleteSlope('non-existent');
    expect(storageService.getSlopes()).toHaveLength(1);
  });
});

describe('StorageService — weather', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns default weather when nothing saved', () => {
    const w = storageService.getWeather();
    expect(w['1000-1300']).toBeDefined();
    expect(w['1000-1300'].lastUpdated).toBeNull();
  });

  it('saves and retrieves weather', () => {
    const w = storageService.getWeather();
    w['1300-1600'].dangerLevel3 = true;
    w['1300-1600'].lastUpdated = '2026-02-18T10:00:00.000Z';
    storageService.saveWeather(w);
    const loaded = storageService.getWeather();
    expect(loaded['1300-1600'].dangerLevel3).toBe(true);
    expect(loaded['1300-1600'].lastUpdated).toBe('2026-02-18T10:00:00.000Z');
  });
});

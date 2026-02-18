import type { SlopePolygon, WeatherData } from '../types';
import { defaultWeatherData } from '../types';

const SLOPES_KEY = 'avalancher_slopes';
const WEATHER_KEY = 'avalancher_weather';

class StorageService {
  // ---- Slopes ----

  getSlopes(): SlopePolygon[] {
    try {
      const raw = localStorage.getItem(SLOPES_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SlopePolygon[];
    } catch {
      return [];
    }
  }

  saveSlope(slope: SlopePolygon): void {
    const slopes = this.getSlopes();
    const idx = slopes.findIndex(s => s.id === slope.id);
    if (idx >= 0) {
      slopes[idx] = slope;
    } else {
      slopes.push(slope);
    }
    localStorage.setItem(SLOPES_KEY, JSON.stringify(slopes));
  }

  deleteSlope(id: string): void {
    const slopes = this.getSlopes().filter(s => s.id !== id);
    localStorage.setItem(SLOPES_KEY, JSON.stringify(slopes));
  }

  // ---- Weather ----

  getWeather(): WeatherData {
    try {
      const raw = localStorage.getItem(WEATHER_KEY);
      if (!raw) return defaultWeatherData();
      return JSON.parse(raw) as WeatherData;
    } catch {
      return defaultWeatherData();
    }
  }

  saveWeather(data: WeatherData): void {
    localStorage.setItem(WEATHER_KEY, JSON.stringify(data));
  }
}

export const storageService = new StorageService();

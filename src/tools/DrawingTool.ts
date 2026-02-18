import maplibregl from 'maplibre-gl';

const PREVIEW_SOURCE = 'drawing-preview';
const PREVIEW_LINE_LAYER = 'drawing-line';
const PREVIEW_FILL_LAYER = 'drawing-fill';
const PREVIEW_POINTS_LAYER = 'drawing-points';
const CLOSE_RADIUS_PX = 15;

type Coordinate = [number, number];

/**
 * Step 2.3 — Drawing tool for polygon creation on a MapLibre map.
 * Handles click-based point placement, preview rendering,
 * polygon closing (by clicking near first point or on deactivate).
 */
export class DrawingTool {
  private map: maplibregl.Map;
  private points: Coordinate[] = [];
  private active = false;
  private onComplete: (coordinates: Coordinate[]) => void;
  private clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  constructor(map: maplibregl.Map, onComplete: (coordinates: Coordinate[]) => void) {
    this.map = map;
    this.onComplete = onComplete;
    this.initPreviewLayers();
  }

  private initPreviewLayers(): void {
    const map = this.map;

    if (!map.getSource(PREVIEW_SOURCE)) {
      map.addSource(PREVIEW_SOURCE, {
        type: 'geojson',
        data: this.buildPreviewGeoJSON()
      });
    }

    if (!map.getLayer(PREVIEW_FILL_LAYER)) {
      map.addLayer({
        id: PREVIEW_FILL_LAYER,
        type: 'fill',
        source: PREVIEW_SOURCE,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#808080',
          'fill-opacity': 0.3
        }
      });
    }

    if (!map.getLayer(PREVIEW_LINE_LAYER)) {
      map.addLayer({
        id: PREVIEW_LINE_LAYER,
        type: 'line',
        source: PREVIEW_SOURCE,
        filter: ['in', '$type', 'LineString', 'Polygon'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-dasharray': [4, 2]
        }
      });
    }

    if (!map.getLayer(PREVIEW_POINTS_LAYER)) {
      map.addLayer({
        id: PREVIEW_POINTS_LAYER,
        type: 'circle',
        source: PREVIEW_SOURCE,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#333333',
          'circle-stroke-width': 2
        }
      });
    }
  }

  private buildPreviewGeoJSON(): GeoJSON.FeatureCollection {
    if (this.points.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: GeoJSON.Feature[] = [];

    // Point markers
    for (const pt of this.points) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: {}
      });
    }

    // Line connecting points
    if (this.points.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: this.points },
        properties: {}
      });
    }

    // Close preview polygon if 3+ points
    if (this.points.length >= 3) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...this.points, this.points[0]]] },
        properties: {}
      });
    }

    return { type: 'FeatureCollection', features };
  }

  private updatePreview(): void {
    const source = this.map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData(this.buildPreviewGeoJSON());
  }

  private clearPreview(): void {
    const source = this.map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: 'FeatureCollection', features: [] });
  }

  /** Returns screen distance in pixels between a map point and a coordinate */
  private screenDistance(a: Coordinate, b: Coordinate): number {
    const pa = this.map.project(a as maplibregl.LngLatLike);
    const pb = this.map.project(b as maplibregl.LngLatLike);
    return Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.points = [];
    this.map.getCanvas().style.cursor = 'crosshair';

    this.clickHandler = (e: maplibregl.MapMouseEvent) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const clickedCoord: Coordinate = [lng, lat];

      // Check if clicking near the first point to close the polygon
      if (this.points.length >= 3) {
        const distToFirst = this.screenDistance(clickedCoord, this.points[0]);
        if (distToFirst <= CLOSE_RADIUS_PX) {
          this.finishPolygon();
          return;
        }
      }

      this.points.push(clickedCoord);
      this.updatePreview();
    };

    this.map.on('click', this.clickHandler);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.map.getCanvas().style.cursor = '';

    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }

    if (this.points.length >= 3) {
      this.finishPolygon();
    } else {
      this.reset();
    }
  }

  private finishPolygon(): void {
    const coords = [...this.points];
    this.reset();
    this.onComplete(coords);
  }

  reset(): void {
    this.points = [];
    this.clearPreview();
  }

  isActive(): boolean {
    return this.active;
  }
}

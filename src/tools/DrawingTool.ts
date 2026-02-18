import maplibregl from 'maplibre-gl';

const PREVIEW_SOURCE       = 'drawing-preview';
const PREVIEW_FILL_LAYER   = 'drawing-fill';
const PREVIEW_LINE_LAYER   = 'drawing-line';
const PREVIEW_POINTS_LAYER = 'drawing-points';
const CLOSE_RADIUS_PX      = 20;  // px radius to snap-close polygon

type Coord = [number, number];  // [lng, lat]

export class DrawingTool {
  private map: maplibregl.Map;
  private points: Coord[] = [];
  private active = false;
  private onComplete: (coordinates: Coord[]) => void;
  private clickHandler: ((e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) => void) | null = null;

  constructor(map: maplibregl.Map, onComplete: (coordinates: Coord[]) => void) {
    this.map = map;
    this.onComplete = onComplete;
    this.initPreviewLayers();
  }

  private initPreviewLayers(): void {
    const map = this.map;
    if (map.getSource(PREVIEW_SOURCE)) return;

    map.addSource(PREVIEW_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: PREVIEW_FILL_LAYER,
      type: 'fill',
      source: PREVIEW_SOURCE,
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#1565C0', 'fill-opacity': 0.2 }
    });

    map.addLayer({
      id: PREVIEW_LINE_LAYER,
      type: 'line',
      source: PREVIEW_SOURCE,
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
        'line-dasharray': [4, 2]
      }
    });

    map.addLayer({
      id: PREVIEW_POINTS_LAYER,
      type: 'circle',
      source: PREVIEW_SOURCE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#1565C0',
        'circle-stroke-width': 2
      }
    });
  }

  private buildGeoJSON(): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    const pts = this.points;

    // Dot markers for each placed point
    pts.forEach(p => features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: {}
    }));

    // Preview line
    if (pts.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pts },
        properties: {}
      });
    }

    // Preview filled polygon (closed)
    if (pts.length >= 3) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
        properties: {}
      });
    }

    return { type: 'FeatureCollection', features };
  }

  private updatePreview(): void {
    (this.map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource)
      ?.setData(this.buildGeoJSON());
  }

  private clearPreview(): void {
    (this.map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource)
      ?.setData({ type: 'FeatureCollection', features: [] });
  }

  /** Pixel distance between two [lng,lat] coords on screen */
  private pxDist(a: Coord, b: Coord): number {
    const pa = this.map.project(new maplibregl.LngLat(a[0], a[1]));
    const pb = this.map.project(new maplibregl.LngLat(b[0], b[1]));
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.points = [];
    this.clearPreview();
    this.map.getCanvas().style.cursor = 'crosshair';

    this.clickHandler = (e) => {
      // If this click was already handled by a slope polygon — ignore
      if (e.originalEvent.defaultPrevented) return;

      const coord: Coord = [e.lngLat.lng, e.lngLat.lat];

      // Snap-close if clicking near first point (min 3 points already placed)
      if (this.points.length >= 3) {
        if (this.pxDist(coord, this.points[0]) <= CLOSE_RADIUS_PX) {
          this.finishPolygon();
          return;
        }
      }

      this.points.push(coord);
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
    // Pass raw (unclosed) points — slopesLayer.ts handles closing
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

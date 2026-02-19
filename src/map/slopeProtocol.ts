/**
 * slopeProtocol.ts
 *
 * Registers a custom MapLibre protocol "slope://" that:
 *  1. Fetches the 3×3 neighbourhood of MapTiler terrain-rgb-v2 tiles
 *     centred on the requested tile.
 *  2. Decodes RGB → elevation (mapbox encoding).
 *  3. Runs a Sobel kernel to compute dX/dY gradients.
 *  4. Converts gradient magnitude → slope angle (degrees).
 *  5. Maps angle → RGBA colour using the CalTopo avalanche palette.
 *  6. Returns a 256×256 PNG blob.
 *
 * Usage:
 *   registerSlopeProtocol(apiKey);
 *   map.addSource('slope-src', { type: 'raster', tiles: ['slope://{z}/{x}/{y}'], tileSize: 256 });
 */

import maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------------------
// Avalanche colour palette (CalTopo-compatible)
// angle → [R, G, B, A]
// ---------------------------------------------------------------------------
const PALETTE: Array<[number, [number, number, number, number]]> = [
  [0,   [0,   0,   0,   0  ]],   // < 27° transparent
  [27,  [255, 255, 255, 220]],   // 27-30° white
  [30,  [0,   200, 0,   220]],   // 30-34° green
  [34,  [255, 220, 0,   220]],   // 34-38° yellow
  [38,  [255, 120, 0,   220]],   // 38-42° orange
  [42,  [220, 0,   0,   220]],   // 42-45° red
  [45,  [160, 0,   160, 220]],   // 45-50° violet
  [50,  [0,   0,   200, 220]],   // 50°+ blue
  [90,  [0,   0,   200, 220]],
];

function angleToColor(deg: number): [number, number, number, number] {
  if (deg < PALETTE[0][0]) return PALETTE[0][1];
  for (let i = 1; i < PALETTE.length; i++) {
    if (deg < PALETTE[i][0]) {
      const t = (deg - PALETTE[i - 1][0]) / (PALETTE[i][0] - PALETTE[i - 1][0]);
      const a = PALETTE[i - 1][1];
      const b = PALETTE[i][1];
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
        Math.round(a[3] + (b[3] - a[3]) * t),
      ];
    }
  }
  return PALETTE[PALETTE.length - 1][1];
}

// ---------------------------------------------------------------------------
// Decode MapTiler terrain-rgb-v2 pixel → elevation in metres
// ---------------------------------------------------------------------------
function decodeElevation(r: number, g: number, b: number): number {
  return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

// ---------------------------------------------------------------------------
// Fetch a single terrain-rgb tile and return its ImageData (256×256)
// ---------------------------------------------------------------------------
async function fetchTilePixels(
  z: number, x: number, y: number,
  apiKey: string
): Promise<ImageData | null> {
  const url =
    `https://api.maptiler.com/tiles/terrain-rgb-v2/${z}/${x}/${y}.webp?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, 256, 256);
    return ctx.getImageData(0, 0, 256, 256);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build a 768×768 elevation grid from 3×3 tile neighbourhood
// ---------------------------------------------------------------------------
async function buildElevationGrid(
  z: number, cx: number, cy: number,
  apiKey: string
): Promise<Float32Array> {
  const SIZE = 256;
  const GRID = SIZE * 3; // 768
  const elev = new Float32Array(GRID * GRID);

  const tiles = await Promise.all(
    [-1, 0, 1].flatMap(dy =>
      [-1, 0, 1].map(async dx => ({
        dx, dy,
        data: await fetchTilePixels(z, cx + dx, cy + dy, apiKey)
      }))
    )
  );

  for (const { dx, dy, data } of tiles) {
    const ox = (dx + 1) * SIZE;
    const oy = (dy + 1) * SIZE;
    if (!data) continue;
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const si = (py * SIZE + px) * 4;
        const di = (oy + py) * GRID + (ox + px);
        elev[di] = decodeElevation(data.data[si], data.data[si + 1], data.data[si + 2]);
      }
    }
  }
  return elev;
}

// ---------------------------------------------------------------------------
// Metres per pixel at given zoom and latitude
// ---------------------------------------------------------------------------
function metersPerPixel(z: number, lat: number): number {
  // WGS84 equatorial radius
  return (2 * Math.PI * 6378137 * Math.cos((lat * Math.PI) / 180)) /
    (256 * Math.pow(2, z));
}

// Tile centre latitude from Y tile coordinate
function tileLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// ---------------------------------------------------------------------------
// Sobel slope calculation + colour mapping → PNG blob
// ---------------------------------------------------------------------------
async function renderSlopeTile(
  z: number, x: number, y: number,
  apiKey: string
): Promise<Blob> {
  const SIZE = 256;
  const GRID = SIZE * 3;

  const elev = await buildElevationGrid(z, x, y, apiKey);
  const res = metersPerPixel(z, tileLat(y, z));

  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(SIZE, SIZE);
  const px = imgData.data;

  // Offset into the centre tile within the 3×3 grid
  const offY = SIZE;
  const offX = SIZE;

  for (let py = 0; py < SIZE; py++) {
    for (let pxIdx = 0; pxIdx < SIZE; pxIdx++) {
      const gy = offY + py;
      const gx = offX + pxIdx;

      // Sobel kernel (3×3) for dX and dY
      const tl = elev[(gy - 1) * GRID + (gx - 1)];
      const tc = elev[(gy - 1) * GRID + (gx    )];
      const tr = elev[(gy - 1) * GRID + (gx + 1)];
      const ml = elev[(gy    ) * GRID + (gx - 1)];
      const mr = elev[(gy    ) * GRID + (gx + 1)];
      const bl = elev[(gy + 1) * GRID + (gx - 1)];
      const bc = elev[(gy + 1) * GRID + (gx    )];
      const br = elev[(gy + 1) * GRID + (gx + 1)];

      const dZdX = ((tr + 2 * mr + br) - (tl + 2 * ml + bl)) / (8 * res);
      const dZdY = ((bl + 2 * bc + br) - (tl + 2 * tc + tr)) / (8 * res);

      const slopeDeg = Math.atan(Math.sqrt(dZdX * dZdX + dZdY * dZdY)) * (180 / Math.PI);

      const [r, g, b, a] = angleToColor(slopeDeg);
      const i = (py * SIZE + pxIdx) * 4;
      px[i    ] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

// ---------------------------------------------------------------------------
// Public API: register protocol + cleanup
// ---------------------------------------------------------------------------
let registered = false;

export function registerSlopeProtocol(apiKey: string): void {
  if (registered) return;
  registered = true;

  maplibregl.addProtocol('slope', async (params) => {
    // params.url === "slope://14/10014/5978"
    const parts = params.url.replace('slope://', '').split('/');
    const z = parseInt(parts[0], 10);
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      throw new Error(`[SlopeProtocol] invalid tile URL: ${params.url}`);
    }

    const blob = await renderSlopeTile(z, x, y, apiKey);
    const arrayBuffer = await blob.arrayBuffer();
    return { data: arrayBuffer };
  });
}

export function unregisterSlopeProtocol(): void {
  if (!registered) return;
  maplibregl.removeProtocol('slope');
  registered = false;
}

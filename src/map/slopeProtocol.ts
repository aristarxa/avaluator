/**
 * slopeProtocol.ts
 *
 * Custom MapLibre protocol "slope://" — client-side slope shading.
 *
 * Pipeline:
 *  1. Fetch 3×3 neighbourhood of MapTiler terrain-rgb-v2 tiles.
 *  2. Decode RGB → elevation (mapbox encoding).
 *  3. Apply 5×5 Gaussian blur to elevation grid (removes quantisation noise).
 *  4. Sobel gradient → slope angle in degrees.
 *  5. Linearly interpolate CalTopo avalanche palette.
 *  6. Return 256×256 PNG.
 */

import maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------------------
// Avalanche palette — CalTopo-compatible
// ---------------------------------------------------------------------------
const PALETTE: Array<[number, [number, number, number, number]]> = [
  [0,   [0,   0,   0,   0  ]],
  [27,  [255, 255, 255, 0  ]],   // ramp to transparent below 27°
  [30,  [0,   200, 0,   200]],   // green
  [34,  [255, 220, 0,   210]],   // yellow
  [38,  [255, 120, 0,   215]],   // orange
  [42,  [220, 0,   0,   215]],   // red
  [45,  [160, 0,   160, 215]],   // violet
  [50,  [0,   0,   200, 215]],   // blue
  [90,  [0,   0,   200, 215]],
];

function angleToColor(deg: number): [number, number, number, number] {
  if (deg <= PALETTE[0][0]) return [0, 0, 0, 0];
  for (let i = 1; i < PALETTE.length; i++) {
    if (deg <= PALETTE[i][0]) {
      const t = (deg - PALETTE[i - 1][0]) / (PALETTE[i][0] - PALETTE[i - 1][0]);
      const a = PALETTE[i - 1][1];
      const b = PALETTE[i    ][1];
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
// Elevation decode: MapTiler terrain-rgb-v2 (mapbox encoding)
// ---------------------------------------------------------------------------
function decodeElevation(r: number, g: number, b: number): number {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

// ---------------------------------------------------------------------------
// 5×5 Gaussian kernel (sigma ≈ 1.0) — pre-normalised
// ---------------------------------------------------------------------------
const GAUSS5: number[] = [
  1,  4,  7,  4, 1,
  4, 16, 26, 16, 4,
  7, 26, 41, 26, 7,
  4, 16, 26, 16, 4,
  1,  4,  7,  4, 1,
];
const GAUSS5_SUM = GAUSS5.reduce((s, v) => s + v, 0); // 273

function gaussianBlur5(src: Float32Array, width: number, height: number): Float32Array {
  const dst = new Float32Array(src.length);
  const R = 2; // kernel radius
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      let wsum = 0;
      for (let ky = -R; ky <= R; ky++) {
        const ny = Math.min(Math.max(y + ky, 0), height - 1);
        for (let kx = -R; kx <= R; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), width - 1);
          const w  = GAUSS5[(ky + R) * 5 + (kx + R)];
          acc  += src[ny * width + nx] * w;
          wsum += w;
        }
      }
      dst[y * width + x] = acc / wsum;
    }
  }
  return dst;
}

// ---------------------------------------------------------------------------
// Fetch a terrain-rgb tile → ImageData
// ---------------------------------------------------------------------------
async function fetchTilePixels(
  z: number, x: number, y: number,
  apiKey: string
): Promise<ImageData | null> {
  const url = `https://api.maptiler.com/tiles/terrain-rgb-v2/${z}/${x}/${y}.webp?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob   = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(256, 256);
    const ctx    = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, 256, 256);
    return ctx.getImageData(0, 0, 256, 256);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build 768×768 blurred elevation grid from 3×3 tile neighbourhood
// ---------------------------------------------------------------------------
async function buildElevationGrid(
  z: number, cx: number, cy: number,
  apiKey: string
): Promise<Float32Array> {
  const SIZE = 256;
  const GRID = SIZE * 3;
  const raw  = new Float32Array(GRID * GRID);

  const tiles = await Promise.all(
    [-1, 0, 1].flatMap(dy =>
      [-1, 0, 1].map(async dx => ({
        dx, dy,
        data: await fetchTilePixels(z, cx + dx, cy + dy, apiKey)
      }))
    )
  );

  for (const { dx, dy, data } of tiles) {
    if (!data) continue;
    const ox = (dx + 1) * SIZE;
    const oy = (dy + 1) * SIZE;
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const si = (py * SIZE + px) * 4;
        raw[(oy + py) * GRID + (ox + px)] =
          decodeElevation(data.data[si], data.data[si + 1], data.data[si + 2]);
      }
    }
  }

  // Gaussian blur to suppress quantisation stripes
  return gaussianBlur5(raw, GRID, GRID);
}

// ---------------------------------------------------------------------------
// Geography helpers
// ---------------------------------------------------------------------------
function metersPerPixel(z: number, lat: number): number {
  return (2 * Math.PI * 6378137 * Math.cos((lat * Math.PI) / 180)) /
         (256 * Math.pow(2, z));
}

function tileLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// ---------------------------------------------------------------------------
// Render one slope tile → PNG Blob
// ---------------------------------------------------------------------------
async function renderSlopeTile(
  z: number, x: number, y: number,
  apiKey: string
): Promise<Blob> {
  const SIZE = 256;
  const GRID = SIZE * 3;

  const elev = await buildElevationGrid(z, x, y, apiKey);
  const res  = metersPerPixel(z, tileLat(y, z));

  const canvas  = new OffscreenCanvas(SIZE, SIZE);
  const ctx     = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(SIZE, SIZE);
  const buf     = imgData.data;

  const offX = SIZE;
  const offY = SIZE;

  for (let py = 0; py < SIZE; py++) {
    for (let pxIdx = 0; pxIdx < SIZE; pxIdx++) {
      const gx = offX + pxIdx;
      const gy = offY + py;

      // Sobel 3×3
      const tl = elev[(gy - 1) * GRID + (gx - 1)];
      const tc = elev[(gy - 1) * GRID +  gx     ];
      const tr = elev[(gy - 1) * GRID + (gx + 1)];
      const ml = elev[ gy      * GRID + (gx - 1)];
      const mr = elev[ gy      * GRID + (gx + 1)];
      const bl = elev[(gy + 1) * GRID + (gx - 1)];
      const bc = elev[(gy + 1) * GRID +  gx     ];
      const br = elev[(gy + 1) * GRID + (gx + 1)];

      const dZdX = ((tr + 2 * mr + br) - (tl + 2 * ml + bl)) / (8 * res);
      const dZdY = ((bl + 2 * bc + br) - (tl + 2 * tc + tr)) / (8 * res);

      const deg = Math.atan(Math.sqrt(dZdX * dZdX + dZdY * dZdY)) * (180 / Math.PI);

      const [r, g, b, a] = angleToColor(deg);
      const i = (py * SIZE + pxIdx) * 4;
      buf[i    ] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
let registered = false;

export function registerSlopeProtocol(apiKey: string): void {
  if (registered) return;
  registered = true;

  maplibregl.addProtocol('slope', async (params) => {
    const parts = params.url.replace('slope://', '').split('/');
    const z = parseInt(parts[0], 10);
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(z) || isNaN(x) || isNaN(y))
      throw new Error(`[SlopeProtocol] bad URL: ${params.url}`);
    const blob = await renderSlopeTile(z, x, y, apiKey);
    return { data: await blob.arrayBuffer() };
  });
}

export function unregisterSlopeProtocol(): void {
  if (!registered) return;
  maplibregl.removeProtocol('slope');
  registered = false;
}

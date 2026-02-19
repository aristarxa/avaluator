#!/usr/bin/env bash
# =============================================================================
# generate-slope-tiles.sh
#
# Generates slope-angle shading PMTiles for Krasnaya Polyana area
# using SRTM 30m DEM data and GDAL inside Docker.
#
# Requirements: Docker (no local GDAL needed)
# Output:       public/slope.pmtiles  (~15-40 MB)
#
# Usage:
#   chmod +x scripts/generate-slope-tiles.sh
#   ./scripts/generate-slope-tiles.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Krasnaya Polyana bounding box + buffer
# ---------------------------------------------------------------------------
MIN_LON=40.0
MIN_LAT=43.4
MAX_LON=40.8
MAX_LAT=43.8
ZOOM_MIN=8
ZOOM_MAX=16

OUT_DIR="$(cd "$(dirname "$0")/.."; pwd)/public"
WORK_DIR="$(cd "$(dirname "$0")/.."; pwd)/.slope-build"

mkdir -p "$WORK_DIR" "$OUT_DIR"

echo "==> Working directory: $WORK_DIR"
echo "==> Output:            $OUT_DIR/slope.pmtiles"

# ---------------------------------------------------------------------------
# Colour table (CalTopo-compatible avalanche palette)
# Format: elevation-value R G B A
# Here 'elevation-value' = slope angle in degrees
# ---------------------------------------------------------------------------
cat > "$WORK_DIR/slope-colors.txt" << 'EOF'
nv  0   0   0   0
0   255 255 255 0
20  255 255 255 0
27  255 255 255 255
30  0   210 0   255
34  255 230 0   255
38  255 120 0   255
45  220 0   0   255
50  160 0   160 255
90  0   0   200 255
EOF

# ---------------------------------------------------------------------------
# Run everything inside ghcr.io/osgeo/gdal (official, ~500MB)
# ---------------------------------------------------------------------------
docker run --rm \
  -v "$WORK_DIR:/work" \
  -v "$OUT_DIR:/out" \
  ghcr.io/osgeo/gdal:ubuntu-small-latest \
  bash -c '
    set -euo pipefail
    cd /work

    echo "--- [1/6] Downloading SRTM tiles via GDAL VSIAZ / VRT ---"
    # Use OpenTopography SRTM GL1 (30m) via GDAL /vsicurl — no account needed
    SRTM_VRT="/vsicurl/https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/N43E040.hgt"

    # Download + crop to bbox
    gdal_translate \
      -projwin 40.0 43.8 40.8 43.4 \
      -of GTiff \
      "$SRTM_VRT" \
      dem_crop.tif 2>/dev/null || true

    # Fallback: download all tiles covering bbox and merge
    if [ ! -s dem_crop.tif ]; then
      echo "   Single tile failed, trying mosaic..."
      for LAT in 43 44; do
        for LON in 40; do
          LATSTR=$(printf "%02d" $LAT)
          LONSTR=$(printf "%03d" $LON)
          URL="/vsicurl/https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/N${LATSTR}E${LONSTR}.hgt"
          gdal_translate -of GTiff "$URL" "tile_N${LATSTR}E${LONSTR}.tif" 2>/dev/null || true
        done
      done
      ls tile_*.tif 2>/dev/null && gdal_merge.py -o dem_merged.tif tile_*.tif || true
      [ -f dem_merged.tif ] && gdal_translate \
        -projwin 40.0 43.8 40.8 43.4 \
        dem_merged.tif dem_crop.tif || true
    fi

    if [ ! -s dem_crop.tif ]; then
      echo "ERROR: Could not download DEM. Check internet access."
      exit 1
    fi

    echo "--- [2/6] Reproject to UTM (meters) for accurate slope calculation ---"
    gdalwarp \
      -t_srs EPSG:32637 \
      -r bilinear \
      -tr 30 30 \
      dem_crop.tif \
      dem_utm.tif

    echo "--- [3/6] Compute slope angle (degrees) ---"
    gdaldem slope \
      -s 1 \
      dem_utm.tif \
      slope_deg.tif

    echo "--- [4/6] Apply colour table ---"
    gdaldem color-relief \
      -alpha \
      -nearest_color_entry \
      slope_deg.tif \
      /work/slope-colors.txt \
      slope_colored.tif

    echo "--- [5/6] Convert to Web Mercator PNG tiles ---"
    gdalwarp \
      -t_srs EPSG:3857 \
      -r near \
      slope_colored.tif \
      slope_webmerc.tif

    gdal2tiles.py \
      --zoom=8-16 \
      --resampling=near \
      --tilesize=256 \
      --xyz \
      --processes=4 \
      slope_webmerc.tif \
      /work/tiles/

    echo "--- [6/6] Pack into PMTiles ---"
    # Install pmtiles CLI
    apt-get install -qq -y curl > /dev/null 2>&1 || true
    curl -fsSL https://github.com/protomaps/go-pmtiles/releases/download/v1.22.0/go-pmtiles_1.22.0_Linux_x86_64.tar.gz \
      | tar -xz -C /usr/local/bin pmtiles 2>/dev/null || \
    wget -qO- https://github.com/protomaps/go-pmtiles/releases/download/v1.22.0/go-pmtiles_1.22.0_Linux_x86_64.tar.gz \
      | tar -xz -C /usr/local/bin pmtiles

    pmtiles convert /work/tiles/ /out/slope.pmtiles

    echo ""
    echo "=== Done! ==="
    ls -lh /out/slope.pmtiles
  '

echo ""
echo "Generated: $OUT_DIR/slope.pmtiles"
echo "Next: add to .gitignore if large, or commit if < 50 MB"

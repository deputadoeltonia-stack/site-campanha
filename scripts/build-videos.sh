#!/usr/bin/env bash
# Otimiza os vídeos pesados para produção (re-executável):
#   assets-src/videos-src/*.mp4 (originais, fora do deploy)
#   -> public/assets/videos/*.mp4 (H.264 720px, faststart)
#   -> public/assets/videos/*.webp (poster/thumbnail do frame em 1s)
#
# Rode: bash scripts/build-videos.sh
# Precisa: ffmpeg no PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets-src/videos-src"
OUT="$ROOT/public/assets/videos"
mkdir -p "$OUT"

for f in "$SRC"/*.mp4; do
  [ -e "$f" ] || continue
  name="$(basename "${f%.mp4}")"
  out_mp4="$OUT/$name.mp4"
  out_poster="$OUT/$name.webp"
  in_size=$(du -h "$f" | cut -f1)

  echo "== $name ($in_size) =="
  ffmpeg -y -i "$f" \
    -vf "scale=720:-2" -c:v libx264 -preset medium -crf 25 -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 1 \
    -movflags +faststart \
    "$out_mp4" -hide_banner -loglevel error -stats

  ffmpeg -y -ss 1 -i "$f" -frames:v 1 -vf "scale=720:-2" "$out_poster" -hide_banner -loglevel error

  out_size=$(du -h "$out_mp4" | cut -f1)
  echo "   $in_size -> $out_size"
done

echo "== total public/assets/videos =="
du -sh "$OUT"

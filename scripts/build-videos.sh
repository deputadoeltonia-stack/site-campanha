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

  # Conferencia obrigatoria: o ffmpeg grava o indice (box "moov") so no FIM.
  # Se ele morrer no meio, sobra um .mp4 truncado com tamanho plausivel que
  # nenhum player abre — foi assim que 2 videos quebrados foram parar no ar.
  if ! python3 -c "
import struct,sys
p=sys.argv[1]; sz=__import__('os').path.getsize(p); off=0; achou=False
f=open(p,'rb')
while off < sz:
    f.seek(off); h=f.read(8)
    if len(h) < 8: break
    n=struct.unpack('>I',h[:4])[0]; t=h[4:8]
    if n == 1: n=struct.unpack('>Q',f.read(8))[0]
    elif n == 0: n=sz-off
    if t == b'moov': achou=True; break
    if n < 8: break
    off += n
sys.exit(0 if achou else 1)
" "$out_mp4"; then
    echo "   ERRO: $name saiu sem indice (conversao interrompida). Apagando." >&2
    rm -f "$out_mp4" "$out_poster"
    exit 1
  fi
  [ -s "$out_poster" ] || { echo "   ERRO: poster de $name nao foi gerado." >&2; exit 1; }
  out_size=$(du -h "$out_mp4" | cut -f1)
  echo "   $in_size -> $out_size  (indice ok, poster ok)"
done

echo "== total public/assets/videos =="
du -sh "$OUT"

#!/usr/bin/env bash
# Converte as cartilhas (PDF) em paginas .webp pra leitura no site, sem pdf.js:
#   assets-src/cartilhas-src/*.pdf (originais, fora do deploy)
#   -> public/assets/cartilhas/<nome>/pagina-01.webp, pagina-02.webp, ...
#   -> public/cartilhas-pdf/<nome>.pdf (o PDF original, pro botao de baixar)
#
# Rode: bash scripts/build-cartilhas.sh
#
# Nao usa pdf.js em runtime: ~1MB de JS num site sem build/framework, com o
# publico no 4G, contra uma pagina em webp que carrega numa fracao disso. O
# custo aceito e o texto nao ficar selecionavel — por isso o PDF original
# sempre entra junto, e e ele que o botao de download entrega.
#
# NAO usa Pillow: o Pillow desta maquina e build x86_64 num Mac ARM e quebra
# no import (mesmo problema que ja travou o gen-og.py). pdftoppm (poppler)
# rasteriza o PDF; cwebp (do pacote webp, dependencia do poppler) comprime.
# Precisa: pdftoppm e cwebp no PATH (brew install poppler).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets-src/cartilhas-src"
OUT_IMG="$ROOT/public/assets/cartilhas"
OUT_PDF="$ROOT/public/cartilhas-pdf"
# largura, nao DPI: um PDF com pagina em "pt" grande (a Emendas nasceu de
# export do Photoshop, 1080x1920 — 1pt = 1px na origem) vira 2250x4000 num
# DPI fixo, pesado a toa. -scale-to-x prende a largura real que a tela usa,
# nao importa o tamanho da pagina no PDF. 1100px cobre 2-up no desktop e
# retina no celular sem passar disso.
LARGURA_PX=1100
QUALIDADE=80
mkdir -p "$OUT_IMG" "$OUT_PDF"

command -v pdftoppm >/dev/null || { echo "ERRO: pdftoppm nao esta no PATH (brew install poppler)" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "ERRO: cwebp nao esta no PATH (brew install webp)" >&2; exit 1; }

# Sem argumentos converte tudo; com nomes converte so eles (mesmo espirito do
# build-videos.sh: reprocessar as cartilhas todas so pra publicar 1 nova
# custa minutos de CPU e nao muda um byte das outras).
#   bash scripts/build-cartilhas.sh diabetes
if [ $# -gt 0 ]; then
  FILES=()
  for n in "$@"; do FILES+=("$SRC/${n%.pdf}.pdf"); done
else
  FILES=("$SRC"/*.pdf)
fi

for f in "${FILES[@]}"; do
  [ -e "$f" ] || { echo "ERRO: $f nao existe" >&2; exit 1; }
  name="$(basename "${f%.pdf}")"
  dir_img="$OUT_IMG/$name"
  tmp="$(mktemp -d)"
  in_size=$(du -h "$f" | cut -f1)

  echo "== $name ($in_size) =="
  rm -rf "$dir_img"
  mkdir -p "$dir_img"

  pdftoppm -png -scale-to-x "$LARGURA_PX" -scale-to-y -1 "$f" "$tmp/pagina"

  total_pdf=$(ls "$tmp"/pagina-*.png 2>/dev/null | wc -l | tr -d ' ')
  [ "$total_pdf" -gt 0 ] || { echo "   ERRO: pdftoppm nao gerou nenhuma pagina" >&2; rm -rf "$tmp"; exit 1; }

  # Algumas cartilhas saem do InDesign com cada spread duplicado (a mesma
  # pagina duas vezes seguidas) — descoberto na cartilha de Saude Mental,
  # 16 paginas de PDF = so 9 imagens de verdade. Detecta por checksum e pula
  # o duplicado consecutivo, renumerando sem buraco.
  prev_md5=""
  saida=0
  pulou=0
  for png in "$tmp"/pagina-*.png; do
    md5="$(md5 -q "$png")"
    if [ "$md5" = "$prev_md5" ]; then
      pulou=$((pulou + 1))
      continue
    fi
    prev_md5="$md5"
    saida=$((saida + 1))
    num=$(printf "%02d" "$saida")
    out="$dir_img/pagina-$num.webp"
    cwebp -quiet -q "$QUALIDADE" "$png" -o "$out"
    [ -s "$out" ] || { echo "   ERRO: pagina $num de $name nao saiu" >&2; rm -rf "$tmp"; exit 1; }
  done
  rm -rf "$tmp"

  cp "$f" "$OUT_PDF/$name.pdf"

  out_size=$(du -sh "$dir_img" | cut -f1)
  if [ "$pulou" -gt 0 ]; then
    echo "   $total_pdf paginas no PDF, $pulou duplicada(s) descartada(s), $saida imagens ($out_size)"
  else
    echo "   $saida paginas -> $out_size"
  fi
  echo "   PDF original em public/cartilhas-pdf/$name.pdf"
done

echo "== total public/assets/cartilhas =="
du -sh "$OUT_IMG"

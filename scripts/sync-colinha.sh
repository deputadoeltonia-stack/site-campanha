#!/bin/sh
# Sincroniza a Colinha Digital para dentro do site (pasta colinha/).
# Fonte da verdade: ~/Projetos/colinha-digital — qualquer mudança lá
# (ex.: dataset 2026 via build/importar_tse.py + importar_fotos.py)
# entra no site rodando este script de novo.
# fotos/ (13MB) vai no git: o deploy e por push (Vercel), gitignorar
# aqui significa 404 em producao.
set -e
SRC="$HOME/Projetos/colinha-digital"
DST="$(cd "$(dirname "$0")/.." && pwd)/colinha"

rsync -a --delete \
  --include='index.html' --include='style.css' \
  --include='app.js' --include='busca.js' --include='colinha-core.js' --include='imagem.js' \
  --include='candidatos-sp.json' \
  --include='fonts/***' --include='marca/***' --include='fotos/***' \
  --exclude='*' \
  "$SRC/" "$DST/"

echo "colinha sincronizada em $DST"

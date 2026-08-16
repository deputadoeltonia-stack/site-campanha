#!/usr/bin/env python3
"""
Otimiza os assets pesados para produção (re-executável):
  - fontes OTF/TTF  -> woff2 subsetado (charset PT-BR + pontuação tipográfica)
  - hero deputado.png -> deputado.webp

Rode:  python3 scripts/build-assets.py
Precisa: fonttools + brotli (woff2) e Pillow com suporte a webp.
"""
import os
from fontTools import subset
from PIL import Image

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_SRC = os.path.join(ROOT, "fonts-src")      # originais OTF/TTF (fora do deploy)
FONTS = os.path.join(ROOT, "public/fonts")       # saída woff2 (deploy)
ASSETS = os.path.join(ROOT, "public/assets")
GALLERY_SRC = os.path.join(ROOT, "assets-src/gallery")  # jpgs originais (fora do deploy)
GALLERY_W = 1400   # largura alvo dos tiles (2x do tamanho exibido)

# Basic Latin + Latin-1 (acentos PT) + Latin-Ext-A + travessões/aspas/bullet/reticências
UNICODES = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026"

# origem -> saída (só o que o CSS usa; neue-bold ficou de fora = peso morto)
FONT_MAP = [
    ("Geometos.ttf",              "geometos.woff2"),
    ("geometos-neue-black.otf",   "geometos-black.woff2"),
    ("AvenirLTStd-Roman_0.otf",   "avenir-400.woff2"),
    ("AvenirLTStd-Medium_0.otf",  "avenir-500.woff2"),
    ("AvenirLTStd-Light_0.otf",   "avenir-300.woff2"),
    ("AvenirLTStd-Oblique_0.otf", "avenir-i.woff2"),
]


def subset_font(src, dst):
    args = [
        os.path.join(FONTS_SRC, src),
        "--unicodes=" + UNICODES,
        "--layout-features=kern,liga,calt,ccmp,mark,mkmk",
        "--flavor=woff2",
        "--output-file=" + os.path.join(FONTS, dst),
    ]
    subset.main(args)
    return os.path.getsize(os.path.join(FONTS, dst))


def main():
    print("== fontes -> woff2 (subset) ==")
    total_in = total_out = 0
    for src, dst in FONT_MAP:
        p = os.path.join(FONTS_SRC, src)
        if not os.path.exists(p):
            print("  faltando:", src); continue
        sz_in = os.path.getsize(p)
        sz_out = subset_font(src, dst)
        total_in += sz_in; total_out += sz_out
        print(f"  {src:28} {sz_in//1024:>4}K -> {dst:22} {sz_out//1024:>3}K")
    print(f"  TOTAL fontes: {total_in//1024}K -> {total_out//1024}K")

    print("== hero -> busto 3:4 (webp + png fallback) ==")
    src = os.path.join(ROOT, "assets-src/deputado-src.png")
    if os.path.exists(src):
        im = Image.open(src).convert("RGBA")
        # Corpo INTEIRO na largura (bracos nao cortam) e base no peito:
        # 638x658, quase quadrado. No hero a foto e limitada pela ALTURA da
        # coluna de texto; quanto menos torso no quadro, maior o rosto sai
        # na tela. O CSS renderiza a proporcao natural (sem cover) — corte
        # zero por construcao.
        im = im.crop((25, 22, 663, 680))
        webp = os.path.join(ASSETS, "deputado.webp")
        png = os.path.join(ASSETS, "deputado.png")
        im.save(webp, "WEBP", quality=82, method=6)  # method 6 = melhor compressão
        im.save(png, "PNG", optimize=True)
        print(f"  deputado-src.png -> busto {im.width}x{im.height}: "
              f"webp {os.path.getsize(webp)//1024}K, png {os.path.getsize(png)//1024}K")
    else:
        print("  faltando assets-src/deputado-src.png")

    print("== galeria -> webp ==")
    if os.path.isdir(GALLERY_SRC):
        for fn in sorted(os.listdir(GALLERY_SRC)):
            if not fn.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            src = os.path.join(GALLERY_SRC, fn)
            im = Image.open(src).convert("RGB")
            if im.width > GALLERY_W:  # nunca ampliar
                im = im.resize((GALLERY_W, round(im.height * GALLERY_W / im.width)), Image.LANCZOS)
            base = "g-" + os.path.splitext(fn)[0] + ".webp"
            out = os.path.join(ASSETS, base)
            im.save(out, "WEBP", quality=80, method=6)
            print(f"  {fn:16} -> {base:20} {os.path.getsize(out)//1024:>4}K  {im.width}x{im.height}")
    else:
        print("  sem assets-src/gallery")


if __name__ == "__main__":
    main()

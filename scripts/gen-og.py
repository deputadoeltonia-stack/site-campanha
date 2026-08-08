#!/usr/bin/env python3
"""
Gera o card social (og:image 1200x630) e os ícones do site.

Rode de novo sempre que mudar nome/numero/foto:
    python3 scripts/gen-og.py

Saidas:
    public/assets/og-image.png      -> compartilhamento WhatsApp/Instagram/Facebook
    public/assets/favicon.svg       -> aba do browser (escrito a mao, nao passa por aqui)
    public/assets/apple-touch-icon.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------------------------------------------------------------- CONFIG
NOME   = "Dr. Elton"
CARGO  = "DEPUTADO FEDERAL"
NUMERO = "4412"
FRASE  = "Trabalho sério, perto de você."

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOTO   = os.path.join(ROOT, "public/assets/deputado.png")
OUTDIR = os.path.join(ROOT, "public/assets")

# paleta oficial da campanha: navy 289C · lima 381C
INK      = (23, 30, 49)
INK2     = (35, 46, 73)
GOLD     = (204, 255, 0)   # lima — acento
GOLD_LT  = (204, 255, 0)
WHITE    = (255, 255, 255)

W, H = 1200, 630

FONT_DIRS = [
    "/System/Library/Fonts/Supplemental/",
    "/System/Library/Fonts/",
]


def load_font(names, size):
    """Primeira fonte que carregar, na ordem de preferencia."""
    for n in names:
        for d in FONT_DIRS:
            p = os.path.join(d, n)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return ImageFont.load_default()


F_NAME  = ["Avenir Next.ttc", "HelveticaNeue.ttc", "Arial Bold.ttf"]
F_HEAVY = ["Arial Black.ttf", "Avenir Next.ttc", "Arial Bold.ttf"]


def radial_glow(size, center, radius, color, alpha):
    """Brilho suave (PIL nao tem gradiente radial nativo)."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.45))


def main():
    card = Image.new("RGBA", (W, H), INK + (255,))

    # brilho ambar atras da foto
    card = Image.alpha_composite(card, radial_glow((W, H), (860, 470), 300, GOLD, 90))

    # numero gigante em outline (mesma assinatura do hero)
    big = load_font(F_HEAVY, 300)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(
        (600, 300), NUMERO, font=big,
        fill=(0, 0, 0, 0), stroke_width=3, stroke_fill=GOLD_LT + (34,),
    )
    card = Image.alpha_composite(card, layer)

    # foto recortada, ancorada embaixo à direita
    if os.path.exists(FOTO):
        foto = Image.open(FOTO).convert("RGBA")
        alvo_h = 620
        r = alvo_h / foto.height
        foto = foto.resize((max(1, int(foto.width * r)), alvo_h), Image.LANCZOS)
        card.alpha_composite(foto, (W - foto.width - 40, H - foto.height))
    else:
        print("aviso: foto nao encontrada em", FOTO)

    d = ImageDraw.Draw(card)

    # ---- bloco de texto à esquerda
    f_kicker = load_font(F_NAME, 26)
    f_nome   = load_font(F_HEAVY, 92)
    f_frase  = load_font(F_NAME, 30)
    f_vote   = load_font(F_NAME, 24)
    f_num    = load_font(F_HEAVY, 62)

    x = 70
    d.text((x, 92), CARGO, font=f_kicker, fill=GOLD_LT)
    d.rectangle([x, 138, x + 54, 142], fill=GOLD)          # regra ouro
    d.text((x, 176), NOME, font=f_nome, fill=WHITE)
    d.text((x, 300), FRASE, font=f_frase, fill=(226, 232, 240))

    # cédula: VOTE + numero com keyline
    by = 420
    d.rounded_rectangle([x, by, x + 96, by + 46], radius=8, fill=INK2)
    d.text((x + 18, by + 12), "VOTE", font=f_vote, fill=GOLD_LT)
    d.text((x + 118, by - 8), NUMERO, font=f_num, fill=WHITE)
    nw = d.textlength(NUMERO, font=f_num)
    d.rectangle([x + 118, by + 62, x + 118 + nw, by + 66], fill=GOLD)

    os.makedirs(OUTDIR, exist_ok=True)
    out = os.path.join(OUTDIR, "og-image.png")
    card.convert("RGB").save(out, "PNG", optimize=True)
    print("og:image  ->", out, os.path.getsize(out) // 1024, "KB")

    # ---- apple-touch-icon: marca de voto (nao depende de nome/numero)
    S = 180
    icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    di = ImageDraw.Draw(icon)
    di.rounded_rectangle([0, 0, S, S], radius=40, fill=INK + (255,))
    di.line([(46, 92), (78, 124), (134, 60)], fill=GOLD_LT, width=16, joint="curve")
    di.rectangle([46, 140, 134, 148], fill=GOLD)
    ico = os.path.join(OUTDIR, "apple-touch-icon.png")
    icon.convert("RGB").save(ico, "PNG", optimize=True)
    print("touch-icon ->", ico, os.path.getsize(ico) // 1024, "KB")


if __name__ == "__main__":
    main()

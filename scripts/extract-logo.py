#!/usr/bin/env python3
"""Extrai as marcas do manual de identidade (ID 26 ELTON.pdf) para PNG transparente.

O manual chegou só em PDF — não temos os vetores. Cada marca é arte de duas
cores chapadas sobre um fundo chapado, então dá para recuperar o alfa exato:
para cada pixel, testa contra qual cor da arte ele foi misturado e resolve a
fração da mistura. Resultado: borda antialiasada limpa, sem halo do fundo.

Reexecutável. Requer macOS (Quartz) + PIL + numpy.
    python3 scripts/extract-logo.py
"""
import os
import numpy as np
import Quartz
from CoreFoundation import CFURLCreateFromFileSystemRepresentation
from PIL import Image

PDF = "/Users/aquivaleredacao/Downloads/ID 26 ELTON.pdf"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "marca")

NAVY = (23, 30, 49)
LIME = (204, 255, 0)
WHITE = (245, 245, 245)
YELLOW = (247, 190, 0)
CYAN = (0, 166, 223)
PARTY_BLUE = (19, 61, 109)

# (nome, página, recorte (x0,y0,x1,y1) em fração da página a partir do CANTO
#  SUPERIOR ESQUERDO, cor de fundo, cores da arte, largura final)
# Caixas folgadas de propósito: o keying zera o fundo e o trim() corta no bbox
# real. Só precisam excluir o parágrafo de rodapé, que é da cor da arte.
JOBS = [
    ("logo-empilhada",  20, (0.20, 0.05, 0.80, 0.72), NAVY, [WHITE, LIME], 700),
    ("logo-horizontal",  2, (0.05, 0.05, 0.95, 0.72), NAVY, [WHITE, LIME], 760),
    ("logo-compacta",    3, (0.25, 0.05, 0.80, 0.72), NAVY, [WHITE, LIME], 760),
    ("partido", 25, (0.05, 0.25, 0.50, 0.50), (255, 255, 255),
     [PARTY_BLUE, YELLOW, CYAN], 460),
]


def render(page_no, box, scale=6.0):
    """Renderiza a página inteira e recorta depois, em pixels.

    Recortar via CTM exigia raciocinar na origem invertida do PDF e errava a
    faixa toda vez; renderizar inteiro e fatiar o array é chato de graça.
    """
    p = PDF.encode()
    doc = Quartz.CGPDFDocumentCreateWithURL(
        CFURLCreateFromFileSystemRepresentation(None, p, len(p), False))
    page = Quartz.CGPDFDocumentGetPage(doc, page_no)
    r = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
    W, H = int(r.size.width * scale), int(r.size.height * scale)
    cs = Quartz.CGColorSpaceCreateDeviceRGB()
    ctx = Quartz.CGBitmapContextCreate(
        None, W, H, 8, W * 4, cs,
        Quartz.kCGImageAlphaPremultipliedFirst | Quartz.kCGBitmapByteOrder32Little)
    # o buffer nasce sujo e as páginas de fundo branco não pintam retângulo:
    # sem esse fill o "branco" da página vira preto e o keying erra tudo.
    Quartz.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, W, H))
    Quartz.CGContextScaleCTM(ctx, scale, scale)
    Quartz.CGContextTranslateCTM(ctx, -r.origin.x, -r.origin.y)
    Quartz.CGContextDrawPDFPage(ctx, page)
    buf = Quartz.CGBitmapContextGetData(ctx)
    arr = np.frombuffer(buf.as_buffer(W * H * 4), dtype=np.uint8).reshape(H, W, 4)
    rgb = arr[:, :, [2, 1, 0]].astype(np.float32)  # BGRA -> RGB
    x0, y0, x1, y1 = box
    return rgb[int(H * y0):int(H * y1), int(W * x0):int(W * x1)]


def key_out(rgb, bg, arts):
    """Recupera alfa: P = a*A + (1-a)*BG. Escolhe o A de menor resíduo."""
    bg = np.array(bg, np.float32)
    d = rgb - bg
    best_a = np.zeros(rgb.shape[:2], np.float32)
    best_res = np.full(rgb.shape[:2], 1e9, np.float32)
    best_col = np.zeros_like(rgb)
    for art in arts:
        v = np.array(art, np.float32) - bg
        a = np.clip((d @ v) / float(v @ v), 0.0, 1.0)
        res = np.linalg.norm(d - a[..., None] * v, axis=-1)
        win = res < best_res
        best_res = np.where(win, res, best_res)
        best_a = np.where(win, a, best_a)
        best_col[win] = np.array(art, np.float32)
    return best_col, best_a


def trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def save(img, name):
    """webp lossless: arte de 2-3 cores chapadas comprime muito melhor que PNG."""
    path = os.path.join(OUT, name + ".webp")
    img.save(path, lossless=True, quality=100, method=6)
    print(f"{name}: {img.width}x{img.height}  {os.path.getsize(path)//1024}K")


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, page, box, bg, arts, width in JOBS:
        rgb = render(page, box)
        col, a = key_out(rgb, bg, arts)
        rgba = np.dstack([col, a * 255.0]).astype(np.uint8)
        img = trim(Image.fromarray(rgba, "RGBA"))
        if img.width > width:
            img = img.resize((width, round(img.height * width / img.width)),
                             Image.LANCZOS)
        save(img, name)

        # versão p/ fundo claro: a arte é de cores chapadas com alfa recuperado,
        # então trocar o branco por navy é exato — não precisa reextrair do PDF.
        if WHITE in arts:
            a2 = np.array(img)
            white = np.abs(a2[:, :, :3].astype(int) - np.array(WHITE)).sum(-1) < 30
            a2[white, 0], a2[white, 1], a2[white, 2] = NAVY
            save(Image.fromarray(a2), name + "-claro")


if __name__ == "__main__":
    main()

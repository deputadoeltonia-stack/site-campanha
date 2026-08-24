# Leitor de PDF-como-imagem (cartilhas + emendas)

Duas famílias de conteúdo, MESMO motor:

- `cartilhas/` — material de saúde (Diabetes, Saúde Mental)
- `emendas/` — repasses parlamentares (São José dos Campos, Vale do
  Paraíba, São Paulo)

Cada família tem uma página picker (`cartilhas/index.html`,
`emendas/index.html`) que lista os itens, e uma pasta por item
(`cartilhas/diabetes/`, `emendas/sjc/` etc) com o leitor propriamente dito.
`cartilhas/style.css` e `cartilhas/reader.js` são COMPARTILHADOS por todas
as 7 páginas de leitor+picker das duas famílias (emendas não tem CSS/JS
próprio — reaproveita o de cartilhas de propósito).

## Por que não pdf.js

pdf.js runtime pesa ~1MB de JS. Público majoritariamente em 4G. Trade-off
aceito: o PDF vira uma sequência de imagens `.webp` pré-renderizadas (build
time, não runtime) — carrega uma fração do peso, mas o texto não fica
selecionável. Por isso o PDF original SEMPRE entra junto no build
(`public/cartilhas-pdf/<nome>.pdf`) — é ele que o botão "Baixar PDF" entrega,
pra quem precisa do texto de verdade.

## Pipeline de build (`scripts/build-cartilhas.sh`)

```bash
bash scripts/build-cartilhas.sh              # processa tudo em assets-src/cartilhas-src/
bash scripts/build-cartilhas.sh nome-do-item  # só um (rápido — reprocessar tudo custa minutos)
```

Fluxo: `assets-src/cartilhas-src/<nome>.pdf` (original, fora do deploy,
`.gitignore`) → `pdftoppm` rasteriza cada página → `cwebp` comprime →
`public/assets/cartilhas/<nome>/pagina-NN.webp`. O PDF original também é
copiado pra `public/cartilhas-pdf/<nome>.pdf` (esse SIM entra no deploy).

**Flag importante:** `-scale-to-x 1100 -scale-to-y -1` (largura fixa, não
DPI fixo). Motivo: PDFs que nasceram de export do Photoshop (ex: as
Emendas) têm página em "pt" que já é 1:1 com pixel de origem (1080×1920) —
um DPI fixo (`-r 150`) nesse tipo de PDF gera imagem gigante à toa
(~2250×4000px). `-scale-to-x` trava a largura real que a tela usa,
independente do tamanho nativo da página no PDF.

**Deduplicação de spread:** algumas cartilhas saem do InDesign com cada
spread duplicado (a mesma página duas vezes seguidas). O script detecta por
checksum (`md5`) e pula o duplicado consecutivo, renumerando sem buraco —
foi descoberto na cartilha de Saúde Mental (16 páginas de PDF = só 9
imagens de verdade).

**og:image por item:** cada pasta ganha um `og.jpg` (1200×630, fundo navy)
gerado via `ffmpeg` a partir da página 1:
```bash
ffmpeg -y -i public/assets/cartilhas/<nome>/pagina-01.webp \
  -vf "scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:color=0x171E31" \
  -q:v 3 public/assets/cartilhas/<nome>/og.jpg
```
(o script `build-cartilhas.sh` NÃO gera isso automaticamente — é passo
manual depois do build, ao adicionar item novo.)

## Adicionar uma cartilha/emenda nova

1. `cp PDF-original.pdf assets-src/cartilhas-src/nome-do-item.pdf`
2. `bash scripts/build-cartilhas.sh nome-do-item`
3. Gerar `og.jpg` (comando acima)
4. Criar `cartilhas/nome-do-item/index.html` (ou `emendas/...`) — copiar de
   um item existente da mesma família, trocar título/meta/alt-text/PDF path
5. Adicionar card no picker (`cartilhas/index.html` ou `emendas/index.html`)
6. Adicionar URL em `sitemap.xml`
7. Bump `?v=` do `cartilhas/style.css` em TODAS as 7 páginas que o
   referenciam (novo item incluso) se você mexeu no CSS compartilhado

## `reader.js` — paginação genérica

Lê os `.pagina` (figure) que já estão no HTML da página atual — não tem
config hardcoded por cartilha, é 100% dirigido pelo DOM.

- `ehRetrato(fig)` — decide se a página é retrato (`width < height` nos
  atributos `width`/`height` do `<img>`) ou paisagem/spread
- `grupoDe(i)` — decide se a página `i` deve ser mostrada SOZINHA ou em
  PAR com a seguinte (spread 2-up), só em tela larga (`telaLarga()`) e só
  se ambas as páginas do par forem retrato — página de capa (índice 0) e
  páginas paisagem nunca pareiam
- `?p=N` na URL — deep-link direto pra página N, lido no load
  (`paginaValidaDaURL`)
- `prefetch(indice)` — aquece a próxima imagem antes de precisar dela
  (`new Image()`, sem inserir no DOM)
- Navegação: seta/teclado/swipe, todos convergem pra `mostrar(n, direcao)`,
  que anima a entrada (`entrando-dir`/`entrando-esq`, translateX+opacity,
  SEM curvatura 3D — só translação, então nunca engasga)
- `anunciar(texto)` — atualiza a região `aria-live` (`#status`) pra leitor
  de tela saber que a página mudou
- Compartilhar: `navigator.share` se disponível, senão copia link
  (clipboard) — botão nasce `hidden`, só aparece via JS (progressive
  enhancement; ver nota de especificidade abaixo)

## Sem JS: fallback empilhado, TODAS as páginas visíveis

`.leitor-paginas` sem JS é `display:flex; flex-direction:column` — TODAS as
figuras no fluxo normal, roláveis, sem nada escondido. Com JS
(`document.documentElement.classList.add('js')`, síncrono no `<head>`),
vira álbum paginado: `.js .pagina { display:none; }`, só a(s) ativa(s)
ficam no fluxo — de propósito tira do a11y tree e da ordem de tab (é
paginação de verdade, tipo abas — diferente do "ver mais" dos vídeos, que é
recorte visual, não paginação; lá o conteúdo escondido continua acessível).

## Viewport-fit: a página encaixa na tela sem scroll

`.js .leitor { height: calc(100svh - 61px); display:flex; flex-direction:
column; }` — **`height`, não `min-height`** (mesmo princípio do hero — ver
`docs/animacoes.md` — min-height nunca perde pra um height menor, então sem
isso o cálculo não faz diferença nenhuma). `61px` = altura fixa do
`.leitor-topo` (header do leitor, padding vertical não é clamped por
viewport, só o horizontal — então não varia por breakpoint).

`.leitor-palco { flex: 1 1 auto; min-height: 160px; }` — pega o espaço que
sobra do título; o piso de 160px evita que a imagem suma de vez num título
muito comprido numa tela muito curta (raro, mas existe).

`.js .pagina.ativa img { max-height: 100%; width: auto; height: auto;
max-width: 100%; }` — a imagem escala pra caber no que sobrou, preservando
proporção. Cadeia de `height:100%` precisa estar INTACTA do `.leitor-palco`
até a `<img>` (`.leitor-paginas` → `.pagina.ativa` → `img`), senão a
porcentagem não resolve (ancestral com altura "auto" faz percentual virar
"auto" também, pela spec CSS).

Escopado a `.js` de propósito — sem JS, o fallback empilhado (altura
natural, scroll normal) fica intocado.

**Edge case aceito:** página landscape/spread (`.leitor-paginas:not(.duas)
.pagina.ativa { max-width: min(100%, 620px) }`) pode renderizar mais curta
que a altura total do palco quando a LARGURA é o fator limitante — as
setas de navegação (`top:50%` do palco inteiro) não ficam perfeitamente
centralizadas na imagem nesse caso. Aceito porque não afeta as páginas de
Emendas (todas retrato, uniformes ~1100×1956).

## Armadilhas já resolvidas aqui (não redescobrir)

- **`height` do atributo HTML vira hint de apresentação**: o `img
  width="…" height="…"` (que o navegador usa pra reservar espaço) tem
  prioridade sobre `aspect-ratio`/`max-width` da CSS SE não houver uma
  regra de `height` explícita competindo. Sem `height: auto;` na regra base
  `img { … }`, qualquer imagem que a CSS só estreita em largura fica
  esticada verticalmente (foi o bug: "as folhas estão esticadas pra
  baixo").
- **`[hidden]` perde empate de especificidade pro `.btn`**: o botão
  "Compartilhar" (nasce `hidden`, só o JS libera) ficava visível mesmo sem
  JS, porque `.btn { display: inline-flex }` (autor) empata em
  especificidade com o `[hidden]` da UA stylesheet (ambos 0,0,1,0) — origem
  autor sempre vence empate. Fix: `[hidden] { display: none !important; }`
  perto do topo de `cartilhas/style.css`.

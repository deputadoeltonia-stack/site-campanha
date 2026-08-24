---
name: "Site Campanha — Arquitetura Completa"
description: "Mapa completo do site institucional da campanha do Dr. Elton (drelton4412.com.br): stack (HTML/CSS/JS puro, sem build, decisão deliberada), todas as animações scroll-driven e como funcionam, sistema de leitor de PDF-como-imagem (cartilhas/emendas), deploy via HostGator/rclone, endpoint de leads compartilhado entre 3 campanhas, colinha digital, e as armadilhas já documentadas. Use isto ANTES de mexer em qualquer parte do site-campanha, pra entender como as peças se encaixam sem precisar re-explorar o repo do zero."
---

# Site Campanha (Dr. Elton) — Arquitetura Completa

## O que é

Site institucional da campanha do Dr. Elton, deputado federal 4412. Repositório
`site-campanha`, domínio `drelton4412.com.br`.

**Stack: HTML/CSS/JS puro. Sem build, sem npm, sem framework.** Isso é decisão,
não falta — não sugira Tailwind, React, bundler ou qualquer coisa que precise
de `npm install`. Não existe `package.json` no repo por escolha.

O projeto compartilha infraestrutura com duas outras campanhas irmãs — **Tozi**
(`site-tozi`) e **Dulce Rita** (`site-dulcerita`) — que reaproveitam o mesmo
padrão de código, o mesmo endpoint de leads, e (parcialmente) a mesma "colinha
digital". Ver `docs/leads-e-colinha.md` pra detalhes de onde as três se cruzam.

## Antes de mexer em qualquer coisa

1. **Leia o `CLAUDE.md` da raiz do projeto** — tem as armadilhas específicas
   (cache-buster `?v=`, deploy manual, sync da colinha, etc). Este skill
   complementa aquele arquivo com o "como funciona por dentro"; o CLAUDE.md
   tem o "o que NÃO fazer".
2. **`git status` primeiro.** Outra sessão/pessoa pode estar mexendo em
   paralelo no mesmo clone — já aconteceu nesta campanha (commits de terceiros
   aparecendo no meio de uma leva de trabalho, sem ninguém rodar `git pull`
   manualmente).
3. **Todo CSS/JS editado precisa bump de `?v=` no `<link>`/`<script>` que o
   referencia**, ou a HostGator serve a versão em cache pro visitante. Ver
   seção "Cache-buster" abaixo.
4. **Nunca `git push` publica o site.** Publicar é `bash
   scripts/deploy-hostgator.sh` manual — ver `docs/deploy-e-infra.md`.

## Mapa do repositório

```
index.html              — página única, todas as seções (hero, quem-sou, propostas,
                           depoimentos, vídeos, materiais, form de lead)
css/style.css            — todo o CSS do site principal (~1300+ linhas, um arquivo só)
js/main.js               — todo o JS do site principal (vanilla, um arquivo só)
sitemap.xml

cartilhas/               — leitor de PDF-como-imagem: index (picker), diabetes/,
                           saude-mental/, style.css (compartilhado com emendas/),
                           reader.js (compartilhado)
emendas/                 — mesmo leitor, conteúdo diferente: index (picker),
                           sjc/, vale/, sp/
public/assets/cartilhas/ — páginas .webp pré-renderizadas de cada cartilha/emenda
public/cartilhas-pdf/    — os PDFs originais (pro botão "baixar")
assets-src/cartilhas-src/ — PDFs originais fora do deploy (.gitignore), matéria-prima
                           do scripts/build-cartilhas.sh

colinha/                 — a "colinha digital" (guia de voto), serve Elton/Tozi/Dulce/
                           outros candidatos aliados pelo MESMO código (colinha-core.js
                           decide o candidato pelo hostname) — ver docs/leads-e-colinha.md

scripts/
  deploy-hostgator.sh    — o ÚNICO jeito de publicar (rclone sync via SFTP)
  build-cartilhas.sh     — PDF → .webp (pdftoppm + cwebp)
  gen-og.py              — gera og-image.png do site principal (Pillow, PIL)
  apps-script-leads.gs   — CÓPIA do que roda no Google Apps Script (não é o
                           código vivo — ver docs/leads-e-colinha.md)
  htaccess-raiz.txt      — headers de segurança (CSP/HSTS) pra colar A MÃO no
                           .htaccess da raiz via cPanel (não versionável)
```

## Cache-buster (`?v=`)

`index.html` referencia `css/style.css?v=N` e `js/main.js?v=N`. **Toda vez que
qualquer um dos dois arquivos muda, incremente o `N` correspondente**, senão a
HostGator serve a versão antiga em cache pro navegador do visitante.

O leitor de PDF (`cartilhas/style.css` e `cartilhas/reader.js`) tem seu PRÓPRIO
`?v=`, compartilhado pelas 6 páginas que os referenciam (`cartilhas/index.html`,
`cartilhas/diabetes/`, `cartilhas/saude-mental/`, `emendas/index.html`,
`emendas/vale/`, `emendas/sp/`, `emendas/sjc/` — são 7, na verdade). Ao editar
`cartilhas/style.css`, bump o `?v=` em TODAS elas — um `sed` faz isso rápido:

```bash
for f in cartilhas/index.html cartilhas/diabetes/index.html cartilhas/saude-mental/index.html \
         emendas/index.html emendas/vale/index.html emendas/sp/index.html emendas/sjc/index.html; do
  sed -i '' 's#cartilhas/style.css?v=OLD#cartilhas/style.css?v=NEW#' "$f"
done
```

**Armadilha de deploy:** o script de deploy usa `rclone --size-only` (não
compara conteúdo, só tamanho em bytes). Se você só incrementa o número do
`?v=` (ex: `v=90` → `v=91`, mesma quantidade de dígitos), o `index.html` pode
ficar com o MESMO tamanho em bytes que a versão já publicada — e o rclone
pula o upload dele, achando que "não mudou". Sintoma: você publica, mas o
domínio continua servindo a versão de `?v=` antiga. Ver `docs/deploy-e-infra.md`
→ "O blind spot do --size-only" pra como forçar o upload nesse caso.

## As animações — visão geral

Todas gated por `@supports (animation-timeline: scroll())` ou `@supports
(animation-timeline: view())`, e quase todas por `@media
(prefers-reduced-motion: no-preference)` também — degradam pra estático sem
quebrar em navegador sem suporte (Firefox, principalmente) ou com o SO
pedindo menos movimento.

| Efeito | Onde | Mecanismo |
|---|---|---|
| Capa cobre (hero sticky) | `.capa`/`.folha`, hero | `position:sticky` + trilho espaçador — **desligado no mobile**, ver abaixo |
| Parallax sutil (glow, número, foto) | hero | `animation-timeline: scroll(root)` |
| Título assenta ao soltar | "Uma vida dedicada" | `animation-timeline: view()`, timeline nomeada |
| Cards empilhando | Depoimentos | `position:sticky` por card + `animation-timeline: view()` |
| Título letra-a-letra | `.titulo-float` (JS) | JS puro, scroll listener, SEM CSS scroll-timeline |
| Vídeos "veja mais" | grades de vídeo | JS: `max-height` transition + âncora de scroll contínua |
| CTA fixo aparece | `.sticky-cta` (mobile) | JS: timer de 3s (não é scroll) |

Detalhe completo de cada uma, com seletores exatos e os porquês, em
[docs/animacoes.md](docs/animacoes.md) — **leia antes de tocar em qualquer
efeito visual**, tem mais armadilha resolvida ali do que vale a pena
redescobrir.

### A armadilha mais cara da sessão: hero sticky no mobile

O efeito "capa cobre" (hero preso na tela, resto do site desliza por cima) é
`position:sticky`. No mobile, o hero empilhado (logo + título + texto + foto,
tudo em coluna) facilmente passa de 1000px de altura — mais que a tela. Um
elemento sticky mais alto que a viewport **corta a parte que não cabe pra
sempre**: não é questão de rolar mais ou esperar mais tempo, a fatia visível
trava assim que o sticky prende e nunca muda até a folha cobrir tudo. Foi
testado e medido nesta sessão (ver histórico do repo) antes de confirmar isso.

**Solução aplicada:** `.hero { position: relative; }` só no mobile
(`@media (max-width: 939px)`), e o trilho/margem do capa+folha zerados no
mesmo breakpoint. O hero mobile virou uma seção comum, que passa quando você
rola — perde o efeito de capa, mas a foto aparece inteira. **Não use
`position: static` aqui** — o véu escurecedor (`::before`), o brilho
(`::after`) e o número gigante de fundo (`.hero-backnum`) são
`position:absolute` e contam com o `.hero` como referência de
posicionamento; `static` tira essa referência e eles vazam pro ancestral
posicionado seguinte, criando uma linha/corte visual torto no meio da foto.
`relative` resolve os dois problemas ao mesmo tempo.

Desktop mantém sticky normal, sem essa restrição (conteúdo cabe numa tela).

## O leitor de PDF-como-imagem (cartilhas + emendas)

Duas famílias de conteúdo (`cartilhas/` = saúde, `emendas/` = repasses
parlamentares) compartilham o MESMO motor de leitura: PDF → páginas .webp
pré-renderizadas (não usa pdf.js — 1MB de JS runtime não compensa numa base
majoritariamente 4G). Cobertura completa, incluindo o pipeline de build, o
`reader.js` genérico, e o fix de viewport-fit (páginas encaixando na tela sem
scroll), em [docs/leitor-pdf.md](docs/leitor-pdf.md).

## Leads, colinha digital e as outras duas campanhas

O formulário de lead deste site posta pro MESMO Google Apps Script que Tozi e
Dulce Rita usam — mexer em `scripts/apps-script-leads.gs` (que é só uma CÓPIA
local, não o código vivo) afeta as três campanhas em produção. A "colinha
digital" (guia de voto) também é compartilhada por código: o mesmo
`colinha-core.js` decide qual candidato mostrar pelo hostname da requisição.
Detalhes de como publicar sem quebrar as outras duas, o honeypot anti-bot, e
o layout do `CANDIDATOS` object, em [docs/leads-e-colinha.md](docs/leads-e-colinha.md).

## Deploy

`git push` não publica nada — produção é HostGator, via
`scripts/deploy-hostgator.sh` (rclone sobre SFTP, porque a conta não tem
shell habilitado). Sempre `--dry` antes do real, sempre ler a lista de
APAGADOS. Passo a passo, os dois filtros (`.vercelignore` bilateral) e o
blind spot do `--size-only`, em [docs/deploy-e-infra.md](docs/deploy-e-infra.md).

## Ferramentas de teste usadas nesta base de código

Sem framework de teste automatizado. Verificação visual/funcional é feita via
Chrome headless + CDP puro (não pelo MCP `claude-in-chrome`, que teve
problemas de auth nesta sessão) — um padrão recorrente:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --remote-debugging-port=PORTA --no-first-run \
  --no-default-browser-check --user-data-dir=/tmp/perfil-unico about:blank &
```

Depois disso, um script Python com `websockets` abre uma aba
(`PUT /json/new?URL`, não GET — versões recentes do Chrome exigem PUT),
manda `Page.navigate`, `Runtime.evaluate` (pra ler `getBoundingClientRect`,
simular scroll, clicar botões) e `Page.captureScreenshot`. Serve local em
`python3 -m http.server 8123` a partir da raiz do repo antes de testar.

Sempre mate o processo do Chrome de teste no final
(`pkill -f "remote-debugging-port=PORTA"`).

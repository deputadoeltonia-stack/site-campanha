# Animações — mapa completo

Todo efeito scroll-driven usa CSS nativo (`animation-timeline`), não
biblioteca JS de scroll (GSAP/ScrollTrigger/Framer). Onde não dá (título
letra-a-letra, o "veja mais" dos vídeos, indicador de rolagem custom), é JS
vanilla puro, sem dependência.

Convenção do arquivo `css/style.css`: os efeitos scroll-driven "sutis" (não
essenciais à leitura) ficam agrupados perto do fim do arquivo, sob letras de
seção em comentário (`---------- A) ... ----------`, `B)`, `D)`, `E)` etc —
useful pra `grep -n "---------- [A-Z])"` e navegar direto pro efeito que você
quer mexer.

---

## 1. Capa + Folha (hero sticky cobrindo)

**CSS:** `.capa`, `.capa-trilho`, `.folha`, `.hero` — linhas ~220-280 de
`css/style.css`. **HTML:** `index.html`, hero envolto em `<div class="capa">`
+ `<div class="capa-trilho" aria-hidden="true">`, seguido de `<div
class="folha">` contendo o resto do `<main>`.

**Mecânica:** `.hero` é `position:sticky; top:0`. `.capa-trilho` é um `<div>`
vazio de `140vh` de altura, que existe só pra dar ao container sticky
(`.capa` = hero + trilho) altura extra além do próprio hero — sem isso, o
sticky duraria o `<main>` inteiro e a capa nunca soltaria. `.folha` (que
contém TODO o resto do site) tem `margin-top: -140vh`, que a puxa pra cima,
sobrepondo o hero visualmente conforme o usuário rola.

A matemática importante, se for mexer nos números: **o `margin-top`
negativo da `.folha` CANCELA a altura do trilho.** A posição absoluta em que
a folha começa a cobrir = `topoDaCapa + alturaDoHero` — **independente** do
valor do trilho, contanto que `margin-top` = `-trilho`. O trilho, sozinho,
só controla quanto tempo o hero fica preso (sticky) **depois** de já estar
totalmente coberto, antes de soltar de vez — não afeta quando a cobertura
começa nem quanto tempo ela demora (a duração da transição de cobertura em
si é sempre = 1 altura de viewport, mecanicamente, porque é literalmente a
folha entrando por baixo até o topo).

**Se precisar atrasar quando a cobertura começa** (dar mais "tempo parado"
antes de qualquer coisa cobrir o hero), a alavanca certa é encolher a
magnitude do `margin-top` da folha EM RELAÇÃO ao trilho (não só aumentar o
trilho sozinho — isso só prende o hero por mais tempo depois de já coberto,
o que não ajuda ninguém a ver nada). Fórmula: se quer um atraso `D` antes da
cobertura começar, com cobertura levando sempre `V` (100vh) e um buffer `B`
depois: `trilho = D + V + B`, `margin-top = -(trilho - D)`.

**Degrada sozinho:** sem `position:sticky` suportado (ou desligado via
media query), tudo volta a fluxo normal — capa em cima, folha embaixo, sem
sobreposição, sem estado quebrado.

### Por que está DESLIGADO no mobile (`@media max-width: 939px`)

Hero mobile empilha logo + título + texto + foto em coluna — facilmente
passa de 1000px de altura, mais que a viewport. Um elemento sticky mais alto
que a tela **corta a parte que não cabe, PRA SEMPRE**: testado e confirmado
nesta base — a fatia visível não muda nem rolando bastante antes da folha
cobrir, ela trava assim que o sticky prende (o sticky "congela" o
renderizado assim que engata, não há reveal progressivo do conteúdo
excedente por rolagem contínua). Não existe ajuste de timing/trilho que
resolva isso — é física de layout, não de scroll.

Solução: `.hero { position: relative; }` no mobile (não `static` — ver nota
abaixo), e `.capa-trilho { height: 0; } .folha { margin-top: 0; }` no mesmo
breakpoint. O hero mobile vira seção comum, passa quando você rola, foto
aparece inteira. Perde o efeito de capa nessa largura — troca aceita
deliberadamente.

**`position: relative`, não `static`:** o véu escurecedor (`.hero::before`),
o brilho âmbar (`.hero::after`) e o número gigante de fundo
(`.hero-backnum`) são todos `position:absolute` e usam `.hero` como
referência de posicionamento (`inset:0` etc). `static` tira essa referência
— eles "vazam" pro próximo ancestral posicionado e renderizam no lugar
errado, criando uma linha/corte visual torto sobre a foto. `relative`
resolve isso mantendo o hero como contexto de posicionamento, sem sticky.

---

## 2. Véu escurecedor do hero (`.hero::before`)

`animation-timeline: scroll(root); animation-range: 0 82vh;` — opacidade
0→0.58 conforme rola os primeiros 82vh da PÁGINA (não do hero — é
`scroll(root)`, timeline global). Dá a sensação de a capa "recuar" (escurecer)
em vez de só sumir atrás da folha. Sem gate de `prefers-reduced-motion`: é
ligado 1:1 ao gesto de rolagem do usuário, não é movimento autônomo, então
conta como seguro mesmo com "menos movimento" pedido pelo SO.

## 3. Parallax sutil do hero (número, brilho, foto)

Três elementos, mesma técnica (`animation-timeline: scroll(root); range: 0
70vh`), MAS animando propriedades diferentes em elementos DIFERENTES —
importante: nunca anime duas coisas concorrentes na mesma propriedade do
MESMO elemento com timelines diferentes (elas brigam). Por isso o parallax
da foto anima a `<img>` dentro de `.hero-photo`, não o `.hero-photo`
propriamente — o wrapper já tem a animação de ENTRADA (`heroPhoto`, on-load,
`opacity`/`transform`), uma segunda animação de scroll no mesmo elemento
conflitaria.

- `.hero-backnum` — `translateY(3%)`
- `.hero::after` (glow) — `translateY(6%)`, `opacity: .5`
- `.hero-photo img` — `scale(1.045) translateY(-1.2%)`

Gated por `@supports (animation-timeline: scroll())` E `@media
(prefers-reduced-motion: no-preference)` — aqui sim, porque é movimento
autônomo (a página "respira" sozinha ao rolar, não é 1:1 feedback puro).

## 4. Régua de leitura no header (`.site-header::after`)

Barra de progresso de leitura (`scale-x` 0→1) sobre a borda inferior do
header fixo, `animation-timeline: scroll(root)`, sem range explícito (cobre
a página inteira). Sem gate de reduced-motion pela mesma razão do véu: é
1:1 com o gesto do usuário.

## 5. Trajetória — timeline que "ignita" ao rolar

Seção "Trajetória", uma `<ol class="timeline">` com `<li>` por marco. Cada
`<li>` tem sua PRÓPRIA `view-timeline` nomeada (`--tl-seg`, declarada no
`<li>` via `view-timeline-name`), e três sub-efeitos amarrados a ela:

- `.timeline > li::after` (o "nó", círculo) — `tlIgnite`: apagado → anel
  ouro + núcleo aceso + glow, em `entry 55%` → `entry 100%`
- `.timeline > li::before` (o "segmento", linha até o próximo nó) —
  `tlFill`: vazio → preenchido, `entry 100%` → `cover 38%`
- `.tl-year` (o rótulo do ano) — `tlYear`: cor fantasma → dourado, mesmo
  range do nó

Puro CSS, sem JS, sem loop, sem relógio — o estado É a posição de scroll.
SEM gate de reduced-motion: é pintura pura (cor, `background-size`,
`box-shadow`), segue 1:1 a mão do usuário, funciona igual com "menos
movimento" pedido. Fora do `@supports`, o estado-base já nasce ACESO
(fallback estático seguro pra Firefox/navegador sem `animation-timeline:
view()`).

## 6. Cards empilhando (Depoimentos)

**Origem:** porte do efeito que o site-tozi usa em "Propostas" — só que lá
foi REMOVIDO (7 propostas reais escondidas atrás de cards não fazia sentido,
o eleitor precisa LER cada proposta pra decidir o voto). Aqui, em
Depoimentos, faz sentido: são citações curtas, prova social, não
informação que pesa decisão.

`.quotes` (container) declara `view-timeline-name: --quotes-scroll` e
`--numcards: 6`. Cada `.quote` é `position:sticky` com `top` escalonado por
`--index` (`nth-child` 1-6, hardcoded — se adicionar/remover depoimento,
ajustar a lista de `nth-child`), então empilham uns sobre os outros ao
rolar. Um segundo efeito (`animation-timeline: --quotes-scroll` na PRÓPRIA
`.quotes`, `animation-range: exit-crossing`) encolhe cada card levemente
(`scale`) conforme o próximo o cobre — fator pequeno (0.03 por card) pra não
encolher demais o primeiro com 6 cards.

**Ordem no HTML importa:** cards do menor pro maior/mais substancial — o
ÚLTIMO é o que fica visualmente "assentado" (não encolhe, cobre todos os
outros), então deve ser o depoimento mais forte/completo.

Coluna única de propósito (não pares 2-a-2, que foi testado e descartado): o
efeito de empilhar só faz sentido lendo um de cada vez.

## 7. Título letra-a-letra (`.titulo-float`)

**Não é CSS scroll-timeline** — é JS puro em `js/main.js` (porte do
"ScrollFloat" do React Bits, sem React/GSAP). Motivo documentado no código:
`view-timeline` nomeada não ativa em parte dos navegadores testados; cálculo
de posição no scroll roda em todos.

Mecânica: no load, cada `.titulo-float` tem seu texto fatiado em `<span
class="word">` → `<span class="char">` por letra, com `--i` (índice) em
cada `<span class="char">` pra CSS escalonar o delay da animação de subida
(`@keyframes subirLetra`). O `<h2>` original ganha `aria-label` com o texto
completo e as letras somem do leitor de tela (`aria-hidden` nos spans) —
sem isso, VoiceOver soletraria letra por letra.

Disparo: JS calcula posição (`getBoundingClientRect`) no `scroll` listener
(debounced via `requestAnimationFrame`), não `IntersectionObserver` — mesmo
mecanismo do indicador de seção. Gatilho a 88% da altura da viewport (revela
pouco depois de entrar pela base). Uma vez revelado (`.revela` adicionada),
sai da lista de pendentes — 6 títulos no total, custo desprezível. Rede de
segurança: nunca revela em massa (title fora da tela não anima escondido,
só fica legível parado — evita o bug antigo de só os 2 primeiros títulos
aparecerem animados).

## 8. Grades de vídeo — "Veja mais" / "Ver menos"

`js/main.js`, função `ajustarGrade` (dentro do bloco que seleciona
`.video-grid:not(.video-grid-sempre-aberto)`). Não usa CSS puro porque
precisa medir altura real de conteúdo variável (cards com/sem legenda) e
JS controla o `max-height` da grade pra criar o efeito colapsado/expandido.

Variáveis-chave: `FILEIRAS_VISIVEIS` (1), `ESPIA_PX` (tira do gradiente,
40px), `BOTAO_FOLGA` (espaço reservado abaixo do gradiente pro botão, 24px).

**Abrir:** `max-height` anima até `scrollHeight` real (transição CSS
`.28s`). Ao terminar (`transitionend`), classe `.video-grid-recolhido`
sai, `max-height` limpa (solta pro fluxo — importante porque legenda com
"Ler mais" pode crescer depois e ficaria cortada por um `max-height`
antigo), e `btn.scrollIntoView({block:'end'})` — sem isso, o grid cresce
pra baixo da tela e o clique parece não ter feito nada.

**Fechar:** `overflow-anchor: none` no `.video-grid` (CSS) impede o
navegador de "compensar" a rolagem sozinho durante a transição (scroll
anchoring nativo do Chrome, que causava um tranco visível antes de acomodar
no lugar certo). O JS usa uma função `ancorarDurante(el, duracaoMs)` — um
loop de `requestAnimationFrame` que, a cada frame durante a transição de
`.28s`, mede `el.getBoundingClientRect().top` e corrige `window.scrollBy`
pra manter o botão PIXEL-FIXO na tela enquanto o grid encolhe ao redor dele.
Isso resolve dois bugs ao mesmo tempo: (a) sem compensação nenhuma, fechar
podia "sumir" a pessoa lá embaixo do site (scrollY clampado ao novo — menor
— tamanho do documento); (b) compensar só uma vez no fim (como o "abrir"
faz) dava um vai-e-volta visível (desce, espera, sobe de repente).

`botaoJaExistia` (flag local) distingue "1ª carga da página" (grid nasce
colapsado, sem transição) de "fechando de verdade" (usuário clicou) — só o
segundo caso dispara a dança de reflow forçado (`grade.offsetHeight`) que
faz a transição CSS animar em vez de saltar direto pro valor final.

Reduced-motion: CSS desliga a `transition` do `max-height`;
`ancorarDurante` recebe `duracaoMs: 0`, o que ainda roda 1 frame (correção
instantânea, sem animação) — mantém o botão no lugar certo mesmo sem
movimento.

## 9. CTA fixo mobile (`.sticky-cta`)

`display:none` acima de 940px (CSS) — só existe no mobile. Aparece via
classe `.show` (JS adiciona depois de **3 segundos fixos** desde o load —
não é scroll-driven, foi trocado de "depois que passa do hero" pra timer
fixo por pedido explícito). Some de novo quando o formulário `#participar`
entra em vista (`IntersectionObserver`, threshold 0.1) — não faz sentido
CTA flutuante sobre o próprio formulário.

Animação de entrada: `transform: translateY(150%) scale(.92); opacity: 0;`
→ `translateY(0) scale(1); opacity: 1;`, `.5s`/`.4s` com `var(--ease)`
(ease-out-quint, `cubic-bezier(.16,1,.3,1)` — o "moderno" do vocabulário de
motion deste projeto).

## 10. Indicador de rolagem custom (`scroll-rail`/`scroll-thumb`)

Só em `pointer-events: fine` (mouse, não touch) — no toque não há barra
nativa pra substituir. JS cria os elementos e só then esconde a barra
nativa (`root.classList.add('tem-indicador')`) — se a criação falhar por
algum motivo, o usuário nunca fica sem NENHUMA barra de rolagem.

// Desenha a colinha em canvas nativo. Nada de html2canvas: sao ~90 linhas
// de fillText com controle total, contra 200 KB de dependencia que renderiza
// HTML por aproximacao e erra a fonte no iOS.
//
// O visual imita o santinho impresso "COMO VOTAR": topo escuro, corpo claro,
// e um quadrado por digito — preenchido na cor da marca, vazio em branco.

import { slotTravado } from './colinha-core.js'

const L = 1080
const A = 1350

// Espelha os temas de style.css. Canvas nao le variavel CSS, entao os dois
// arquivos precisam mudar juntos — tests/theme.test.js cobra isso.
export const TEMAS = {
  elton: {
    // Cores medidas na arte final da peca (15/08): navy mais azulado, verde
    // de caixa #84bf41 e um segundo verde — o lima vivo dos acentos.
    // Cabecalho no pattern oficial do manual (p.21): fundo escuro #061e4c com
    // a fita clara #0a3983 — cores digitais do proprio vetor.
    topo: '#061e4c', chevClaro: '#0a3983',
    ciano: 'rgba(64,170,214,.38)',
    destaque: '#84bf41', lima: '#a9cf35',
    fundo: '#e9e9e6', fundo2: '#dfe0d8', caixa: '#ffffff', linha: '#cfceca',
    txt: '#13284a', rot: '#63666a',
    // O selo e o botton oficial do manual (ID 26 ELTON p.14), em imagem; se
    // ela falhar ao carregar, cai no circulo desenhado.
    selo: '#13284a', seloAnel: '#13284a', seloImagem: 'marca/selo-elton.png',
    seloSombra: true,
    seloLinha: 5.05, // ultima linha (presidente), como na tela — nos senadores
                     // ele caia em cima do nome assim que o eleitor digitava
    fotoSemDestaque: true, // campo pre-definido sem borda verde
    seloNoCorpo: true, // na arte ele flutua na faixa dos senadores
    // Numerais do santinho: retos e pesados (foto da peca), tinta em ~72% da
    // altura da caixa — nada do falso italico antigo.
    digitoAltura: 0.72,
    // peca: true liga o que so a peca do Dr. Elton tem — pincel no titulo,
    // fitas de chevron e faixa lima no pe.
    peca: true,
    // Faixa do pe na versao lima do pattern oficial (manual p.22).
    faixa: '#a2d600', faixaFita: '#bdff00',
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
  },
  tozi: {
    topo: '#1a174e', topoRisco: '#001a6d', destaque: '#84bf41',
    fundo: '#e3e4e3', fundo2: '#d8dad8', caixa: '#ffffff', linha: '#c8cac8',
    txt: '#1a174e', rot: '#5b5f6b',
    travado: '#1055bd', travadoTxt: '#ffffff', // o campo dele sai azul na peca
    selo: '#1055bd', seloAnel: '#ffffff',
    // Simbolo e rosto em traco do manual, os mesmos arquivos da tela. Se o
    // navegador nao desenhar o SVG, cai nas listras retas de topoRisco.
    simbolo: 'marca/ondas.svg', rosto: 'marca/rosto.svg',
    seloNoCorpo: true,
    // Ultima linha (presidente), igual a tela: nos senadores o selo caia
    // em cima do nome assim que o eleitor digitava. bordaDireita ja
    // encolhe o nome na linha que hospeda o selo.
    seloLinha: 5.05,
    // Numerais retos: a Geometos nao tem face italica, entao 'italic'
    // virava oblique sintetico. O skew inclina a tinta sem alterar a
    // largura de avanco, e o textAlign 'center' centra pelo avanco —
    // o digito saia visivelmente jogado para a direita na caixa.
    digitoItalico: false,
    seloItalico: false,
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
  },
  // Verso do santinho 9x5 conjunto (Dr. Elton + parceiro estadual): a peca
  // inteira e escura, ao contrario das outras tres. Corpo navy com o chevron
  // do manual, caixa preenchida em lima e algarismo BRANCO — nao navy, como
  // nas pecas claras. Caixa vazia branca, exatamente como as do senador, do
  // governador e do presidente que o eleitor recebe em branco no papel.
  // Verso do santinho 9x5 conjunto (Dr. Elton + parceiro estadual). Layout
  // proprio, em desenharSantinho() la embaixo: nenhuma das medidas das outras
  // tres pecas vale aqui. Cores medidas na pagina 2 do PDF da peca.
  santinho: {
    santinho: true, // usa o renderizador proprio, nao o das tres campanhas
    fundo: '#0a223e', chevClaro: '#0d294b',
    caixa: '#ffffff',
    txt: '#ffffff', rot: '#c3d3e8',
    // Lima das caixas do Dr. Elton e dos cargos livres. O parceiro leva a cor
    // dele, que vem da config (config.cor) — e o unico eixo que muda de uma
    // peca para a outra.
    destaque: '#cddc00',
    tique: '#9dc23c', // os tiques soltos no fundo saem num lima mais fechado
    semSelo: true, // a peca 9x5 nao tem adesivo redondo
    legalDireita: true, // a marcacao legal virada fica na lateral direita
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
  },
  dulce: {
    // Verso do santinho 7x10 em curvas (16/08), reproduzido a risca: painel
    // cinza chapado, rotulo cinza + nome/digito navy, selo petroleo-escuro,
    // tecla CONFIRMA num lima mais vivo que o verde das caixas.
    topo: '#005474', topoRisco: '#005b79', destaque: '#8dc73f', lima: '#bfd736',
    fundo: '#e7e8e8', fundo2: '#e7e8e8', caixa: '#ffffff', linha: '#d3d4d4',
    txt: '#062240', rot: '#656769', // mesmo ajuste de contraste da tela (4,63:1)
    travadoTxt: '#062240', // caixa travada segue verde; so o digito escurece
    // O selo e o adesivo oficial, extraido em vetor do santinho (ja com o
    // 44400 e com a inclinacao do lockup na propria arte). Raio 129 = 23,9%
    // da largura, a proporcao que ele tem na peca impressa.
    seloImagem: 'marca/selo-dulce.png',
    seloRaio: 129,
    seloCy: 205, // montado na quebra do cabecalho, no canto sem texto
    seloNoCorpo: false,
    // Rotulo do cargo na display da campanha, como na peca. A Avenir nao serve
    // aqui: o arquivo avenir-500.woff2 e o 65 Medium e o @font-face declara
    // cobrir 500-800, entao pedir 800 devolve o Medium — sai leve demais
    // perto do impresso. A Geometos Neue e Black de verdade (usWeightClass 900).
    rotuloDisplay: true,
    fotoSemDestaque: true, // campo pre-definido sem borda verde
    digitoAltura: 0.82, // tinta do digito / altura da caixa, medido na peca
    // Borrao mint na esquerda do painel, como no impresso: sangra pela borda,
    // centro a 26% da altura do corpo (medido na pagina 2 do santinho).
    coracaoCorpo: 'marca/coracao.svg',
    topoLiso: true, // sem coracao no topo: o adesivo ocupa o canto direito
    padrao: 'marca/padrao-dulce-topo.svg', // pessoinhas tom sobre tom no topo
    corpoPadrao: 'marca/padrao-dulce-corpo.svg', // mint na direita do corpo
    rodapeBanda: '#005474', // a faixa petroleo que fecha a peca
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
  },
}

// Mesma fonte da tela (fonts/archivo-var.woff2, ja carregada pelo CSS). Os
// keywords "condensed"/"semi-condensed" mapeiam no eixo de largura variavel.
const SANS = 'Archivo, system-ui, -apple-system, "Segoe UI", sans-serif'
const COND = 'condensed'
const SEMI = 'semi-condensed'

// Monta a string de font do canvas. Os keywords de largura ("condensed") so
// valem para a Archivo variavel — um tema com fonte propria (o Tozi usa
// Geometos e Avenir, do manual dele) os dispensa, senao o navegador sintetiza
// a condensacao e engorda a letra.
function fonte(t, peso, largura, px, { texto = false, italico = false } = {}) {
  const fam = (texto ? t.texto : t.titulo) ?? SANS
  const esticar = (texto ? t.texto : t.titulo) ? '' : `${largura} `
  return `${italico ? 'italic ' : ''}${peso} ${esticar}${px}px ${fam}`
}

// Medidas amarradas na vertical, que e o gargalo:
//   rotulo (baseline em y, texto ~24px acima) + SALTO_CAIXA + CAIXA
// A folga entre o fim das caixas de uma linha e o topo do rotulo da proxima
// e ALTURA_LINHA - SALTO_CAIXA - CAIXA - 24 (altura do rotulo) = 20px. Se
// CAIXA crescer sem ALTURA_LINHA crescer junto, essa conta fica negativa e o
// rotulo encosta nas caixas de cima.
// Fecha em 248 + 6*172 = 1280, e o rodape comeca em 1300.
const MARGEM = 64
const TOPO = 210
const Y0 = 248
const CAIXA = 108 // lado do quadrado de um digito
const GAP = 16
const SALTO_CAIXA = 20 // do baseline do rotulo ao topo das caixas
const ALTURA_LINHA = 172

// Foto a esquerda de cada linha, alinhada com a fileira de caixas. Mesma
// proporcao retrato dos arquivos em fotos/ (89x112).
const FOTO_A = CAIXA
const FOTO_L = Math.round(CAIXA * 0.79)
const GAP_FOTO = 16
// Rotulo e caixas comecam depois da foto.
const X_CONTEUDO = MARGEM + FOTO_L + GAP_FOTO

function retanguloArredondado(ctx, x, y, l, a, r) {
  const raio = Math.min(r, l / 2, a / 2)
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.arcTo(x + l, y, x + l, y + a, raio)
  ctx.arcTo(x + l, y + a, x, y + a, raio)
  ctx.arcTo(x, y + a, x, y, raio)
  ctx.arcTo(x, y, x + l, y, raio)
  ctx.closePath()
}

function cortar(ctx, texto, largura) {
  if (largura <= 0) return ''
  if (ctx.measureText(texto).width <= largura) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largura) {
    t = t.slice(0, -1)
  }
  return `${t}…`
}

// --- fotos -------------------------------------------------------------

// Carrega a foto de cada slot. Falha (arquivo ausente, rede) vira null e o
// desenho cai no placeholder — nunca derruba a geracao da imagem inteira.
function carregarUma(nome) {
  return carregarArquivo(`fotos/${nome}.jpg`)
}

function carregarArquivo(caminho) {
  if (!caminho) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = caminho
  })
}

async function carregarFotos(colinha) {
  const pares = await Promise.all(
    colinha.map(async (s) => [s.id, s.foto ? await carregarUma(s.foto) : null]),
  )
  return new Map(pares)
}

// Equivalente ao object-fit: cover do CSS — preenche a caixa sem distorcer.
function desenharCover(ctx, img, x, y, l, a) {
  const escala = Math.max(l / img.width, a / img.height)
  const w = img.width * escala
  const h = img.height * escala
  ctx.save()
  retanguloArredondado(ctx, x, y, l, a, 8)
  ctx.clip()
  ctx.drawImage(img, x + (l - w) / 2, y + (a - h) / 2, w, h)
  ctx.restore()
}

function desenharSilhueta(ctx, cor, x, y, l, a) {
  const cx = x + l / 2
  const cy = y + a / 2
  const r = l * 0.17
  ctx.fillStyle = cor
  ctx.globalAlpha = 0.45
  ctx.beginPath()
  ctx.arc(cx, cy - r * 1.15, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy + r * 1.75, r * 1.85, Math.PI, 0)
  ctx.fill()
  ctx.globalAlpha = 1
}

// A peca do Tozi nao traz foto por cargo: as caixas comecam na margem.
function colunaDe(t) {
  return t.semFoto ? MARGEM : X_CONTEUDO
}

function desenharFoto(ctx, t, slot, img, x, y) {
  // Na colinha da Dulce os campos ja preenchidos nao levam destaque na foto:
  // ficam com o mesmo fio fino dos campos livres (t.fotoSemDestaque).
  const destacar = slot.proprio && !t.fotoSemDestaque
  if (img) {
    desenharCover(ctx, img, x, y, FOTO_L, FOTO_A)
    ctx.strokeStyle = destacar ? (t.travado ?? t.destaque) : t.linha
    ctx.lineWidth = destacar ? 4 : 2
    retanguloArredondado(ctx, x, y, FOTO_L, FOTO_A, 8)
    ctx.stroke()
    return
  }

  // Sem foto: inicial do nome se ha candidato, silhueta se o campo esta vazio.
  ctx.fillStyle = slot.nome ? t.topo : t.caixa
  retanguloArredondado(ctx, x, y, FOTO_L, FOTO_A, 8)
  ctx.fill()
  ctx.strokeStyle = destacar ? (t.travado ?? t.destaque) : t.linha
  ctx.lineWidth = destacar ? 4 : 2
  retanguloArredondado(ctx, x, y, FOTO_L, FOTO_A, 8)
  ctx.stroke()

  if (slot.nome) {
    ctx.fillStyle = '#ffffff'
    ctx.font = fonte(t, 800, SEMI, 48)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(slot.nome.trim()[0] ?? '', x + FOTO_L / 2, y + FOTO_A / 2 + 3)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  } else {
    desenharSilhueta(ctx, t.rot, x, y, FOTO_L, FOTO_A)
  }
}

// Fitas de chevron da peca, como no pattern do manual (ID 26 ELTON p.21):
// filas coladas (passo = espessura) alternando duas cores. Passar a mesma
// cor duas vezes reproduz o desenho antigo de uma cor so.
function desenharFitas(ctx, corA, corB, x0, y0, larg, alt, seg = 68, queda = 16, esp = 19) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, larg, alt)
  ctx.clip()
  let fila = 0
  for (let y = y0 - queda - esp; y < y0 + alt; y += esp, fila++) {
    ctx.fillStyle = fila % 2 ? corB : corA
    ctx.beginPath()
    for (let x = x0 - seg; x < x0 + larg + seg; x += seg) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + seg / 2, y + queda)
      ctx.lineTo(x + seg, y)
      ctx.lineTo(x + seg, y + esp)
      ctx.lineTo(x + seg / 2, y + queda + esp)
      ctx.lineTo(x, y + esp)
      ctx.closePath()
    }
    ctx.fill()
  }
  ctx.restore()
}

// Pattern oficial do manual (ID 26 ELTON, p.21/22), poligono exato do vetor:
// colunas de 135,6 x periodo 71, fita clara de 35,8 sobre o fundo escuro
// (50/50, vale assimetrico em x=37). colFrac = coluna como fracao da largura
// da folha — proporcoes medidas na peca impressa: topo ~0,13, faixa ~0,05.
function desenharPadraoOficial(ctx, y0, alt, cor, colFrac) {
  const P = [[135.6, 0], [135.6, 35.8], [111.7, 43.5], [92.3, 49.8],
    [71.4, 56.5], [37, 67.7], [23.9, 63.4], [0, 55.7], [0, 19.9], [37, 31.9]]
  const col = L * colFrac
  const k = col / 135.6
  const per = 71 * k
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, y0, L, alt)
  ctx.clip()
  ctx.fillStyle = cor
  for (let x = 0; x < L; x += col) {
    for (let y = y0 - per; y < y0 + alt + per; y += per) {
      ctx.beginPath()
      P.forEach(([px, py], i) => {
        i ? ctx.lineTo(x + px * k, y + py * k) : ctx.moveTo(x + px * k, y + py * k)
      })
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

function desenharTopo(ctx, t, simbolo, padrao) {
  ctx.fillStyle = t.topo
  ctx.fillRect(0, 0, L, TOPO)

  // Chevrons da peca impressa. O tema que traz o simbolo proprio (Tozi)
  // usa o SVG do manual no lugar, rebaixado a textura.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, L, TOPO)
  ctx.clip()
  if (padrao) {
    // Como na peca (e na tela): UMA faixa de pessoinhas encostada no pe do
    // cabecalho, repetindo so na horizontal. 64% da altura da faixa e a
    // proporcao medida na pagina 2 do santinho — o terco de cima fica liso.
    const alt = TOPO * 0.64
    const larg = alt * (padrao.width / padrao.height)
    for (let x = 0; x < L; x += larg) {
      ctx.drawImage(padrao, x, TOPO - alt, larg, alt)
    }
  } else if (simbolo) {
    const larg = L * 1.25
    const alt = larg * (simbolo.height / simbolo.width)
    ctx.drawImage(simbolo, -L * 0.1, TOPO - alt * 0.7, larg, alt)
    ctx.fillStyle = 'rgba(26,23,78,.62)'
    ctx.fillRect(0, 0, L, TOPO)
  } else if (t.chevClaro) {
    desenharPadraoOficial(ctx, 0, TOPO, t.chevClaro, 0.121)
  } else if (!t.topoLiso) {
    desenharFitas(ctx, t.topoRisco2 ?? t.topoRisco, t.topoRisco, 0, 0, L, TOPO)
  }
  // O brilho ciano diagonal que a arte tem entrando pela esquerda do topo.
  if (t.ciano) {
    const luz = ctx.createLinearGradient(0, TOPO, L * 0.55, 0)
    luz.addColorStop(0, t.ciano)
    luz.addColorStop(1, 'rgba(64,170,214,0)')
    ctx.fillStyle = luz
    ctx.fillRect(0, 0, L, TOPO)
  }
  ctx.restore()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = fonte(t, 800, COND, 62)
  ctx.fillText('COMO VOTAR', MARGEM, 96)

  // O visto lima da identidade cruza POR CIMA da base do "OTA" de VOTAR —
  // por isso vem DEPOIS do fillText (no canvas quem desenha depois fica por
  // cima). Path = visto OFICIAL (ID 26 ELTON p.7), proporcao natural
  // 170.7x79.3; o corpo dele desce abaixo da linha de base, so a ponta alta
  // cruza as letras. Mesmas medidas da tela, em em do corpo do titulo.
  if (t.peca) {
    const corpo = 62 // o mesmo px do fillText acima
    const x0 = MARGEM + 4.15 * corpo
    const larg = 2.1 * corpo
    const alt = larg * (79.3 / 170.7)
    const base = 96 + 0.77 * corpo // 96 = linha de base do titulo
    const px = (x, y) => [x0 + (x / 170.7) * larg, base - alt + (y / 79.3) * alt]
    ctx.fillStyle = t.lima ?? t.destaque
    ctx.beginPath()
    const pts = [[170.7, 0], [93.3, 25], [46.5, 40.1], [0, 25.1], [0, 64.3],
      [6, 66.2], [46.5, 79.3], [154.6, 44.4], [170.7, 39.2]]
    pts.forEach(([x, y], i) => {
      const [cx, cy] = px(x, y)
      i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy)
    })
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
  }

  ctx.font = fonte(t, 500, COND, 29, { texto: true })
  ctx.fillStyle = 'rgba(255,255,255,.93)'
  // Uma linha so; a data da eleicao saiu do cabecalho a pedido da campanha.
  // Base em 180 (TOPO e 210): fica logo acima da borda da faixa, afastada do
  // titulo, como a segunda linha ficava antes.
  ctx.fillText('Confira o nome de cada candidato antes de votar.', MARGEM, 180)
}

// Divide o nome em ate duas linhas, quebrando no espaco mais proximo do meio.
function duasLinhas(ctx, texto, largura) {
  if (ctx.measureText(texto).width <= largura || !texto.includes(' ')) {
    return [cortar(ctx, texto, largura)]
  }
  const palavras = texto.split(' ')
  let corte = 1
  let melhor = Infinity
  for (let i = 1; i < palavras.length; i++) {
    const dif = Math.abs(
      palavras.slice(0, i).join(' ').length - palavras.slice(i).join(' ').length,
    )
    if (dif < melhor) { melhor = dif; corte = i }
  }
  return [
    cortar(ctx, palavras.slice(0, corte).join(' '), largura),
    cortar(ctx, palavras.slice(corte).join(' '), largura),
  ]
}

// Raio do selo montado com texto (o do Tozi). O de imagem usa t.seloRaio.
const SELO_RAIO_TEXTO = 96

// Raio do selo que sera desenhado — 0 quando o site nao tem candidato proprio.
export function raioDoSelo(t, temSelo, temImagem) {
  // semSelo: a peca simplesmente nao tem adesivo redondo (o santinho 9x5
  // conjunto). Sem isto o tema cairia no selo montado com texto, que existe
  // como ULTIMO recurso para campanha sem arte — nao como escolha de arte.
  if (!temSelo || t.semSelo) return 0
  return temImagem ? (t.seloRaio ?? 148) : SELO_RAIO_TEXTO
}

// Onde o nome de uma linha precisa parar. Na linha que hospeda o selo ele para
// na borda esquerda do selo; nas outras, na margem de sempre. Puro e exportado
// para o teste conferir a geometria sem canvas.
export function bordaDoNome(t, idx, seloRaio) {
  const naLinhaDoSelo = seloRaio > 0 && t.seloNoCorpo
    && Math.round(t.seloLinha ?? 2.32) === idx
  return naLinhaDoSelo ? L - MARGEM - 2 * seloRaio - 30 : L - MARGEM - 60
}

// O selo redondo do candidato, como na peca impressa: circulo na cor da marca
// com anel de destaque, sobrepondo o topo e o corpo.
function desenharSelo(ctx, t, slot, imgSelo, raio, seloLogo, seloLogo2, seloTrio) {
  // Botton oficial em imagem (Dr. Elton): desenha e pronto. Maior que o selo
  // de texto, como na arte. O raio vem de raioDoSelo — o MESMO numero que
  // bordaDoNome usa para parar o nome antes do selo.
  if (imgSelo) {
    const cx = L - MARGEM - raio
    // No corpo (Dr. Elton) ou montado na quebra do cabecalho (Dulce): na
    // imagem as linhas sao compactas e nao sobra bolso para um adesivo do
    // tamanho da peca sem cair em cima do nome de algum candidato. O alto a
    // direita e a unica area livre de texto — o titulo e as duas linhas do
    // cabecalho sao alinhados a esquerda.
    const cy = t.seloNoCorpo ? Y0 + ALTURA_LINHA * (t.seloLinha ?? 2.32) : (t.seloCy ?? 150)
    ctx.save()
    // So o botton do Dr. Elton tem sombra na arte; o adesivo da Dulce e chapado.
    if (t.seloSombra) {
      ctx.shadowColor = 'rgba(14,31,58,.30)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 6
    }
    ctx.drawImage(imgSelo, cx - raio, cy - raio, raio * 2, raio * 2)
    ctx.restore()
    return
  }

  const cx = L - MARGEM - raio
  // Na peca o selo desce para a faixa dos senadores, que so tem 3 digitos e
  // deixa a direita vazia. Na tela (e aqui) esse vazio nao e permanente: com o
  // nome do senador resolvido, e ali que o texto cai. Por isso o tema pode
  // escolher outra linha — a Dulce usa a ultima, onde o vao nao fecha.
  const cy = t.seloNoCorpo ? Y0 + ALTURA_LINHA * (t.seloLinha ?? 2.32) : 150

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.fillStyle = t.selo ?? t.topo
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = t.seloAnel ?? t.destaque
  ctx.stroke()

  // Nas pecas do Dr. Elton e da Dulce o conteudo do selo sai inclinado.
  if (t.peca || t.seloTorto) {
    ctx.translate(cx, cy)
    ctx.rotate(-8 * Math.PI / 180)
    ctx.translate(-cx, -cy)
  }

  // Selo da Dulce: cargo, wordmark oficial + trio mint, numero mint — como
  // no verso do santinho dela. O texto generico abaixo nao roda.
  if (seloLogo) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = fonte(t, 700, COND, 15, { texto: true })
    const rotulo = `${slot.rotulo.toUpperCase()} //`
    const linhas = duasLinhas(ctx, rotulo, raio * 1.5)
    linhas.forEach((l, i) => ctx.fillText(l, cx, cy - 44 - (linhas.length - 1 - i) * 17))

    // "DULCE" na primeira linha; "RITΛ" + trio mint na segunda, como na peca.
    const l1L = 132
    const l1A = l1L * (seloLogo.height / seloLogo.width)
    ctx.drawImage(seloLogo, cx - l1L / 2, cy - 34, l1L, l1A)
    if (seloLogo2) {
      const l2L = 94
      const l2A = l2L * (seloLogo2.height / seloLogo2.width)
      const trioL = seloTrio ? 28 : 0
      const x0 = cx - (l2L + (trioL ? trioL + 6 : 0)) / 2
      const y2 = cy - 34 + l1A + 4
      ctx.drawImage(seloLogo2, x0, y2, l2L, l2A)
      if (seloTrio) {
        const trioA = trioL * (seloTrio.height / seloTrio.width)
        ctx.drawImage(seloTrio, x0 + l2L + 6, y2 + l2A - trioA, trioL, trioA)
      }
    }

    ctx.fillStyle = t.seloNumero ?? t.destaque
    ctx.font = fonte(t, 800, COND, 46, { italico: t.seloItalico !== false })
    ctx.fillText(slot.numero, cx, cy + 74)
    ctx.restore()
    ctx.textAlign = 'left'
    return
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  // "DEPUTADO ESTADUAL" nao cabe numa linha do selo na fonte do Tozi — e na
  // peca dele o cargo vem quebrado em duas mesmo.
  ctx.font = fonte(t, 700, COND, t.texto ? 15 : 17, { texto: true })
  const cargo = duasLinhas(ctx, slot.rotulo.toUpperCase(), raio * (t.texto ? 1.45 : 1.95))
  cargo.forEach((l, i) => ctx.fillText(l, cx, cy - 52 - (cargo.length - 1 - i) * 18))

  ctx.fillStyle = '#ffffff'
  // Nome de uma palavra so mais larga que o selo ("PROFESSOR") sairia cortado
  // com reticencias, porque duasLinhas nao tem onde quebrar. Encolhe a fonte
  // ate a maior palavra caber — o selo aguenta ate 22px sem virar ilegivel.
  const largura = raio * 1.7
  let tam = 34
  ctx.font = fonte(t, 800, COND, tam)
  const nome = slot.nome.toUpperCase()
  const maior = Math.max(...nome.split(' ').map((p) => ctx.measureText(p).width))
  if (maior > largura) tam = Math.max(22, Math.floor((tam * largura) / maior))

  ctx.font = fonte(t, 800, COND, tam)
  // Na peca do Dr. Elton o nome sai empilhado ("DR." / "ELTON") mesmo
  // cabendo em uma linha — e o vao da primeira linha recebe as fitas.
  const quebra = nome.indexOf(' ')
  const linhas = t.peca && quebra > 0
    ? [nome.slice(0, quebra), cortar(ctx, nome.slice(quebra + 1), largura)]
    : duasLinhas(ctx, nome, largura)
  const base = linhas.length === 2 ? cy - 14 : cy + 2
  linhas.forEach((l, i) => ctx.fillText(l, cx, base + i * (tam + 2)))

  // Na peca do Dr. Elton, tres fitas de chevron lima preenchem o vao a
  // direita da primeira linha curta ("DR." + fitas / "ELTON").
  if (t.peca && linhas.length === 2 && linhas[0].length <= 4) {
    const x0 = cx + ctx.measureText(linhas[0]).width / 2 + 12
    ctx.fillStyle = t.destaque
    for (let i = 0; i < 3; i++) {
      const y = base - 26 + i * 11
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x0 + 19, y + 6)
      ctx.lineTo(x0 + 38, y)
      ctx.lineTo(x0 + 38, y + 7)
      ctx.lineTo(x0 + 19, y + 13)
      ctx.lineTo(x0, y + 7)
      ctx.closePath()
      ctx.fill()
    }
  }

  ctx.fillStyle = t.seloNumero ?? (t.peca ? t.destaque : t.seloAnel ?? t.destaque)
  // Na peca do Dr. Elton o numero domina o selo; nos outros temas segue menor.
  const numTam = t.peca ? 54 : 44
  ctx.font = fonte(t, 800, COND, numTam, { italico: t.seloItalico !== false })
  ctx.fillText(slot.numero, cx, cy + (t.peca ? 70 : 64))
  ctx.restore()
  ctx.textAlign = 'left'
}

// Marcacao legal na margem, rodada 90deg — o lugar que o santinho impresso
// usa. A faixa livre entre a borda e MARGEM nao disputa espaco com nada: as
// fotos so comecam em MARGEM e as caixas terminam antes da outra borda.
// Na peca 9x5 conjunta ela sai na margem DIREITA e em duas linhas, como
// impresso; nas tres campanhas proprias, na esquerda e numa linha so.
const ENTRELINHA_LEGAL = 21

function desenharLegal(ctx, t, config, altura) {
  const legal = config.legal
    ?? (config.cnpj ? [`${config.razao} \u00b7 CNPJ ${config.cnpj}`] : null)
  if (!legal?.length) return
  ctx.save()
  // Depois do rotate(-90) o +y local aponta para a DIREITA da peca. Na
  // margem direita as linhas por isso comecam recuadas, para que a ultima
  // (a mais longa, a do contratado) e nao a primeira encoste na borda.
  const x = t.legalDireita
    ? L - MARGEM * 0.62 - ENTRELINHA_LEGAL * (legal.length - 1)
    : MARGEM * 0.62
  ctx.translate(x, altura - 118)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = t.rot
  ctx.font = fonte(t, 500, COND, 17, { texto: true })
  legal.forEach((linha, i) => ctx.fillText(linha, 0, i * ENTRELINHA_LEGAL))
  ctx.restore()
}

export async function desenhar(colinha, config) {
  const t = TEMAS[config.tema] ?? TEMAS.elton

  // Sem isto o iOS desenha com a fonte de fallback e o layout sai torto.
  // O load explicito cobre o canvas: a fonte pode ainda nao ter sido usada
  // com esses pesos/larguras no DOM.
  try {
    const pedidos = t.titulo
      ? ['900 66px "Geometos Neue"', '800 32px "Avenir LT Std"', '500 29px "Avenir LT Std"']
      : [`800 ${COND} 62px Archivo`, `800 ${SEMI} 74px Archivo`, '500 29px Archivo']
    await Promise.all(pedidos.map((f) => document.fonts.load(f)))
  } catch { /* sem a fonte, cai no fallback do sistema */ }
  if (document.fonts?.ready) await document.fonts.ready

  // Fotos antes de qualquer traco: drawImage e sincrono, entao elas precisam
  // ja estar decodificadas quando o laco chegar em cada linha.
  const fotos = await carregarFotos(colinha)

  // A peca 9x5 conjunta tem layout proprio (sem cabecalho, fundo escuro de
  // ponta a ponta, lockup redondo por candidato travado). Sai daqui antes de
  // carregar simbolo, rosto e selo: nenhum deles existe nela.
  if (t.santinho) return desenharSantinho(colinha, config, t, fotos)
  // Simbolo, rosto e selo do manual, quando o tema tem. Falha vira null e o
  // desenho cai no risco geometrico — a imagem sai sem a marca, nunca quebrada.
  const [simbolo, rosto, padrao, imgSelo, seloLogo, seloLogo2, seloTrio, corpoPadrao, coracao, coracaoCorpo] = await Promise.all([
    carregarArquivo(t.simbolo), carregarArquivo(t.rosto), carregarArquivo(t.padrao),
    carregarArquivo(t.seloImagem),
    carregarArquivo(t.seloLogo), carregarArquivo(t.seloLogo2),
    carregarArquivo(t.seloTrio), carregarArquivo(t.corpoPadrao),
    carregarArquivo(t.coracao), carregarArquivo(t.coracaoCorpo),
  ])
  // A peca do Dr. Elton fecha com a faixa lima de chevrons; a imagem dele
  // cresce essa faixa. Os temas com peca propria ficam na altura de sempre.
  const FAIXA = t.peca ? 84 : 0
  const cv = document.createElement('canvas')
  cv.width = L
  cv.height = A + FAIXA
  const ctx = cv.getContext('2d')

  const degrade = ctx.createLinearGradient(0, TOPO, L * 0.3, A)
  degrade.addColorStop(0, t.fundo2)
  degrade.addColorStop(0.45, t.fundo)
  degrade.addColorStop(1, t.fundo)
  ctx.fillStyle = degrade
  ctx.fillRect(0, 0, L, A + FAIXA)

  // O brilho lima do canto de baixo da arte.
  if (t.peca) {
    const brilho = ctx.createRadialGradient(L * 0.98, A * 0.92, 0, L * 0.98, A * 0.92, L * 0.55)
    brilho.addColorStop(0, 'rgba(169,207,53,.32)')
    brilho.addColorStop(1, 'rgba(169,207,53,0)')
    ctx.fillStyle = brilho
    ctx.fillRect(0, 0, L, A + FAIXA)
  }

  // Pessoinhas mint na lateral direita do corpo, como na peca da Dulce.
  // O esvaecer e feito num canvas separado: destination-out direto no canvas
  // principal apagava tambem o fundo ja pintado e o PNG saia com uma banda
  // transparente (escura em qualquer visualizador de fundo escuro).
  if (corpoPadrao) {
    const off = document.createElement('canvas')
    off.width = L
    off.height = A - TOPO
    const octx = off.getContext('2d')
    octx.fillStyle = octx.createPattern(corpoPadrao, 'repeat')
    octx.fillRect(L * 0.5, 0, L * 0.5, A - TOPO)
    const grad = octx.createLinearGradient(L * 0.5, 0, L * 0.78, 0)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    octx.globalCompositeOperation = 'destination-out'
    octx.fillStyle = grad
    // apaga o padrao gradualmente na borda esquerda, como o esvaecer da peca
    octx.fillRect(L * 0.5, 0, L * 0.28, A - TOPO)
    ctx.globalAlpha = 0.85
    ctx.drawImage(off, 0, TOPO)
    ctx.globalAlpha = 1
  }

  // Coracao mint desfocado na esquerda do painel, como na peca: sangra pela
  // borda e o centro cai a 26% da altura do corpo. Proporcoes medidas no
  // santinho (visivel 318x321 num painel de 1794, comecando na propria borda).
  if (coracaoCorpo) {
    const corpoA = A - TOPO
    const larg = 0.193 * L // inclui o pedaco que fica fora da folha
    const alt = larg * (coracaoCorpo.height / coracaoCorpo.width)
    const x0 = -0.015 * L
    const y0 = TOPO + 0.175 * corpoA
    ctx.save()
    // Sem suporte a filter (Safari antigo) o coracao sai nitido demais para
    // passar por marca d'agua — ai entra com menos opacidade no lugar do blur.
    const temBlur = typeof ctx.filter === 'string'
    if (temBlur) ctx.filter = `blur(${Math.round(larg * 0.085)}px)`
    ctx.globalAlpha = temBlur ? 0.5 : 0.22
    ctx.drawImage(coracaoCorpo, x0, y0, larg, alt)
    ctx.restore()
  }

  desenharTopo(ctx, t, simbolo, padrao)

  // O coracao da identidade na direita do topo — desfocado, como o brilho
  // suave da peca. Navegador sem ctx.filter (Safari velho) desenha nitido.
  if (coracao) {
    const alt = 92
    const larg = alt * (coracao.width / coracao.height)
    ctx.save()
    ctx.filter = 'blur(9px)'
    ctx.globalAlpha = 0.8
    ctx.drawImage(coracao, L - larg - 48, (TOPO - alt) / 2, larg, alt)
    ctx.restore()
  }

  // Rosto em traco no canto de cima, invadindo o topo — a moldura da peca.
  if (rosto) {
    // Como na peca: a cabeca sobre a faixa navy, a gola ja no corpo claro, o
    // desenho inteiro dentro da imagem — nada de topo cortado.
    const alt = A * 0.205
    const larg = alt * (rosto.width / rosto.height)
    ctx.drawImage(rosto, L - larg - MARGEM * 0.45, 10, larg, alt)
  }

  // O selo e o do PROPRIO candidato do site: procura pelo cargo da config, e
  // nao pelo primeiro `travado`. Com os aliados da peca tambem fixos, o
  // primeiro travado passou a ser o federal — e o selo saiu com o wordmark
  // dela e o numero do Dr. Elton.
  const proprio = colinha.find((s) => s.id === slotTravado(config))
  // Raio do selo que sera desenhado — 0 quando nao ha selo. O laco das linhas
  // usa o MESMO numero para saber onde parar o nome.
  const seloRaio = raioDoSelo(t, Boolean(proprio), Boolean(imgSelo))
  // seloRaio, nao `proprio`: com raio 0 (tema semSelo) o circulo some mas o
  // cargo, o nome e o numero continuavam sendo escritos por cima da peca.
  if (seloRaio > 0) desenharSelo(ctx, t, proprio, imgSelo, seloRaio, seloLogo, seloLogo2, seloTrio)

  // Tamanho do algarismo tirado da peca: no santinho a tinta do digito mede
  // 0,82 da altura da caixa (176px numa caixa de 215). Mede-se a tinta do "4"
  // (de topo reto) num corpo de referencia e reescala — assim o "0" e o "2"
  // mantem o transbordo optico proprio deles, como no impresso.
  // So o tema que declara digitoAltura entra nessa conta; os outros seguem no
  // corpo fixo de sempre, para nao mexer no PNG de campanha ja aprovada.
  let tamDigito = t.peca ? 80 : 76
  if (t.digitoAltura) {
    ctx.font = fonte(t, t.peca ? 900 : 800, SEMI, 100, { italico: !!t.digitoItalico })
    const ref = ctx.measureText('4')
    const tintaRef = ref.actualBoundingBoxAscent + ref.actualBoundingBoxDescent
    if (tintaRef > 0) tamDigito = Math.round((100 * CAIXA * t.digitoAltura) / tintaRef)
  }

  ctx.textAlign = 'left'
  let y = Y0

  for (const [idx, slot] of colinha.entries()) {
    // O nome para na borda esquerda do selo na linha que o hospeda. Vale para
    // os DOIS tipos de selo: antes so o adesivo em imagem encolhia a borda, e
    // no tema do Tozi — que monta o selo com texto — "VETERINARIO WILSON
    // GRASSI" no campo de presidente ia ate x=888 com o selo comecando em
    // x=824, e o nome saia atravessado por cima dele no PNG.
    const bordaDireita = bordaDoNome(t, idx, seloRaio)
    // Rotulo do cargo, e o nome resolvido logo depois da barra. Na peca do
    // Dr. Elton o rotulo sai na display da campanha, nao na fonte de texto.
    const display = t.peca || t.rotuloDisplay
    ctx.font = fonte(t, 800, COND, display ? 30 : 32, { texto: !display })
    ctx.fillStyle = t.rot
    const cargo = slot.rotulo.toUpperCase()
    const coluna = colunaDe(t)
    ctx.fillText(cargo, coluna, y)
    let cursor = coluna + ctx.measureText(cargo).width

    if (slot.nome) {
      ctx.fillText(' |', cursor, y)
      cursor += ctx.measureText(' | ').width
      ctx.fillStyle = t.txt
      // Nome nao se trunca numa peca de conferencia: encolhe ate caber
      // (24px ainda le bem) e so corta se nem assim couber.
      const cheio = slot.nome.toUpperCase()
      let corpo = display ? 30 : 32
      while (corpo > 24 && ctx.measureText(cheio).width > bordaDireita - cursor) {
        corpo -= 2
        ctx.font = fonte(t, 800, COND, corpo, { texto: !display })
      }
      const nome = cortar(ctx, cheio, bordaDireita - cursor)
      ctx.fillText(nome, cursor, y)
      // Na peca o campo ja preenchido sai sem a sigla ("... | DR. ELTON", so).
      // Isso tambem tira o "UNIAO" de baixo do adesivo, no alto a direita.
      if (slot.partido && !(slot.travado && display)) {
        cursor += ctx.measureText(nome).width + 12
        ctx.font = fonte(t, 700, COND, 24, { texto: true })
        // A sigla so entra se couber antes da borda (do selo, na linha dele).
        if (cursor + ctx.measureText(slot.partido).width <= bordaDireita) {
          ctx.fillStyle = t.rot
          ctx.fillText(slot.partido, cursor, y)
        }
      }
    }

    // Um quadrado por digito.
    const topo = y + SALTO_CAIXA

    if (!t.semFoto) desenharFoto(ctx, t, slot, fotos.get(slot.id), MARGEM, topo)

    for (let i = 0; i < slot.digitos; i++) {
      const x = colunaDe(t) + i * (CAIXA + GAP)
      const digito = (slot.numero ?? '')[i] ?? ''

      // So o campo do PROPRIO candidato leva a cor propria (azul na peca do
      // Tozi); aliado fixo sai verde como os demais.
      const cheia = slot.proprio ? (t.travado ?? t.destaque) : t.destaque

      ctx.fillStyle = digito ? cheia : t.caixa
      retanguloArredondado(ctx, x, topo, CAIXA, CAIXA, 10)
      ctx.fill()
      ctx.strokeStyle = digito ? cheia : t.linha
      ctx.lineWidth = 2
      retanguloArredondado(ctx, x, topo, CAIXA, CAIXA, 10)
      ctx.stroke()

      if (digito) {
        ctx.fillStyle = slot.proprio ? (t.travadoTxt ?? t.txt) : t.txt
        ctx.font = fonte(t, t.peca ? 900 : 800, SEMI, tamDigito, { italico: !!t.digitoItalico })
        // Centra pela TINTA do algarismo, nao pelo textBaseline 'middle': o
        // meio da caixa de linha fica entre ascent e descent da fonte, que sao
        // assimetricos, e o digito sentava fora do centro da caixa.
        const md = ctx.measureText(digito)
        const meio = (md.actualBoundingBoxAscent - md.actualBoundingBoxDescent) / 2
        ctx.textAlign = 'center'
        ctx.fillText(digito, x + CAIXA / 2, topo + CAIXA / 2 + meio)
        ctx.textAlign = 'left'
      }
    }


    y += ALTURA_LINHA
  }

  // A peca da Dulce fecha com a faixa petroleo colada na borda de baixo; o
  // rodape entra nela em branco. Sem banda, segue o cinza discreto de sempre.
  if (t.rodapeBanda) {
    ctx.fillStyle = t.rodapeBanda
    ctx.fillRect(0, A - 92, L, 92)
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = t.rodapeBanda ? 'rgba(255,255,255,.88)' : t.rot
  ctx.font = fonte(t, 700, COND, 26, { texto: true })
  ctx.fillText(location.hostname, L / 2, A - 50)
  ctx.font = fonte(t, 500, COND, 24, { texto: true })
  ctx.fillText('Confira sempre o n\u00famero do candidato na urna.', L / 2, A - 18)

  desenharLegal(ctx, t, config, A)

  if (FAIXA) {
    // A faixa lima fecha a peca com o MESMO pattern oficial do topo, na
    // versao verde do manual (p.22) e na mesma escala.
    ctx.fillStyle = t.faixa ?? t.destaque
    ctx.fillRect(0, A, L, FAIXA)
    if (t.faixaFita) desenharPadraoOficial(ctx, A, FAIXA, t.faixaFita, 0.048)
  }

  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'))
}

// --- santinho 9x5 conjunto ---------------------------------------------
// A peca conjunta nao e uma variacao da colinha das tres campanhas: nao tem
// cabecalho, o fundo escuro vai de ponta a ponta e cada candidato travado
// ocupa DUAS alturas (o lockup com a foto redonda em cima, a fila de caixas
// embaixo). Encaixar isso na mesma funcao pediria uma duzia de flags novas
// dentro do laco que desenha as pecas ja aprovadas — o risco mora ali, nao
// no codigo a mais.
//
// Todas as medidas daqui para baixo estao em pixels da PAGINA 2 do PDF da
// peca (578x1031, o render a 4x), convertidas por SANT(). Assim qualquer
// numero deste arquivo pode ser conferido na peca com uma regua, sem refazer
// conta nenhuma.
const REF_L = 578
const REF_A = 1031
const SANT = (v) => Math.round((v * L) / REF_L)

// Colunas do chevron: periodo horizontal medido em 78px na peca.
const CHEV_COL = 78 / REF_L

const S = {
  margem: 66,
  caixaL: 85.5, caixaA: 83, passo: 90, gap: 4.5,
  circD: 111,
  // travado: o circulo centra 55,5 abaixo do topo da faixa, as caixas
  // comecam em +121 e a proxima faixa em +220.
  travadoCirc: 55.5, travadoCaixas: 121, travadoAltura: 220,
  // livre: BASELINE do rotulo em +8 (o texto sobe acima dela, para dentro da
  // folga da faixa anterior), caixas em +15, proxima faixa em +119.
  livreRotulo: 8, livreCaixas: 15, livreAltura: 119,
  y0: 66,
}

// Quebra o nome em ate duas linhas que caibam na largura, encolhendo o corpo
// se nem assim couber. Sem isto "ROGÉRIO FRANCO" (que na peca sai em duas
// linhas) ou um nome de urna comprido sangraria por cima da margem.
function nomeEmLinhas(ctx, t, nome, largura, corpo) {
  for (let px = corpo; px >= corpo * 0.62; px -= 2) {
    ctx.font = fonte(t, 900, SEMI, px)
    if (ctx.measureText(nome).width <= largura) return { px, linhas: [nome] }
    const palavras = nome.split(' ')
    if (palavras.length < 2) continue
    for (let corte = palavras.length - 1; corte >= 1; corte--) {
      const a = palavras.slice(0, corte).join(' ')
      const b = palavras.slice(corte).join(' ')
      if (ctx.measureText(a).width <= largura && ctx.measureText(b).width <= largura) {
        return { px, linhas: [a, b] }
      }
    }
  }
  const px = Math.round(corpo * 0.62)
  ctx.font = fonte(t, 900, SEMI, px)
  return { px, linhas: [cortar(ctx, nome, largura)] }
}

// Corpo do algarismo pela TINTA, nao pela caixa de linha: mede o "4" (de topo
// reto) num corpo de referencia e reescala para a fracao pedida da caixa.
function corpoDoDigito(ctx, t, alturaCaixa, fracao) {
  ctx.font = fonte(t, 900, SEMI, 100)
  const m = ctx.measureText('4')
  const tinta = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  return tinta > 0 ? Math.round((100 * alturaCaixa * fracao) / tinta) : Math.round(alturaCaixa * 0.7)
}

function caixasDoSlot(ctx, t, slot, y, cor) {
  // O numero do DONO da peca ocupa a largura inteira do conteudo; os outros
  // cargos ficam na caixa de tamanho fixo, alinhados a esquerda. Nas pecas
  // conjuntas isso nao aparece — o parceiro tem 5 digitos, que e justamente
  // o que preenche a largura no tamanho fixo. Na peca do Dr. Elton sozinho,
  // os 4 digitos dele esticam de 85 para 107 (medido na pagina 2).
  const largura = REF_L - 2 * S.margem
  const passoRef = slot.proprio
    ? (largura + S.gap) / slot.digitos
    : S.passo
  const L_CX = SANT(passoRef - S.gap)
  const A_CX = slot.proprio ? SANT((passoRef - S.gap) * (S.caixaA / S.caixaL)) : SANT(S.caixaA)
  const passo = SANT(passoRef)
  const corpo = corpoDoDigito(ctx, t, A_CX, 0.72)
  for (let i = 0; i < slot.digitos; i++) {
    const x = SANT(S.margem) + i * passo
    const digito = (slot.numero ?? '')[i] ?? ''
    retanguloArredondado(ctx, x, y, L_CX, A_CX, SANT(6))
    // Caixa vazia e branca na peca — é ali que o eleitor escreve à caneta.
    ctx.fillStyle = digito ? cor : t.caixa
    ctx.fill()
    if (digito) {
      ctx.fillStyle = '#ffffff'
      ctx.font = fonte(t, 900, SEMI, corpo)
      const md = ctx.measureText(digito)
      const meio = (md.actualBoundingBoxAscent - md.actualBoundingBoxDescent) / 2
      ctx.textAlign = 'center'
      ctx.fillText(digito, x + L_CX / 2, y + A_CX / 2 + meio)
      ctx.textAlign = 'left'
    }
  }
  return y + A_CX
}

// Foto redonda do candidato travado, dentro do disco na cor dele.
//
// Com o RECORTE (fotos/recorte-<nome>.png, gerado por build/recortar_fotos.py)
// o disco aparece atras da pessoa, como na peca. Sem ele — clone novo, foto
// em que a Vision nao achou ninguem — entra a foto quadrada do acervo, que
// cobre o disco com o proprio fundo e deixa so o anel colorido. Mais pobre,
// nunca quebrada.
function fotoRedonda(ctx, foto, recorte, cx, cy, raio, cor) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.fillStyle = cor
  ctx.fill()
  ctx.clip()
  const img = recorte ?? foto
  if (img) {
    // A foto do acervo e 3/4 (ombros para cima) e o rosto mora no terco de
    // cima. Encaixar pela ALTURA do circulo deixaria a cabeca minuscula: a
    // imagem entra maior que o disco e sobe, para o rosto cair no meio dele.
    const l = raio * (recorte ? 2.05 : 1.9)
    const a = l * (img.height / img.width)
    ctx.drawImage(img, cx - l / 2, cy - raio - a * 0.06, l, a)
  }
  ctx.restore()
}

// O tique da identidade solto no fundo, como na peca: alguns passam por tras
// das caixas, e e isso que os faz ler como fundo e nao como adesivo colado.
// Mesmo poligono oficial do visto (ID 26 ELTON p.7), proporcao 170.7x79.3.
const VISTO = [[170.7, 0], [93.3, 25], [46.5, 40.1], [0, 25.1], [0, 64.3],
  [6, 66.2], [46.5, 79.3], [154.6, 44.4], [170.7, 39.2]]

function tique(ctx, cor, x, y, larg) {
  const alt = larg * (79.3 / 170.7)
  ctx.fillStyle = cor
  ctx.beginPath()
  VISTO.forEach(([vx, vy], i) => {
    const px = x + (vx / 170.7) * larg
    const py = y + (vy / 79.3) * alt
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  })
  ctx.closePath()
  ctx.fill()
}

// Cargo em cima, nome embaixo, o conjunto centrado na altura do circulo —
// como cada lockup da peca.
function lockup(ctx, t, slot, x, cy) {
  const largura = L - SANT(S.margem) - x
  const corpoRotulo = SANT(15)
  const { px, linhas } = nomeEmLinhas(ctx, t, slot.nome.toUpperCase(), largura, SANT(42))
  const entrelinha = Math.round(px * 0.94)
  const alturaTotal = corpoRotulo + SANT(6) + linhas.length * entrelinha
  let y = cy - alturaTotal / 2 + corpoRotulo

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = fonte(t, 800, COND, corpoRotulo, { texto: true })
  // O rotulo da peca e bem espacado; onde o canvas nao suporta letterSpacing
  // (Safari antigo) ele so sai mais junto, sem quebrar nada.
  const espaco = ctx.letterSpacing
  if (espaco !== undefined) ctx.letterSpacing = `${SANT(2.4)}px`
  ctx.fillText((slot.rotulo ?? '').toUpperCase(), x, y)
  if (espaco !== undefined) ctx.letterSpacing = espaco

  y += SANT(6)
  ctx.font = fonte(t, 900, SEMI, px)
  for (const linha of linhas) {
    y += entrelinha
    ctx.fillText(linha, x, y)
  }
}

// Cargo livre: so o rotulo, como na peca em branco. Resolvido o numero, o
// nome entra na MESMA linha — a peca impressa nao tem onde por um nome que
// ela nao conhece, e o eleitor precisa dele para conferir na urna.
// `base` e a LINHA DE BASE do rotulo, nao o topo: o texto sobe a partir dela,
// para dentro da folga que a faixa anterior deixou. Medir pelo topo colocava
// o rotulo por cima das proprias caixas.
function rotuloLivre(ctx, t, slot, x, base) {
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  const corpo = SANT(21)
  ctx.font = fonte(t, 900, SEMI, corpo)
  const rotulo = (slot.rotulo ?? '').toUpperCase()
  ctx.fillText(rotulo, x, base)
  if (!slot.nome) return
  const cursor = x + ctx.measureText(`${rotulo} `).width
  const sobra = L - SANT(S.margem) - cursor
  ctx.font = fonte(t, 800, COND, Math.round(corpo * 0.86), { texto: true })
  ctx.fillStyle = t.rot
  ctx.fillText(cortar(ctx, `| ${slot.nome.toUpperCase()}`, sobra), cursor, base)
}

async function desenharSantinho(colinha, config, t, fotos) {
  const A_S = SANT(REF_A)
  const cv = document.createElement('canvas')
  cv.width = L
  cv.height = A_S
  const ctx = cv.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  // Recortes das fotos dos travados, se existirem no disco. Ausencia vira
  // null e fotoRedonda cai na foto quadrada.
  const recortes = new Map(await Promise.all(
    colinha
      .filter((s) => s.travado && s.foto)
      .map(async (s) => [s.id, await carregarArquivo(`fotos/recorte-${s.foto}.png`)]),
  ))

  ctx.fillStyle = t.fundo
  ctx.fillRect(0, 0, L, A_S)
  desenharPadraoOficial(ctx, 0, A_S, t.chevClaro, CHEV_COL)
  // Posicoes dos tiques medidas na peca. O de baixo dela cai onde vai o QR
  // impresso; aqui esse canto e o rodape, entao ele sobe para a folga entre
  // o governador e o presidente.
  //
  // Borrados, como na peca: ampliada, a borda leva ~15px (dos 578 da pagina)
  // de cada lado para sair do lima e chegar no navy — o tique quase nao tem
  // aresta, so um nucleo saturado que se desfaz. Sem o blur eles viram tres
  // setas chapadas coladas por cima do fundo, que foi o que denunciou que a
  // imagem nao era a peca. Navegador sem ctx.filter (Safari velho) desenha
  // nitido: perde o efeito, nao a imagem.
  ctx.save()
  if (typeof ctx.filter === 'string') ctx.filter = `blur(${SANT(15)}px)`
  for (const [x, y, larg] of [[352, 520, 170], [296, 742, 120], [330, 855, 180]]) {
    tique(ctx, t.tique ?? t.lima, SANT(x), SANT(y), SANT(larg))
  }
  ctx.restore()

  // O candidato dono da peca leva a cor DELE; o Dr. Elton e os cargos livres
  // ficam no lima da campanha. E o unico eixo que muda de um parceiro para o
  // outro — por isso vive na config, nao no tema.
  const cor = (slot) => (slot.proprio ? (config.cor ?? t.destaque) : t.destaque)

  let y = SANT(S.y0)
  for (const slot of colinha) {
    if (slot.travado) {
      const raio = SANT(S.circD) / 2
      const cx = SANT(S.margem) + raio
      const cy = y + SANT(S.travadoCirc)
      fotoRedonda(ctx, fotos.get(slot.id), recortes.get(slot.id), cx, cy, raio, cor(slot))
      lockup(ctx, t, slot, cx + raio + SANT(18), cy)
      const fimCaixas = caixasDoSlot(ctx, t, slot, y + SANT(S.travadoCaixas), cor(slot))
      // A faixa acompanha a caixa: na peca do Dr. Elton sozinho ela e mais
      // alta (4 digitos esticados), e a altura fixa jogaria o proximo rotulo
      // por cima dela.
      y = Math.max(y + SANT(S.travadoAltura), fimCaixas + SANT(21))
    } else {
      rotuloLivre(ctx, t, slot, SANT(S.margem), y + SANT(S.livreRotulo))
      caixasDoSlot(ctx, t, slot, y + SANT(S.livreCaixas), t.destaque)
      y += SANT(S.livreAltura)
    }
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = t.rot
  ctx.font = fonte(t, 700, COND, SANT(15), { texto: true })
  ctx.fillText(location.hostname, L / 2, A_S - SANT(28))
  ctx.font = fonte(t, 500, COND, SANT(14), { texto: true })
  ctx.fillText('Confira sempre o número do candidato na urna.', L / 2, A_S - SANT(11))
  ctx.textAlign = 'left'

  desenharLegal(ctx, t, config, A_S)

  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'))
}

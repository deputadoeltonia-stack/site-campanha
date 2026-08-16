// Desenha a colinha em canvas nativo. Nada de html2canvas: sao ~90 linhas
// de fillText com controle total, contra 200 KB de dependencia que renderiza
// HTML por aproximacao e erra a fonte no iOS.
//
// O visual imita o santinho impresso "COMO VOTAR": topo escuro, corpo claro,
// e um quadrado por digito — preenchido na cor da marca, vazio em branco.

const L = 1080
const A = 1350

// Espelha os temas de style.css. Canvas nao le variavel CSS, entao os dois
// arquivos precisam mudar juntos — tests/theme.test.js cobra isso.
export const TEMAS = {
  elton: {
    topo: '#13253f', topoRisco: '#1c3357', destaque: '#8dc63f',
    fundo: '#e6e7e5', fundo2: '#dbe4c4', caixa: '#ffffff', linha: '#c3c5c2',
    txt: '#13253f', rot: '#63666a',
    // Selo da peca: circulo navy liso, sem anel (anel na cor do fundo).
    selo: '#13253f', seloAnel: '#13253f',
    // peca: true liga o que so a peca do Dr. Elton tem — pincel no titulo,
    // fitas de chevron, selo inclinado com nome empilhado, faixa lima no pe.
    peca: true,
    // Rosto oficial em destaque no topo direito (recorte com alpha da foto
    // do site, public/assets/deputado.png). O selo desce para a faixa dos
    // senadores, como na peca impressa.
    retrato: 'marca/elton-destaque.webp',
    seloNoCorpo: true,
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
    seloNoCorpo: true, // o selo na faixa dos senadores, como na peca
    digitoItalico: true, // numerais inclinados da peca dele
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
  },
  dulce: {
    topo: '#094b68', topoRisco: '#0a6089', destaque: '#84bf41',
    fundo: '#e3e4e3', fundo2: '#d9e2df', caixa: '#ffffff', linha: '#c8cac8',
    txt: '#10333f', rot: '#48626e',
    travadoTxt: '#10333f', // caixa travada segue verde; so o digito escurece
    // Selo navy sem anel (anel na cor do fundo = invisivel), numero mint.
    selo: '#174156', seloAnel: '#174156', seloNumero: '#5ac2ad',
    padrao: 'marca/pessoinhas.svg', // textura de pessoinhas do topo/rodape
    titulo: '"Geometos Neue", "Geometos", system-ui, sans-serif',
    texto: '"Avenir LT Std", system-ui, -apple-system, sans-serif',
    seloNoCorpo: true,
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
  if (img) {
    desenharCover(ctx, img, x, y, FOTO_L, FOTO_A)
    ctx.strokeStyle = slot.travado ? (t.travado ?? t.destaque) : t.linha
    ctx.lineWidth = slot.travado ? 4 : 2
    retanguloArredondado(ctx, x, y, FOTO_L, FOTO_A, 8)
    ctx.stroke()
    return
  }

  // Sem foto: inicial do nome se ha candidato, silhueta se o campo esta vazio.
  ctx.fillStyle = slot.nome ? t.topo : t.caixa
  retanguloArredondado(ctx, x, y, FOTO_L, FOTO_A, 8)
  ctx.fill()
  ctx.strokeStyle = slot.travado ? (t.travado ?? t.destaque) : t.linha
  ctx.lineWidth = slot.travado ? 4 : 2
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

// Fitas de chevron da peca: segmento cheio, corte reto, apontando para
// baixo. As mesmas fitas do topo navy e da faixa lima do pe.
function desenharFitas(ctx, cor, x0, y0, larg, alt, seg = 90, queda = 20, esp = 22, passo = 46) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, larg, alt)
  ctx.clip()
  ctx.fillStyle = cor
  for (let y = y0 - queda; y < y0 + alt; y += passo) {
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
    // Textura repetida (pessoinhas da Dulce), como o background-image da tela.
    ctx.fillStyle = ctx.createPattern(padrao, 'repeat')
    ctx.fillRect(0, 0, L, TOPO)
  } else if (simbolo) {
    const larg = L * 1.25
    const alt = larg * (simbolo.height / simbolo.width)
    ctx.drawImage(simbolo, -L * 0.1, TOPO - alt * 0.7, larg, alt)
    ctx.fillStyle = 'rgba(26,23,78,.62)'
    ctx.fillRect(0, 0, L, TOPO)
  } else {
    desenharFitas(ctx, t.topoRisco, 0, 0, L, TOPO)
  }
  ctx.restore()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = fonte(t, 800, COND, 62)
  ctx.fillText('COMO VOTAR', MARGEM, 96)

  // O pincel lima da peca do Dr. Elton: fita de chevron preenchida cortando
  // por baixo do fim de "VOTAR". So a peca dele traz.
  if (t.peca) {
    const fim = MARGEM + ctx.measureText('COMO VOTAR').width
    ctx.fillStyle = t.destaque
    ctx.beginPath()
    ctx.moveTo(fim - 150, 104)
    ctx.lineTo(fim - 118, 120)
    ctx.lineTo(fim - 4, 86)
    ctx.lineTo(fim - 4, 104)
    ctx.lineTo(fim - 118, 138)
    ctx.lineTo(fim - 150, 122)
    ctx.closePath()
    ctx.fill()
  }

  ctx.font = fonte(t, 500, COND, 29, { texto: true })
  ctx.fillStyle = 'rgba(255,255,255,.93)'
  ctx.fillText('Confira o nome de cada candidato antes de votar.', MARGEM, 146)
  ctx.fillText('4 de outubro de 2026 · São Paulo', MARGEM, 184)
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

// O selo redondo do candidato, como na peca impressa: circulo na cor da marca
// com anel de destaque, sobrepondo o topo e o corpo.
function desenharSelo(ctx, t, slot) {
  const raio = 96
  const cx = L - MARGEM - raio
  // Na peca do Tozi o selo desce para a faixa dos senadores, que so tem 3
  // digitos e deixa a direita vazia; na do Elton ele fica no topo.
  const cy = t.seloNoCorpo ? Y0 + ALTURA_LINHA * 2.32 : 150

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.fillStyle = t.selo ?? t.topo
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = t.seloAnel ?? t.destaque
  ctx.stroke()

  // Na peca do Dr. Elton o conteudo do selo sai levemente inclinado.
  if (t.peca) {
    ctx.translate(cx, cy)
    ctx.rotate(-8 * Math.PI / 180)
    ctx.translate(-cx, -cy)
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
  ctx.font = fonte(t, 800, COND, numTam, { italico: true })
  ctx.fillText(slot.numero, cx, cy + (t.peca ? 70 : 64))
  ctx.restore()
  ctx.textAlign = 'left'
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
  // Simbolo e rosto do manual, quando o tema tem. Falha vira null e o desenho
  // cai no risco geometrico — a imagem sai sem a marca, nunca quebrada.
  const [simbolo, rosto, padrao, retrato] = await Promise.all([
    carregarArquivo(t.simbolo), carregarArquivo(t.rosto), carregarArquivo(t.padrao),
    carregarArquivo(t.retrato),
  ])
  // A peca do Dr. Elton fecha com a faixa lima de chevrons; a imagem dele
  // cresce essa faixa. Os temas com peca propria ficam na altura de sempre.
  const FAIXA = t.peca ? 72 : 0
  const cv = document.createElement('canvas')
  cv.width = L
  cv.height = A + FAIXA
  const ctx = cv.getContext('2d')

  const degrade = ctx.createLinearGradient(0, TOPO, L * 0.3, A)
  degrade.addColorStop(0, t.fundo)
  degrade.addColorStop(1, t.fundo2)
  ctx.fillStyle = degrade
  ctx.fillRect(0, 0, L, A + FAIXA)

  desenharTopo(ctx, t, simbolo, padrao)

  // Rosto oficial em destaque no canto direito, da faixa navy para o corpo
  // claro, com a base dissolvendo antes da linha do deputado estadual.
  if (retrato && t.peca) {
    const larg = 312
    const alt = larg * (retrato.height / retrato.width)
    const x = L - larg - 24
    ctx.drawImage(retrato, x, 0, larg, alt)
    const fade = ctx.createLinearGradient(0, alt - 70, 0, alt)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = fade
    ctx.fillRect(x, alt - 70, larg, 70)
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

  const travado = colinha.find((s) => s.travado)
  if (travado) desenharSelo(ctx, t, travado)

  ctx.textAlign = 'left'
  let y = Y0

  for (const slot of colinha) {
    // Rotulo do cargo, e o nome resolvido logo depois da barra. Na peca do
    // Dr. Elton o rotulo sai na display da campanha, nao na fonte de texto.
    ctx.font = fonte(t, 800, COND, t.peca ? 30 : 32, { texto: !t.peca })
    ctx.fillStyle = t.rot
    const cargo = slot.rotulo.toUpperCase()
    const coluna = colunaDe(t)
    ctx.fillText(cargo, coluna, y)
    let cursor = coluna + ctx.measureText(cargo).width

    if (slot.nome) {
      ctx.fillText(' |', cursor, y)
      cursor += ctx.measureText(' | ').width
      ctx.fillStyle = t.txt
      const nome = cortar(ctx, slot.nome.toUpperCase(), L - MARGEM - cursor - 60)
      ctx.fillText(nome, cursor, y)
      if (slot.partido) {
        cursor += ctx.measureText(nome).width + 12
        ctx.font = fonte(t, 700, COND, 24, { texto: true })
        ctx.fillStyle = t.rot
        ctx.fillText(slot.partido, cursor, y)
      }
    }

    // Um quadrado por digito.
    const topo = y + SALTO_CAIXA

    if (!t.semFoto) desenharFoto(ctx, t, slot, fotos.get(slot.id), MARGEM, topo)

    for (let i = 0; i < slot.digitos; i++) {
      const x = colunaDe(t) + i * (CAIXA + GAP)
      const digito = (slot.numero ?? '')[i] ?? ''

      // O campo travado pode ter cor propria (na peca do Tozi ele e azul).
      const cheia = slot.travado ? (t.travado ?? t.destaque) : t.destaque

      ctx.fillStyle = digito ? cheia : t.caixa
      retanguloArredondado(ctx, x, topo, CAIXA, CAIXA, 10)
      ctx.fill()
      ctx.strokeStyle = digito ? cheia : t.linha
      ctx.lineWidth = 2
      retanguloArredondado(ctx, x, topo, CAIXA, CAIXA, 10)
      ctx.stroke()

      if (digito) {
        ctx.fillStyle = slot.travado ? (t.travadoTxt ?? t.txt) : t.txt
        // Na peca do Dr. Elton o digito quase preenche a caixa.
        ctx.font = fonte(t, t.peca ? 900 : 800, SEMI, t.peca ? 78 : 66, { italico: !!t.digitoItalico })
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(digito, x + CAIXA / 2, topo + CAIXA / 2 + 3)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    }

    y += ALTURA_LINHA
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = t.rot
  ctx.font = fonte(t, 700, COND, 26, { texto: true })
  ctx.fillText(location.hostname, L / 2, A - 50)
  ctx.font = fonte(t, 500, COND, 24, { texto: true })
  ctx.fillText('Confira sempre na urna.', L / 2, A - 18)

  if (FAIXA) {
    ctx.fillStyle = t.destaque
    ctx.fillRect(0, A, L, FAIXA)
    desenharFitas(ctx, 'rgba(111,143,38,.32)', 0, A, L, FAIXA, 64, 14, 16, 33)
  }

  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'))
}

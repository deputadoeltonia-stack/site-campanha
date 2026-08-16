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
    // Cores medidas na arte final da peca (15/08): navy mais azulado, verde
    // de caixa #84bf41 e um segundo verde — o lima vivo dos acentos.
    topo: '#13284a', topoRisco: '#0e1f3a', topoRisco2: '#17335f',
    ciano: 'rgba(64,170,214,.38)',
    destaque: '#84bf41', lima: '#a9cf35',
    fundo: '#e9e9e6', fundo2: '#dfe0d8', caixa: '#ffffff', linha: '#cfceca',
    txt: '#13284a', rot: '#63666a',
    // O selo e o botton oficial do manual (ID 26 ELTON p.14), em imagem; se
    // ela falhar ao carregar, cai no circulo desenhado.
    selo: '#13284a', seloAnel: '#13284a', seloImagem: 'marca/selo-elton.png',
    seloNoCorpo: true, // na arte ele flutua na faixa dos senadores
    digitoItalico: true, // Gunterz Bold Italic da peca; Geometos inclinada aqui
    // peca: true liga o que so a peca do Dr. Elton tem — pincel no titulo,
    // fitas de chevron, tique depois do numero travado, faixa lima no pe.
    peca: true,
    faixa: '#97c53f', faixaFita: '#a6cf45', faixaFita2: '#8dbd35',
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
    // Cores medidas do verso do santinho 7x10 em curvas (16/08).
    topo: '#005474', topoRisco: '#005a78', destaque: '#8dc73f',
    fundo: '#eef0ee', fundo2: '#e2e7e4', caixa: '#ffffff', linha: '#c8cac8',
    txt: '#062240', rot: '#48626e',
    travadoTxt: '#062240', // caixa travada segue verde; so o digito escurece
    // Selo navy inclinado sem anel: wordmark oficial + trio + numero mint.
    selo: '#0d3a52', seloAnel: '#0d3a52', seloNumero: '#5ac2ad',
    seloTorto: true,
    seloLogo: 'marca/logo-dulce-l1.png',
    seloLogo2: 'marca/logo-dulce-l2.png',
    seloTrio: 'marca/pessoinhas-trio.svg',
    topoLiso: true, coracao: 'marca/coracao.svg', // topo limpo, so o coracao
    corpoPadrao: 'marca/padrao-dulce-corpo.svg', // mint na direita do corpo
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

  // O pincel lima da peca do Dr. Elton: fita de chevron preenchida cortando
  // por baixo do fim de "VOTAR". So a peca dele traz.
  if (t.peca) {
    const fim = MARGEM + ctx.measureText('COMO VOTAR').width
    ctx.fillStyle = t.lima ?? t.destaque
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
function desenharSelo(ctx, t, slot, imgSelo, seloLogo, seloLogo2, seloTrio) {
  // Botton oficial em imagem (Dr. Elton): desenha e pronto. Maior que o selo
  // de texto, como na arte.
  if (imgSelo) {
    const raio = 148
    const cx = L - MARGEM - raio
    const cy = Y0 + ALTURA_LINHA * 2.32
    ctx.save()
    ctx.shadowColor = 'rgba(14,31,58,.30)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6
    ctx.drawImage(imgSelo, cx - raio, cy - raio, raio * 2, raio * 2)
    ctx.restore()
    return
  }

  const raio = 96
  const cx = L - MARGEM - raio
  // Na peca o selo desce para a faixa dos senadores, que so tem 3 digitos e
  // deixa a direita vazia.
  const cy = t.seloNoCorpo ? Y0 + ALTURA_LINHA * 2.32 : 150

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
    ctx.font = fonte(t, 800, COND, 46, { italico: true })
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
  // Simbolo, rosto e selo do manual, quando o tema tem. Falha vira null e o
  // desenho cai no risco geometrico — a imagem sai sem a marca, nunca quebrada.
  const [simbolo, rosto, padrao, imgSelo, seloLogo, seloLogo2, seloTrio, corpoPadrao, coracao] = await Promise.all([
    carregarArquivo(t.simbolo), carregarArquivo(t.rosto), carregarArquivo(t.padrao),
    carregarArquivo(t.seloImagem),
    carregarArquivo(t.seloLogo), carregarArquivo(t.seloLogo2),
    carregarArquivo(t.seloTrio), carregarArquivo(t.corpoPadrao),
    carregarArquivo(t.coracao),
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
  if (corpoPadrao) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(L * 0.5, TOPO, L * 0.5, A - TOPO)
    ctx.clip()
    const grad = ctx.createLinearGradient(L * 0.5, 0, L * 0.78, 0)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.55
    ctx.fillStyle = ctx.createPattern(corpoPadrao, 'repeat')
    ctx.fillRect(L * 0.5, TOPO, L * 0.5, A - TOPO)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = grad
    // apaga o padrao gradualmente na borda esquerda, como o esvaecer da peca
    ctx.fillRect(L * 0.5, TOPO, L * 0.28, A - TOPO)
    ctx.restore()
  }

  desenharTopo(ctx, t, simbolo, padrao)

  // So o coracao da identidade na direita do topo, como na tela.
  if (coracao) {
    const alt = 88
    const larg = alt * (coracao.width / coracao.height)
    ctx.drawImage(coracao, L - larg - 48, (TOPO - alt) / 2, larg, alt)
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
  if (travado) desenharSelo(ctx, t, travado, imgSelo, seloLogo, seloLogo2, seloTrio)

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
      // Na peca o campo travado sai sem a sigla ("... | DR. ELTON", so).
      if (slot.partido && !(slot.travado && t.peca)) {
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
        ctx.font = fonte(t, t.peca ? 900 : 800, SEMI, t.peca ? 80 : 66, { italico: !!t.digitoItalico })
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(digito, x + CAIXA / 2, topo + CAIXA / 2 + 3)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    }

    // O tique em contorno da peca do Dr. Elton, no vao da 5a caixa que o
    // numero travado de 4 digitos deixa livre.
    if (slot.travado && t.peca && slot.digitos === 4) {
      const x0 = colunaDe(t) + 4 * (CAIXA + GAP) + 10
      const cyq = topo + CAIXA / 2
      const k = (CAIXA * 1.02) / 60 // o path do visto vive num viewBox 60x36
      ctx.save()
      ctx.translate(x0, cyq - 18 * k)
      ctx.rotate(-7 * Math.PI / 180)
      ctx.scale(k, k)
      ctx.beginPath()
      ctx.moveTo(2, 15)
      ctx.lineTo(14, 25)
      ctx.lineTo(58, 4)
      ctx.lineTo(58, 14)
      ctx.lineTo(14, 36)
      ctx.lineTo(2, 25)
      ctx.closePath()
      ctx.shadowColor = 'rgba(19,40,74,.22)'
      ctx.shadowBlur = 5
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#fdfdf8'
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.lineWidth = 3.4
      ctx.lineJoin = 'round'
      ctx.strokeStyle = t.lima ?? t.destaque
      ctx.stroke()
      ctx.restore()
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
    ctx.fillStyle = t.faixa ?? t.destaque
    ctx.fillRect(0, A, L, FAIXA)
    desenharFitas(
      ctx,
      t.faixaFita ?? 'rgba(111,143,38,.32)', t.faixaFita2 ?? t.faixaFita ?? 'rgba(111,143,38,.32)',
      0, A, L, FAIXA, 56, 13, 16,
    )
  }

  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'))
}

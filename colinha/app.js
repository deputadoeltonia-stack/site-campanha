import {
  CARGOS, configPara, hostDeDev, criarEstado, lerURL, lerSalvo, paraSalvar,
  montarColinha, erroSenadores, estaCompleta, slotTravado, limpar, linkDeVolta,
} from './colinha-core.js'
import { desenhar } from './imagem.js'
import { configurarBusca, abrirBusca } from './busca.js'

const CHAVE = 'colinha-sp-2026'

const config = configPara(hostDeDev(location.hostname, location.search))
let dados = {}
let estado = criarEstado(config)

const el = {
  form: document.getElementById('colinha'),
  carregando: document.getElementById('carregando'),
  acoes: document.getElementById('acoes'),
  erroGeral: document.getElementById('erro-geral'),
  aviso: document.getElementById('aviso'),
  avisoTxt: document.getElementById('aviso-txt'),
  limpar: document.getElementById('btn-limpar'),
}

document.body.dataset.tema = config.tema

// Embutida num site, a pagina ganha o link de volta para a raiz dele.
{
  const volta = linkDeVolta(location.pathname)
  if (volta) {
    document.getElementById('volta').href = volta
    document.getElementById('volta-area').hidden = false
  }
}

// Selo do candidato no topo, como na peca impressa. Le da config e so da
// config, pelo mesmo motivo do campo travado. Sem campo travado (numero ainda
// nao definido), o selo simplesmente nao aparece.
{
  const travadoId = slotTravado(config)
  if (travadoId) {
    if (config.tema === 'elton') {
      // O selo do Dr. Elton e o botton oficial do manual (ID 26 ELTON, pag.
      // 14), extraido como imagem — texto montado a mao nunca reproduz o
      // lockup com os chevrons cruzando o T. Decorativo: a informacao ja
      // esta no campo travado.
      const img = document.createElement('img')
      img.src = 'marca/selo-elton.png'
      img.alt = ''
      img.className = 'selo-badge'
      document.getElementById('selo').replaceChildren(img)
    } else if (config.tema === 'dulce') {
      // Selo da peca dela: wordmark oficial (o Λ final nao e fonte) + trio
      // de pessoinhas mint. Cargo e numero seguem vindo da config.
      const cargoInfo = CARGOS.find((c) => c.id === travadoId)
      const cargo = document.createElement('span')
      cargo.className = 'selo-cargo'
      cargo.textContent = `${config.rotulo ?? cargoInfo.rotulo} `
      const barra = document.createElement('span')
      barra.className = 'selo-barra'
      barra.textContent = '//'
      cargo.append(barra)
      const lockup = document.createElement('span')
      lockup.className = 'selo-lockup'
      const l1 = document.createElement('img')
      l1.src = 'marca/logo-dulce-l1.png'
      l1.alt = ''
      l1.className = 'selo-l1'
      const linha2 = document.createElement('span')
      linha2.className = 'selo-l2wrap'
      const l2 = document.createElement('img')
      l2.src = 'marca/logo-dulce-l2.png'
      l2.alt = ''
      l2.className = 'selo-l2'
      const trio = document.createElement('img')
      trio.src = 'marca/pessoinhas-trio.svg'
      trio.alt = ''
      trio.className = 'selo-trio'
      linha2.append(l2, trio)
      lockup.append(l1, linha2)
      const num = document.createElement('span')
      num.className = 'selo-numero'
      num.textContent = config.numero
      document.getElementById('selo').replaceChildren(cargo, lockup, num)
    } else {
      const cargoInfo = CARGOS.find((c) => c.id === travadoId)
      document.getElementById('selo-cargo').textContent = config.rotulo ?? cargoInfo.rotulo
      document.getElementById('selo-nome').textContent = config.nome
      document.getElementById('selo-numero').textContent = config.numero
    }
    document.getElementById('selo').hidden = false
  }
}

// --- montagem da marcacao --------------------------------------------

// Silhueta neutra para campo vazio / candidato sem foto no acervo do TSE.
const SILHUETA = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-9 2-9 6v2h18v-2c0-4-5-6-9-6Z"/></svg>'

// Lupa no canto da foto: sinaliza que ali se busca por nome. So nos campos
// livres — no travado nao ha o que buscar.
const LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
  '<path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'

function fotoInterna(slot) {
  return `<img class="foto-img" id="fotoimg-${slot.id}" alt="" hidden>` +
    `<span class="foto-ph" id="fotoph-${slot.id}" aria-hidden="true">${SILHUETA}</span>` +
    (slot.travado ? '' : `<span class="foto-lupa" aria-hidden="true">${LUPA}</span>`)
}

function linhaHTML(slot) {
  const travado = slot.travado
  // Uma caixa por digito, como no santinho impresso. Sao decorativas: quem
  // recebe o texto e o input transparente por cima.
  const caixas = Array.from(
    { length: slot.digitos },
    (_, i) => `<span class="digito" id="d-${slot.id}-${i}" aria-hidden="true"></span>`,
  ).join('')

  // O tique da peca do Dr. Elton: o visto em contorno depois do 4412, no vao
  // que o cargo de 4 digitos deixa na grade de 5. So no campo travado dele —
  // as pecas do Tozi e da Dulce nao trazem o tique.
  const tique = travado && config.tema === 'elton'
    ? `<svg class="tique" viewBox="-4 -6 68 48" aria-hidden="true">
         <path d="M2 15 L14 25 L58 4 L58 14 L14 36 L2 25 Z"/>
       </svg>`
    : ''

  // A foto e o botao que abre a busca por nome. No campo travado ela so
  // mostra a pessoa, nao clica — ninguem troca o federal por caminho nenhum.
  const foto = travado
    ? `<div class="foto foto-travada" id="foto-${slot.id}">${fotoInterna(slot)}</div>`
    : `<button type="button" class="foto" id="foto-${slot.id}"
        aria-label="Buscar ${slot.rotulo} por nome">${fotoInterna(slot)}</button>`

  return `
    <div class="campo${travado ? ' travado' : ''}" id="campo-${slot.id}">
      ${foto}
      <div class="campo-corpo">
        <p class="rotulo">
          <span>${slot.rotulo}</span><span class="nome" id="nome-${slot.id}" aria-live="polite"></span>
        </p>
        <div class="digitos">
          ${caixas}${tique}
          <input class="entrada" id="input-${slot.id}" name="${slot.id}"
                 type="text" inputmode="numeric" pattern="[0-9]*"
                 maxlength="${slot.digitos}"
                 aria-label="${slot.rotulo}, ${slot.digitos} dígitos"
                 aria-describedby="nome-${slot.id} erro-${slot.id}"
                 ${travado ? 'readonly tabindex="-1"' : ''}>
        </div>
        <p class="erro" id="erro-${slot.id}" role="alert"></p>
      </div>
    </div>`
}

function montarMarcacao() {
  const colinha = montarColinha(estado, config, dados)
  el.form.innerHTML = colinha.map(linhaHTML).join('')

  for (const c of CARGOS) {
    const input = document.getElementById(`input-${c.id}`)
    if (!input.readOnly) {
      input.addEventListener('input', () => aoDigitar(c, input))
      // Sem isto o caret pode cair no meio do numero e a proxima tecla
      // inserir no lugar errado — as caixas mostram sempre da esquerda.
      input.addEventListener('focus', () => {
        const n = input.value.length
        requestAnimationFrame(() => input.setSelectionRange(n, n))
      })
      // A foto abre a gaveta de busca por nome para esse cargo.
      document.getElementById(`foto-${c.id}`)
        .addEventListener('click', () => abrirBusca(c))
    }
  }
}

// --- foto -------------------------------------------------------------

// Foto vazia: silhueta se o campo esta em branco, inicial do nome se ha
// candidato mas sem foto no acervo.
function preencherPlaceholder(ph, slot) {
  if (slot.nome) {
    ph.textContent = slot.nome.trim()[0] ?? ''
    ph.classList.add('inicial')
  } else {
    ph.innerHTML = SILHUETA
    ph.classList.remove('inicial')
  }
}

function atualizarFoto(slot) {
  const img = document.getElementById(`fotoimg-${slot.id}`)
  const ph = document.getElementById(`fotoph-${slot.id}`)
  const caixa = document.getElementById(`foto-${slot.id}`)
  caixa.classList.toggle('tem-foto', Boolean(slot.foto))

  if (slot.foto) {
    const src = `fotos/${slot.foto}.jpg`
    if (img.getAttribute('src') !== src) {
      img.src = src
      // Nem todo candidato tem foto no acervo: se 404, cai no placeholder.
      img.onload = () => { img.hidden = false; ph.hidden = true }
      img.onerror = () => { img.hidden = true; ph.hidden = false; preencherPlaceholder(ph, slot) }
    }
  } else {
    img.hidden = true
    img.removeAttribute('src')
    ph.hidden = false
    preencherPlaceholder(ph, slot)
  }
}

// --- interacao --------------------------------------------------------

function aoDigitar(cargo, input) {
  const limpo = limpar(input.value, cargo.digitos)
  if (input.value !== limpo) input.value = limpo
  estado[cargo.id] = limpo
  salvar()
  render()
  if (limpo.length === cargo.digitos) focarProximo(cargo.id)
}

// O teclado numerico do celular nunca fecha entre um campo e outro:
// completou os digitos, o foco pula sozinho.
function focarProximo(idAtual) {
  const i = CARGOS.findIndex((c) => c.id === idAtual)
  for (const c of CARGOS.slice(i + 1)) {
    const prox = document.getElementById(`input-${c.id}`)
    if (prox && !prox.readOnly && prox.value.length < c.digitos) {
      prox.focus()
      return
    }
  }
}

function render() {
  const colinha = montarColinha(estado, config, dados)
  for (const slot of colinha) {
    const campo = document.getElementById(`campo-${slot.id}`)
    const input = document.getElementById(`input-${slot.id}`)
    const nome = document.getElementById(`nome-${slot.id}`)
    const erro = document.getElementById(`erro-${slot.id}`)

    const numero = slot.numero ?? ''
    if (input.value !== numero) input.value = numero

    for (let i = 0; i < slot.digitos; i++) {
      const caixa = document.getElementById(`d-${slot.id}-${i}`)
      const digito = numero[i] ?? ''
      caixa.textContent = digito
      caixa.classList.toggle('preenchido', digito !== '')
      // Marca onde a proxima tecla cai: o input e invisivel, entao sem isto
      // o usuario nao ve o cursor.
      caixa.classList.toggle('atual', !slot.travado && i === numero.length)
    }

    nome.innerHTML = ''
    if (slot.nome) {
      nome.append(slot.nome)
      if (slot.partido) {
        const sigla = document.createElement('span')
        sigla.className = 'partido'
        sigla.textContent = ` ${slot.partido}`
        nome.append(sigla)
      }
    }
    erro.textContent = slot.erro ?? ''
    campo.classList.toggle('tem-erro', Boolean(slot.erro))
    atualizarFoto(slot)
  }

  const geral = erroSenadores(colinha)
  el.erroGeral.textContent = geral ?? ''
  el.erroGeral.hidden = !geral
  // add, nunca toggle: o laco acima ja marcou cada campo pelo proprio erro.
  // Um toggle(false) aqui apagava a marca de "numero nao encontrado" de um
  // senador sempre que os dois numeros eram diferentes entre si.
  if (geral) {
    document.getElementById('campo-senador1').classList.add('tem-erro')
    document.getElementById('campo-senador2').classList.add('tem-erro')
  }

  // Hook de depuracao deliberado, usado pelo checklist de validacao manual.
  window.__colinha = { estado, config, dados, colinha: () => montarColinha(estado, config, dados) }
  document.dispatchEvent(new CustomEvent('colinha:mudou', {
    detail: { colinha, completa: estaCompleta(colinha) },
  }))
}

// --- persistencia -----------------------------------------------------

// yyyy-mm-dd em horario local. new Date().toISOString() e UTC: entre 21h e
// meia-noite em Brasilia a data virava a de amanha (na vespera da eleicao,
// o aviso diria "sua colinha de 04/10" ainda no dia 3).
function dataLocalISO(d = new Date()) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      quando: dataLocalISO(),
      campos: JSON.parse(paraSalvar(estado)),
    }))
  } catch {
    // modo privativo do Safari: seguir sem persistir
  }
}

function restaurar() {
  let bruto = null
  try {
    bruto = localStorage.getItem(CHAVE)
  } catch {
    return
  }
  if (!bruto) return
  let quando = null
  let campos = '{}'
  try {
    const obj = JSON.parse(bruto)
    quando = obj?.quando ?? null
    campos = JSON.stringify(obj?.campos ?? {})
  } catch {
    return
  }
  const recuperado = lerSalvo(campos, config)
  if (!Object.values(recuperado).some(Boolean)) return
  estado = recuperado
  if (quando) {
    const [a, m, d] = quando.split('-')
    el.avisoTxt.textContent = `Sua colinha de ${d}/${m}`
    el.aviso.hidden = false
  }
}

el.limpar.addEventListener('click', () => {
  estado = criarEstado(config)
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // sem storage, nada a remover
  }
  el.aviso.hidden = true
  render()
  const primeiro = CARGOS.map((c) => document.getElementById(`input-${c.id}`))
    .find((i) => i && !i.readOnly)
  primeiro?.focus()
})

// --- imagem -------------------------------------------------------------

function nomeArquivo() {
  return `colinha-${location.hostname.split('.')[0]}.png`
}

async function gerarPNG() {
  // A colinha e remontada aqui, e nao lida da tela: o slot travado vem da
  // config, entao a imagem sai correta mesmo com o DOM adulterado.
  const blob = await desenhar(montarColinha(estado, config, dados), config)
  if (!blob) throw new Error('canvas.toBlob retornou null')
  return blob
}

document.getElementById('btn-salvar').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget
  btn.disabled = true
  try {
    const blob = await gerarPNG()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (e) {
    console.error('falha ao gerar a imagem', e)
    el.erroGeral.textContent = 'Não foi possível gerar a imagem. Tente de novo.'
    el.erroGeral.hidden = false
  } finally {
    btn.disabled = false
  }
})

// --- compartilhar -----------------------------------------------------

function linkComNumeros() {
  const url = new URL(location.href)
  url.search = ''
  // Passa por lerSalvo/paraSalvar (o mesmo chokepoint de criarEstado) em vez
  // de iterar `estado` direto: se `estado` fosse poluido com a chave do slot
  // travado, o link de compartilhamento nao carregaria ela.
  const seguro = lerSalvo(paraSalvar(estado), config)
  for (const [id, valor] of Object.entries(seguro)) {
    if (valor) url.searchParams.set(id, valor)
  }
  return url.toString()
}

const TEXTO = 'Minha colinha de voto para 4 de outubro:'

async function copiarLink(link) {
  try {
    await navigator.clipboard.writeText(link)
    return true
  } catch {
    return false
  }
}

const btnEnviar = document.getElementById('btn-enviar')
// Rotulo lido uma vez, em escopo de modulo: lido a cada clique, um segundo
// clique dentro da janela de 2,5s capturaria o texto de sucesso e o botao
// ficaria preso nele.
const rotuloEnviar = btnEnviar.textContent
let restaurarRotuloId = null

btnEnviar.addEventListener('click', async (ev) => {
  const btn = ev.currentTarget
  btn.disabled = true
  try {
    const link = linkComNumeros()
    const blob = await gerarPNG()
    const arquivo = new File([blob], nomeArquivo(), { type: 'image/png' })

    if (navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], text: TEXTO })
      return
    }
    if (navigator.share) {
      await navigator.share({ title: 'Minha colinha de voto', text: TEXTO, url: link })
      return
    }

    // Desktop sem Web Share: baixa a imagem e copia o link.
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    btn.textContent = (await copiarLink(link)) ? 'Imagem salva, link copiado' : 'Imagem salva'
    clearTimeout(restaurarRotuloId)
    restaurarRotuloId = setTimeout(() => { btn.textContent = rotuloEnviar }, 2500)
  } catch (e) {
    // AbortError = o usuario fechou o menu nativo. Nao e falha.
    if (e?.name !== 'AbortError') {
      console.error('falha ao compartilhar', e)
      el.erroGeral.textContent = 'Não foi possível compartilhar. Tente salvar a imagem.'
      el.erroGeral.hidden = false
    }
  } finally {
    btn.disabled = false
  }
})

// --- arranque ---------------------------------------------------------

// A gaveta so sabe procurar e mostrar; gravar a escolha e daqui.
configurarBusca({
  getDados: () => dados,
  aoEscolher: (cargo, resultado) => {
    estado[cargo.id] = resultado.numero
    const input = document.getElementById(`input-${cargo.id}`)
    if (input) input.value = resultado.numero
    salvar()
    render()
  },
})

async function iniciar() {
  try {
    const resp = await fetch('candidatos-sp.json', {
      cache: 'no-cache',
      // Sem timeout, uma conexao instavel (1 barra, portal cativo) deixa o
      // fetch pendurado por minutos e a tela fica em "Carregando..." pra sempre.
      signal: AbortSignal.timeout(12000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    dados = await resp.json()
  } catch (e) {
    console.error('falha ao carregar candidatos-sp.json', e)
    el.carregando.innerHTML = ''
    const msg = document.createElement('span')
    msg.textContent = 'Não foi possível carregar a lista de candidatos. '
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'link'
    btn.textContent = 'Tentar de novo'
    btn.addEventListener('click', () => {
      el.carregando.innerHTML = ''
      el.carregando.textContent = 'Carregando candidatos…'
      iniciar()
    })
    el.carregando.append(msg, btn)
    return
  }

  // URL tem prioridade sobre o que estava salvo: quem abre um link
  // compartilhado quer ver aquela colinha, nao a dele.
  const daURL = lerURL(location.search, config)
  if (Object.values(daURL).some(Boolean)) {
    estado = daURL
  } else {
    restaurar()
  }

  if (!slotTravado(config)) {
    console.info(
      `numero de ${config.nome} ainda nao definido: o campo fica destravado`,
    )
  }

  montarMarcacao()

  // Na peça — nas três campanhas — o selo não fica no topo: ele flutua à
  // direita dos senadores, no vazio que 3 dígitos deixam. Ancorado no próprio
  // campo (e não em top fixo na folha) ele acompanha o layout — quando o
  // aviso de "Começar de novo" aparece e empurra tudo para baixo, o selo
  // desce junto em vez de cair por cima dos números.
  if (slotTravado(config)) {
    document.getElementById('campo-senador1')
      .appendChild(document.getElementById('selo'))
  }

  render()
  el.carregando.hidden = true
  el.form.hidden = false
  el.acoes.hidden = false
}

iniciar()

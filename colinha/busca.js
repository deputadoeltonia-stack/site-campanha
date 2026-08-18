// Gaveta de busca por nome (bottom sheet). Cuida so da UI da busca: quem
// tem os dados e quem grava a escolha e o app.js, que passa os dois como
// callbacks. Assim esta gaveta nao conhece estado, localStorage nem render.

import { buscarPorNome } from './colinha-core.js'

const el = {
  raiz: document.getElementById('busca'),
  titulo: document.getElementById('busca-titulo'),
  input: document.getElementById('busca-input'),
  lista: document.getElementById('busca-lista'),
  fechar: document.getElementById('busca-fechar'),
}

let cargoAtivo = null
let getDados = () => ({})
let aoEscolher = () => {}
// Quem abriu a gaveta: o foco volta para la ao fechar, senao o leitor de tela
// (e o teclado) recomecam do topo da pagina a cada busca.
let abriuComFoco = null

// A gaveta se declara aria-modal, mas isso e so uma promessa ao leitor de
// tela: sem inert o Tab continua passeando pelos campos ATRAS da cortina.
// inert cobre teclado e leitor de tela de uma vez, e o browser sem suporte
// cai no ciclo manual do keydown abaixo.
function fundo() {
  return Array.prototype.filter.call(document.body.children, (e) => e !== el.raiz)
}

function fechar() {
  el.raiz.hidden = true
  cargoAtivo = null
  document.body.classList.remove('sem-rolagem')
  fundo().forEach((e) => e.removeAttribute('inert'))
  const volta = abriuComFoco
  abriuComFoco = null
  volta?.focus()
}

function itemHTML(r) {
  const li = document.createElement('li')
  const bt = document.createElement('button')
  bt.type = 'button'
  bt.className = 'busca-item'
  bt.addEventListener('click', () => {
    const cargo = cargoAtivo
    fechar()
    aoEscolher(cargo, r)
  })

  const foto = document.createElement('span')
  foto.className = 'busca-foto'
  const inicial = () => {
    foto.textContent = r.nome.trim()[0] ?? ''
    foto.classList.add('inicial')
  }
  if (r.foto) {
    const img = document.createElement('img')
    img.loading = 'lazy'
    img.alt = ''
    img.src = `fotos/${r.foto}.jpg`
    img.onerror = inicial
    foto.append(img)
  } else {
    inicial()
  }

  const txt = document.createElement('span')
  txt.className = 'busca-txt'
  const nome = document.createElement('span')
  nome.className = 'busca-nome'
  nome.textContent = r.nome
  const meta = document.createElement('span')
  meta.className = 'busca-meta'
  meta.textContent = `${r.numero} · ${r.partido}`
  txt.append(nome, meta)

  bt.append(foto, txt)
  li.append(bt)
  return li
}

function renderResultados() {
  if (!cargoAtivo) return
  el.lista.innerHTML = ''

  if (el.input.value.trim().length < 2) {
    el.lista.innerHTML = '<li class="busca-dica">Digite ao menos 2 letras do nome.</li>'
    return
  }
  const achados = buscarPorNome(getDados(), cargoAtivo.cargo, el.input.value)
  if (achados.length === 0) {
    el.lista.innerHTML = '<li class="busca-dica">Nenhum candidato encontrado.</li>'
    return
  }
  for (const r of achados) el.lista.append(itemHTML(r))
}

el.input.addEventListener('input', renderResultados)
el.fechar.addEventListener('click', fechar)
el.raiz.addEventListener('click', (ev) => {
  // Clique no fundo escuro (nao no painel) fecha.
  if (ev.target === el.raiz) fechar()
})
document.addEventListener('keydown', (ev) => {
  if (el.raiz.hidden) return
  if (ev.key === 'Escape') { fechar(); return }
  if (ev.key !== 'Tab') return
  // Ciclo de foco dentro do painel, para o browser que ignora inert.
  const itens = el.raiz.querySelectorAll('button, input, [href]')
  if (!itens.length) return
  const primeiro = itens[0]
  const ultimo = itens[itens.length - 1]
  if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus() }
  else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus() }
})

// getDados: () => dataset atual. aoEscolher: (cargo, {numero,nome,...}) => void
export function configurarBusca(opcoes) {
  getDados = opcoes.getDados
  aoEscolher = opcoes.aoEscolher
}

export function abrirBusca(cargo) {
  cargoAtivo = cargo
  abriuComFoco = document.activeElement
  el.titulo.textContent = `Buscar ${cargo.rotulo.toLowerCase()}`
  el.input.value = ''
  el.lista.innerHTML = ''
  el.raiz.hidden = false
  fundo().forEach((e) => e.setAttribute('inert', ''))
  document.body.classList.add('sem-rolagem')
  // Espera o layout aplicar antes de focar, senao o teclado abre torto no iOS.
  requestAnimationFrame(() => el.input.focus())
}

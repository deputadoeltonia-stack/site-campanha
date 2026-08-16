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

function fechar() {
  el.raiz.hidden = true
  cargoAtivo = null
  document.body.classList.remove('sem-rolagem')
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
  if (ev.key === 'Escape' && !el.raiz.hidden) fechar()
})

// getDados: () => dataset atual. aoEscolher: (cargo, {numero,nome,...}) => void
export function configurarBusca(opcoes) {
  getDados = opcoes.getDados
  aoEscolher = opcoes.aoEscolher
}

export function abrirBusca(cargo) {
  cargoAtivo = cargo
  el.titulo.textContent = `Buscar ${cargo.rotulo.toLowerCase()}`
  el.input.value = ''
  el.lista.innerHTML = ''
  el.raiz.hidden = false
  document.body.classList.add('sem-rolagem')
  // Espera o layout aplicar antes de focar, senao o teclado abre torto no iOS.
  requestAnimationFrame(() => el.input.focus())
}

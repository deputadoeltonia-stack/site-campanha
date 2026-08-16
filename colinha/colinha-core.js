// Logica pura da colinha. Zero DOM, zero fetch — tudo aqui roda no Node
// para que a garantia do campo travado possa ser testada de verdade.

// Ordem da urna em 2026 (Res. TSE 23.751/2026). Os dois primeiros digitos
// de qualquer numero sao o do partido; o resto varia por cargo, o que torna
// colisao entre cargos impossivel dentro de uma UF.
export const CARGOS = [
  { id: 'federal', cargo: 6, rotulo: 'Deputado federal', digitos: 4 },
  { id: 'estadual', cargo: 7, rotulo: 'Deputado estadual', digitos: 5 },
  { id: 'senador1', cargo: 5, rotulo: 'Senador (1º voto)', digitos: 3 },
  { id: 'senador2', cargo: 5, rotulo: 'Senador (2º voto)', digitos: 3 },
  { id: 'governador', cargo: 3, rotulo: 'Governador', digitos: 2 },
  { id: 'presidente', cargo: 1, rotulo: 'Presidente', digitos: 2 },
]

// numero: null = ainda nao saiu da convencao. O campo fica destravado ate
// alguem preencher aqui; nenhuma outra linha de codigo precisa mudar.
export const CANDIDATOS = {
  'colinha.dreltonai.com.br': {
    nome: 'DR. ELTON', cargo: 6, numero: '4412', partido: 'UNIÃO', tema: 'elton',
    foto: 'elton', // fotos/elton.jpg — foto oficial da campanha, nao vem do TSE
    // A peca impressa ja traz o governador preenchido (Tarcisio, 10). Sugestao
    // e diferente de travado: o campo comeca com o numero mas segue editavel,
    // e o nome continua vindo do dataset TSE como em qualquer campo livre.
    sugestao: { governador: '10' },
  },
  // Numero confirmado pelo santinho impresso 7x10 da campanha (15/08/2026).
  'colinhavirtual.dreltonai.com.br': {
    nome: 'PROFESSOR TOZI', cargo: 7, numero: '44447', partido: 'UNIÃO', tema: 'tozi',
    foto: 'tozi',
    // Como na colinha da Dulce: Dr. Elton (peca conjunta) e o governador ja
    // vem preenchidos. Sugestao = editavel; o nome resolve pelo dataset TSE.
    sugestao: { federal: '4412', governador: '10' },
  },
  // O site do Tozi embute a colinha em /colinha/ (site-tozi, deploy Vercel).
  // Sem estes aliases o hostname dele cairia no PADRAO e abriria a colinha
  // do Dr. Elton dentro do site do Tozi.
  'tozisite.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'tozisite-elton8.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'tozisite-git-main-elton8.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'proftozi.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  'www.proftozi.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  // Site da Dulce Rita (projeto Vercel "dulcesite") tambem embute /colinha/.
  // Dominio de producao e sitedulce.vercel.app — um alias errado aqui abre a
  // colinha do Dr. Elton dentro do site dela, em silencio.
  'sitedulce.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  'dulcesite-elton8.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  'dulcesite-git-main-elton8.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  // Numero confirmado pelo santinho impresso 7x10 da campanha (15/08/2026).
  'colinha2026.dreltonai.com.br': {
    nome: 'DULCE RITA', cargo: 7, numero: '44400', partido: 'UNIÃO', tema: 'dulce',
    foto: 'dulce', rotulo: 'Deputada estadual', // flexao do cargo, so no campo dela
    // O verso do santinho dela ja vem com o federal (Dr. Elton, peca conjunta)
    // e o governador preenchidos. Sugestao = editavel, como no tema do Elton.
    sugestao: { federal: '4412', governador: '10' },
  },
}

const PADRAO = 'colinha.dreltonai.com.br'

export function configPara(hostname) {
  const cfg = CANDIDATOS[hostname] ?? CANDIDATOS[PADRAO]
  return cfg.alias ? CANDIDATOS[cfg.alias] : cfg
}

// Em localhost o hostname nao diz qual campanha e, entao ?campanha=tozi
// escolhe. Fora de localhost o parametro e ignorado de proposito: se a URL
// pudesse trocar a campanha, daria pra abrir o site do Elton mostrando outro
// candidato travado no topo.
const LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', ''])

export function hostDeDev(hostname, busca) {
  if (!LOCAIS.has(hostname)) return hostname
  const tema = new URLSearchParams(busca ?? '').get('campanha')
  const achado = Object.entries(CANDIDATOS).find(([, c]) => c.tema === tema)
  return achado ? achado[0] : PADRAO
}

export function buscar(dados, cargo, numero) {
  return dados?.[String(cargo)]?.[numero] ?? null
}

// Embutida num site (ex.: /colinha/ dentro do site do Dr. Elton) a pagina
// ganha um link de volta para a raiz do site. Nos subdominios proprios ela
// vive na raiz e o link nao existe.
export function linkDeVolta(pathname) {
  const p = String(pathname ?? '/')
  return p === '/' || p === '/index.html' ? null : '../'
}

// --- estado -----------------------------------------------------------
// O slot travado NAO existe no objeto de estado. Nao e uma validacao que
// pode falhar: e ausencia de caminho de escrita. Toda funcao que produz
// estado passa por criarEstado, entao a exclusao vale para URL, para
// localStorage e para qualquer fonte futura.

export function slotTravado(config) {
  if (!config?.numero) return null
  return CARGOS.find((c) => c.cargo === config.cargo)?.id ?? null
}

export function criarEstado(config) {
  const travado = slotTravado(config)
  const livres = CARGOS.filter((c) => c.id !== travado)
  // Sugestao da config preenche o valor inicial de um campo livre (na peca do
  // Dr. Elton, o governador). lerURL/lerSalvo sobrescrevem depois: o que o
  // eleitor apagou de proposito continua apagado ao restaurar.
  return Object.fromEntries(
    livres.map((c) => [c.id, limpar(config?.sugestao?.[c.id], c.digitos)]),
  )
}

export function limpar(valor, digitos) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, digitos)
}

function preencher(estado, fonte) {
  for (const id of Object.keys(estado)) {
    const { digitos } = CARGOS.find((c) => c.id === id)
    estado[id] = limpar(fonte(id), digitos)
  }
  return estado
}

export function lerURL(search, config) {
  const params = new URLSearchParams(search ?? '')
  return preencher(criarEstado(config), (id) => params.get(id))
}

export function lerSalvo(raw, config) {
  let obj = {}
  try {
    obj = JSON.parse(raw ?? '{}') ?? {}
  } catch {
    obj = {}
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) obj = {}
  return preencher(criarEstado(config), (id) => obj[id])
}

export function paraSalvar(estado) {
  return JSON.stringify(estado)
}

// --- montagem ---------------------------------------------------------

export function montarColinha(estado, config, dados) {
  const travado = slotTravado(config)
  return CARGOS.map((c) => {
    if (c.id === travado) {
      // Le da config e so da config. O estado nao e consultado nem que
      // tenha a chave; os dados do TSE nao sao consultados nem que tenham
      // o numero. Esta e a garantia central do produto. A foto tambem: vem
      // do config (config.foto), nunca do dataset.
      return {
        ...c,
        rotulo: config.rotulo ?? c.rotulo,
        numero: String(config.numero),
        nome: config.nome,
        partido: config.partido,
        foto: config.foto ?? null,
        travado: true,
        erro: null,
      }
    }
    const numero = estado?.[c.id] ?? ''
    const completo = numero.length === c.digitos
    const achado = completo ? buscar(dados, c.cargo, numero) : null
    return {
      ...c,
      numero,
      nome: achado?.[0] ?? null,
      partido: achado?.[1] ?? null,
      foto: achado?.[2] || null, // SQ_CANDIDATO -> fotos/{sq}.jpg
      travado: false,
      erro: completo && !achado ? 'Número não encontrado. Confira na urna.' : null,
    }
  })
}

// Remove acentos e caixa, para busca tolerante ("tarcisio" acha "TARCÍSIO").
function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Busca candidatos de um cargo cujo nome de urna contem o termo. Devolve
// ate `limite` resultados {numero, nome, partido, foto}, ordenados por quem
// comeca com o termo primeiro. So opera sobre slots livres — o cargo do
// campo travado nunca chega aqui (o app nao abre busca no travado).
export function buscarPorNome(dados, cargo, termo, limite = 40) {
  const t = normalizar(termo).trim()
  if (t.length < 2) return []
  const balde = dados?.[String(cargo)] ?? {}
  const achados = []
  for (const [numero, reg] of Object.entries(balde)) {
    const alvo = normalizar(reg[0])
    const pos = alvo.indexOf(t)
    if (pos === -1) continue
    achados.push({ numero, nome: reg[0], partido: reg[1], foto: reg[2] || null, pos })
  }
  achados.sort((a, b) => a.pos - b.pos || a.nome.localeCompare(b.nome))
  return achados.slice(0, limite).map(({ pos, ...r }) => r)
}

export function erroSenadores(colinha) {
  const s1 = colinha.find((s) => s.id === 'senador1')
  const s2 = colinha.find((s) => s.id === 'senador2')
  if (s1?.numero && s1.numero === s2?.numero) {
    return 'A urna anula o 2º voto se os números forem iguais.'
  }
  return null
}

export function estaCompleta(colinha) {
  return colinha.every((s) => s.nome) && !erroSenadores(colinha)
}

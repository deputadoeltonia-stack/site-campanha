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
    // Marcacao legal da propaganda eleitoral (Lei 9.504/97, art. 38 §1o):
    // razao social e CNPJ da campanha, como na lateral do santinho impresso.
    // Vive aqui junto de nome e numero porque e por candidato — a colinha
    // serve tres campanhas no mesmo codigo.
    razao: 'ELEIÇÃO 2026 ELTON ALVES RIBEIRO DE CARVALHO JUNIOR DEPUTADO FEDERAL',
    cnpj: '68.237.359/0001-10',
    foto: 'elton', // fotos/elton.jpg — foto oficial da campanha, nao vem do TSE
    // A peca impressa dele ja traz o governador (Tarcisio, 10). Fixo, como na
    // colinha da Dulce: o slot nao existe no estado, entao nao ha caminho de
    // escrita por URL nem por localStorage. Nome e foto seguem do TSE.
    fixos: { governador: '10' },
  },
  // Numero confirmado pelo santinho impresso 7x10 da campanha (15/08/2026).
  'colinhavirtual.dreltonai.com.br': {
    nome: 'PROFESSOR TOZI', cargo: 7, numero: '44447', partido: 'UNIÃO', tema: 'tozi',
    // Marcacao legal da propaganda, como na lateral do santinho impresso.
    razao: 'ELEIÇÃO 2026 LUIZ ANTONIO TOZI DEPUTADO ESTADUAL',
    cnpj: '68.283.009/0001-90',
    foto: 'tozi',
    // A peca conjunta dele traz o Dr. Elton e o governador impressos, igual a
    // da Dulce — e fixos pelo mesmo motivo: o eleitor nao muda nenhum dos dois.
    fixos: { federal: '4412', governador: '10' },
  },
  // O site do Tozi embute a colinha em /colinha/ (site-tozi, deploy Vercel).
  // Sem estes aliases o hostname dele cairia no PADRAO e abriria a colinha
  // do Dr. Elton dentro do site do Tozi.
  'tozisite.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'tozisite-elton8.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'tozisite-git-main-elton8.vercel.app': { alias: 'colinhavirtual.dreltonai.com.br' },
  'proftozi.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  'www.proftozi.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  // Dominios de PRODUCAO 2026 (HostGator) — os que o eleitor recebe no
  // santinho. Ficavam so na copia do servidor, editados a mao la; qualquer
  // deploy a partir do git derrubava os tres e a colinha de cada candidato
  // caia no PADRAO (Dr. Elton) em silencio. Agora vivem aqui.
  'proftozi44447.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  'www.proftozi44447.com.br': { alias: 'colinhavirtual.dreltonai.com.br' },
  'drelton4412.com.br': { alias: 'colinha.dreltonai.com.br' },
  'www.drelton4412.com.br': { alias: 'colinha.dreltonai.com.br' },
  'dulcerita44400.com.br': { alias: 'colinha2026.dreltonai.com.br' },
  'www.dulcerita44400.com.br': { alias: 'colinha2026.dreltonai.com.br' },
  // Site da Dulce Rita (projeto Vercel "dulcesite") tambem embute /colinha/.
  // Dominio de producao e sitedulce.vercel.app — um alias errado aqui abre a
  // colinha do Dr. Elton dentro do site dela, em silencio.
  'sitedulce.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  'dulcesite-elton8.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  'dulcesite-git-main-elton8.vercel.app': { alias: 'colinha2026.dreltonai.com.br' },
  // Numero confirmado pelo santinho impresso 7x10 da campanha (15/08/2026).
  'colinha2026.dreltonai.com.br': {
    nome: 'DULCE RITA', cargo: 7, numero: '44400', partido: 'UNIÃO', tema: 'dulce',
    // Marcacao legal da propaganda, como na lateral do santinho impresso.
    razao: 'ELEIÇÃO 2026 DULCE RITA CHAVES DE ANDRADE DABKIWIC',
    cnpj: '68.283.179/0001-75',
    foto: 'dulce', rotulo: 'Deputada estadual', // flexao do cargo, so no campo dela
    // O verso do santinho dela ja vem com o federal (Dr. Elton, peca conjunta)
    // e o governador impressos. FIXO, nao sugestao: o eleitor nao muda nenhum
    // dos dois, e a garantia e a mesma do campo dela — nenhum desses slots
    // existe no objeto de estado, entao nao ha caminho de escrita nem por URL
    // nem por localStorage.
    fixos: { federal: '4412', governador: '10' },
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

// O slot do PROPRIO candidato do site. E o que ganha o selo no topo.
export function slotTravado(config) {
  if (!config?.numero) return null
  return CARGOS.find((c) => c.cargo === config.cargo)?.id ?? null
}

// Todos os slots que o eleitor nao edita: o do proprio candidato mais os
// aliados que a peca ja traz impressos (config.fixos). Os dois casos tem a
// MESMA garantia — nenhum deles entra no objeto de estado, entao nao existe
// caminho de escrita por URL, por localStorage ou por qualquer fonte futura.
export function slotsTravados(config) {
  const proprio = slotTravado(config)
  const aliados = Object.keys(config?.fixos ?? {}).filter(
    (id) => id !== proprio && CARGOS.some((c) => c.id === id),
  )
  return new Set(proprio ? [proprio, ...aliados] : aliados)
}

export function criarEstado(config) {
  const travados = slotsTravados(config)
  const livres = CARGOS.filter((c) => !travados.has(c.id))
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
        proprio: true, // o campo do candidato do site — o unico azul no Tozi
        erro: null,
      }
    }
    // Aliado impresso na peca (Dr. Elton e o governador, na colinha da Dulce).
    // O NUMERO vem da config e so da config, como no campo do proprio
    // candidato: o estado nao e consultado nem que tenha a chave. Nome, sigla
    // e foto seguem saindo do dataset do TSE — a config guarda so o que a
    // peca imprime, que e o numero.
    if (c.id in (config?.fixos ?? {})) {
      const numero = limpar(config.fixos[c.id], c.digitos)
      const achado = numero.length === c.digitos ? buscar(dados, c.cargo, numero) : null
      return {
        ...c,
        numero,
        nome: achado?.[0] ?? null,
        partido: achado?.[1] ?? null,
        foto: achado?.[2] || null,
        travado: true,
        proprio: false, // aliado impresso: travado, mas sem a cor do candidato
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

// Busca do topo da pagina: UM termo, procurado em todos os cargos LIVRES de
// uma vez. Digitos casam por PREFIXO de numero; letras caem na busca por
// nome. O eleitor nao precisa saber em qual cargo o numero se encaixa — o
// tamanho do numero ja diz (4=federal, 5=estadual...), entao quem responde
// isso e a colinha, nao ele.
// Devolve {cargoId, rotulo, digitos, numero, nome, partido, foto, exato}.
// exato = o numero completo de um cargo, achado no dataset. Os travados
// (proprio candidato e aliados impressos) ficam de fora: nada os preenche.
export function buscarGlobal(dados, config, termo, limite = 12) {
  const travados = slotsTravados(config)
  const livres = CARGOS.filter((c) => !travados.has(c.id))
  const t = String(termo ?? '').trim()
  if (t.length < 2) return []
  const soDigitos = /^\d+$/.test(t)
  const achados = []
  const cargosVistos = new Set() // senador1/senador2 dividem o cargo 5: sem isto cada nome sairia em dobro
  for (const c of livres) {
    if (cargosVistos.has(c.cargo)) continue
    cargosVistos.add(c.cargo)
    // "Senador (1º voto)" no resultado confundiria: qual voto e decisao da
    // hora do preenchimento (o primeiro vazio), nao da busca.
    const rotulo = c.id.startsWith('senador') ? 'Senador' : c.rotulo
    if (soDigitos) {
      if (t.length > c.digitos) continue
      for (const [numero, reg] of Object.entries(dados?.[String(c.cargo)] ?? {})) {
        if (!numero.startsWith(t)) continue
        achados.push({
          cargoId: c.id, rotulo, digitos: c.digitos, numero,
          nome: reg[0], partido: reg[1], foto: reg[2] || null,
          exato: numero === t,
        })
      }
    } else {
      for (const r of buscarPorNome(dados, c.cargo, t, limite)) {
        achados.push({ cargoId: c.id, rotulo, digitos: c.digitos, ...r, exato: false })
      }
    }
  }
  // Exato na frente; depois o cargo cujo tamanho bate com o que foi digitado
  // (quem digitou 3 digitos quase sempre quer senador, nao um estadual que
  // comeca igual); o resto na ordem da urna, e numero baixo primeiro.
  const ordem = new Map(CARGOS.map((c, i) => [c.id, i]))
  achados.sort((a, b) =>
    (b.exato - a.exato) ||
    ((b.digitos === t.length) - (a.digitos === t.length)) ||
    (ordem.get(a.cargoId) - ordem.get(b.cargoId)) ||
    // Numero baixo primeiro so na busca por digito. Na busca por nome a
    // relevancia ja veio de buscarPorNome (comeca-com antes de contem) e o
    // sort estavel a preserva.
    (soDigitos ? a.numero.localeCompare(b.numero) : 0),
  )
  return achados.slice(0, limite)
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

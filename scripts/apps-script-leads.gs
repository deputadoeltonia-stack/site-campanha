/**
 * Destino dos leads do site de campanha -> Google Sheets.
 *
 * COMO LIGAR (5 min):
 *  1. sheets.new  ->  dá um nome à planilha (ex.: "Leads Dr. Elton 4412").
 *  2. Extensões > Apps Script. Apague o conteúdo e cole ESTE arquivo. Salve.
 *  3. Rode a função `setup` uma vez. Vai pedir autorização: Revisar permissões
 *     > sua conta > "Isso não é seguro" (é seu próprio script) > Permitir.
 *     Confira que nasceu a aba "Leads" com cabeçalho.
 *  4. Implantar > Nova implantação > engrenagem > "App da Web".
 *       Executar como: Eu
 *       Quem tem acesso: QUALQUER PESSOA   <- sem isso o site leva 401
 *  5. Copie a URL que termina em /exec.
 *  6. Cole em js/main.js, linha ~15:
 *       var LEAD_ENDPOINT = "https://script.google.com/macros/s/XXXX/exec";
 *  7. Teste sem abrir o navegador:  bash scripts/testar-endpoint.sh <URL>
 *
 * REIMPLANTAR: toda vez que editar este arquivo, Implantar > Gerenciar
 * implantações > EDITE A IMPLANTAÇÃO QUE JÁ EXISTE (lápis) > Versão: Nova >
 * Implantar. Sem isso a URL continua servindo o código velho — é a pegadinha
 * nº 1 do Apps Script. E nunca clique em "Nova implantação": ela nasce com
 * outra URL /exec e os três sites (campanha, tozi, dulcerita) param de entregar
 * lead sem dar erro nenhum.
 *
 * IMPORTANTE: a validação do navegador é só UX. Ela é refeita aqui porque
 * qualquer um pode postar direto no endpoint.
 */

var ABA = 'Leads';   // destino padrão (site do Dr. Elton)
var CABECALHO = ['Data', 'Nome', 'Telefone', 'Consentimento LGPD', 'Origem'];

/**
 * Uma planilha atende mais de um site: o campo `origem` do lead decide a aba.
 * Origem desconhecida cai na aba padrão em vez de ser descartada — perder um
 * lead por erro de digitação num site seria pior que uma linha fora de lugar.
 */
var ABA_POR_ORIGEM = {
  'site-tozi': 'Pagina Tozi',
  'site-dulcerita': 'Pagina Dulce'
};

function setup() {
  var abas = [ABA];
  for (var k in ABA_POR_ORIGEM) abas.push(ABA_POR_ORIGEM[k]);
  for (var i = 0; i < abas.length; i++) {
    var sh = planilhaPorNome_(abas[i]);
    if (sh.getLastRow() === 0) sh.appendRow(CABECALHO);
    sh.setFrozenRows(1);
  }
}

function planilhaPorNome_(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(CABECALHO);
    sh.setFrozenRows(1);
  }
  return sh;
}

function planilha_(origem) {
  return planilhaPorNome_(ABA_POR_ORIGEM[String(origem || '')] || ABA);
}

/**
 * Sheets interpreta texto começando com = + - @ como FÓRMULA.
 * Um lead com nome "=IMPORTXML(...)" viraria execução de fórmula na planilha.
 * Prefixar com apóstrofo força texto puro.
 */
function seguro_(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/**
 * `origem` vem solta no corpo do POST: vira parte da chave de dedupe e vai
 * parar numa célula da planilha. Antes, uma origem gigante estourava sozinha o
 * limite de 250 caracteres da chave do CacheService e o pedido morria ali; com
 * a chave virando HMAC de tamanho fixo esse freio acidental some. Daí o corte
 * explícito: 60 caracteres sobram pra qualquer slug de campanha
 * ('site-campanha', 'site-tozi', 'site-dulcerita', 'teste-cli') e limitam o que
 * um POST anônimo consegue escrever na planilha. É normalização, não recusa —
 * origem esquisita continua virando lead, só que aparada.
 */
function origemSegura_(v) {
  var s = String(v == null ? '' : v).trim().replace(/[^\p{L}\p{N}_-]/gu, '-');
  return s.slice(0, 60) || 'site';
}

function soDigitos_(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

/** Mesmas regras do cliente, refeitas no servidor. */
function validar_(d) {
  var erros = [];
  var nome = String(d.nome || '').trim().replace(/\s+/g, ' ');
  var tel = soDigitos_(d.telefone);

  if (nome.length < 3 || nome.length > 80) erros.push('nome');
  else if (!/^[\p{L}\s.'-]+$/u.test(nome)) erros.push('nome_invalido');

  if (tel.length < 10 || tel.length > 11) erros.push('telefone');
  if (d.consentimento_lgpd !== true) erros.push('consentimento');

  return { erros: erros, nome: nome, telefone: tel };
}

/**
 * A chave do cache carregava o telefone em texto puro, e o cache é o mesmo pro
 * script inteiro. HMAC troca isso por uma chave de tamanho fixo sem o número
 * dentro. O segredo mora nas Propriedades do Script — passo manual, uma vez:
 * Apps Script > engrenagem (Configurações do projeto) > Propriedades do script
 * > Adicionar:  DEDUPE_SEGREDO = um texto aleatório longo.
 * Sem a propriedade (ou se o PropertiesService reclamar) cai na chave antiga:
 * dedupe funcionando vale mais que chave bonita.
 */
function chaveDedupe_(origem, telefone) {
  var cru = origem + '_' + telefone;
  try {
    var segredo = PropertiesService.getScriptProperties().getProperty('DEDUPE_SEGREDO');
    if (segredo) {
      return 'lead_' + Utilities.base64EncodeWebSafe(
        Utilities.computeHmacSha256Signature(cru, segredo));
    }
  } catch (err) { /* sem propriedades disponíveis: segue com a chave crua */ }
  return 'lead_' + cru;
}

function resposta_(ok, msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, msg: msg || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return resposta_(false, 'sem corpo');

    var d;
    try { d = JSON.parse(e.postData.contents); }
    catch (err) { return resposta_(false, 'json invalido'); }

    // honeypot: campo escondido no formulário, invisível pra gente e irresistível
    // pra bot. AUSENTE = aceita: os sites tozi/dulcerita ainda não mandam o campo,
    // e exigir ele mataria a captação deles. Só rejeita quem mandou preenchido.
    //
    // A resposta é a MESMA do lead aceito — a linha é que não vai pra planilha.
    // Dizer 'invalido: bot' entregaria qual campo é a armadilha, e o robô
    // mandaria ele vazio na próxima. É a mesma razão do fakeSuccess() no
    // main.js: quem cai na armadilha não pode saber que caiu.
    if (String(d.site || '').trim() !== '') return resposta_(true, 'ok');

    var v = validar_(d);
    if (v.erros.length) return resposta_(false, 'invalido: ' + v.erros.join(','));

    var origem = origemSegura_(d.origem);

    // anti duplicata: mesmo telefone em menos de 2 min é reenvio/bot.
    // A chave inclui a origem: a mesma pessoa pode se cadastrar nos dois
    // sites em seguida, e isso são dois leads legítimos, não repetição.
    // A resposta do duplicado é igualzinha à do lead aceito de propósito: se
    // fosse diferente, qualquer um postaria um telefone alheio pra descobrir se
    // aquela pessoa acabou de se cadastrar. A linha é que não vai pra planilha.
    var cache = CacheService.getScriptCache();
    var chave = chaveDedupe_(origem, v.telefone);
    if (cache.get(chave)) return resposta_(true, 'ok');
    cache.put(chave, '1', 120);

    // appendRow sem lock pode sobrescrever linha em envios simultâneos
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      planilha_(origem).appendRow([
        new Date(),
        seguro_(v.nome),
        "'" + v.telefone,   // apóstrofo: senão o Sheets come o zero do DDD
        'SIM',              // validar_ já rejeita quem não consentiu
        seguro_(origem)
      ]);
    } finally {
      lock.releaseLock();
    }

    return resposta_(true, 'ok');
  } catch (err) {
    return resposta_(false, 'erro interno');
  }
}

/** GET só pra conferir no navegador que a implantação está viva. */
function doGet() {
  return resposta_(true, 'endpoint ativo');
}

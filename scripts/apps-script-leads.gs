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
 * implantações > lápis > Versão: Nova > Implantar. Sem isso a URL continua
 * servindo o código velho — é a pegadinha nº 1 do Apps Script.
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
  'site-tozi': 'Pagina Tozi'
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

    var v = validar_(d);
    if (v.erros.length) return resposta_(false, 'invalido: ' + v.erros.join(','));

    var origem = String(d.origem || 'site');

    // anti duplicata: mesmo telefone em menos de 2 min é reenvio/bot.
    // A chave inclui a origem: a mesma pessoa pode se cadastrar nos dois
    // sites em seguida, e isso são dois leads legítimos, não repetição.
    var cache = CacheService.getScriptCache();
    var chave = 'lead_' + origem + '_' + v.telefone;
    if (cache.get(chave)) return resposta_(true, 'duplicado ignorado');
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

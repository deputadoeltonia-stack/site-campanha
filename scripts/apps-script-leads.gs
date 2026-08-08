/**
 * Destino dos leads do site de campanha -> Google Sheets.
 *
 * COMO LIGAR (5 min):
 *  1. Crie uma planilha nova no Google Sheets.
 *  2. Extensões > Apps Script. Apague o conteúdo e cole ESTE arquivo.
 *  3. Rode a função `setup` uma vez (cria o cabeçalho e pede autorização).
 *  4. Implantar > Nova implantação > tipo "App da Web".
 *       Executar como: Eu
 *       Quem tem acesso: Qualquer pessoa
 *  5. Copie a URL que termina em /exec.
 *  6. Em js/main.js, linha ~15:
 *       var LEAD_ENDPOINT = "https://script.google.com/macros/s/XXXX/exec";
 *  7. Envie um lead de teste pelo site e confira se caiu na planilha.
 *
 * IMPORTANTE: a validação do navegador é só UX. Ela é refeita aqui porque
 * qualquer um pode postar direto no endpoint.
 */

var ABA = 'Leads';
var CABECALHO = ['Data', 'Nome', 'Telefone', 'Consentimento LGPD', 'Origem'];

function setup() {
  var sh = planilha_();
  if (sh.getLastRow() === 0) sh.appendRow(CABECALHO);
  sh.setFrozenRows(1);
}

function planilha_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ABA) || ss.insertSheet(ABA);
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

    // anti duplicata: mesmo telefone em menos de 2 min é reenvio/bot
    var cache = CacheService.getScriptCache();
    var chave = 'lead_' + v.telefone;
    if (cache.get(chave)) return resposta_(true, 'duplicado ignorado');
    cache.put(chave, '1', 120);

    // appendRow sem lock pode sobrescrever linha em envios simultâneos
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      planilha_().appendRow([
        new Date(),
        seguro_(v.nome),
        seguro_(v.telefone),
        v.consentimento_lgpd === false ? 'NAO' : 'SIM',
        seguro_(d.origem || 'site')
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

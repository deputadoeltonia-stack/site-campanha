#!/usr/bin/env bash
# Testa o endpoint de leads sem precisar abrir o site.
#   bash scripts/testar-endpoint.sh https://script.google.com/macros/s/XXXX/exec
#
# Manda 3 requisições: uma válida, uma inválida e a mesma válida de novo.
# O esperado é: ok:true / ok:false / ok:true.
# O repetido responde igual ao aceito de propósito — quem não pode distinguir os
# dois é o bot. A prova do dedupe está na planilha, não na resposta.
set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "uso: bash scripts/testar-endpoint.sh <URL /exec do Apps Script>" >&2
  exit 1
fi
case "$URL" in *"/exec") ;; *) echo "AVISO: a URL deveria terminar em /exec" >&2 ;; esac

# 11 dígitos, como o validador exige (celular BR com DDD). Muda a cada segundo,
# então não colide com o cache de dedupe de 2 min entre uma rodada e outra.
TEL=$(printf '119%08d' $(( $(date +%s) % 100000000 )))

# O /exec responde 302 apontando pro googleusercontent, que só aceita GET.
# Com `curl -L` o POST era reenviado pro destino e voltava 405 — parecia falha
# do endpoint, mas o doPost já tinha rodado. Então: POSTa, pega o Location,
# e busca o corpo com um GET separado.
post() {
  local loc
  loc=$(curl -sS -o /dev/null -D- -X POST "$URL" \
          -H 'Content-Type: text/plain;charset=utf-8' \
          --data "$1" --max-time 30 \
        | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}')
  if [ -z "$loc" ]; then
    echo "  SEM REDIRECT — o /exec não respondeu como app da web" >&2
    return 1
  fi
  curl -sS "$loc" --max-time 30 -w '\n  [HTTP %{http_code}]\n'
}

echo "== 1. lead válido (esperado: ok:true) =="
post "{\"nome\":\"Teste Automatizado\",\"telefone\":\"$TEL\",\"consentimento_lgpd\":true,\"origem\":\"teste-cli\"}"

echo "== 2. lead inválido, sem consentimento (esperado: ok:false) =="
post '{"nome":"Teste Automatizado","telefone":"11999999999","consentimento_lgpd":false,"origem":"teste-cli"}'

echo "== 3. repetido do nº 1 (esperado: ok:true, idêntico ao nº 1) =="
post "{\"nome\":\"Teste Automatizado\",\"telefone\":\"$TEL\",\"consentimento_lgpd\":true,\"origem\":\"teste-cli\"}"

echo
echo "Confira a aba Leads: deve ter UMA linha nova (telefone $TEL), não duas."
echo "É aí que o dedupe aparece: a resposta do nº 3 é igual à do nº 1 de propósito."
echo "Apague as linhas de teste antes de divulgar o site."

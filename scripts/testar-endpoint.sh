#!/usr/bin/env bash
# Testa o endpoint de leads sem precisar abrir o site.
#   bash scripts/testar-endpoint.sh https://script.google.com/macros/s/XXXX/exec
#
# Manda 3 requisições: uma válida, uma inválida e a mesma válida de novo.
# O esperado é: ok:true / ok:false / "duplicado ignorado".
set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "uso: bash scripts/testar-endpoint.sh <URL /exec do Apps Script>" >&2
  exit 1
fi
case "$URL" in *"/exec") ;; *) echo "AVISO: a URL deveria terminar em /exec" >&2 ;; esac

TEL="119$(date +%H%M%S)"   # muda a cada segundo: não colide com o cache de dedupe

post() {
  curl -sS -L -X POST "$URL" \
    -H 'Content-Type: text/plain;charset=utf-8' \
    --data "$1" \
    -w '\n  [HTTP %{http_code}]\n'
}

echo "== 1. lead válido (esperado: ok:true) =="
post "{\"nome\":\"Teste Automatizado\",\"telefone\":\"$TEL\",\"consentimento_lgpd\":true,\"origem\":\"teste-cli\"}"

echo "== 2. lead inválido, sem consentimento (esperado: ok:false) =="
post '{"nome":"Teste Automatizado","telefone":"11999999999","consentimento_lgpd":false,"origem":"teste-cli"}'

echo "== 3. repetido do nº 1 (esperado: duplicado ignorado) =="
post "{\"nome\":\"Teste Automatizado\",\"telefone\":\"$TEL\",\"consentimento_lgpd\":true,\"origem\":\"teste-cli\"}"

echo
echo "Confira a aba Leads: deve ter UMA linha nova (telefone $TEL), não duas."
echo "Apague as linhas de teste antes de divulgar o site."

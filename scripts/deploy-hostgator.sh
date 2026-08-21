#!/usr/bin/env bash
# Publica o site no HostGator br300 — o que o dominio oficial serve.
#   HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh --dry   # so mostra
#   HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh         # envia
#
# Por que rclone e nao rsync, como no deploy-vps.sh: rsync roda o binario dele
# no OUTRO lado, e isso exige shell. Nesta conta o shell esta desabilitado
# ("Shell access is not enabled on your account") — a chave autentica, o SSH
# conecta e o servidor recusa executar qualquer coisa. O subsistema SFTP, esse,
# esta ligado, e o rclone sync fala SFTP puro: mesmo espelhamento, mesma chave,
# sem senha em lugar nenhum. Se o suporte da HostGator habilitar shell um dia, o
# deploy-vps.sh vira o molde e este script pode voltar pro rsync.
set -euo pipefail

USUARIO="${HOSTGATOR_USER:-}"          # usuario do cPanel (nao e senha; so o login)
SERVIDOR="192.185.223.124"             # br300-ip04.hostgator.com.br
KEY="$HOME/.ssh/id_ed25519_hostgator_drelton"
DEST="${HOSTGATOR_DEST:-public_html}"  # docroot do dominio dentro do home

[ -n "$USUARIO" ] || {
  echo "ERRO: defina o usuario do cPanel." >&2
  echo "      HOSTGATOR_USER=seuusuario bash scripts/deploy-hostgator.sh" >&2
  exit 1
}
[ -f "$KEY" ] || { echo "ERRO: chave $KEY nao existe (ssh-keygen -t ed25519 -f $KEY)" >&2; exit 1; }
command -v rclone >/dev/null || { echo "ERRO: rclone nao esta no PATH (brew install rclone)" >&2; exit 1; }

cd "$(dirname "$0")/.."
[ -f index.html ] || { echo "ERRO: rode de dentro do projeto (index.html nao achado)" >&2; exit 1; }

DRY=""
[ "${1:-}" = "--dry" ] && DRY="--dry-run"

REMOTO=":sftp,host=$SERVIDOR,user=$USUARIO,key_file=$KEY,shell_type=none:"

# .vercelignore continua sendo a UNICA lista de "o que e site e o que e bastidor"
# — a Vercel le esse arquivo, e aqui ele vira filtro de rclone. A sintaxe muda:
# no rsync "assets-src" ja cobre a pasta; no rclone um nome sozinho casa arquivo,
# entao cada entrada sai em duas regras (a pasta e o arquivo de mesmo nome).
FILTROS="$(mktemp)"
trap 'rm -f "$FILTROS"' EXIT
while IFS= read -r linha; do
  case "$linha" in ''|'#'*) continue ;; esac
  printf -- '- %s/**\n- %s\n' "$linha" "$linha" >> "$FILTROS"
done < .vercelignore

# O public_html de hospedagem compartilhada NAO e so nosso. Estas tres saem do
# espelho — o que esta excluido nao e enviado nem apagado no destino:
#   .well-known   -> desafio do Let's Encrypt; sumir = certificado nao renova
#   /cgi-bin      -> criado pelo cPanel
#   /.htaccess*   -> regras que o painel escreve na raiz, mais os backups que o
#                    upgrader de PHP do cPanel deixa ao lado (.htaccess.phpupgrader.*)
# .well-known NAO leva barra inicial de proposito: existe um em colinha/ tambem, e
# a versao ancorada na raiz deixaria o rclone apagar o acme-challenge de la — ou
# seja, quebraria a renovacao do certificado do subdominio da colinha no proximo
# vencimento, semanas depois do deploy, sem ninguem ligar uma coisa na outra.
# O /.htaccess da raiz continua ancorado: o colinha/.htaccess do repo tem que subir.
cat >> "$FILTROS" <<'EOF'
- .well-known/**
- /cgi-bin/**
- /.htaccess
- /.htaccess.*
- /.vercel/**
- /vercel.json
- /.vercelignore
- /.gitignore
EOF

# Confere o docroot ANTES de mandar 200MB pro lugar errado. Um public_html que
# nao existe normalmente quer dizer dominio adicional: o cPanel cria a pasta com
# o nome do dominio, e ai o rclone criaria um diretorio novo que ninguem serve.
rclone lsd "$REMOTO$DEST" >/dev/null 2>&1 || {
  echo "ERRO: ~/$DEST nao existe no servidor. O que tem no home:" >&2
  rclone lsd "$REMOTO" >&2 || true
  echo "Reexecute com HOSTGATOR_DEST=<a pasta certa>" >&2
  exit 1
}

# transfers/checkers baixos de proposito: o LFD da HostGator bloqueia a porta 22
# do IP inteiro quando ve muitas conexoes SSH seguidas (aconteceu no primeiro
# teste — 22 recusada por ~100s, 443 e 2083 intactas). O default de 8 checkers
# abre sessao demais e derruba o deploy no meio.
#
# --size-only: o SFTP da HostGator nao deixa gravar mtime, entao comparar por
# data marcaria o site inteiro como alterado a cada deploy (200MB de video
# subindo de novo, toda vez). Tamanho basta — todo arquivo que muda de conteudo
# aqui muda de tamanho ou de nome (o cache-bust ?v= cuida do resto).
rclone sync ./ "$REMOTO$DEST" \
  --filter-from "$FILTROS" \
  --size-only \
  --transfers 2 --checkers 4 \
  --retries 3 --low-level-retries 20 \
  --progress --stats-one-line $DRY

[ -n "$DRY" ] && { echo "(dry-run: nada foi enviado)"; exit 0; }

echo
echo "Enviado. Conferindo pelo dominio publico:"
curl -s https://drelton4412.com.br | grep -oE 'style\.css\?v=[0-9]+' || echo "  (nao achei a versao do CSS na home)"
for p in / /privacidade/ /colinha/ /public/assets/videos/casa-teca-geraldo.webp; do
  printf '  %-46s HTTP %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://drelton4412.com.br$p")"
done

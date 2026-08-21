#!/usr/bin/env bash
# Publica o site no HostGator br300 — o que o dominio oficial serve.
#   bash scripts/deploy-hostgator.sh          # envia
#   bash scripts/deploy-hostgator.sh --dry    # mostra o que mudaria, sem enviar
#
# Gemeo do deploy-vps.sh: mesma chave-em-vez-de-senha, mesmo .vercelignore como
# unica lista de "o que e site e o que e bastidor". A diferenca esta no --delete:
# la o destino era /opt/site-campanha, uma pasta so nossa; aqui e o public_html
# de uma hospedagem compartilhada, que tem arquivos do cPanel no meio. Espelhar
# sem excecao apagaria o .well-known e derrubaria a renovacao do certificado.
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

cd "$(dirname "$0")/.."
[ -f index.html ] || { echo "ERRO: rode de dentro do projeto (index.html nao achado)" >&2; exit 1; }

DRY=""
[ "${1:-}" = "--dry" ] && DRY="--dry-run"

ALVO="$USUARIO@$SERVIDOR"
SSH=(ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15)

# Confere o docroot ANTES de mandar 200MB pro lugar errado. Um public_html que
# nao existe normalmente quer dizer dominio adicional: o cPanel cria a pasta com
# o nome do dominio, e ai o rsync criaria um diretorio novo que ninguem serve.
"${SSH[@]}" "$ALVO" "[ -d ~/$DEST ]" || {
  echo "ERRO: ~/$DEST nao existe no servidor. Candidatos la:" >&2
  "${SSH[@]}" "$ALVO" "ls -d ~/public_html ~/public_html/*/ ~/*.com.br 2>/dev/null" >&2 || true
  echo "Reexecute com HOSTGATOR_DEST=<a pasta certa>" >&2
  exit 1
}

# --delete espelha, mas o public_html compartilhado nao e so nosso:
#   .well-known  -> desafio do Let's Encrypt; sumir = certificado nao renova
#   cgi-bin      -> criado pelo cPanel
#   .htaccess    -> regras de redirect/PHP que o painel escreve na raiz
#     (o colinha/.htaccess do repo NAO entra aqui: a exclusao e so da raiz)
# --progress, nao --info=progress2: o macOS ainda embarca rsync 2.6.9, de 2006.
rsync -az --delete --progress $DRY \
  -e "ssh -i $KEY -o BatchMode=yes -o ConnectTimeout=15" \
  --exclude-from=.vercelignore \
  --exclude='.vercel' --exclude='vercel.json' --exclude='.vercelignore' --exclude='.gitignore' \
  --exclude='/.well-known' --exclude='/cgi-bin' --exclude='/.htaccess' \
  ./ "$ALVO:$DEST/"

[ -n "$DRY" ] && { echo "(dry-run: nada foi enviado)"; exit 0; }

echo
echo "Enviado. Conferindo pelo dominio publico:"
curl -s https://drelton4412.com.br | grep -oE 'style\.css\?v=[0-9]+' || echo "  (nao achei a versao do CSS na home)"
for p in / /privacidade/ /colinha/ /public/assets/videos/casa-teca-geraldo.webp; do
  printf '  %-46s HTTP %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://drelton4412.com.br$p")"
done

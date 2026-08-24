# Deploy e infraestrutura

## `git push` NÃO publica nada

Produção é HostGator (br300), publicada só por script manual:

```bash
HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh --dry   # SEMPRE primeiro
HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh         # depois, se o --dry estiver limpo
```

**Leia a lista de ARQUIVOS APAGADOS no `--dry`, não só a de enviados.** Já
aconteceu de um deploy quase remover 50 fotos e 3 links vivos de produção
(santinhos da colinha que nunca foram versionados localmente).

## Por que rclone, não rsync

A conta HostGator não tem shell habilitado (`shell access is not enabled`).
`rsync` precisa rodar seu binário no OUTRO lado — exige shell. `rclone
sync` fala SFTP puro (só o subsistema SFTP está ligado): mesma chave, sem
senha em lugar nenhum, mas sem shell remoto. Chave: `~/.ssh/
id_ed25519_hostgator_drelton`.

## Rate-limit de SSH (LFD)

O LFD da HostGator bloqueia a porta 22 do IP inteiro (~100s) se detectar
muitas conexões SSH seguidas. Por isso o script usa `--transfers 2
--checkers 4` (baixo, de propósito — o default de 8 checkers abre sessão
demais e derruba o deploy no meio) e `--retries 3 --low-level-retries 20`.
Se uma conexão manual (ex: forçar upload de um arquivo só) falhar com
"connection refused", **espere e tente de novo** — não é problema de
configuração, é o rate-limit temporário.

## O filtro: `.vercelignore` faz dupla função

O mesmo `.vercelignore` que a Vercel lê (de quando o projeto começou lá)
virou o filtro do `rclone sync` — é a ÚNICA lista de "o que é site e o que
é bastidor". Sintaxe muda: no rclone, um nome sozinho no filtro casa
ARQUIVO; pra casar a PASTA também, cada entrada do `.vercelignore` sai como
duas regras (`nome/**` e `nome`) — o script já faz essa expansão sozinho.

**O filtro vale para os DOIS lados — upload E delete.** Excluir um arquivo
do `.vercelignore` faz o sync deixar de vê-lo tanto pra enviar quanto pra
apagar. Se um rascunho já subiu e você quer parar de versionar ele, tem que
**apagar do servidor a mão primeiro**, e só DEPOIS adicionar ao
`.vercelignore` — na ordem errada, o rascunho fica pra sempre em produção,
invisível ao sync. Já aconteceu 2x nesta base (`_probe.html`, `CLAUDE.md`
exposto por um dia).

Padrão de exclusão adotado: `_*` (qualquer coisa que comece com underscore
nunca sobe — glob resolve na origem, não depende de lembrar de listar cada
nome novo).

Exclusões fixas no próprio `deploy-hostgator.sh` (fora do `.vercelignore`,
porque são coisas do docroot compartilhado, não do repo):
- `.well-known/**` — challenge do Let's Encrypt (SEM barra inicial de
  propósito: existe um `.well-known` em `colinha/` também, versão ancorada
  na raiz apagaria o dele, quebrando a renovação do certificado do
  subdomínio semanas depois, sem ninguém ligar as duas coisas)
- `/cgi-bin/**`, `/.htaccess`, `/.htaccess.*` — criados/escritos pelo cPanel

## O blind spot do `--size-only`

O sync usa `--size-only` (compara TAMANHO em bytes, não checksum/conteúdo)
porque o SFTP da HostGator não deixa gravar `mtime` — comparar por data
marcaria o site inteiro como alterado a cada deploy (200MB de vídeo
subindo de novo, sempre).

**Armadilha real, já mordeu:** se uma edição muda conteúdo mas NÃO muda o
tamanho em bytes do arquivo (o caso clássico: incrementar `?v=85` →
`?v=86`, mesma quantidade de dígitos), o rclone acha que "não mudou" e
PULA o upload — o deploy termina com "Enviado" e sucesso, mas o arquivo
real em produção continua o de antes.

**Como forçar o upload de um arquivo específico** quando isso acontece
(comparar por checksum em vez de tamanho, só pra esse arquivo):

```bash
REMOTO=":sftp,host=192.185.223.124,user=eltona93,key_file=$HOME/.ssh/id_ed25519_hostgator_drelton,shell_type=none:"
rclone copyto index.html "${REMOTO}public_html/index.html" --checksum -v
```

Se der "connection refused", é o rate-limit do LFD (seção acima) — espere
uns 8-30s e repita (ou use um loop `until ... ; do sleep 8; done`).

**Como verificar se o conteúdo real bate** (sem depender do `?v=` mostrado,
que pode estar mentindo por causa do blind spot acima):
```bash
curl -s "https://drelton4412.com.br/ARQUIVO?nocache=$RANDOM" | wc -c
wc -c ARQUIVO   # local
# bytes iguais = conteúdo bate. bytes diferentes = precisa forçar upload.
```

## Conferência pós-deploy

O próprio script já faz um check básico no final (curl em `/`,
`/privacidade/`, `/colinha/`, um asset de vídeo). Mas ISSO NÃO PEGA o blind
spot do `--size-only` acima — sempre confira o `?v=` mostrado na home E o
byte-count real dos arquivos que você mudou nesta leva, não só o HTTP 200.

`main` já ficou 5 dias na frente de produção sem ninguém notar, uma vez —
nenhuma revisão de código pega isso, só checagem manual pós-deploy.

## `og:image` tem cache de 30 dias

Definido no `.htaccess` da raiz — que é escrito pelo cPanel e NÃO está no
repo (por isso excluído do sync, ver acima). Trocar a imagem de
`og-image.png` não invalida nada — o WhatsApp/Facebook/etc vão continuar
servindo o preview antigo por até 30 dias. Única saída: mudar a URL
(`?v=N` incrementado no `<meta property="og:image">`).

## Headers de segurança (CSP/HSTS/X-Frame-Options)

Vivem em `scripts/htaccess-raiz.txt` — não são aplicados automaticamente
pelo deploy, é texto pra **colar a mão** no `.htaccess` da raiz via cPonel
(o próprio arquivo `.htaccess` da raiz é escrito pelo cPanel, fora do repo,
excluído do sync de propósito — mexer nele fora do painel se perde no
próximo ajuste que o cPanel fizer). CSP sobe em `Report-Only` e HSTS com
`max-age` curto (5 min) até a primeira semana confirmar que nada quebrou.

## Repositório de segurança / auditoria

Se aparecer uma pasta `CLAUDE-SECURITY-*` na raiz (saída de rodada de
auditoria automatizada), ela JÁ está excluída do `.vercelignore` — nunca é
site, nunca deve subir. Se estiver criando uma pasta assim manualmente,
confirme que o padrão `CLAUDE-SECURITY-*` ainda cobre o nome antes de
publicar.

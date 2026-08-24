# Leads e Colinha Digital — infraestrutura compartilhada

Este repositório não é uma ilha: o formulário de lead e a "colinha digital"
são código/infra **compartilhados literalmente** com as campanhas irmãs
Tozi (`site-tozi`) e Dulce Rita (`site-dulcerita`). Mudança aqui pode afetar
as três em produção, silenciosamente, sem erro nenhum aparecer.

## Endpoint de leads (Google Apps Script)

`LEAD_ENDPOINT` em `js/main.js` aponta pra um Web App do Google Apps
Script. **Os três sites de campanha usam o MESMO endpoint** — mudança em
`scripts/apps-script-leads.gs` afeta as três.

**O `.gs` do repositório é CÓPIA, não o código vivo.** O que roda de
verdade mora no editor do Apps Script, dentro da conta Google. Pra
publicar uma mudança:

1. Copie o código ATUAL do editor pra um arquivo local (backup — não é
   versionado automaticamente)
2. Cole o código novo
3. **Implantar → Gerenciar implantações → lápis na implantação
   EXISTENTE → Versão: Nova**

**NUNCA "Nova implantação"** — isso nasce com uma URL `/exec` diferente, e
os três sites param de receber lead **em silêncio, sem erro em lugar
nenhum**. O bug mais caro possível aqui: nada quebra visivelmente, só para
de chegar lead.

Testar depois de publicar: `bash scripts/testar-endpoint.sh <URL>` —
esperado `ok:true` / `ok:false` (teste de duplicado) / `ok:true`, com **uma
linha só** aparecendo na planilha (não três).

### Decisões de segurança já tomadas (não reabrir sem motivo novo)

- **Honeypot vale no servidor.** Campo `site` **ausente = aceito** — Tozi e
  Dulce ainda não enviam esse campo, exigi-lo mataria a captação dos dois.
- **Bot e duplicado respondem IGUAL a um lead aceito.** Resposta diferente
  vira oráculo pra quem testa o form: entrega qual campo é a armadilha, ou
  se um telefone já está cadastrado.
- **Turnstile foi avaliado e recusado.** Validar token gasta uma chamada de
  `UrlFetchApp` por lead e falha FECHADA — esgotar a cota diária do Apps
  Script derrubaria a captação das três campanhas (trocaria spam por
  apagão). Se for retomar, precisa de orçamento de fetch reservado via
  `CacheService`, com folga pra tráfego real.
- **Apps Script é lugar ruim pra endpoint público** (sem rate limit, sem
  IP do cliente) — decisão de fundo registrada, mas mover pra função
  serverless própria ainda não foi feito.
- **Consentimento LGPD**: o checkbox do form precisa nomear EXPLICITAMENTE
  (a) que as três campanhas da federação acessam a base, e (b) que o dado
  vai pra servidor do Google fora do Brasil — texto genérico ("fins da
  campanha", singular) não cobre transferência internacional, que a LGPD
  pede consentimento específico e destacado pra isso. `POLITICA_VERSAO`
  (constante em `js/main.js`, formato `AAAA-MM-DD`) grava JUNTO com cada
  lead qual versão do texto a pessoa aceitou — sem isso, uma mudança
  futura no texto apagaria a prova do que foi realmente aceito na hora.
  **Sempre atualize essa data ao editar o texto do checkbox ou a Política
  de Privacidade.** Pendente de advogado: DPO não nomeado, exclusão sem
  log, fotos de adversários na base do TSE.

## `navigator.sendBeacon`

O envio do form usa `sendBeacon` como caminho primário (sobrevive à
navegação da página — importante porque o clique manda o usuário pro
WhatsApp imediatamente depois), com `fetch` como fallback. `WHATSAPP_BOT` +
`WHATSAPP_MSG` (em `js/main.js`) montam o link do bot que continua a
conversa — o site só manda pro WhatsApp DEPOIS de confirmar que gravou na
planilha, é assim que se sabe quem veio do site.

## Colinha Digital

Guia de voto (mostra o número de cada cargo pra colar/decorar). Serve
Elton, Tozi, Dulce e outros candidatos aliados **pelo MESMO código** —
`colinha/colinha-core.js` decide qual candidato mostrar **pelo hostname da
requisição** (objeto `CANDIDATOS`, chave = hostname).

Estrutura por candidato: `nome`, `cargo` (código numérico do cargo na
urna), `numero`, `partido`, `tema` (visual), `razao`/`cnpj` (marcação legal
obrigatória da propaganda eleitoral, Lei 9.504/97 art. 38 §1º), `foto`,
`fixos` (object opcional — cargos que a peça IMPRESSA já traz preenchidos,
e por isso ficam travados/sem caminho de escrita por URL nem
`localStorage`; ex: `{ governador: '10' }` quando o santinho já vem com o
governador impresso — **sem `fixos`, o campo fica destravado e o eleitor
escolhe**).

`hosts` (array) mapeia múltiplos domínios pro MESMO candidato (ex: preview
Vercel + domínio de produção do Tozi apontando pro mesmo config). Entradas
tipo `{ alias: 'outro-hostname' }` fazem um hostname simplesmente reusar a
config de outro, sem duplicar dados.

**Decisão registrada:** o governador NÃO fica travado por padrão na
colinha do Dr. Elton (`fixos` vazio nessa entrada) — foi removido
deliberadamente depois de feedback do usuário ("tire o Tarcísio que está
pré-colocado"). Tozi e Dulce MANTÊM o governador travado — os santinhos
IMPRESSOS deles trazem o nome junto de verdade, então travar reflete a
peça física real. Não generalize a decisão de um candidato pros outros
sem confirmar o que a peça impressa de cada um realmente traz.

`colinha/c/` guarda os santinhos individuais gerados (links vivos em
produção) — ver `docs/deploy-e-infra.md` pra armadilha do
`.vercelignore` bilateral que já deixou arquivos aqui de fora do repo por
semanas.

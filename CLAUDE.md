# site-campanha — Dr. Elton 4412

Site institucional de campanha. HTML/CSS/JS puro. **Sem build, sem npm, sem framework.**
Não sugira Tailwind, React ou bundler: não há `package.json` e isso é decisão, não falta.

## Publicar

`git push` **não publica nada.** A produção é a HostGator, por script manual:

```bash
HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh --dry   # sempre primeiro
HOSTGATOR_USER=eltona93 bash scripts/deploy-hostgator.sh
```

Sempre `--dry` antes, e **leia a lista de arquivos APAGADOS**, não só a de enviados.
Já aconteceu de um deploy quase remover 50 fotos e 3 links vivos em produção.

Depois de publicar, confira por `curl` no domínio real — `main` já ficou 5 dias à
frente da produção sem ninguém notar, porque nenhuma revisão de código pega isso.

## Armadilhas que já custaram tempo

**Filtro do rclone vale nos dois lados.** Excluir um arquivo do `.vercelignore`
impede que ele seja enviado **e** que seja apagado no destino. Rascunho que já subiu
precisa ser removido *antes* de entrar na lista de exclusão.

**`sync-colinha.sh` tem allowlist.** O que não está nos `--include` é apagado pelo
`--delete`. Foi assim que `colinha/c/` (os santinhos, links vivos em produção) ficou
de fora do repositório por semanas.

**Cache-buster `?v=` no `index.html`.** CSS e JS têm número de versão. Editou um,
incrementa o `?v=`. Esquecer significa a HostGator servindo arquivo velho.

**`og:image` tem cache de 30 dias** no `.htaccess` da raiz, que é do cPanel e não
está no repositório. Trocar a imagem não invalida nada — só mudar a URL (`?v=N`).

## Endpoint de leads

`LEAD_ENDPOINT` em `js/main.js` aponta para um Google Apps Script.
**Os três sites de campanha (campanha, tozi, dulcerita) usam o MESMO endpoint.**
Mudança em `scripts/apps-script-leads.gs` afeta as três campanhas.

O `.gs` do repositório é **cópia**. O que roda vive no editor do Apps Script, na
conta Google. Para publicar: copie o código atual para um arquivo (backup — ele não
é versionado), cole o novo, e então:

> Implantar → Gerenciar implantações → **lápis na implantação existente** → Versão: Nova

**Nunca "Nova implantação"**: nasce com outra URL `/exec` e os três sites param de
receber lead em silêncio, sem erro em lugar nenhum.

Testar depois: `bash scripts/testar-endpoint.sh <URL>`. Esperado `ok:true` /
`ok:false` / `ok:true`, com **uma linha só** na planilha.

### Decisões de segurança já tomadas (22/08/2026)

- Honeypot vale no servidor. Campo `site` **ausente = aceito** — Tozi e Dulce ainda
  não o enviam, e exigi-lo mataria a captação dos dois.
- Bot e duplicado respondem **igual** a um lead aceito. Resposta diferente vira
  oráculo: entrega qual campo é a armadilha, ou se um telefone acabou de se cadastrar.
- **Turnstile foi avaliado e recusado.** Validar token gasta uma chamada de
  `UrlFetchApp` por lead e falha fechada — esgotar a cota diária derrubaria a captação
  das três campanhas. Trocaria spam por apagão. Se for retomar, precisa de orçamento
  de fetch em `CacheService` com folga reservada para tráfego real.
- Conclusão de fundo: Apps Script é lugar ruim para endpoint público (sem rate limit,
  sem IP do cliente). A solução real é mover o recebimento para uma função serverless.

## Vídeos e fotos

`assets-src/videos-src/` é ignorado (originais pesados). Só a versão comprimida entra
no git — e **entra mesmo**: o que não está versionado se perde. Já custou 50 fotos.
Rode `git gc` de vez em quando; o repositório passa de meio giga.

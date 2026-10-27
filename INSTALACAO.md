# Instalação do Vórtex Iscas (passo a passo)

Este guia instala o Vórtex Iscas nas **suas** contas, do zero. Leva de 30 minutos a 1 hora na primeira vez.
Prefere que o Claude Code faça junto com você? Use o [PROMPT-DE-INSTALACAO.md](PROMPT-DE-INSTALACAO.md).

Alguns termos que aparecem aqui:

- **Terminal**: a janela onde você digita comandos. No Mac, aperte `Cmd + Espaço`, digite `Terminal` e dê
  Enter. No Windows, aperte a tecla Windows, digite `PowerShell` e dê Enter.
- **Variável de ambiente**: uma configuração (endereço, chave, senha) que fica fora do código. No seu
  computador ela mora no arquivo `.env.local`; no ar, nas configurações do projeto na Vercel.
- **Migração**: um arquivo SQL que cria ou muda as tabelas do banco. Fica em `supabase/migrations/` e roda
  em ordem.
- **RLS** (Row Level Security): regra do banco que decide quem pode ler e gravar cada linha. Aqui, o site só
  consegue **gravar** lead; ler, só o seu servidor.
- **Webhook**: um aviso automático que o seu site manda pra outra ferramenta quando algo acontece.
- **UTM**: as marcações no fim do link (`?utm_source=instagram&...`) que dizem de onde o lead veio.

> Arquivos que começam com ponto (como `.env.local`) ficam escondidos. No Mac, no Finder, aperte
> `Cmd + Shift + .` pra mostrar.

---

## 1. Contas

| Conta | Pra quê | Custo |
|---|---|---|
| [GitHub](https://github.com/signup) | guardar o seu código e ligar na Vercel | grátis |
| [Supabase](https://supabase.com) | banco de dados dos leads | plano grátis serve pra começar. O projeto grátis pausa depois de 7 dias sem uso (é só reativar no painel) |
| [Vercel](https://vercel.com/signup) | deixar o site no ar (entre com o GitHub) | plano grátis (Hobby) serve pra testar. Os termos da Vercel pedem o plano Pro (pago) pra uso comercial |

Opcionais: conta no Meta (pixel de anúncios), uma ferramenta que recebe webhooks (n8n, Make, Zapier...), uma
ferramenta de automação de direct do Instagram (manda o link da isca pra quem comenta) e um domínio próprio.

No seu computador você precisa de:

- **Node.js 20 ou mais novo** ([nodejs.org](https://nodejs.org), botão "LTS"). Confira com `node -v`.
- **Git** ([git-scm.com](https://git-scm.com)). Confira com `git --version`.
- **CLI do Supabase** ([guia oficial](https://supabase.com/docs/guides/local-development/cli/getting-started)).
  Mac: `brew install supabase/tap/supabase`. Windows: `scoop install supabase` (ou troque `supabase` por
  `npx supabase` em todos os comandos). Confira com `supabase --version`.
- **CLI da Vercel** (opcional, ajuda a cadastrar variáveis): `npm i -g vercel`.

## 2. Baixar o código

```bash
git clone https://github.com/matheustillimt-tech/vortex-iscas.git
cd vortex-iscas
npm install
cp .env.example .env.local
```

No Windows, se o `cp` der erro, use `copy .env.example .env.local`. Se o `npm install` avisar de
"vulnerabilities", não rode `npm audit fix --force` (ele troca versões e pode quebrar o projeto).

O `.env.local` é onde ficam as suas chaves. Ele nunca vai pro GitHub (o `.gitignore` já ignora).

## 3. Supabase: criar o projeto e o banco

**Jeito 1, pela linha de comando** (o mesmo que o prompt do Claude usa):

```bash
supabase login                    # abre o navegador: crie a conta ou entre, e autorize
supabase orgs list                # copie o ID da sua organização
supabase projects create minhas-iscas --org-id SEU-ORG-ID --region sa-east-1 --db-password UMA-SENHA-FORTE
supabase projects list            # espere aparecer ACTIVE_HEALTHY (uns 2 min) e copie o REFERENCE ID
supabase link --project-ref SEU-REF --password UMA-SENHA-FORTE
supabase db push --password UMA-SENHA-FORTE
```

Guarde a senha do banco no `.env.local`, na linha `SUPABASE_DB_PASSWORD=` (ela só serve pra linha de comando e
não vai pra Vercel).

**Jeito 2, pelo painel**: em [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**, região
**South America (São Paulo)**. Guarde a senha do banco. Depois, ou rode `supabase link` + `supabase db push`
como acima, ou abra **SQL Editor → New query**, cole o arquivo
`supabase/migrations/20260101000000_vortex_iscas.sql` **inteiro** e clique em **Run** (tem que aparecer
"Success"). O arquivo pode rodar de novo sem medo: nada é apagado.

O banco cria:

- `isca_leads`: um lead por formulário enviado (nome, WhatsApp, isca, origem, etapa no CRM);
- `lead_events`: a linha do tempo de cada lead (captura, abriu o material, baixou o PDF, clicou no convite,
  mudança de etapa, notas);
- `webhooks` e `webhook_entregas`: as URLs que recebem os leads e o histórico das entregas;
- as regras de segurança (RLS), a padronização do WhatsApp, a jornada que anda sozinha e os números do painel.

**Chaves**: rode `supabase projects api-keys --project-ref SEU-REF` ou abra **Project Settings → API Keys**
(e **Data API** pra URL). Cole no `.env.local`:

- a URL (`https://SEU-REF.supabase.co`) em `NEXT_PUBLIC_SUPABASE_URL`;
- a chave `anon` (nas contas novas, `publishable`) em `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- a chave `service_role` (nas contas novas, `secret`) em `SUPABASE_SERVICE_ROLE_KEY`.

A `anon` é pública por natureza: pode ir pro navegador, porque o banco só deixa ela **gravar** contato. A
`service_role` lê tudo: fica **só no servidor**, é usada pelo CRM e **nunca** vai no código nem pro GitHub.

Este sistema **não usa** Edge Functions, `supabase secrets set` nem o Supabase Vault: tudo roda no site, na
Vercel.

## 4. Variáveis de ambiente

| Variável | Pra que serve | Onde pegar | Obrigatória? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | endereço do banco | Supabase → Project Settings → Data API (ou `https://SEU-REF.supabase.co`) | sim (sem ela o site funciona, mas não grava os leads) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública: o site grava o lead direto no banco | Supabase → Project Settings → API Keys → `anon` ou `publishable` | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta, só no servidor: CRM, webhooks e caminho alternativo de captura | Supabase → Project Settings → API Keys → `service_role` ou `secret` | sim (sem ela o CRM fica vazio) |
| `SUPABASE_DB_PASSWORD` | senha do banco, só pra linha de comando (`link` e `db push`) | a que você criou com o projeto | não (e **não** vai pra Vercel) |
| `ADMIN_SENHA` | senha do CRM em `/admin` | você inventa (12+ caracteres) | sim (vazia = painel trancado) |
| `NEXT_PUBLIC_AUTHOR_NAME` | seu nome no topo das páginas, no PDF e na política de privacidade | você | recomendada (padrão: "Seu Nome") |
| `NEXT_PUBLIC_AUTHOR_HANDLE` | seu @ do Instagram | você | recomendada |
| `NEXT_PUBLIC_VERIFIED` | `true` mostra o selo azul ao lado do nome | você | não (padrão: `false`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | e-mail pra pedidos de dados (LGPD), na política de privacidade | você | sim, antes de publicar |
| `NEXT_PUBLIC_CONVITE_URL` | link do convite no fim do material. Vazio = sem convite | o link do seu grupo, aula, agenda... | não |
| `NEXT_PUBLIC_CONVITE_SELO` | etiqueta pequena em cima do convite | você | não |
| `NEXT_PUBLIC_CONVITE_TITULO` | título do convite | você | não |
| `NEXT_PUBLIC_CONVITE_TEXTO` | frase explicando o que fazer | você | não |
| `NEXT_PUBLIC_CONVITE_BOTAO` | texto do botão do convite | você | não |
| `NEXT_PUBLIC_META_PIXEL_ID` | número do Meta Pixel (visitas e evento de lead) | business.facebook.com → Gerenciador de Eventos | não |

A sua foto não é variável: troque o arquivo `public/avatar.jpg` (quadrado, mesmo nome).

Variáveis que começam com `NEXT_PUBLIC_` vão pro navegador e entram no site na hora de publicar: mudou na
Vercel, publique de novo.

## 5. Testar no seu computador

```bash
npm run dev
```

- Abra **http://localhost:3000/exemplo/lead**, preencha nome e WhatsApp e clique em "Quero o material". Você
  cai na página do material (`/exemplo`).
- Abra **http://localhost:3000/admin**, entre com a `ADMIN_SENHA` e confira que o seu lead está lá.
- Quer ver o CRM cheio antes de ter leads? **http://localhost:3000/admin?demo=1** (dados de mentira; pra sair,
  `/admin?demo=0`). A demonstração não existe no site publicado.
- Pra parar o site: clique no terminal e aperte `Ctrl + C`.

Sem o Supabase configurado o site funciona do mesmo jeito (a pessoa vê o material), mas o lead **não é
gravado** e o navegador avisa isso no console.

## 6. Publicar na Vercel

1. Suba o código pra um repositório **seu** no GitHub (pode ser privado). Como você clonou o modelo, troque a
   origem primeiro:

   ```bash
   git remote rename origin modelo
   git add -A && git commit -m "minhas iscas"
   ```

   Crie um repositório **vazio** em [github.com/new](https://github.com/new) e rode os comandos que ele
   mostra (`git remote add origin ...` e `git push -u origin main`). Ou, com a CLI do GitHub:
   `gh repo create minhas-iscas --private --source . --remote origin --push`.
2. Em [vercel.com/new](https://vercel.com/new), escolha esse repositório.
3. Antes de clicar em **Deploy**, abra **Environment Variables** e cadastre as linhas preenchidas do seu
   `.env.local` (nome à esquerda, valor à direita), **menos** a `SUPABASE_DB_PASSWORD`. Dá pra colar o arquivo
   inteiro de uma vez e apagar essa linha. Pela CLI: `vercel env add NOME production` pra cada uma.
4. Clique em **Deploy** e espere uns 2 minutos. O site fica num endereço como `seu-projeto.vercel.app`.

A partir daqui, **todo `git push` na `main` publica sozinho**. Mudou uma variável na Vercel? Ela só vale depois
de publicar de novo: **Deployments** → o último → `...` → **Redeploy**.

Este projeto **não tem** `vercel.json` nem tarefas agendadas (cron): os webhooks saem na hora, em segundo plano.

## 7. O administrador (a senha do CRM)

O CRM não tem cadastro de usuários: quem sabe a `ADMIN_SENHA` entra. Pra criar o acesso:

1. Escolha uma senha forte (12+ caracteres) e coloque em `ADMIN_SENHA` no `.env.local` e na Vercel.
2. Publique de novo (Redeploy) e abra `seu-site/admin`.

O login guarda um cookie seguro por 30 dias. **Trocar a senha desconecta todo mundo** que estava logado: é
assim que você "tira" o acesso de alguém.

## 8. Ligar as integrações (todas opcionais)

### Automação de direct (Instagram)

O sistema não manda direct sozinho. Na sua ferramenta de automação de comentário → direct, configure a palavra
do post pra mandar o link da isca **com a origem marcada**:

```
https://seu-dominio/exemplo/lead?utm_source=instagram&utm_medium=reels&utm_campaign=exemplo&utm_content=01-10
```

A origem aparece no CRM em "De onde vêm os leads". Registre cada palavra no `INDICE-CTAS.md`.

### Convite no fim do material

Preencha `NEXT_PUBLIC_CONVITE_URL` (e, se quiser, `_SELO`, `_TITULO`, `_TEXTO`, `_BOTAO`) no `.env.local` e
na Vercel e publique de novo. O bloco verde aparece no topo e no fim de **todas** as iscas e no fim do PDF.
O clique leva junto as marcações de origem e move o lead pra etapa "Clicou no convite".

### Meta Pixel

Coloque o número em `NEXT_PUBLIC_META_PIXEL_ID` e publique de novo. O site dispara `PageView` em toda página e
`Lead` quando o formulário é gravado. Se você usa remarketing, a política de privacidade já menciona o Meta.

### Webhooks: mande seus leads pra qualquer lugar

1. Na sua ferramenta, crie um gatilho de webhook e copie a URL que ela te dá:
   - **n8n:** nó **Webhook**, método `POST` (use a "Production URL" e ative o fluxo).
   - **Make:** módulo **Webhooks → Custom webhook** → **Add** → copie o endereço.
   - **Zapier:** gatilho **Webhooks by Zapier → Catch Hook**.
2. No CRM, abra **/admin → Webhooks**, cole a URL e escolha quando mandar: **Lead novo** (já vem marcado) e,
   se quiser, **Lead mudou de etapa** (quando você move o lead no Pipeline).
3. Clique em **Salvar webhook** e depois em **Enviar teste**. Um lead de mentira ("Lead de Teste") chega na
   sua ferramenta, e ela já aprende o formato.

Embaixo aparecem as **últimas entregas**: deu certo (✓ e o código, ex.: 200) ou deu erro (✕, com o motivo).
Se a ferramenta não responder, o site tenta de novo uma vez. **Se o webhook falhar, o lead não é perdido:** ele
continua no CRM e a pessoa recebe o material normalmente. O histórico guarda 30 dias.

O que chega na sua ferramenta (um `POST` em JSON):

```json
{
  "evento": "lead.novo",
  "enviado_em": "2026-10-01T14:03:00.000Z",
  "lead": {
    "id": "6f1c...",
    "nome": "Ana Souza",
    "whatsapp": "+5511912345678",
    "link_whatsapp": "https://wa.me/5511912345678",
    "isca": "exemplo",
    "etapa": "novo",
    "criado_em": "2026-10-01T14:02:58.000Z",
    "utm_source": "instagram",
    "utm_medium": "reels",
    "utm_campaign": "exemplo",
    "utm_content": "01-10"
  }
}
```

No evento `lead.etapa` vem também `"etapa_anterior"`. No teste, `"evento": "teste"`.

**Assinatura (opcional, pra ninguém se passar pelo seu site):** preencha o campo **Segredo** (ou clique em
**Gerar**). Aí todo envio leva o cabeçalho `X-Webhook-Assinatura: sha256=...`, que é o HMAC-SHA256 do corpo
da mensagem com o seu segredo. Pra conferir do outro lado (Node.js, ou um nó **Code** do n8n):

```js
const crypto = require("crypto");
const esperado = "sha256=" + crypto.createHmac("sha256", "SEU-SEGREDO").update(corpoCruDaRequisicao).digest("hex");
const confere = esperado === cabecalhos["x-webhook-assinatura"];
```

**Quer mandar mensagem no WhatsApp pra cada lead?** Ligue um webhook na sua ferramenta de WhatsApp. O sistema
não manda WhatsApp sozinho.

<details>
<summary>Como os webhooks funcionam por dentro</summary>

Quem envia é o servidor do seu site (`app/lib/webhooks.ts`), não o navegador da pessoa: o segredo nunca sai do
servidor. Depois que o lead é gravado, a página avisa `/api/webhooks/lead-novo` (um aviso que sobrevive à troca
de página); se a captura foi pelo caminho alternativo (`/api/lead`), o próprio servidor avisa. A resposta pra
pessoa nunca espera o webhook: o envio roda em segundo plano. Cada lead é mandado **uma vez só** (o servidor
marca `webhook_avisado_at` antes de enviar) e, se algum aviso se perder, o próximo lead (ou abrir a tela de
Webhooks) manda os que ficaram pra trás nas últimas 24 horas.
</details>

### Domínio próprio

Na Vercel: o projeto → **Settings → Domains** → adicione (ex.: `materiais.seusite.com.br`) e siga as instruções
de DNS que ela mostra.

## 9. Criar a sua primeira isca

Abra o Claude Code dentro da pasta do projeto e peça:

```text
cria uma isca sobre {seu tema}. A palavra do comentário vai ser {PALAVRA}.
O post prometeu: {o que você prometeu entregar}.
```

O Claude segue o `CLAUDE.md`: confere a palavra no `INDICE-CTAS.md`, pesquisa o tema, mostra o esqueleto pra
você aprovar, cria as páginas em `app/{slug}/` e o PDF em `app/api/{slug}-pdf/`, testa e publica. Quer fazer
na mão? Copie a pasta `app/exemplo/` e o `app/api/exemplo-pdf/` com o nome novo e troque o texto do
`conteudo.ts`.

## 10. Checklist de teste

- [ ] `npm run build` termina sem erro.
- [ ] `/exemplo/lead`: o topo mostra a sua foto, o seu nome e o seu @.
- [ ] Preencher nome e WhatsApp leva pra `/exemplo` (o material).
- [ ] WhatsApp sem DDD ou com DDD que não existe mostra o aviso e não envia.
- [ ] O lead aparece em `/admin → Leads`, com a origem certa quando o link tem `utm_*`.
- [ ] "Baixar PDF" baixa o arquivo e o lead passa pra "Consumiu o material".
- [ ] Com o convite ligado, o bloco verde aparece e o clique move o lead pra "Clicou no convite".
- [ ] No Pipeline, arrastar um lead pra "Em contato" funciona e aparece na linha do tempo.
- [ ] `/privacidade` mostra o seu nome e o seu e-mail.
- [ ] Webhook: "Enviar teste" chega na sua ferramenta e aparece ✓ nas últimas entregas.
- [ ] O mesmo vale no site publicado (`seu-site/exemplo/lead` e `seu-site/admin`).

## 11. Problemas comuns

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| O lead não aparece e o console do navegador avisa "O Supabase ainda não está configurado" | faltam `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | preencher no `.env.local` e na Vercel; reiniciar / Redeploy |
| O lead não aparece, sem aviso | o banco não foi aplicado | `supabase db push` (ou rodar a migração no SQL Editor) |
| `/admin` mostra "Painel trancado" | falta `ADMIN_SENHA` | preencher e reiniciar / Redeploy |
| `/admin` abre vazio com aviso amarelo | falta `SUPABASE_SERVICE_ROLE_KEY` (ou a URL) | preencher |
| Webhooks: "as tabelas ainda não existem" | banco antigo | `supabase db push` de novo |
| Webhook não chega | URL errada ou fluxo desligado | ver o motivo em `/admin → Webhooks`; no n8n, a "Production URL" só funciona com o fluxo ativo |
| Depois do formulário cai em página 404 | o `slug` da página de captura é diferente do nome da pasta | igualar (`<PaginaCaptura slug="nome-da-pasta" />`) |
| O PDF dá erro | caractere especial no texto do material | o texto do PDF tem que passar por `semAcento()`; peça pro Claude conferir |
| Funciona no computador, não no ar | variável só no `.env.local` | cadastrar na Vercel e Redeploy |
| Esqueci a senha do painel | — | trocar a `ADMIN_SENHA` (na Vercel, com Redeploy) |
| O site parou de gravar depois de uns dias parado | o projeto grátis do Supabase pausou | reativar no painel do Supabase |

## 12. Atualizar o banco depois

Mudança no banco é sempre uma **migração nova no fim da fila**: um arquivo novo em `supabase/migrations/` com
data e hora maiores que a do último (ex.: `20261101120000_minha_mudanca.sql`), aplicado com
`supabase db push`. Nunca edite uma migração que já rodou no seu banco.

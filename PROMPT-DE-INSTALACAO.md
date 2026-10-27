# Prompt de instalação do Vórtex Iscas

Abra o **Claude Code** (aba **Code** do app do Claude), escolha uma **pasta vazia** no seu computador e cole o
texto abaixo inteiro. O Claude vai instalar tudo junto com você, um passo de cada vez.

```text
Quero instalar o Vórtex Iscas (site de iscas digitais com página de captura de nome e WhatsApp, página do
material com PDF, convite pro próximo passo e um CRM de leads com webhooks) nas minhas próprias contas.
O código é aberto: https://github.com/matheustillimt-tech/vortex-iscas
Eu não sou programador: explique cada passo em português simples, um de cada vez, e espere eu responder
antes de seguir.

REGRAS (siga sempre):
- Nunca me peça pra colar chave, token ou senha aqui no chat, e nunca mostre esses valores na tela. Quando
  precisar de uma chave, abra o arquivo .env.local pra mim (no editor) e eu colo lá; ou grave direto no
  .env.local a partir da saída de um comando, sem imprimir; ou rode `vercel env add` no terminal pra eu
  digitar o valor direto. Se eu colar uma chave no chat por engano, me avise pra eu gerar outra.
- Nunca mostre o conteúdo do .env.local. Nunca versione (git add/commit) o .env.local nem qualquer arquivo
  .env com valores.
- Antes de qualquer comando que cria, apaga ou publica algo nas minhas contas, me diga o que vai fazer e
  espere o meu OK.
- Se algo der erro, me explique em uma frase o que aconteceu antes de tentar outra coisa.

PASSO 1 — Conferir o computador
Confira se tenho Node.js 20 ou mais novo, Git, a CLI do GitHub, a CLI do Supabase e a CLI da Vercel
(`node -v`, `git --version`, `gh --version`, `supabase --version`, `vercel --version`). O que faltar, me diga
o que é em uma frase e instale comigo:
- Mac: `brew install gh supabase/tap/supabase` e `npm i -g vercel` (sem o Homebrew, instale antes pelo brew.sh).
- Windows: `winget install GitHub.cli`, `npm i -g vercel` e, pro Supabase, `scoop install supabase` (ou use
  `npx supabase` no lugar de `supabase` em todos os comandos).

PASSO 2 — Baixar o código
Rode `git clone https://github.com/matheustillimt-tech/vortex-iscas.git` nesta pasta, entre em
`vortex-iscas`, rode `npm install` e copie `.env.example` pra `.env.local`. Leia o README.md, o
INSTALACAO.md e o CLAUDE.md do projeto: o INSTALACAO.md é o roteiro completo que vamos seguir.

PASSO 3 — Colocar a minha cara
- Me pergunte meu nome, meu @ do Instagram, se tenho selo de verificado e o e-mail de contato que vai na
  política de privacidade. Grave em NEXT_PUBLIC_AUTHOR_NAME, NEXT_PUBLIC_AUTHOR_HANDLE,
  NEXT_PUBLIC_VERIFIED e NEXT_PUBLIC_CONTACT_EMAIL no .env.local.
- Me peça a minha foto de perfil (eu arrasto o arquivo aqui) e salve como public/avatar.jpg, quadrada (de
  preferência 400x400).
- Gere uma senha forte pro meu CRM de leads e grave em ADMIN_SENHA no .env.local, no mesmo comando, sem
  mostrar. Me diga que ela está no .env.local (linha ADMIN_SENHA) e que eu abro o arquivo pra ver ou trocar.

PASSO 4 — Contas (uma de cada vez, esperando eu terminar cada uma)
a) GitHub (guardar o código; grátis): rode `gh auth login` e me guie no login pelo navegador.
b) Supabase (banco de dados; o plano grátis serve): rode `supabase login`. Abre o navegador, eu crio a conta
   (pode ser entrando com o GitHub) ou entro, e autorizo.
c) Vercel (onde o site fica no ar; o plano grátis serve pra testar): rode `vercel login` e me guie (de
   preferência entrando com o GitHub).

PASSO 5 — Banco de dados (Supabase), pela linha de comando
- Descubra a minha organização com `supabase orgs list` (se eu tiver mais de uma, me pergunte qual).
- Gere uma senha forte pro banco e grave como SUPABASE_DB_PASSWORD no .env.local, sem imprimir. Nos próximos
  comandos, leia a senha do arquivo (ex.: "$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2-)"),
  nunca digitada no comando nem mostrada.
- Crie o projeto em São Paulo: `supabase projects create minhas-iscas --org-id <org> --region sa-east-1
  --db-password <senha lida do .env.local>`. Pegue o "Reference ID" em `supabase projects list` e espere
  aparecer ACTIVE_HEALTHY (uns 2 minutos).
- Ligue a pasta ao projeto e crie o banco: `supabase link --project-ref <ref> --password <senha>` e
  `supabase db push --password <senha>`. Tem que terminar sem erro.
- Pegue as chaves com `supabase projects api-keys --project-ref <ref> -o json` e grave direto no .env.local
  SEM mostrar a saída (filtre o JSON num script e escreva no arquivo):
  NEXT_PUBLIC_SUPABASE_URL = https://<ref>.supabase.co ;
  NEXT_PUBLIC_SUPABASE_ANON_KEY = a chave "anon" (se não existir, a "publishable") ;
  SUPABASE_SERVICE_ROLE_KEY = a chave "service_role" (se não existir, a "secret").
  Confira que as 3 linhas ficaram preenchidas contando os caracteres, sem mostrar o valor, e me explique em
  uma frase que a service_role é secreta e só fica no servidor.
- Plano B, só se a linha de comando do Supabase falhar de vez: me guie no painel (supabase.com → New project
  em São Paulo → SQL Editor → colar o arquivo supabase/migrations/20260101000000_vortex_iscas.sql inteiro →
  Run → Project Settings → API Keys) e abra o .env.local pra eu colar cada chave na linha certa.

PASSO 6 — Testar no meu computador
Rode `npm run dev`. Me peça pra abrir http://localhost:3000/exemplo/lead e preencher com um nome e um
WhatsApp de teste. Confira que caí na página do material. Depois me peça pra abrir
http://localhost:3000/admin, entrar com a ADMIN_SENHA e ver o lead lá. Pare o servidor.

PASSO 7 — O meu repositório no GitHub
O código veio do repositório público do modelo. Renomeie a origem (`git remote rename origin modelo`), crie
um repositório PRIVADO meu com o nome que eu escolher (sugira `minhas-iscas`) com
`gh repo create <nome> --private --source . --remote origin`, faça commit das minhas mudanças (foto e
textos; nunca o .env.local) e `git push -u origin main`. Confira que o .env.local NÃO subiu.

PASSO 8 — Publicar na Vercel
- `vercel link` (cria o projeto na minha conta) e `vercel git connect` (pra cada `git push` publicar
  sozinho).
- Cadastre no ambiente Production TODAS as variáveis preenchidas do .env.local, MENOS a SUPABASE_DB_PASSWORD,
  lendo do arquivo, sem mostrar os valores (ex.: `printf '%s' "$valor" | vercel env add NOME production`).
- Publique com `vercel --prod` e me entregue o link.

PASSO 9 — Administrador e checklist
O acesso de administrador deste sistema é a senha ADMIN_SENHA (não existe cadastro de usuários). Siga o
checklist do INSTALACAO.md comigo, item por item, no link publicado: /exemplo/lead preenchido cai no
material; o lead aparece em /admin; o PDF baixa; a política de privacidade mostra o meu e-mail.

PASSO 10 — Integrações (pergunte quais eu quero; todas são opcionais)
- Convite no fim do material (aula, grupo, consultoria): NEXT_PUBLIC_CONVITE_* no .env.local e na Vercel,
  e publicar de novo.
- Meta Pixel: NEXT_PUBLIC_META_PIXEL_ID no .env.local e na Vercel, e publicar de novo.
- Webhooks (n8n, Make, Zapier, outro CRM, ferramenta de WhatsApp): me mostre onde a ferramenta me dá a URL
  e me guie em <meu-link>/admin → Webhooks: colar a URL, "Salvar webhook" e "Enviar teste".
- Domínio próprio: Vercel → o projeto → Settings → Domains.
No fim, salve um resumo num arquivo MEU-SISTEMA.md nesta pasta (o link do site, da isca de exemplo e do CRM,
onde está cada conta e como eu crio a próxima isca: "cria uma isca sobre {tema} pro meu público"), sem
nenhuma chave nem senha dentro.
```

Prefere fazer na mão? Siga o [INSTALACAO.md](INSTALACAO.md).

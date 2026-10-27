# CLAUDE.md — Vórtex Iscas

Guia pro Claude Code mexer neste template. Existe pra que o dono do projeto possa pedir "cria uma isca sobre X"
e você já saiba o que fazer. **O dono não é técnico:** explique em português simples, diga o que cada comando
faz antes de rodar, mostre o que vai mudar antes de mudar, nunca peça chave ou senha no chat e nunca mostre o
conteúdo do `.env.local`.

## O que é

Site de **iscas digitais** (materiais gratuitos) com CRM de leads. Next.js 15 (App Router) + React 19 +
TypeScript + Tailwind CSS 4 + Supabase (`@supabase/supabase-js`) + jsPDF, publicado na Vercel. Cada instalação
é uma cópia própria: um projeto Supabase e um projeto Vercel.

O funil:

1. A pessoa comenta uma palavra no post → a ferramenta de automação de direct do dono (fora deste projeto)
   manda o link `/{slug}/lead`.
2. Página de captura: foto, nome e @ do dono no topo; **só Nome e WhatsApp**; botão "Quero o material".
3. O lead é salvo no Supabase (nome, WhatsApp, slug, UTMs, referrer) e a pessoa cai **na hora** no material
   `/{slug}`. **Não existe entrega por WhatsApp nem por e-mail.**
4. No material: conteúdo, botão de baixar PDF e um **convite opcional** (aula, grupo, consultoria) que vem das
   variáveis `NEXT_PUBLIC_CONVITE_*`.
5. Cada passo (abriu o material, baixou o PDF, clicou no convite) vira evento e anda sozinho no **CRM de
   leads** (`/admin`). Webhooks avisam outras ferramentas.

## Onde está cada coisa

```
app/
  components/
    pagina-captura.tsx   # a página de captura INTEIRA (formulário, máscara, envio, redirect). Toda isca usa
    campo-whatsapp.tsx   # campo com máscara brasileira
    cta-section.tsx      # convite do fim do material (some se NEXT_PUBLIC_CONVITE_URL estiver vazio)
    download-pdf-link.tsx, copy-block.tsx, track-view.tsx
    ui.tsx               # cabeçalho, rodapé, avatar, selo, botões; lê NEXT_PUBLIC_AUTHOR_*
  lib/
    enviar-lead.ts       # grava o lead com 3 tentativas (Supabase direto x2, depois /api/lead)
    jornada.ts           # eventos da jornada → CRM
    telefone.ts          # máscara e validação do WhatsApp (mesma regra da função whatsapp_e164 do banco)
    convite.ts           # lê NEXT_PUBLIC_CONVITE_*
    pdf-text.ts          # semAcento() pro PDF
    admin-servidor.ts    # SÓ servidor: senha do painel + chave service_role
    webhooks.ts          # SÓ servidor: manda o lead pros webhooks do dono
  exemplo/               # ISCA MODELO, completa
    conteudo.ts          # o texto (página e PDF leem daqui)
    page.tsx             # /exemplo  (material)
    lead/page.tsx        # /exemplo/lead  (captura: uma linha, <PaginaCaptura slug="exemplo" />)
    lead/layout.tsx      # título/descrição de compartilhamento
  api/
    exemplo-pdf/route.ts # /api/exemplo-pdf
    lead/route.ts        # caminho alternativo da captura (mesmo domínio)
    admin/sessao, admin/dados, admin/webhooks   # API do CRM (protegida por ADMIN_SENHA)
    webhooks/lead-novo   # aviso de lead novo pros webhooks (público, só manda lead real, 1 vez)
  admin/                 # o CRM: visão geral, leads, pipeline, webhooks (+ _lib/demo.ts, dados falsos)
  privacidade/page.tsx   # política de privacidade (LGPD)
  page.tsx               # página inicial (perfil do dono)
public/avatar.jpg        # foto do dono
supabase/migrations/     # banco, em ordem
INDICE-CTAS.md           # palavras de comentário já usadas
.env.example             # todas as variáveis, com comentário
INSTALACAO.md            # instalação manual completa
```

## Como rodar

```bash
npm install
cp .env.example .env.local   # a pessoa preenche; nunca peça os valores no chat
npm run dev                  # http://localhost:3000  (/exemplo/lead, /admin, /admin?demo=1)
npm run build                # tem que passar limpo antes de publicar
```

Não há testes automáticos neste projeto: confira com `npm run build` e testando as páginas no `npm run dev`.

## Personalizar marca e textos

- Nome, @ e selo: `NEXT_PUBLIC_AUTHOR_NAME`, `NEXT_PUBLIC_AUTHOR_HANDLE`, `NEXT_PUBLIC_VERIFIED`. Foto:
  `public/avatar.jpg`. E-mail da política de privacidade: `NEXT_PUBLIC_CONTACT_EMAIL`.
- Convite: `NEXT_PUBLIC_CONVITE_*` (textos padrão em `app/lib/convite.ts`).
- Cores: `app/globals.css` (`--color-go` é o verde do botão e do convite; `--color-ad-*` é o tema escuro do CRM).
- Texto e botão da página de captura: props `titulo` e `botao` do `<PaginaCaptura />` (padrões em
  `app/components/pagina-captura.tsx`). Texto da página inicial: `app/page.tsx`.
- Nome no topo do CRM ("CRM de leads"): `Logo` em `app/admin/_components/admin-shell.tsx`.
- Etapas do Pipeline: `STAGES` em `app/admin/_lib/types.ts` **e** a constraint `isca_leads_stage_check` no
  banco (mudar os dois juntos, com migração nova).

## Como criar uma isca nova

### 1. Levantar o essencial (pergunte, não invente)

- **Tema e promessa exata:** o que o post/vídeo prometeu entregar, palavra por palavra
- **Palavra do comentário** (ex: `GUIA`, `PROMPTS`, `ABC12`)
- **Público:** quem é a pessoa e o que ela já sabe

O slug é a palavra em minúsculo, sem acento (ex: `PROMPTS` → `prompts`).

### 2. Reservar a palavra

No `INDICE-CTAS.md`: a palavra não pode existir, nenhuma existente pode ser pedaço dela (nem ela pedaço de
outra) e não pode ser palavra comum de comentário (`IA`, `SIM`, `TOP`). Confira também se `app/{slug}/` não
existe e se o slug não bate com uma rota do sistema (`admin`, `api`, `privacidade`).

### 3. Pesquisar de verdade

A isca entrega **3 a 5 vezes mais profundidade** que o post. Pesquise (WebSearch/WebFetch), junte fontes reais
e confira os links. **Nunca invente número, estatística, caso ou link.** Sem fonte, ou fica genérico ou você
pergunta ao dono. Mostre o esqueleto do material e espere o OK antes de escrever o código.

### 4. Criar os arquivos (copie de `app/exemplo/`)

```
app/{slug}/conteudo.ts        ← o texto, com acento normal
app/{slug}/page.tsx           ← o visual do material (lê de ./conteudo)
app/{slug}/lead/page.tsx      ← export default () => <PaginaCaptura slug="{slug}" />
app/{slug}/lead/layout.tsx    ← metadata (título e descrição)
app/api/{slug}-pdf/route.ts   ← o PDF (lê de ../../{slug}/conteudo)
```

- No `lead/page.tsx`, o `slug` **tem que ser o nome da pasta**: é pra lá que a pessoa vai depois do formulário
  e é o que fica gravado no lead.
- No `page.tsx`, mantenha `<TrackView isca="{slug}" />`, o `DownloadPdfLink`, o `<CTASection compact />` no
  topo e o `<CTASection />` no fim.
- No `route.ts` do PDF, **todo texto passa por `semAcento()`** (o jsPDF quebra com acento). O convite já entra
  sozinho no fim, se estiver configurado.
- Pode criar blocos visuais próprios dentro do `page.tsx` da isca; reaproveite `CopyBlock`, `ProfileLine`,
  `Label`, `Container` de `components/`.

### 5. Regras de conteúdo

- **Entregue literalmente o que foi prometido.** Prometeu 10 com links? Dez, com links que abrem.
- **Um item copiável por isca** (prompt, checklist, modelo) com `CopyBlock`.
- Termine com a "Dica do criador" (opinião do dono; pergunte se não souber) e as fontes.
- **Não peça e-mail nem outro campo.** O formulário é só Nome e WhatsApp.

### 6. Conferir antes de publicar

`npm run build` tem que passar limpo. Rode `npm run dev`, abra `/{slug}/lead`, preencha e confira que cai em
`/{slug}`. Teste o PDF em `http://localhost:3000/api/{slug}-pdf`. Mostre ao dono e espere o OK.

### 7. Publicar e registrar

Com o OK do dono: `git add -A && git commit -m "feat: isca {slug}" && git push`. Se o repositório estiver ligado
na Vercel, o push publica sozinho. Confira se a página respondeu (`/{slug}/lead` com status 200) e adicione a
linha no `INDICE-CTAS.md` (palavra, slug, tema, data, link).

### 8. Entregar

Sempre o link **completo**, com a origem marcada (é isso que aparece no CRM):

```
https://SEU-DOMINIO/{slug}/lead?utm_source=instagram&utm_medium=reels&utm_campaign={slug}&utm_content={DD-MM}
```

E a palavra que ele configura na automação de direct.

## CRM de leads (/admin)

- Senha: `ADMIN_SENHA`. O login grava um cookie httpOnly (30 dias, derivado da senha); a API confere em toda
  chamada. Trocar a senha derruba todas as sessões.
- Dados lidos **só no servidor** com `SUPABASE_SERVICE_ROLE_KEY` (`app/lib/admin-servidor.ts`). **Nunca**
  importe esse arquivo nem use essa chave em componente `"use client"` ou variável `NEXT_PUBLIC_`.
- Etapas: `novo → consumiu → convite` (automáticas, por gatilhos no banco) e `contato → negociando → cliente /
  perdido` (o dono arrasta no Pipeline).
- `/admin?demo=1` mostra dados falsos, só em `npm run dev`.

## Webhooks

- O dono cadastra URLs em `/admin → Webhooks` (tabelas `webhooks` e `webhook_entregas`, só service_role).
  Eventos: `lead.novo` e `lead.etapa` (mudança feita no Pipeline).
- Quem envia é o servidor (`app/lib/webhooks.ts`): POST JSON, tempo limite de 5 s, 1 nova tentativa,
  assinatura `X-Webhook-Assinatura: sha256=HMAC(corpo, segredo)` quando há segredo. Tudo em segundo plano
  (`after`): **falha de webhook nunca bloqueia a captura**.
- Lead novo: a captura chama `/api/webhooks/lead-novo` com `sendBeacon` depois de gravar (o `/api/lead` chama
  sozinho). Cada lead vai uma vez (`webhook_avisado_at`); leads perdidos das últimas 24 h vão no próximo aviso.
- Envio de mensagem no WhatsApp **não existe** aqui: oriente o dono a ligar um webhook na ferramenta de
  WhatsApp dele.

## Banco (Supabase)

- O banco está em `supabase/migrations/` e vai pro projeto com `supabase link` + `supabase db push` (a senha do
  banco fica em `SUPABASE_DB_PASSWORD` no `.env.local`; leia do arquivo, nunca mostre).
- RLS: o site (chave anon) só **grava** em `isca_leads` (sempre na etapa `novo`) e os passos da jornada em
  `lead_events`; ninguém de fora lê. Não afrouxe essas regras.

## LGPD (não remova)

O formulário coleta nome e telefone: a página `/privacidade` e o texto de consentimento embaixo do botão são
obrigatórios. Antes de publicar, confirme que `NEXT_PUBLIC_CONTACT_EMAIL` está preenchida. Se o dono pedir pra
tirar, explique que é exigência da LGPD e ofereça encurtar o texto.

## Regras

- Nunca versionar `.env`, `.env.local` nem nada com chave. Nunca imprimir chave no terminal ou no chat.
- Migração nova sempre no **fim da fila**: arquivo novo em `supabase/migrations/` com data/hora maior que a
  última. Nunca editar uma migração que já rodou num banco de verdade. Aplicar com `supabase db push` (mostre
  antes o que vai mudar e espere o OK).
- Se o repositório estiver ligado na Vercel, **push na `main` publica**. Só faça push com o OK do dono.
- Variável `NEXT_PUBLIC_*` vai pro navegador e só vale no ar depois de publicar de novo (Redeploy).
- Não mexa sem necessidade na lógica de UTM e envio (`pagina-captura.tsx`, `enviar-lead.ts`).

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| Lead não grava, console avisa "Supabase ainda não está configurado" | faltam `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` | preencher no `.env.local` e na Vercel |
| Lead não grava, sem aviso | banco não aplicado | `supabase db push` |
| Webhooks: "tabelas ainda não existem" | banco antigo | `supabase db push` |
| Depois do formulário cai em página 404 | `slug` do `PaginaCaptura` diferente do nome da pasta | igualar |
| PDF dá 500 | texto sem `semAcento()` ou import errado do conteúdo | conferir o `route.ts` |
| `/admin` "Painel trancado" | falta `ADMIN_SENHA` | preencher e reiniciar / Redeploy |
| `/admin` vazio com aviso amarelo | falta `SUPABASE_SERVICE_ROLE_KEY` | preencher |
| Funciona local, não no ar | variável só no `.env.local` | cadastrar na Vercel e Redeploy |

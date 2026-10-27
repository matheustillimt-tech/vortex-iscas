-- ============================================================
-- Vórtex Iscas — banco de dados (Supabase)
-- ============================================================
-- Como usar: `supabase link` + `supabase db push` (linha de comando do Supabase), ou, se preferir
-- o painel, Supabase → SQL Editor → New query → cole este arquivo INTEIRO → Run.
-- Pode rodar de novo sem medo: nada é apagado, só criado ou atualizado.
--
-- O que este arquivo cria:
--   1. isca_leads   → um lead por formulário enviado (nome, WhatsApp, isca, origem)
--   2. lead_events  → a linha do tempo de cada lead (abriu o material, baixou o PDF, clicou no convite, notas)
--   3. As regras de segurança (RLS): quem chega pelo site só GRAVA, nunca lê nada
--   4. O WhatsApp sempre no mesmo formato (+5511912345678)
--   5. A jornada que anda sozinha no CRM
--   6. Os números do painel (/admin)
--   7. Webhooks: mandar cada lead novo pra outra ferramenta (n8n, Make, Zapier...)
-- ============================================================


-- 1. LEADS --------------------------------------------------

create table if not exists public.isca_leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  nome             text not null check (char_length(nome) between 1 and 120),
  whatsapp         text not null check (char_length(whatsapp) between 8 and 30),
  isca             text not null check (char_length(isca) between 1 and 80),  -- o slug da isca (nome da pasta em app/)
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  referrer         text,      -- de qual página a pessoa veio (quando o navegador informa)
  user_agent       text,
  -- CRM
  stage            text not null default 'novo',
  stage_changed_at timestamptz not null default now(),
  conteudo_at      timestamptz,  -- primeira vez que abriu o material
  pdf_at           timestamptz,  -- primeira vez que baixou o PDF
  convite_at       timestamptz,  -- primeira vez que clicou no convite
  last_event_at    timestamptz,
  webhook_avisado_at timestamptz  -- quando o lead novo foi mandado pros webhooks (evita mandar 2 vezes)
);

-- Quem já tinha o banco antes dos webhooks ganha a coluna aqui
alter table public.isca_leads add column if not exists webhook_avisado_at timestamptz;

alter table public.isca_leads drop constraint if exists isca_leads_stage_check;
alter table public.isca_leads add constraint isca_leads_stage_check
  check (stage in ('novo', 'consumiu', 'convite', 'contato', 'negociando', 'cliente', 'perdido'));

create index if not exists isca_leads_isca_idx on public.isca_leads (isca);
create index if not exists isca_leads_created_at_idx on public.isca_leads (created_at desc);
create index if not exists isca_leads_stage_idx on public.isca_leads (stage, stage_changed_at desc);
create index if not exists isca_leads_source_idx on public.isca_leads (utm_source);

comment on table public.isca_leads is 'Leads das iscas. Uma linha por formulário enviado.';
comment on column public.isca_leads.isca is 'Slug da isca (o nome da pasta em app/, ex: exemplo).';


-- 2. LINHA DO TEMPO -----------------------------------------

create table if not exists public.lead_events (
  id         bigint generated always as identity primary key,
  lead_id    uuid not null references public.isca_leads (id) on delete cascade,
  type       text not null check (type in ('captura', 'abriu_conteudo', 'baixou_pdf', 'clicou_convite', 'etapa', 'nota')),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);


-- 3. SEGURANÇA (RLS) ----------------------------------------
-- O site usa a chave "anon" (pública): ela só consegue gravar lead novo e passos da jornada.
-- Ler, editar e apagar só com a chave "service_role", que fica no servidor (o seu /admin).

alter table public.isca_leads enable row level security;
alter table public.lead_events enable row level security;

drop policy if exists "site grava lead" on public.isca_leads;
create policy "site grava lead"
  on public.isca_leads for insert
  to anon, authenticated
  with check (stage = 'novo' and conteudo_at is null and pdf_at is null and convite_at is null and last_event_at is null
              and webhook_avisado_at is null);

drop policy if exists "site registra jornada" on public.lead_events;
create policy "site registra jornada"
  on public.lead_events for insert
  to anon, authenticated
  with check (type in ('abriu_conteudo', 'baixou_pdf', 'clicou_convite') and created_by is null);

-- (sem policy de select/update/delete: ninguém de fora lê nada)

-- Permissões explícitas: o site (anon) só pode GRAVAR nestas duas tabelas (o RLS acima decide o
-- quê); o servidor (service_role) lê e edita tudo. Deixar escrito evita depender do padrão do projeto.
grant insert on table public.isca_leads to anon, authenticated;
grant insert on table public.lead_events to anon, authenticated;
grant select, insert, update, delete on table public.isca_leads to service_role;
grant select, insert, update, delete on table public.lead_events to service_role;


-- 4. WHATSAPP SEMPRE NO MESMO FORMATO -----------------------
-- Mesmas regras do formulário (app/lib/telefone.ts), aplicadas também no banco.

create or replace function public.whatsapp_e164(entrada text)
returns text
language plpgsql
immutable
as $$
declare
  d      text;
  local  text;
  ddd    text;
  numero text;
  ddds   int[] := array[
    11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,
    51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,
    91,92,93,94,95,96,97,98,99];
begin
  if entrada is null then return null; end if;
  d := regexp_replace(entrada, '\D', '', 'g');
  if d = '' then return entrada; end if;

  -- Outro país: veio com + e não começa em 55
  if left(btrim(entrada), 1) = '+' and left(d, 2) <> '55' then
    if length(d) between 8 and 15 then return '+' || d; end if;
    return entrada;
  end if;

  local := d;
  if left(local, 2) = '55' and length(local) >= 12 then local := substr(local, 3); end if;
  local := regexp_replace(local, '^0+', '');          -- 0 de operadora
  if length(local) < 10 or length(local) > 11 then return entrada; end if;

  ddd := left(local, 2);
  numero := substr(local, 3);
  if not (ddd::int = any(ddds)) then return entrada; end if;

  -- Celular antigo, sem o nono dígito
  if length(numero) = 8 and numero ~ '^[6-9]' then numero := '9' || numero; end if;

  if length(numero) = 8 and numero ~ '^[2-5]' then return '+55' || ddd || numero; end if;  -- fixo
  if length(numero) <> 9 or numero !~ '^9' then return entrada; end if;

  return '+55' || ddd || numero;
end $$;

create or replace function public.tg_lead_whatsapp()
returns trigger language plpgsql set search_path = public as $$
begin
  new.whatsapp := public.whatsapp_e164(new.whatsapp);
  return new;
end $$;

drop trigger if exists lead_whatsapp on public.isca_leads;
create trigger lead_whatsapp before insert or update of whatsapp on public.isca_leads
  for each row execute function public.tg_lead_whatsapp();


-- 5. JORNADA QUE ANDA SOZINHA -------------------------------
-- Novo lead → "novo". Abriu o material ou baixou o PDF → "consumiu". Clicou no convite → "convite".
-- Daí pra frente (contato, negociando, cliente, perdido) quem move é você, no /admin.

-- Lead novo vira o primeiro evento da linha do tempo
create or replace function public.tg_lead_captura()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lead_events (lead_id, type, data, created_at)
  values (
    new.id, 'captura',
    jsonb_build_object('isca', new.isca, 'utm_source', new.utm_source, 'utm_medium', new.utm_medium,
                       'utm_campaign', new.utm_campaign, 'utm_content', new.utm_content),
    new.created_at
  );
  return new;
end $$;

drop trigger if exists lead_captura on public.isca_leads;
create trigger lead_captura after insert on public.isca_leads
  for each row execute function public.tg_lead_captura();

-- Passo repetido (mesmo lead, mesmo tipo, menos de 30 min) é ignorado
create or replace function public.tg_lead_event_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type in ('abriu_conteudo', 'baixou_pdf', 'clicou_convite') and exists (
    select 1 from public.lead_events
    where lead_id = new.lead_id and type = new.type and created_at > now() - interval '30 minutes'
  ) then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists lead_event_before on public.lead_events;
create trigger lead_event_before before insert on public.lead_events
  for each row execute function public.tg_lead_event_before();

-- Passo marca a data no lead e avança a etapa (nunca volta etapa)
create or replace function public.tg_lead_event_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type in ('captura', 'etapa', 'nota') then
    return null;
  end if;

  update public.isca_leads set last_event_at = new.created_at where id = new.lead_id;

  if new.type = 'abriu_conteudo' then
    update public.isca_leads set conteudo_at = coalesce(conteudo_at, new.created_at) where id = new.lead_id;
    update public.isca_leads set stage = 'consumiu' where id = new.lead_id and stage = 'novo';
  elsif new.type = 'baixou_pdf' then
    update public.isca_leads
      set pdf_at = coalesce(pdf_at, new.created_at), conteudo_at = coalesce(conteudo_at, new.created_at)
      where id = new.lead_id;
    update public.isca_leads set stage = 'consumiu' where id = new.lead_id and stage = 'novo';
  elsif new.type = 'clicou_convite' then
    update public.isca_leads set convite_at = coalesce(convite_at, new.created_at) where id = new.lead_id;
    update public.isca_leads set stage = 'convite' where id = new.lead_id and stage in ('novo', 'consumiu');
  end if;
  return null;
end $$;

drop trigger if exists lead_event_after on public.lead_events;
create trigger lead_event_after after insert on public.lead_events
  for each row execute function public.tg_lead_event_after();

-- Mudança de etapa: carimba a data e registra na linha do tempo
create or replace function public.tg_lead_stage_before()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists lead_stage_before on public.isca_leads;
create trigger lead_stage_before before update on public.isca_leads
  for each row execute function public.tg_lead_stage_before();

create or replace function public.tg_lead_stage_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    -- quem mudou pelo painel aparece como "painel"; quem andou sozinho, como automático
    insert into public.lead_events (lead_id, type, data, created_by)
    values (
      new.id, 'etapa', jsonb_build_object('de', old.stage, 'para', new.stage),
      case when coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then 'painel' end
    );
  end if;
  return null;
end $$;

drop trigger if exists lead_stage_after on public.isca_leads;
create trigger lead_stage_after after update of stage on public.isca_leads
  for each row execute function public.tg_lead_stage_after();


-- 6. NÚMEROS DO PAINEL (/admin) ------------------------------
-- Só a chave service_role (o servidor do seu site) consegue chamar.

create or replace function public.admin_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  result jsonb;
begin
  with l as (
    select * from public.isca_leads where created_at >= p_from and created_at < p_to
  ),
  dias as (
    select gs::date as dia
    from generate_series(
      (p_from at time zone 'America/Sao_Paulo')::date,
      ((p_to - interval '1 second') at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    ) gs
  )
  select jsonb_build_object(
    'leads', (select count(*) from l),
    'unicos', (select count(distinct whatsapp) from l),
    'conteudo', (select count(*) from l where conteudo_at is not null),
    'pdf', (select count(*) from l where pdf_at is not null),
    'convite', (select count(*) from l where convite_at is not null),
    'contato', (select count(*) from l where stage in ('contato', 'negociando', 'cliente')),
    'negociando', (select count(*) from l where stage = 'negociando'),
    'clientes', (select count(*) from l where stage = 'cliente'),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'leads', (select count(*) from l where (l.created_at at time zone 'America/Sao_Paulo')::date = d.dia),
        'convite', (select count(*) from public.isca_leads x where x.convite_at is not null
                   and (x.convite_at at time zone 'America/Sao_Paulo')::date = d.dia)
      ) order by d.dia), '[]'::jsonb)
      from dias d
    ),
    'por_isca', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.leads desc), '[]'::jsonb) from (
        select isca, count(*) as leads,
               count(*) filter (where conteudo_at is not null) as conteudo,
               count(*) filter (where convite_at is not null) as convite,
               count(*) filter (where stage = 'cliente') as clientes
        from l group by isca
      ) t
    ),
    'por_origem', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.leads desc), '[]'::jsonb) from (
        select coalesce(nullif(utm_source, ''), 'direto') as origem, count(*) as leads,
               count(*) filter (where convite_at is not null) as convite
        from l group by 1
      ) t
    ),
    'por_etapa', (
      select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb)
      from (select stage, count(*) as n from l group by stage) s
    )
  ) into result;

  return result;
end $$;

revoke all on function public.admin_overview(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_overview(timestamptz, timestamptz) to service_role;


-- 7. WEBHOOKS -----------------------------------------------
-- Você cadastra no /admin → Webhooks uma ou mais URLs (n8n, Make, Zapier, seu CRM, sua ferramenta
-- de WhatsApp). Quando entra lead novo (ou um lead muda de etapa no Pipeline), o servidor do seu
-- site manda um POST com os dados do lead pra cada URL. Quem envia é o site (app/lib/webhooks.ts),
-- não o banco: aqui ficam só a lista de URLs e o histórico das entregas.
-- Só a chave service_role (o servidor) lê e grava estas tabelas.

create table if not exists public.webhooks (
  id         uuid primary key default gen_random_uuid(),
  criado_em  timestamptz not null default now(),
  nome       text not null default '' check (char_length(nome) <= 80),
  url        text not null check (url ~* '^https?://' and char_length(url) <= 500),
  eventos    text[] not null default array['lead.novo'],
  segredo    text check (segredo is null or char_length(segredo) <= 200),  -- pra assinar o envio (opcional)
  ativo      boolean not null default true
);

alter table public.webhooks drop constraint if exists webhooks_eventos_check;
alter table public.webhooks add constraint webhooks_eventos_check
  check (eventos <@ array['lead.novo', 'lead.etapa']::text[] and cardinality(eventos) >= 1);

create table if not exists public.webhook_entregas (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  webhook_id  uuid references public.webhooks (id) on delete cascade,
  evento      text not null,
  lead_id     uuid,
  url         text,
  ok          boolean not null default false,
  http_status int,
  erro        text,
  tentativas  int not null default 1,
  duracao_ms  int
);
create index if not exists webhook_entregas_criado_idx on public.webhook_entregas (criado_em desc);
create index if not exists webhook_entregas_webhook_idx on public.webhook_entregas (webhook_id, criado_em desc);
create index if not exists isca_leads_webhook_pendente_idx on public.isca_leads (created_at) where webhook_avisado_at is null;

alter table public.webhooks enable row level security;
alter table public.webhook_entregas enable row level security;
-- (sem policy nenhuma: a chave anon não lê nem grava; o service_role passa por cima do RLS)
revoke all on table public.webhooks from anon, authenticated;
revoke all on table public.webhook_entregas from anon, authenticated;
grant select, insert, update, delete on table public.webhooks to service_role;
grant select, insert, update, delete on table public.webhook_entregas to service_role;

/**
 * Dados do CRM de leads. Só responde com sessão aberta (senha do painel) e usa a chave
 * service_role, que nunca sai do servidor.
 *
 * Corpo: { acao, ...parâmetros }
 *   overview { from, to } · leads { q } · pipeline { q } · events { leadId }
 *   setStage { leadId, stage } · addNote { leadId, text }
 *   (setStage também avisa os webhooks de "lead mudou de etapa"; os webhooks em si ficam em /api/admin/webhooks)
 *
 * Sem Supabase configurado, devolve tudo vazio (o painel abre e mostra o aviso).
 */
import { after, NextResponse } from "next/server";
import { bancoAdmin, estaLogado } from "../../../lib/admin-servidor";
import { avisarMudancaDeEtapa } from "../../../lib/webhooks";
import { STAGE_KEYS, STAGES, type Board, type LeadQuery, type Overview } from "../../../admin/_lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tira caracteres que quebram o filtro `or` do banco. */
function limpaBusca(s: string) {
  return s.replace(/[,()%*\\.:]/g, " ").trim().slice(0, 60);
}

function dataValida(s: unknown, padrao: string) {
  return typeof s === "string" && !Number.isNaN(Date.parse(s)) ? s : padrao;
}

function normalizaQuery(bruto: unknown): LeadQuery {
  const q = (bruto ?? {}) as Partial<LeadQuery>;
  return {
    from: dataValida(q.from, "2020-01-01T00:00:00Z"),
    to: dataValida(q.to, new Date(Date.now() + 60000).toISOString()),
    search: typeof q.search === "string" ? limpaBusca(q.search) : "",
    isca: typeof q.isca === "string" ? q.isca.slice(0, 80) : "",
    origem: typeof q.origem === "string" ? q.origem.slice(0, 80) : "",
    stage: typeof q.stage === "string" && STAGE_KEYS.includes(q.stage) ? q.stage : "",
    jornada: q.jornada === "conteudo" || q.jornada === "pdf" || q.jornada === "convite" ? q.jornada : undefined,
    orderBy: q.orderBy === "nome" || q.orderBy === "stage_changed_at" ? q.orderBy : "created_at",
    asc: q.asc === true,
    page: Math.max(0, Math.min(10000, Number(q.page) || 0)),
    pageSize: Math.max(1, Math.min(1000, Number(q.pageSize) || 50)),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicaFiltros(query: any, q: LeadQuery) {
  let r = query.gte("created_at", q.from).lt("created_at", q.to);
  if (q.isca) r = r.eq("isca", q.isca);
  if (q.origem) r = q.origem === "direto" ? r.or("utm_source.is.null,utm_source.eq.") : r.eq("utm_source", q.origem);
  if (q.stage) r = r.eq("stage", q.stage);
  if (q.jornada) r = r.not(`${q.jornada}_at`, "is", null);
  if (q.search) {
    const digitos = q.search.replace(/\D/g, "");
    const partes = [`nome.ilike.*${q.search}*`];
    if (digitos.length >= 3) partes.push(`whatsapp.ilike.*${digitos}*`);
    r = r.or(partes.join(","));
  }
  return r;
}

function overviewVazio(from: string, to: string): Overview {
  const dias: Overview["por_dia"] = [];
  const fim = new Date(to).getTime();
  for (let t = new Date(from).getTime(); t < fim && dias.length < 400; t += 86400000) {
    const dia = new Date(t - 3 * 3600000).toISOString().slice(0, 10);
    if (!dias.some((d) => d.dia === dia)) dias.push({ dia, leads: 0, convite: 0 });
  }
  return { leads: 0, unicos: 0, conteudo: 0, pdf: 0, convite: 0, contato: 0, negociando: 0, clientes: 0, por_dia: dias, por_isca: [], por_origem: [], por_etapa: {} };
}

const boardVazio = (): Board => Object.fromEntries(STAGES.map((s) => [s.key, { rows: [], count: 0 }]));

function erro(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  if (!(await estaLogado())) return erro("Entre com a senha do painel.", 401);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro("JSON inválido", 400);
  }

  const acao = corpo.acao;
  const db = bancoAdmin();

  try {
    if (acao === "overview") {
      const from = dataValida(corpo.from, "2020-01-01T00:00:00Z");
      const to = dataValida(corpo.to, new Date().toISOString());
      if (!db) return NextResponse.json(overviewVazio(from, to));
      const { data, error } = await db.rpc("admin_overview", { p_from: from, p_to: to });
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (acao === "leads") {
      const q = normalizaQuery(corpo.q);
      if (!db) return NextResponse.json({ rows: [], count: 0 });
      const { data, error, count } = await aplicaFiltros(db.from("isca_leads").select("*", { count: "exact" }), q)
        .order(q.orderBy, { ascending: q.asc })
        .range(q.page! * q.pageSize!, q.page! * q.pageSize! + q.pageSize! - 1);
      if (error) throw error;
      return NextResponse.json({ rows: data ?? [], count: count ?? 0 });
    }

    if (acao === "pipeline") {
      const q = normalizaQuery(corpo.q);
      if (!db) return NextResponse.json(boardVazio());
      const colunas = await Promise.all(
        STAGES.map(async (s) => {
          const { data, error, count } = await aplicaFiltros(db.from("isca_leads").select("*", { count: "exact" }), { ...q, stage: s.key })
            .order("stage_changed_at", { ascending: false })
            .limit(60);
          if (error) throw error;
          return [s.key, { rows: data ?? [], count: count ?? 0 }] as const;
        }),
      );
      return NextResponse.json(Object.fromEntries(colunas));
    }

    const leadId = typeof corpo.leadId === "string" && UUID.test(corpo.leadId) ? corpo.leadId : null;

    if (acao === "events") {
      if (!db || !leadId) return NextResponse.json([]);
      const { data, error } = await db.from("lead_events").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    if (acao === "setStage") {
      const stage = typeof corpo.stage === "string" && STAGE_KEYS.includes(corpo.stage) ? corpo.stage : null;
      if (!leadId || !stage) return erro("Lead ou etapa inválidos", 400);
      if (!db) return erro("Supabase não configurado", 503);
      const { data: antes } = await db.from("isca_leads").select("stage").eq("id", leadId).maybeSingle();
      const { error } = await db.from("isca_leads").update({ stage }).eq("id", leadId);
      if (error) throw error;
      // Webhooks de "lead mudou de etapa", em segundo plano (o Pipeline não espera)
      const de = (antes?.stage as string | undefined) ?? "";
      if (de && de !== stage) after(() => avisarMudancaDeEtapa(leadId, de).catch(() => {}));
      return NextResponse.json({ ok: true });
    }

    if (acao === "addNote") {
      const texto = typeof corpo.text === "string" ? corpo.text.trim().slice(0, 2000) : "";
      if (!leadId || !texto) return erro("Nota vazia", 400);
      if (!db) return erro("Supabase não configurado", 503);
      const { error } = await db.from("lead_events").insert({ lead_id: leadId, type: "nota", data: { texto }, created_by: "painel" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return erro("Ação desconhecida", 400);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "erro no banco";
    return erro(msg);
  }
}

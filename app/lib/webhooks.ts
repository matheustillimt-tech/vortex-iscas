/**
 * Webhooks: manda os dados do lead pra outra ferramenta (n8n, Make, Zapier, seu CRM, sua
 * ferramenta de WhatsApp) quando algo acontece. Só roda no SERVIDOR.
 *
 * Eventos:
 *   lead.novo   → alguém preencheu o formulário de uma isca
 *   lead.etapa  → você moveu o lead de etapa no Pipeline (/admin)
 *   teste       → o botão "Enviar teste" do /admin → Webhooks
 *
 * Como o lead novo chega aqui (ver README, "Webhooks"):
 *   1. A página de captura grava o lead no Supabase e, logo depois, avisa /api/webhooks/lead-novo
 *      (navigator.sendBeacon, que sobrevive à troca de página). Se a captura foi pelo plano B
 *      (/api/lead), o próprio servidor avisa.
 *   2. Cada lead só é mandado UMA vez: o servidor "reserva" o lead (coluna webhook_avisado_at)
 *      antes de enviar. Se o aviso chegar duas vezes, o segundo não faz nada.
 *   3. Rede de segurança: a cada aviso (e quando você abre o /admin → Webhooks) o servidor procura
 *      leads das últimas 24 horas que ficaram sem aviso e manda também.
 *
 * Cada envio: POST com JSON, tempo limite de 5 s e 1 nova tentativa se der erro de rede, 429 ou 5xx.
 * Falha no webhook NUNCA impede a pessoa de receber o material (o envio acontece depois, em segundo plano).
 */
import { createHmac, randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bancoAdmin } from "./admin-servidor";

export const EVENTOS = [
  { key: "lead.novo", label: "Lead novo", hint: "Alguém preencheu o formulário de uma isca" },
  { key: "lead.etapa", label: "Lead mudou de etapa", hint: "Você moveu o lead no Pipeline" },
] as const;

export type Evento = (typeof EVENTOS)[number]["key"] | "teste";

export type Webhook = {
  id: string;
  criado_em: string;
  nome: string;
  url: string;
  eventos: string[];
  segredo: string | null;
  ativo: boolean;
};

export type ResultadoEntrega = { ok: boolean; http_status: number | null; erro: string | null; tentativas: number; duracao_ms: number };

type LeadDoBanco = {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  isca: string;
  stage: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

const TIMEOUT_MS = 5000;
const ESPERA_RETENTATIVA_MS = 1000;

/** URL aceita: http(s), sem espaço, até 500 caracteres. */
export function urlValida(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500 || /\s/.test(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Assinatura que vai no cabeçalho X-Webhook-Assinatura: "sha256=" + HMAC-SHA256(corpo, segredo) em hex. */
export function assinar(corpo: string, segredo: string) {
  return "sha256=" + createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");
}

/** O JSON que a outra ferramenta recebe. */
export function montarPayload(evento: Evento, lead: LeadDoBanco, extra: Record<string, unknown> = {}) {
  const digitos = lead.whatsapp.replace(/\D/g, "");
  return {
    evento,
    enviado_em: new Date().toISOString(),
    lead: {
      id: lead.id,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      link_whatsapp: digitos ? `https://wa.me/${digitos}` : null,
      isca: lead.isca,
      etapa: lead.stage,
      criado_em: lead.created_at,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      utm_content: lead.utm_content,
    },
    ...extra,
  };
}

/** Lead de mentira pro botão "Enviar teste". */
export function leadDeTeste(): LeadDoBanco {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    created_at: new Date().toISOString(),
    nome: "Lead de Teste",
    whatsapp: "+5511912345678",
    isca: "exemplo",
    stage: "novo",
    utm_source: "instagram",
    utm_medium: "reels",
    utm_campaign: "exemplo",
    utm_content: "teste",
  };
}

async function umaTentativa(url: string, corpo: string, cabecalhos: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "POST", headers: cabecalhos, body: corpo, signal: ctrl.signal, redirect: "follow", cache: "no-store" });
    // lê (e descarta) a resposta pra liberar a conexão
    await res.text().catch(() => "");
    return { status: res.status, erro: res.ok ? null : `A ferramenta respondeu ${res.status}` };
  } catch (e) {
    const abortou = e instanceof Error && e.name === "AbortError";
    return { status: null, erro: abortou ? "Demorou mais de 5 segundos pra responder" : "Não conectou no endereço (confira a URL)" };
  } finally {
    clearTimeout(timer);
  }
}

/** Manda o POST (com 1 retentativa) e devolve o resultado. Nunca lança erro. */
export async function entregar(url: string, segredo: string | null, evento: Evento, payload: unknown): Promise<ResultadoEntrega> {
  const inicio = Date.now();
  const corpo = JSON.stringify(payload);
  const cabecalhos: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "vortex-iscas-webhook/1.0",
    "X-Webhook-Evento": evento,
    "X-Webhook-Entrega": randomUUID(),
  };
  if (segredo) cabecalhos["X-Webhook-Assinatura"] = assinar(corpo, segredo);

  let r = await umaTentativa(url, corpo, cabecalhos);
  let tentativas = 1;
  const vale_repetir = r.status === null || r.status === 429 || r.status >= 500;
  if (vale_repetir) {
    await new Promise((ok) => setTimeout(ok, ESPERA_RETENTATIVA_MS));
    r = await umaTentativa(url, corpo, cabecalhos);
    tentativas = 2;
  }
  const ok = r.status !== null && r.status >= 200 && r.status < 300;
  return { ok, http_status: r.status, erro: ok ? null : r.erro, tentativas, duracao_ms: Date.now() - inicio };
}

/** Guarda a entrega no histórico (e apaga o que tiver mais de 30 dias). */
export async function registrarEntrega(db: SupabaseClient, w: { id: string | null; url: string }, evento: Evento, leadId: string | null, r: ResultadoEntrega) {
  try {
    await db.from("webhook_entregas").insert({
      webhook_id: w.id,
      evento,
      lead_id: leadId,
      url: w.url,
      ok: r.ok,
      http_status: r.http_status,
      erro: r.erro,
      tentativas: r.tentativas,
      duracao_ms: r.duracao_ms,
    });
    if (Math.random() < 0.05) {
      await db.from("webhook_entregas").delete().lt("criado_em", new Date(Date.now() - 30 * 86400000).toISOString());
    }
  } catch {
    // histórico é só conveniência: nunca derruba o envio
  }
}

async function webhooksAtivos(db: SupabaseClient, evento: Evento): Promise<Webhook[]> {
  const { data, error } = await db.from("webhooks").select("*").eq("ativo", true).contains("eventos", [evento]);
  if (error) return [];
  return (data ?? []) as Webhook[];
}

async function mandarPraTodos(db: SupabaseClient, hooks: Webhook[], evento: Evento, lead: LeadDoBanco, extra: Record<string, unknown> = {}) {
  const payload = montarPayload(evento, lead, extra);
  await Promise.all(
    hooks.map(async (w) => {
      const r = await entregar(w.url, w.segredo, evento, payload);
      await registrarEntrega(db, w, evento, lead.id, r);
    }),
  );
}

const CAMPOS_LEAD = "id, created_at, nome, whatsapp, isca, stage, utm_source, utm_medium, utm_campaign, utm_content";

/** "Reserva" o lead pra mandar uma vez só. Devolve o lead se ESTA chamada ganhou a vez. */
async function reservar(db: SupabaseClient, leadId: string, desde: string): Promise<LeadDoBanco | null> {
  const { data, error } = await db
    .from("isca_leads")
    .update({ webhook_avisado_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("webhook_avisado_at", null)
    .gte("created_at", desde)
    .select(CAMPOS_LEAD);
  if (error || !data?.length) return null;
  return data[0] as LeadDoBanco;
}

/**
 * Lead novo: manda pros webhooks de "lead.novo" e aproveita pra mandar quem ficou pra trás.
 * Pode ser chamado mais de uma vez pro mesmo lead sem problema.
 */
export async function avisarLeadNovo(leadId: string | null) {
  const db = bancoAdmin();
  if (!db) return;
  const hooks = await webhooksAtivos(db, "lead.novo");
  if (!hooks.length) return;

  // Só lead das últimas 24 h e criado depois do webhook mais antigo (não manda o histórico todo
  // de uma vez quando você cadastra o primeiro webhook).
  const t = (iso: string) => Date.parse(iso) || 0;
  const maisAntigo = Math.min(...hooks.map((w) => t(w.criado_em)));
  const desde = new Date(Math.max(maisAntigo, Date.now() - 86400000)).toISOString();
  const paraCada = (lead: LeadDoBanco) =>
    mandarPraTodos(db, hooks.filter((w) => t(w.criado_em) <= t(lead.created_at)), "lead.novo", lead);

  if (leadId) {
    const lead = await reservar(db, leadId, desde);
    if (lead) await paraCada(lead);
  }

  // Rede de segurança: quem ficou sem aviso há mais de 1 minuto (o aviso do navegador se perdeu)
  const umMinuto = new Date(Date.now() - 60000).toISOString();
  const { data: pendentes } = await db
    .from("isca_leads")
    .select("id")
    .is("webhook_avisado_at", null)
    .gte("created_at", desde)
    .lt("created_at", umMinuto)
    .order("created_at", { ascending: true })
    .limit(20);
  for (const p of pendentes ?? []) {
    const lead = await reservar(db, p.id as string, desde);
    if (lead) await paraCada(lead);
  }
}

/** Lead mudou de etapa no Pipeline. */
export async function avisarMudancaDeEtapa(leadId: string, etapaAnterior: string) {
  const db = bancoAdmin();
  if (!db) return;
  const hooks = await webhooksAtivos(db, "lead.etapa");
  if (!hooks.length) return;
  const { data } = await db.from("isca_leads").select(CAMPOS_LEAD).eq("id", leadId).maybeSingle();
  if (!data) return;
  await mandarPraTodos(db, hooks, "lead.etapa", data as LeadDoBanco, { etapa_anterior: etapaAnterior });
}

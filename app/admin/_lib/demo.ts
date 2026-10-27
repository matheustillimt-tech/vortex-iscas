"use client";

import { STAGES, type AdminApi, type Lead, type LeadEvent, type LeadQuery, type Stage } from "./types";

/**
 * Dados FALSOS pra você ver o CRM funcionando antes de ter leads de verdade.
 * Só existe rodando na sua máquina: `npm run dev` e abra /admin?demo=1 (pra sair: /admin?demo=0).
 */

let seed = 42;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

const NOMES = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Eduarda Alves", "Fernanda Costa", "Gabriela Nunes", "Igor Santos", "Isabela Martins", "João Pedro", "Karina Freitas", "Larissa Ribeiro", "Marina Prado", "Nicolas Teixeira", "Olívia Barros", "Paulo Vieira", "Renata Pinto", "Samuel Araújo", "Tatiane Moraes", "Vinícius Cardoso"];
const ISCAS = ["exemplo", "guia-de-prompts", "checklist-de-lancamento"];
const ORIGENS = ["instagram", "instagram", "instagram", "youtube", null];

let cache: { leads: Lead[]; events: LeadEvent[] } | null = null;

function gerar() {
  if (cache) return cache;
  const leads: Lead[] = [];
  const events: LeadEvent[] = [];
  let eid = 1;
  const agora = Date.now();
  for (let i = 0; i < 480; i++) {
    const created = agora - Math.floor(Math.pow(rand(), 1.4) * 45 * 86400000);
    const r = rand();
    const conteudo = r < 0.72 ? created + rand() * 600000 : null;
    const pdf = conteudo && rand() < 0.45 ? conteudo + rand() * 300000 : null;
    const convite = conteudo && rand() < 0.38 ? conteudo + rand() * 3600000 : null;
    let stage: Stage = convite ? "convite" : conteudo ? "consumiu" : "novo";
    if (convite) {
      const x = rand();
      stage = x < 0.25 ? "contato" : x < 0.4 ? "negociando" : x < 0.5 ? "cliente" : x < 0.58 ? "perdido" : "convite";
    }
    const nome = pick(NOMES);
    const origem = pick(ORIGENS);
    const lead: Lead = {
      id: `demo-${i}`,
      created_at: new Date(created).toISOString(),
      nome: `${nome}${i % 3 === 0 ? "" : " " + (i % 97)}`,
      whatsapp: `+55${31 + (i % 60)}9${String(80000000 + i * 137).slice(0, 4)}${String(1000 + i).slice(-4)}`,
      isca: pick(ISCAS),
      utm_source: origem,
      utm_medium: origem === "instagram" ? pick(["reels", "carrossel", "stories"]) : origem === "youtube" ? "descricao" : null,
      utm_campaign: "demo",
      utm_content: null,
      referrer: null,
      stage,
      stage_changed_at: new Date((convite ?? conteudo ?? created) + rand() * 86400000).toISOString(),
      conteudo_at: conteudo ? new Date(conteudo).toISOString() : null,
      pdf_at: pdf ? new Date(pdf).toISOString() : null,
      convite_at: convite ? new Date(convite).toISOString() : null,
      last_event_at: null,
    };
    leads.push(lead);
    const ev = (type: LeadEvent["type"], t: number, data: LeadEvent["data"] = {}, by: string | null = null) =>
      events.push({ id: eid++, lead_id: lead.id, type, data, created_at: new Date(t).toISOString(), created_by: by });
    ev("captura", created, { isca: lead.isca, utm_source: origem });
    if (conteudo) ev("abriu_conteudo", conteudo);
    if (pdf) ev("baixou_pdf", pdf);
    if (convite) ev("clicou_convite", convite);
    if (!["novo", "consumiu", "convite"].includes(stage)) ev("etapa", convite! + 7200000, { de: "convite", para: stage }, "painel");
  }
  cache = { leads, events };
  return cache;
}

function filtra(q: LeadQuery, ignoreStage = false) {
  const { leads } = gerar();
  const s = (q.search ?? "").toLowerCase();
  const digitos = s.replace(/\D/g, "");
  return leads.filter(
    (l) =>
      l.created_at >= q.from &&
      l.created_at < q.to &&
      (!q.isca || l.isca === q.isca) &&
      (!q.origem || (l.utm_source ?? "direto") === q.origem) &&
      (ignoreStage || !q.stage || l.stage === q.stage) &&
      (!q.jornada || l[`${q.jornada}_at` as const]) &&
      (!s || l.nome.toLowerCase().includes(s) || (digitos.length >= 3 && l.whatsapp.includes(digitos))),
  );
}

const dia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10);

export const demoApi: AdminApi = {
  async overview(from, to) {
    const l = filtra({ from, to });
    const dias: { dia: string; leads: number; convite: number }[] = [];
    for (let t = new Date(from).getTime(); t < new Date(to).getTime(); t += 86400000) {
      const d = dia(new Date(t).toISOString());
      if (dias.some((x) => x.dia === d)) continue;
      dias.push({
        dia: d,
        leads: l.filter((x) => dia(x.created_at) === d).length,
        convite: gerar().leads.filter((x) => x.convite_at && dia(x.convite_at) === d).length,
      });
    }
    const group = <K extends string>(key: (x: Lead) => K) => {
      const m = new Map<K, Lead[]>();
      l.forEach((x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]));
      return [...m.entries()];
    };
    return {
      leads: l.length,
      unicos: new Set(l.map((x) => x.whatsapp)).size,
      conteudo: l.filter((x) => x.conteudo_at).length,
      pdf: l.filter((x) => x.pdf_at).length,
      convite: l.filter((x) => x.convite_at).length,
      contato: l.filter((x) => ["contato", "negociando", "cliente"].includes(x.stage)).length,
      negociando: l.filter((x) => x.stage === "negociando").length,
      clientes: l.filter((x) => x.stage === "cliente").length,
      por_dia: dias,
      por_isca: group((x) => x.isca)
        .map(([isca, xs]) => ({ isca, leads: xs.length, conteudo: xs.filter((x) => x.conteudo_at).length, convite: xs.filter((x) => x.convite_at).length, clientes: xs.filter((x) => x.stage === "cliente").length }))
        .sort((a, b) => b.leads - a.leads),
      por_origem: group((x) => x.utm_source ?? "direto")
        .map(([origem, xs]) => ({ origem, leads: xs.length, convite: xs.filter((x) => x.convite_at).length }))
        .sort((a, b) => b.leads - a.leads),
      por_etapa: Object.fromEntries(STAGES.map((s) => [s.key, l.filter((x) => x.stage === s.key).length])),
    };
  },

  async leads(q) {
    const col = q.orderBy ?? "created_at";
    const rows = filtra(q).sort((a, b) => (a[col] < b[col] ? -1 : 1) * (q.asc ? 1 : -1));
    const size = q.pageSize ?? 50;
    const page = q.page ?? 0;
    return { rows: rows.slice(page * size, page * size + size).map((x) => ({ ...x })), count: rows.length };
  },

  async pipeline(q) {
    const l = filtra(q, true);
    return Object.fromEntries(
      STAGES.map((s) => {
        const rows = l.filter((x) => x.stage === s.key).sort((a, b) => (a.stage_changed_at < b.stage_changed_at ? 1 : -1));
        return [s.key, { rows: rows.slice(0, 60).map((x) => ({ ...x })), count: rows.length }];
      }),
    );
  },

  async events(leadId) {
    return gerar().events.filter((e) => e.lead_id === leadId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async setStage(leadId, stage) {
    const lead = gerar().leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    gerar().events.push({ id: Date.now(), lead_id: leadId, type: "etapa", data: { de: lead.stage, para: stage }, created_at: new Date().toISOString(), created_by: "painel" });
    lead.stage = stage;
    lead.stage_changed_at = new Date().toISOString();
  },

  async addNote(leadId, text) {
    gerar().events.push({ id: Date.now(), lead_id: leadId, type: "nota", data: { texto: text }, created_at: new Date().toISOString(), created_by: "painel" });
  },
};

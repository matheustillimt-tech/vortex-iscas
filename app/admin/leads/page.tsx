"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAdmin } from "../_components/admin-shell";
import { LeadDrawer } from "../_components/lead-drawer";
import { ErrorBox, JourneyDots, Loading, PageTitle, selectClass, StageBadge } from "../_components/ui";
import { useLoad } from "../_components/use-load";
import { csv, fmtData, fmtNum, fmtWhatsApp, linkWhatsApp, nomeIsca } from "../_lib/format";
import { STAGES, type Jornada, type Lead, type LeadQuery } from "../_lib/types";

const PAGE = 50;

const CHIPS: { key: "" | Jornada; label: string; color: string }[] = [
  { key: "", label: "Todos", color: "#8b8b8b" },
  { key: "conteudo", label: "Abriram o conteúdo", color: "#3b82f6" },
  { key: "pdf", label: "Baixaram o PDF", color: "#a855f7" },
  { key: "convite", label: "Clicaram no convite", color: "#22c55e" },
];

function LeadsInner() {
  const { api, range, periodo, refreshKey, demo } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [busca, setBusca] = useState("");
  const [isca, setIsca] = useState(params.get("isca") ?? "");
  const [origem, setOrigem] = useState("");
  const [stage, setStage] = useState("");
  const [jornada, setJornada] = useState<"" | Jornada>((params.get("jornada") as Jornada) ?? "");
  const [orderBy, setOrderBy] = useState<"created_at" | "nome">("created_at");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [aberto, setAberto] = useState<Lead | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBusca(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(0), [busca, isca, origem, stage, jornada, periodo, orderBy, asc]);

  const query: LeadQuery = useMemo(
    () => ({ ...range, search: busca, isca, origem, stage, jornada: jornada || undefined, orderBy, asc, page, pageSize: PAGE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodo, busca, isca, origem, stage, jornada, orderBy, asc, page, refreshKey],
  );

  const lista = useLoad(() => api.leads(query), [api, query]);
  const resumo = useLoad(() => api.overview(range.from, range.to), [api, periodo, refreshKey]);

  const contagem: Record<string, number> = {
    "": resumo.data?.leads ?? 0,
    conteudo: resumo.data?.conteudo ?? 0,
    pdf: resumo.data?.pdf ?? 0,
    convite: resumo.data?.convite ?? 0,
  };

  function ordenar(col: "created_at" | "nome") {
    if (orderBy === col) setAsc(!asc);
    else {
      setOrderBy(col);
      setAsc(col === "nome");
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      const todos: Lead[] = [];
      for (let p = 0; p < 200; p++) {
        const { rows } = await api.leads({ ...query, page: p, pageSize: 1000 });
        todos.push(...rows);
        if (rows.length < 1000) break;
      }
      const data = csv(
        todos.map((l) => ({
          nome: l.nome,
          whatsapp: l.whatsapp,
          entrada: fmtData(l.created_at),
          isca: l.isca,
          origem: l.utm_source ?? "direto",
          meio: l.utm_medium ?? "",
          campanha: l.utm_campaign ?? "",
          conteudo_utm: l.utm_content ?? "",
          etapa: STAGES.find((s) => s.key === l.stage)?.label ?? l.stage,
          abriu_conteudo: l.conteudo_at ? fmtData(l.conteudo_at) : "",
          baixou_pdf: l.pdf_at ? fmtData(l.pdf_at) : "",
          clicou_no_convite: l.convite_at ? fmtData(l.convite_at) : "",
        })),
      );
      const blob = new Blob(["﻿" + data], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExportando(false);
    }
  }

  function atualizarLead(l: Lead) {
    setAberto(l);
    lista.setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === l.id ? l : r)) } : d));
  }

  const iscas = resumo.data?.por_isca.map((i) => i.isca) ?? [];
  const origens = resumo.data?.por_origem.map((o) => o.origem) ?? [];
  const total = lista.data?.count ?? 0;

  const seta = (col: string) => (orderBy === col ? (asc ? " ↑" : " ↓") : "");

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle title="Leads" subtitle="Todo mundo que preencheu uma isca, com a jornada de cada um. Clique numa linha pra abrir o lead.">
        <button
          onClick={exportar}
          disabled={exportando || !total}
          className="flex items-center gap-2 rounded-lg border border-ad-line bg-ad-panel px-3 py-2 text-[13px] font-medium hover:bg-ad-panel-2 disabled:opacity-40"
        >
          {exportando ? "Exportando..." : `Exportar CSV (${fmtNum(total)})`}
        </button>
      </PageTitle>

      {/* Chips de jornada */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CHIPS.map((c) => {
          const ativo = jornada === c.key;
          return (
            <button
              key={c.key}
              onClick={() => {
                setJornada(c.key);
                router.replace(c.key ? `/admin/leads?jornada=${c.key}${demo ? "&demo=1" : ""}` : "/admin/leads");
              }}
              className={`min-w-[140px] shrink-0 rounded-xl border p-3 text-left transition-colors ${ativo ? "border-ad-accent bg-ad-accent/10" : "border-ad-line bg-ad-panel hover:bg-ad-panel-2"}`}
            >
              <p className="flex items-center gap-2 text-[12px] text-ad-muted">
                <span className="size-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </p>
              <p className="mt-1 text-[20px] font-bold">{fmtNum(contagem[c.key] ?? 0)}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ad-muted" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
            className="h-9 w-full rounded-lg border border-ad-line bg-ad-panel pl-9 pr-3 text-[13px] outline-none placeholder:text-ad-muted focus:border-ad-accent"
          />
        </div>
        <select value={isca} onChange={(e) => setIsca(e.target.value)} className={selectClass} aria-label="Isca">
          <option value="">Todas as iscas</option>
          {iscas.map((i) => (
            <option key={i} value={i}>
              {nomeIsca(i)}
            </option>
          ))}
        </select>
        <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={selectClass} aria-label="Origem">
          <option value="">Todas as origens</option>
          {origens.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectClass} aria-label="Etapa">
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {lista.error ? (
        <ErrorBox error={lista.error} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ad-line bg-ad-panel">
          <div className="flex items-center justify-between border-b border-ad-line px-4 py-3">
            <p className="text-[14px] font-semibold">
              Leads <span className="font-normal text-ad-muted">· {fmtNum(total)} no período · clique numa coluna pra ordenar</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="text-[12px] text-ad-muted">
                <tr className="border-b border-ad-line">
                  <th className="cursor-pointer px-4 py-2.5 font-medium hover:text-ad-text" onClick={() => ordenar("nome")}>
                    Nome{seta("nome")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">WhatsApp</th>
                  <th className={`cursor-pointer px-4 py-2.5 font-medium hover:text-ad-text ${orderBy === "created_at" ? "text-ad-accent" : ""}`} onClick={() => ordenar("created_at")}>
                    Entrada{seta("created_at")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">Isca</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Jornada</th>
                  <th className="px-4 py-2.5 font-medium">Etapa</th>
                </tr>
              </thead>
              <tbody>
                {lista.loading && !lista.data && (
                  <tr>
                    <td colSpan={7}>
                      <Loading />
                    </td>
                  </tr>
                )}
                {lista.data?.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-ad-muted">
                      Nenhum lead com esses filtros.
                    </td>
                  </tr>
                )}
                {lista.data?.rows.map((l) => (
                  <tr key={l.id} onClick={() => setAberto(l)} className={`cursor-pointer border-b border-ad-line/60 transition-colors hover:bg-ad-panel-2 ${lista.loading ? "opacity-60" : ""}`}>
                    <td className="max-w-[200px] truncate px-4 py-2.5 font-semibold">{l.nome}</td>
                    <td className="px-4 py-2.5">
                      <a href={linkWhatsApp(l.whatsapp)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="whitespace-nowrap text-green-400 hover:underline">
                        {fmtWhatsApp(l.whatsapp)}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{fmtData(l.created_at)}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-ad-text/80">{nomeIsca(l.isca)}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md border border-green-500/40 px-1.5 py-0.5 text-[11px] font-medium text-green-400">{l.utm_source ?? "direto"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <JourneyDots conteudo={l.conteudo_at} pdf={l.pdf_at} convite={l.convite_at} withLabel />
                    </td>
                    <td className="px-4 py-2.5">
                      <StageBadge stage={l.stage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > PAGE && (
            <div className="flex items-center justify-between border-t border-ad-line px-4 py-3 text-[13px]">
              <span className="text-ad-muted">
                {fmtNum(page * PAGE + 1)}–{fmtNum(Math.min(total, (page + 1) * PAGE))} de {fmtNum(total)}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-ad-line px-3 py-1.5 hover:bg-ad-panel-2 disabled:opacity-40">
                  Anterior
                </button>
                <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-ad-line px-3 py-1.5 hover:bg-ad-panel-2 disabled:opacity-40">
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <LeadDrawer lead={aberto} onClose={() => setAberto(null)} onChange={atualizarLead} />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeadsInner />
    </Suspense>
  );
}

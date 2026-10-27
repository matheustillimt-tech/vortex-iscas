"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../_components/admin-shell";
import { LeadDrawer } from "../_components/lead-drawer";
import { Avatar, ErrorBox, JourneyDots, Loading, PageTitle, selectClass } from "../_components/ui";
import { useLoad } from "../_components/use-load";
import { fmtNum, fmtWhatsApp, nomeIsca, tempoRelativo } from "../_lib/format";
import { STAGES, type Board, type Lead, type Stage } from "../_lib/types";

export default function PipelinePage() {
  const { api, range, periodo, refreshKey } = useAdmin();
  const [search, setSearch] = useState("");
  const [busca, setBusca] = useState("");
  const [isca, setIsca] = useState("");
  const [arrastando, setArrastando] = useState<Lead | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Lead | null>(null);
  const [erroMover, setErroMover] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBusca(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const board = useLoad(() => api.pipeline({ ...range, search: busca, isca }), [api, periodo, busca, isca, refreshKey]);
  const resumo = useLoad(() => api.overview(range.from, range.to), [api, periodo, refreshKey]);

  const total = board.data ? Object.values(board.data).reduce((a, c) => a + c.count, 0) : 0;

  function mover(lead: Lead, para: Stage) {
    if (!board.data || lead.stage === para) return;
    const de = lead.stage;
    const atualizado: Lead = { ...lead, stage: para, stage_changed_at: new Date().toISOString() };
    const aplicar = (b: Board, l: Lead, origem: string, destino: string): Board => ({
      ...b,
      [origem]: { rows: b[origem].rows.filter((r) => r.id !== l.id), count: b[origem].count - 1 },
      [destino]: { rows: [l, ...b[destino].rows], count: b[destino].count + 1 },
    });
    board.setData((b) => (b ? aplicar(b, atualizado, de, para) : b));
    setErroMover("");
    api.setStage(lead.id, para).catch(() => {
      board.setData((b) => (b ? aplicar(b, lead, para, de) : b));
      setErroMover(`Não deu pra mover ${lead.nome}. Tenta de novo.`);
    });
  }

  function atualizarDoDrawer(l: Lead) {
    const antigo = board.data && Object.values(board.data).flatMap((c) => c.rows).find((r) => r.id === l.id);
    if (antigo && antigo.stage !== l.stage) {
      board.setData((b) =>
        b
          ? {
              ...b,
              [antigo.stage]: { rows: b[antigo.stage].rows.filter((r) => r.id !== l.id), count: b[antigo.stage].count - 1 },
              [l.stage]: { rows: [l, ...b[l.stage].rows], count: b[l.stage].count + 1 },
            }
          : b,
      );
    }
    setAberto(l);
  }

  return (
    <div>
      <PageTitle
        title="Pipeline"
        subtitle={
          <>
            Arraste o cartão pra mudar a etapa. Clique pra abrir o lead. O período filtra por <b className="text-ad-text">quando o lead entrou</b>. As 3 primeiras etapas andam sozinhas.
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-ad-line bg-ad-panel px-3 py-2 text-[13px] font-semibold">{fmtNum(total)} leads</span>
        <select value={isca} onChange={(e) => setIsca(e.target.value)} className={selectClass} aria-label="Isca">
          <option value="">Todas as iscas</option>
          {(resumo.data?.por_isca ?? []).map((i) => (
            <option key={i.isca} value={i.isca}>
              {nomeIsca(i.isca)}
            </option>
          ))}
        </select>
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ad-muted" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="h-9 w-full rounded-lg border border-ad-line bg-ad-panel pl-9 pr-3 text-[13px] outline-none placeholder:text-ad-muted focus:border-ad-accent"
          />
        </div>
        {erroMover && <span className="text-[13px] text-red-400">{erroMover}</span>}
      </div>

      {board.error ? (
        <ErrorBox error={board.error} />
      ) : !board.data ? (
        <Loading />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
          <div className="flex gap-3">
            {STAGES.map((s) => {
              const col = board.data![s.key];
              const destacado = sobre === s.key && arrastando && arrastando.stage !== s.key;
              return (
                <section
                  key={s.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setSobre(s.key);
                  }}
                  onDragLeave={() => setSobre((x) => (x === s.key ? null : x))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (arrastando) mover(arrastando, s.key);
                    setArrastando(null);
                    setSobre(null);
                  }}
                  className={`flex max-h-[calc(100vh-230px)] w-[280px] shrink-0 flex-col rounded-2xl border bg-ad-panel transition-colors ${destacado ? "border-ad-accent" : "border-ad-line"}`}
                >
                  <header className="flex items-center justify-between px-4 py-3">
                    <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </h2>
                    <span className="text-[12px] text-ad-muted">{fmtNum(col.count)}</span>
                  </header>
                  <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                    {col.rows.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-ad-muted">{s.hint}</p>}
                    {col.rows.map((l) => (
                      <article
                        key={l.id}
                        draggable
                        onDragStart={(e) => {
                          setArrastando(l);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setArrastando(null);
                          setSobre(null);
                        }}
                        onClick={() => setAberto(l)}
                        className={`cursor-grab rounded-xl border border-ad-line bg-ad-panel-2 p-3 transition-colors hover:border-ad-muted/50 active:cursor-grabbing ${arrastando?.id === l.id ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar nome={l.nome} size={30} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{l.nome}</p>
                            <p className="truncate text-[12px] text-ad-muted">{fmtWhatsApp(l.whatsapp)}</p>
                          </div>
                          {l.convite_at && s.key !== "convite" && <span className="size-2 shrink-0 rounded-full bg-green-500" title="Clicou no convite" />}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="truncate rounded-md bg-ad-panel px-1.5 py-0.5 text-[11px] text-ad-muted">{nomeIsca(l.isca)}</span>
                          <span className="flex shrink-0 items-center gap-2 text-[11px] text-ad-muted">
                            <JourneyDots conteudo={l.conteudo_at} pdf={l.pdf_at} convite={l.convite_at} />
                            {tempoRelativo(l.stage_changed_at)}
                          </span>
                        </div>
                      </article>
                    ))}
                    {col.count > col.rows.length && (
                      <p className="px-2 py-2 text-center text-[11px] text-ad-muted">
                        mostrando {col.rows.length} de {fmtNum(col.count)} · use a busca
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <LeadDrawer lead={aberto} onClose={() => setAberto(null)} onChange={atualizarDoDrawer} />
    </div>
  );
}

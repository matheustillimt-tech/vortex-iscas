"use client";

import { useEffect, useState } from "react";
import { fmtData, fmtWhatsApp, linkWhatsApp, nomeIsca } from "../_lib/format";
import { STAGES, stageInfo, type Lead, type LeadEvent, type Stage } from "../_lib/types";
import { useAdmin } from "./admin-shell";
import { Avatar } from "./ui";
import { useLoad } from "./use-load";

const EVENTO: Record<LeadEvent["type"], { label: string; color: string }> = {
  captura: { label: "Preencheu o formulário", color: "#8b8b8b" },
  abriu_conteudo: { label: "Abriu o conteúdo", color: "#3b82f6" },
  baixou_pdf: { label: "Baixou o PDF", color: "#a855f7" },
  clicou_convite: { label: "Clicou no convite", color: "#22c55e" },
  etapa: { label: "Mudou de etapa", color: "#f97316" },
  nota: { label: "Nota", color: "#eab308" },
};

export function LeadDrawer({ lead, onClose, onChange }: { lead: Lead | null; onClose: () => void; onChange: (lead: Lead) => void }) {
  const { api } = useAdmin();
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);
  const eventos = useLoad(() => (lead ? api.events(lead.id) : Promise.resolve([])), [lead?.id, versao, api]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!lead) return null;

  async function mudarEtapa(stage: Stage) {
    if (!lead || stage === lead.stage) return;
    await api.setStage(lead.id, stage);
    onChange({ ...lead, stage, stage_changed_at: new Date().toISOString() });
    setVersao((v) => v + 1);
  }

  async function salvarNota() {
    if (!lead || !nota.trim()) return;
    setSalvando(true);
    await api.addNote(lead.id, nota.trim());
    setNota("");
    setSalvando(false);
    setVersao((v) => v + 1);
  }

  const passos = [
    { label: "Preencheu o formulário", at: lead.created_at, color: "#8b8b8b" },
    { label: "Abriu o conteúdo", at: lead.conteudo_at, color: "#3b82f6" },
    { label: "Baixou o PDF", at: lead.pdf_at, color: "#a855f7" },
    { label: "Clicou no convite", at: lead.convite_at, color: "#22c55e" },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-ad-line bg-ad-bg shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-ad-line p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar nome={lead.nome} size={44} />
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-bold">{lead.nome}</h2>
              <p className="text-[13px] text-ad-muted">Entrou {fmtData(lead.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ad-muted hover:bg-ad-panel-2 hover:text-ad-text" aria-label="Fechar">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Contato */}
          <a href={linkWhatsApp(lead.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 text-[14px] font-semibold text-white hover:bg-green-500">
            Chamar no WhatsApp
          </a>
          <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-[13px]">
            <dt className="text-ad-muted">WhatsApp</dt>
            <dd className="select-all">{fmtWhatsApp(lead.whatsapp)}</dd>
            <dt className="text-ad-muted">Isca</dt>
            <dd>{nomeIsca(lead.isca)}</dd>
            <dt className="text-ad-muted">Origem</dt>
            <dd>{[lead.utm_source ?? "direto", lead.utm_medium, lead.utm_campaign, lead.utm_content].filter(Boolean).join(" · ")}</dd>
          </dl>

          {/* Etapa */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-ad-muted">Etapa</h3>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => {
                const ativo = s.key === lead.stage;
                return (
                  <button
                    key={s.key}
                    onClick={() => mudarEtapa(s.key)}
                    className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors"
                    style={ativo ? { borderColor: s.color, color: s.color, background: `${s.color}1f` } : { borderColor: "#232323", color: "#8b8b8b" }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jornada */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-ad-muted">Jornada</h3>
            <ol className="space-y-2">
              {passos.map((p) => (
                <li key={p.label} className="flex items-center gap-3 text-[14px]">
                  <span className="flex size-5 items-center justify-center rounded-full border" style={p.at ? { background: p.color, borderColor: p.color } : { borderColor: "#333" }}>
                    {p.at && (
                      <svg viewBox="0 0 24 24" className="size-3 text-black" fill="none" stroke="currentColor" strokeWidth={3.5}>
                        <path d="M5 12l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={p.at ? "" : "text-ad-muted"}>{p.label}</span>
                  <span className="ml-auto text-[12px] text-ad-muted">{p.at ? fmtData(p.at) : "ainda não"}</span>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-ad-muted">&quot;Clicou no convite&quot; = tocou no botão do convite no fim do material.</p>
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-ad-muted">Adicionar nota</h3>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Ex: chamei no WhatsApp, pediu pra retornar sexta"
              className="w-full resize-none rounded-lg border border-ad-line bg-ad-panel p-3 text-[14px] outline-none placeholder:text-ad-muted focus:border-ad-accent"
            />
            <button onClick={salvarNota} disabled={salvando || !nota.trim()} className="rounded-lg bg-ad-accent px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-40">
              {salvando ? "Salvando..." : "Salvar nota"}
            </button>
          </div>

          {/* Linha do tempo */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-ad-muted">Linha do tempo</h3>
            <ol className="relative space-y-4 border-l border-ad-line pl-5">
              {(eventos.data ?? []).map((ev) => {
                const info = EVENTO[ev.type];
                const detalhe =
                  ev.type === "etapa"
                    ? `${stageInfo(ev.data.de ?? "").label} → ${stageInfo(ev.data.para ?? "").label}`
                    : ev.type === "nota"
                      ? ev.data.texto
                      : ev.type === "captura"
                        ? nomeIsca(ev.data.isca ?? lead.isca)
                        : null;
                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-ad-bg" style={{ background: info.color }} />
                    <p className="text-[14px] font-medium">{info.label}</p>
                    {detalhe && <p className="whitespace-pre-line text-[13px] text-ad-text/80">{detalhe}</p>}
                    <p className="text-[12px] text-ad-muted">
                      {fmtData(ev.created_at)}
                      {ev.created_by ? ` · ${ev.created_by}` : ev.type === "etapa" ? " · automático" : ""}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { stageInfo } from "../_lib/types";

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-ad-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, subtitle, children, className = "", right }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-ad-line bg-ad-panel p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="text-[12px] text-ad-muted">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const s = stageInfo(stage);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px] font-medium" style={{ borderColor: `${s.color}55`, color: s.color, background: `${s.color}14` }}>
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function Avatar({ nome, size = 32 }: { nome: string; size?: number }) {
  const p = nome.trim().split(/\s+/);
  const ini = ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : p[0]?.[1] ?? "")).toUpperCase();
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-ad-panel-2 text-[11px] font-semibold text-ad-muted ring-1 ring-ad-line" style={{ width: size, height: size }}>
      {ini}
    </span>
  );
}

/** Três bolinhas da jornada: material, PDF, convite. */
export function JourneyDots({ conteudo, pdf, convite, withLabel }: { conteudo: string | null; pdf: string | null; convite: string | null; withLabel?: boolean }) {
  const itens = [
    { on: !!conteudo, label: "Conteúdo", color: "#3b82f6" },
    { on: !!pdf, label: "PDF", color: "#a855f7" },
    { on: !!convite, label: "Convite", color: "#22c55e" },
  ];
  const ultimo = convite ? "Clicou no convite" : pdf ? "Baixou PDF" : conteudo ? "Abriu conteúdo" : "Só cadastro";
  return (
    <span className="inline-flex items-center gap-2" title={itens.map((i) => `${i.label}: ${i.on ? "sim" : "não"}`).join(" · ")}>
      <span className="inline-flex items-center gap-1">
        {itens.map((i) => (
          <span key={i.label} className="size-2 rounded-full" style={{ background: i.on ? i.color : "#2e2e2e" }} />
        ))}
      </span>
      {withLabel && <span className={`whitespace-nowrap text-[12px] ${convite ? "text-green-400" : "text-ad-muted"}`}>{ultimo}</span>}
    </span>
  );
}

export function Loading() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-ad-line border-t-ad-accent" />
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: string }).message) : String(error);
  return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[14px] text-red-300">Erro ao carregar: {msg}</div>;
}

export const selectClass =
  "h-9 rounded-lg border border-ad-line bg-ad-panel px-2.5 text-[13px] text-ad-text outline-none focus:border-ad-accent";

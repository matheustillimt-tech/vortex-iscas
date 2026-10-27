"use client";

import Link from "next/link";
import { useAdmin } from "./_components/admin-shell";
import { ErrorBox, Loading, PageTitle, Panel } from "./_components/ui";
import { useLoad } from "./_components/use-load";
import { fmtDia, fmtNum, nomeIsca, pct, PERIODOS } from "./_lib/format";

function Kpi({ label, value, hint, href, icon }: { label: string; value: number; hint: string; href?: string; icon: string }) {
  const body = (
    <div className="h-full rounded-2xl border border-ad-line bg-ad-panel p-4 transition-colors hover:border-ad-accent/40">
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-ad-muted">{label}</p>
        <svg viewBox="0 0 24 24" className="size-4 text-ad-muted" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <p className="mt-1 text-[30px] font-bold tracking-tight">{fmtNum(value)}</p>
      <p className="text-[12px] text-ad-muted">{hint}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function BarRow({ values, color, max }: { values: { label: string; v: number }[]; color: string; max: number }) {
  return (
    <div className="flex h-16 items-end gap-[3px]">
      {values.map((x) => (
        <div key={x.label} className="group relative flex h-full flex-1 items-end" title={`${x.label}: ${x.v}`}>
          <div className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-80" style={{ height: `${max ? Math.max(x.v ? 6 : 2, (x.v / max) * 100) : 2}%`, background: x.v ? color : "#1f1f1f" }} />
        </div>
      ))}
    </div>
  );
}

function HBar({ label, value, total, color, extra }: { label: string; value: number; total: number; color: string; extra?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-semibold">
          {fmtNum(value)}
          {extra && <span className="ml-2 text-[12px] font-normal text-ad-muted">{extra}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ad-panel-2">
        <div className="h-full rounded-full" style={{ width: `${total ? (value / total) * 100 : 0}%`, background: color }} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { api, range, periodo, refreshKey } = useAdmin();
  const { data, error, loading } = useLoad(() => api.overview(range.from, range.to), [api, periodo, refreshKey]);
  const periodoLabel = PERIODOS.find((p) => p.key === periodo)?.label.toLowerCase();

  if (error) return <ErrorBox error={error} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const dias = data.por_dia;
  const maxLeads = Math.max(...dias.map((d) => d.leads), 0);
  const maxConvite = Math.max(...dias.map((d) => d.convite), 0);
  const ticks = dias.filter((_, i) => i % Math.max(1, Math.ceil(dias.length / 8)) === 0);

  const funil = [
    { label: "Preencheram o formulário", v: data.leads, color: "#8b8b8b" },
    { label: "Abriram o conteúdo", v: data.conteudo, color: "#3b82f6" },
    { label: "Baixaram o PDF", v: data.pdf, color: "#a855f7" },
    { label: "Clicaram no convite", v: data.convite, color: "#22c55e" },
    { label: "Em contato ou negociando", v: data.contato, color: "#eab308" },
    { label: "Viraram cliente", v: data.clientes, color: "#f97316" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Visão geral" subtitle={`Captação por isca · material → convite → venda · ${periodoLabel}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Leads únicos" value={data.unicos} hint="pessoas distintas no período" icon="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" href="/admin/leads" />
        <Kpi label="Cadastros em iscas" value={data.leads} hint={`${data.por_isca.length} iscas com lead`} icon="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" href="/admin/leads" />
        <Kpi label="Consumiram" value={data.conteudo} hint={`${pct(data.conteudo, data.leads)} abriram o material`} icon="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
        <Kpi label="Clicaram no convite" value={data.convite} hint={`${pct(data.convite, data.leads)} dos leads · ver lista →`} icon="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" href="/admin/leads?jornada=convite" />
        <Kpi label="Clientes" value={data.clientes} hint={`${fmtNum(data.negociando)} negociando · pipeline →`} icon="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h7.7a2 2 0 0 0 2-1.6L21 8H6" href="/admin/pipeline" />
      </div>

      <Panel className="mt-4" title="Leads por dia" subtitle={`novos por dia · ${periodoLabel} · passe o mouse numa barra pra ver o número`}>
        <div className="mb-4 flex flex-wrap gap-4 text-[13px]">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-500" /> Cadastros <b>{fmtNum(data.leads)}</b>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-green-500" /> Clicaram no convite <b>{fmtNum(dias.reduce((a, d) => a + d.convite, 0))}</b>
          </span>
          <span className="ml-auto text-[11px] text-ad-muted">cada linha tem escala própria</span>
        </div>
        <div className="space-y-2">
          <BarRow values={dias.map((d) => ({ label: fmtDia(d.dia), v: d.leads }))} color="#3b82f6" max={maxLeads} />
          <BarRow values={dias.map((d) => ({ label: fmtDia(d.dia), v: d.convite }))} color="#22c55e" max={maxConvite} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ad-muted">
          {ticks.map((d) => (
            <span key={d.dia}>{fmtDia(d.dia)}</span>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="De onde vêm os leads" subtitle="utm_source do link · cadastros no período">
          <div className="space-y-4">
            {data.por_origem.length === 0 && <p className="text-[14px] text-ad-muted">Nenhum lead no período.</p>}
            {data.por_origem.map((o) => (
              <HBar key={o.origem} label={o.origem} value={o.leads} total={data.leads} color="#22c55e" extra={`${pct(o.convite, o.leads)} clicaram no convite`} />
            ))}
          </div>
        </Panel>

        <Panel title="Leads por isca" subtitle="qual material mais trouxe gente e quanto dela clicou no convite">
          <div className="space-y-4">
            {data.por_isca.length === 0 && <p className="text-[14px] text-ad-muted">Nenhum lead no período.</p>}
            {data.por_isca.map((i) => (
              <Link key={i.isca} href={`/admin/leads?isca=${encodeURIComponent(i.isca)}`} className="block">
                <HBar label={nomeIsca(i.isca)} value={i.leads} total={Math.max(...data.por_isca.map((x) => x.leads))} color="#3b82f6" extra={`${pct(i.convite, i.leads)} convite`} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Funil da jornada" subtitle="dos leads que entraram no período, quantos chegaram em cada passo">
          <div className="space-y-3">
            {funil.map((f, i) => (
              <div key={f.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                <span className="text-[14px]">{f.label}</span>
                <span className="text-[14px] font-semibold">
                  {fmtNum(f.v)} <span className="text-[12px] font-normal text-ad-muted">{i === 0 ? "" : pct(f.v, data.leads)}</span>
                </span>
                <div className="col-span-2 h-2 rounded-full bg-ad-panel-2">
                  <div className="h-full rounded-full" style={{ width: `${data.leads ? (f.v / data.leads) * 100 : 0}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pipeline agora" subtitle="leads do período por etapa">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                ["novo", "Novo lead", "#8b8b8b"],
                ["consumiu", "Consumiu", "#3b82f6"],
                ["convite", "Clicou no convite", "#22c55e"],
                ["contato", "Em contato", "#eab308"],
                ["negociando", "Negociando", "#ec4899"],
                ["cliente", "Cliente", "#f97316"],
              ] as const
            ).map(([k, label, color]) => (
              <Link key={k} href="/admin/pipeline" className="rounded-xl border border-ad-line bg-ad-panel-2 p-3 hover:border-ad-accent/40">
                <p className="flex items-center gap-2 text-[12px] text-ad-muted">
                  <span className="size-2 rounded-full" style={{ background: color }} />
                  {label}
                </p>
                <p className="mt-1 text-[22px] font-bold">{fmtNum(data.por_etapa[k] ?? 0)}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

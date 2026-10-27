"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_PERMITIDO, getApi } from "../_lib/api";
import { intervalo, PERIODOS, type Periodo } from "../_lib/format";
import type { AdminApi } from "../_lib/types";

type Ctx = {
  api: AdminApi;
  demo: boolean;
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
  range: { from: string; to: string };
  refreshKey: number;
  refresh: () => void;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin fora do AdminShell");
  return ctx;
}

const NAV = [
  { href: "/admin", label: "Visão geral", icon: "M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75" },
  { href: "/admin/pipeline", label: "Pipeline", icon: "M4 4h4v16H4zM10 4h4v11h-4zM16 4h4v7h-4z" },
  { href: "/admin/webhooks", label: "Webhooks", icon: "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2M6 17l3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06M12 6l3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" },
];

export function Icon({ d, className = "size-[18px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/avatar.jpg" alt="" className="size-7 rounded-full object-cover ring-1 ring-ad-line" />
      <span className="text-[15px] font-bold tracking-tight">CRM de leads</span>
    </div>
  );
}

type Sessao = { logado: boolean; senhaConfigurada: boolean; bancoConfigurado: boolean };

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const isLogin = pathname === "/admin/login";

  const [demoState, setDemo] = useState<boolean | null>(null);
  const demo = demoState === true;
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [periodo, setPeriodoState] = useState<Periodo>("30");
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    document.body.style.background = "#0a0a0a";
    try {
      const p = localStorage.getItem("admin_periodo") as Periodo | null;
      if (p && PERIODOS.some((x) => x.key === p)) setPeriodoState(p);
    } catch {}
    return () => {
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    if (!DEMO_PERMITIDO) {
      setDemo(false);
      return;
    }
    try {
      if (params.get("demo") === "1") sessionStorage.setItem("admin_demo", "1");
      if (params.get("demo") === "0") sessionStorage.removeItem("admin_demo");
      setDemo(sessionStorage.getItem("admin_demo") === "1");
    } catch {
      setDemo(params.get("demo") === "1");
    }
  }, [params]);

  useEffect(() => {
    if (demoState === null) return;
    if (demo) {
      setSessao({ logado: true, senhaConfigurada: true, bancoConfigurado: true });
      return;
    }
    let ativo = true;
    fetch("/api/admin/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Sessao) => ativo && setSessao(s))
      .catch(() => ativo && setSessao({ logado: false, senhaConfigurada: true, bancoConfigurado: false }));
    return () => {
      ativo = false;
    };
  }, [demoState, demo, pathname]);

  const logado = !!sessao?.logado;

  useEffect(() => {
    if (!sessao) return;
    if (!logado && !isLogin) router.replace("/admin/login");
    if (logado && isLogin) router.replace("/admin");
  }, [sessao, logado, isLogin, router]);

  const setPeriodo = useCallback((p: Periodo) => {
    setPeriodoState(p);
    try {
      localStorage.setItem("admin_periodo", p);
    } catch {}
  }, []);

  const ctx = useMemo<Ctx>(
    () => ({
      api: getApi(demo),
      demo,
      periodo,
      setPeriodo,
      range: intervalo(periodo),
      refreshKey,
      refresh: () => setRefreshKey((k) => k + 1),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo, periodo, refreshKey],
  );

  async function sair() {
    try {
      sessionStorage.removeItem("admin_demo");
    } catch {}
    if (!demo) await fetch("/api/admin/sessao", { method: "DELETE" }).catch(() => {});
    setDemo(false);
    setSessao((s) => (s ? { ...s, logado: false } : s));
    router.replace("/admin/login");
  }

  if (isLogin) {
    return <div className="min-h-screen bg-ad-bg text-ad-text">{logado ? null : children}</div>;
  }

  if (!logado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ad-bg px-4 text-ad-text">
        <div className="size-6 animate-spin rounded-full border-2 border-ad-line border-t-ad-accent" />
      </div>
    );
  }

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const ativo = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuAberto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
              ativo ? "bg-ad-accent/15 text-ad-accent" : "text-ad-text/80 hover:bg-ad-panel-2 hover:text-ad-text"
            }`}
          >
            <Icon d={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="min-h-screen bg-ad-bg text-ad-text">
        {/* Menu lateral (computador) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ad-line bg-ad-bg md:flex">
          <div className="flex h-14 items-center border-b border-ad-line px-5">
            <Logo />
          </div>
          <div className="flex-1 p-3">{nav}</div>
          <div className="space-y-2 border-t border-ad-line p-3">
            {demo && <p className="px-3 text-[12px] text-ad-muted">Modo demonstração</p>}
            <button onClick={sair} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-ad-text/80 hover:bg-ad-panel-2">
              <Icon d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              Sair
            </button>
          </div>
        </aside>

        {/* Menu do celular */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuAberto(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-y-0 left-0 w-64 space-y-4 border-r border-ad-line bg-ad-bg p-4" onClick={(e) => e.stopPropagation()}>
              <Logo />
              {nav}
              <button onClick={sair} className="w-full rounded-lg px-3 py-2 text-left text-[14px] text-ad-text/80 hover:bg-ad-panel-2">
                Sair
              </button>
            </div>
          </div>
        )}

        <div className="md:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-ad-line bg-ad-bg/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <button onClick={() => setMenuAberto(true)} className="rounded-lg p-2 hover:bg-ad-panel-2 md:hidden" aria-label="Abrir menu">
                <Icon d="M4 6h16M4 12h16M4 18h16" />
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-ad-line bg-ad-panel px-2.5 py-1.5">
                <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" className="size-4 text-ad-muted" />
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="bg-transparent text-[13px] font-medium outline-none" aria-label="Período">
                  {PERIODOS.map((p) => (
                    <option key={p.key} value={p.key} className="bg-ad-panel">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              {demo && <span className="rounded-md bg-ad-accent/15 px-2 py-1 text-[11px] font-semibold text-ad-accent">DEMO</span>}
            </div>
            <button
              onClick={ctx.refresh}
              className="flex items-center gap-2 rounded-lg border border-ad-line bg-ad-panel px-2.5 py-1.5 text-[13px] font-medium hover:bg-ad-panel-2 sm:px-3"
              aria-label="Atualizar"
            >
              <Icon d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" className="size-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </header>
          <main className="px-4 py-6 md:px-8 md:py-8">
            {!demo && sessao && !sessao.bancoConfigurado && (
              <div className="mx-auto mb-6 max-w-6xl rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-[14px] leading-relaxed text-yellow-200">
                <b>O banco ainda não está conectado</b>, então o painel aparece vazio. Preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code> (e na Vercel) e aplique o banco (<code>supabase db push</code>) no Supabase.
                {DEMO_PERMITIDO && (
                  <>
                    {" "}
                    Quer ver o painel com dados de mentira?{" "}
                    <a href="/admin?demo=1" className="font-semibold underline">
                      Abrir a demonstração
                    </a>
                    .
                  </>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ad-bg" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

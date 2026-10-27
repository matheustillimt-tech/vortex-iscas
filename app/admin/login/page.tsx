"use client";

import { useEffect, useState } from "react";
import { Logo } from "../_components/admin-shell";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [semSenha, setSemSenha] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => setSemSenha(!s.senhaConfigurada))
      .catch(() => {});
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const res = await fetch("/api/admin/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    }).catch(() => null);
    setEnviando(false);
    if (!res) return setErro("Sem conexão. Tenta de novo.");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setErro(body.error ?? "Não deu pra entrar.");
    }
    window.location.href = "/admin";
  }

  const input =
    "h-11 w-full rounded-lg border border-ad-line bg-ad-panel px-3.5 text-[15px] text-ad-text outline-none placeholder:text-ad-muted focus:border-ad-accent";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <Logo />
        <div className="space-y-5 rounded-2xl border border-ad-line bg-ad-panel p-6">
          {semSenha ? (
            <div className="space-y-2">
              <h1 className="text-[20px] font-bold">Painel trancado</h1>
              <p className="text-[14px] leading-relaxed text-ad-muted">
                Pra liberar, crie uma senha: preencha <code className="text-ad-text">ADMIN_SENHA</code> no arquivo{" "}
                <code className="text-ad-text">.env.local</code> (e em Settings → Environment Variables, na Vercel) e reinicie o site.
              </p>
            </div>
          ) : (
            <form onSubmit={entrar} className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-[20px] font-bold">Entrar</h1>
                <p className="text-[14px] text-ad-muted">Digite a senha do painel (a ADMIN_SENHA que você definiu).</p>
              </div>
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={input}
              />
              {erro && <p className="text-[13px] text-red-400">{erro}</p>}
              <button
                disabled={enviando || !senha}
                className="h-11 w-full rounded-lg bg-ad-accent text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {enviando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

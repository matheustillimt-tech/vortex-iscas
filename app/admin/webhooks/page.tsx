"use client";

import { useState } from "react";
import { useAdmin } from "../_components/admin-shell";
import { ErrorBox, Loading, PageTitle, Panel } from "../_components/ui";
import { useLoad } from "../_components/use-load";
import { SessaoExpirada } from "../_lib/api";
import { tempoRelativo } from "../_lib/format";

/**
 * Webhooks: a cada lead novo (ou mudança de etapa no Pipeline), o servidor manda um POST com os
 * dados do lead pras URLs cadastradas aqui. Tudo passa por /api/admin/webhooks (sessão + service_role).
 */

const EVENTOS = [
  { key: "lead.novo", label: "Lead novo", hint: "Alguém preencheu o formulário de uma isca" },
  { key: "lead.etapa", label: "Lead mudou de etapa", hint: "Você moveu o lead no Pipeline" },
];

type WebhookTela = {
  id: string;
  criado_em: string;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  tem_segredo: boolean;
  segredo_fim: string | null;
};

type Entrega = {
  id: number;
  criado_em: string;
  webhook_id: string | null;
  evento: string;
  url: string | null;
  ok: boolean;
  http_status: number | null;
  erro: string | null;
  tentativas: number;
  duracao_ms: number | null;
};

type Lista = { bancoConfigurado: boolean; webhooks: WebhookTela[]; entregas: Entrega[] };
type ResultadoTeste = { ok: boolean; http_status: number | null; erro: string | null; tentativas: number; duracao_ms: number; assinado: boolean };

async function chamar<T>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, ...dados }),
    cache: "no-store",
  });
  if (res.status === 401) throw new SessaoExpirada();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `erro ${res.status}`);
  return body as T;
}

function gerarSegredo() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function encurtar(url: string, max = 60) {
  return url.length > max ? url.slice(0, max - 1) + "…" : url;
}

const inputClass = "h-10 w-full rounded-lg border border-ad-line bg-ad-bg px-3 text-[14px] text-ad-text outline-none placeholder:text-ad-muted/60 focus:border-ad-accent";
const botao = "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50";
const botaoPrincipal = `${botao} bg-ad-accent text-black hover:opacity-90`;
const botaoSecundario = `${botao} border border-ad-line bg-ad-panel hover:bg-ad-panel-2`;

const FORM_VAZIO = { id: null as string | null, nome: "", url: "", eventos: ["lead.novo"], segredo: "", ativo: true, temSegredo: false };

function CaixaResultado({ r }: { r: ResultadoTeste | { erro: string } }) {
  if (!("tentativas" in r)) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{r.erro}</div>;
  }
  return r.ok ? (
    <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-[13px] text-green-300">
      Chegou! A ferramenta respondeu <b>{r.http_status}</b> em {r.duracao_ms} ms{r.assinado ? ", com assinatura" : ""}.
    </div>
  ) : (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
      Não chegou: {r.erro}
      {r.tentativas > 1 ? " (tentei 2 vezes)" : ""}.
    </div>
  );
}

export default function WebhooksPage() {
  const { demo, refreshKey } = useAdmin();
  const [versao, setVersao] = useState(0);
  const lista = useLoad(() => (demo ? Promise.resolve<Lista>({ bancoConfigurado: false, webhooks: [], entregas: [] }) : chamar<Lista>("listar")), [demo, refreshKey, versao]);

  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ alvo: string; r: ResultadoTeste | { erro: string } } | null>(null);
  const [erroForm, setErroForm] = useState("");

  const banco = lista.data?.bancoConfigurado ?? false;
  const nomes = new Map((lista.data?.webhooks ?? []).map((w) => [w.id, w.nome || encurtar(w.url, 40)]));

  function lidaErro(e: unknown, onde: string) {
    if (e instanceof SessaoExpirada) {
      window.location.href = "/admin/login";
      return;
    }
    setResultado({ alvo: onde, r: { erro: e instanceof Error ? e.message : String(e) } });
  }

  async function testar(alvo: string, dados: Record<string, unknown>) {
    setTestando(alvo);
    setResultado(null);
    try {
      const r = await chamar<ResultadoTeste>("testar", dados);
      setResultado({ alvo, r });
      if (dados.id) setVersao((v) => v + 1);
    } catch (e) {
      lidaErro(e, alvo);
    } finally {
      setTestando(null);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroForm("");
    if (!form.eventos.length) return setErroForm("Escolha pelo menos um evento.");
    setSalvando(true);
    try {
      const dados: Record<string, unknown> = { id: form.id, nome: form.nome, url: form.url, eventos: form.eventos, ativo: form.ativo };
      // editando sem mexer no segredo: mantém o que já estava salvo
      if (!form.id || form.segredo || !form.temSegredo) dados.segredo = form.segredo;
      await chamar("salvar", dados);
      setForm(FORM_VAZIO);
      setVersao((v) => v + 1);
    } catch (err) {
      if (err instanceof SessaoExpirada) window.location.href = "/admin/login";
      else setErroForm(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(w: WebhookTela) {
    try {
      await chamar("salvar", { id: w.id, nome: w.nome, url: w.url, eventos: w.eventos, ativo: !w.ativo });
      setVersao((v) => v + 1);
    } catch (e) {
      lidaErro(e, w.id);
    }
  }

  async function apagar(w: WebhookTela) {
    if (!confirm(`Apagar o webhook ${w.nome || w.url}? Os leads param de ir pra lá.`)) return;
    try {
      await chamar("apagar", { id: w.id });
      if (form.id === w.id) setForm(FORM_VAZIO);
      setVersao((v) => v + 1);
    } catch (e) {
      lidaErro(e, w.id);
    }
  }

  function editar(w: WebhookTela) {
    setForm({ id: w.id, nome: w.nome, url: w.url, eventos: w.eventos, segredo: "", ativo: w.ativo, temSegredo: w.tem_segredo });
    setErroForm("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Webhooks"
        subtitle="Mande cada lead novo, na hora, pra qualquer ferramenta: n8n, Make, Zapier, outro CRM ou a sua ferramenta de WhatsApp."
      />

      {demo && (
        <div className="mb-6 rounded-xl border border-ad-line bg-ad-panel p-4 text-[14px] text-ad-muted">
          Na demonstração os webhooks ficam desligados. Saia da demonstração (<a href="/admin?demo=0" className="underline">/admin?demo=0</a>) pra configurar os
          seus.
        </div>
      )}

      <div className="space-y-6">
        <Panel title={form.id ? "Editar webhook" : "Novo webhook"} subtitle="Cole o endereço (URL) que a sua ferramenta te deu pra receber dados.">
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium">Nome (pra você reconhecer)</span>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: n8n, Make, CRM" maxLength={80} className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium">URL do webhook</span>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://hook.us1.make.com/..."
                  required
                  inputMode="url"
                  className={inputClass}
                />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-[13px] font-medium">Quando mandar</legend>
              {EVENTOS.map((ev) => (
                <label key={ev.key} className="flex cursor-pointer items-start gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    checked={form.eventos.includes(ev.key)}
                    onChange={(e) =>
                      setForm({ ...form, eventos: e.target.checked ? [...form.eventos, ev.key] : form.eventos.filter((x) => x !== ev.key) })
                    }
                    className="mt-1 accent-ad-accent"
                  />
                  <span>
                    {ev.label} <span className="text-ad-muted">· {ev.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium">
                Segredo pra assinar <span className="font-normal text-ad-muted">(opcional, pra sua ferramenta conferir que fui eu que mandei)</span>
              </span>
              <div className="flex gap-2">
                <input
                  value={form.segredo}
                  onChange={(e) => setForm({ ...form, segredo: e.target.value })}
                  placeholder={form.temSegredo ? "•••••••• (deixe vazio pra manter o atual)" : "sem assinatura"}
                  maxLength={200}
                  autoComplete="off"
                  className={`${inputClass} font-mono`}
                />
                <button type="button" onClick={() => setForm({ ...form, segredo: gerarSegredo() })} className={botaoSecundario}>
                  Gerar
                </button>
              </div>
            </label>

            {erroForm && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{erroForm}</div>}
            {resultado?.alvo === "form" && <CaixaResultado r={resultado.r} />}

            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={salvando || demo || !banco} className={botaoPrincipal} title={!banco ? "Conecte o Supabase pra salvar" : undefined}>
                {salvando ? "Salvando..." : form.id ? "Salvar alterações" : "Salvar webhook"}
              </button>
              <button
                type="button"
                disabled={!form.url || testando !== null || demo}
                onClick={() => testar("form", form.id && !form.segredo ? { id: form.id } : { url: form.url.trim(), segredo: form.segredo })}
                className={botaoSecundario}
              >
                {testando === "form" ? "Enviando..." : "Enviar teste"}
              </button>
              {form.id && (
                <button type="button" onClick={() => setForm(FORM_VAZIO)} className={`${botao} text-ad-muted hover:text-ad-text`}>
                  Cancelar
                </button>
              )}
              {!banco && !demo && lista.data && (
                <span className="text-[12px] text-ad-muted">Sem o Supabase conectado dá pra testar, mas não dá pra salvar.</span>
              )}
            </div>
          </form>
        </Panel>

        <Panel title="Seus webhooks" subtitle="Cada um recebe um POST com os dados do lead, em JSON.">
          {lista.loading && !lista.data ? (
            <Loading />
          ) : lista.error ? (
            <ErrorBox error={lista.error} />
          ) : !lista.data?.webhooks.length ? (
            <p className="py-6 text-center text-[14px] text-ad-muted">Nenhum webhook ainda. Cadastre o primeiro aí em cima.</p>
          ) : (
            <ul className="divide-y divide-ad-line">
              {lista.data.webhooks.map((w) => (
                <li key={w.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-center gap-2 text-[14px] font-semibold">
                        <span className={`size-2 rounded-full ${w.ativo ? "bg-green-500" : "bg-ad-line"}`} />
                        {w.nome || "Sem nome"}
                        {!w.ativo && <span className="text-[12px] font-normal text-ad-muted">(pausado)</span>}
                      </p>
                      <p className="truncate font-mono text-[12px] text-ad-muted" title={w.url}>
                        {encurtar(w.url, 70)}
                      </p>
                      <p className="text-[12px] text-ad-muted">
                        {w.eventos.map((e) => EVENTOS.find((x) => x.key === e)?.label ?? e).join(" · ")}
                        {w.tem_segredo ? ` · assinado (…${w.segredo_fim})` : " · sem assinatura"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => testar(w.id, { id: w.id })} disabled={testando !== null} className={botaoSecundario}>
                        {testando === w.id ? "Enviando..." : "Enviar teste"}
                      </button>
                      <button onClick={() => alternar(w)} className={botaoSecundario}>
                        {w.ativo ? "Pausar" : "Ativar"}
                      </button>
                      <button onClick={() => editar(w)} className={botaoSecundario}>
                        Editar
                      </button>
                      <button onClick={() => apagar(w)} className={`${botaoSecundario} text-red-300`}>
                        Apagar
                      </button>
                    </div>
                  </div>
                  {resultado?.alvo === w.id && <CaixaResultado r={resultado.r} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Últimas entregas" subtitle="As 30 mais recentes. Se der erro, tento de novo uma vez na hora.">
          {!lista.data?.entregas.length ? (
            <p className="py-6 text-center text-[14px] text-ad-muted">Nada enviado ainda.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="text-[12px] text-ad-muted">
                  <tr className="border-b border-ad-line">
                    <th className="px-5 py-2 font-medium">Quando</th>
                    <th className="px-2 py-2 font-medium">Evento</th>
                    <th className="px-2 py-2 font-medium">Pra onde</th>
                    <th className="px-5 py-2 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.data.entregas.map((e) => (
                    <tr key={e.id} className="border-b border-ad-line/60 last:border-0">
                      <td className="whitespace-nowrap px-5 py-2 text-ad-muted" title={new Date(e.criado_em).toLocaleString("pt-BR")}>
                        {tempoRelativo(e.criado_em)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{e.evento === "teste" ? "Teste" : EVENTOS.find((x) => x.key === e.evento)?.label ?? e.evento}</td>
                      <td className="max-w-[220px] truncate px-2 py-2 text-ad-muted" title={e.url ?? ""}>
                        {(e.webhook_id && nomes.get(e.webhook_id)) || encurtar(e.url ?? "", 40)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2">
                        {e.ok ? (
                          <span className="text-green-400">✓ {e.http_status}</span>
                        ) : (
                          <span className="text-red-300" title={e.erro ?? ""}>
                            ✕ {e.http_status ?? "sem resposta"}
                            {e.tentativas > 1 ? " · 2 tentativas" : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="O que a sua ferramenta recebe">
          <div className="space-y-3 text-[14px] leading-relaxed text-ad-text/85">
            <p>
              Um <code>POST</code> em JSON. No n8n use o nó <b>Webhook</b>, no Make o módulo <b>Custom webhook</b>, no Zapier o gatilho <b>Webhooks by Zapier → Catch Hook</b>.
              Copie a URL que eles mostram, cole aqui e clique em <b>Enviar teste</b>.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-ad-line bg-ad-bg p-3 font-mono text-[12px] leading-relaxed text-ad-muted">{`{
  "evento": "lead.novo",          // ou "lead.etapa" / "teste"
  "enviado_em": "2026-10-01T14:03:00.000Z",
  "lead": {
    "nome": "Ana Souza",
    "whatsapp": "+5511912345678",
    "link_whatsapp": "https://wa.me/5511912345678",
    "isca": "exemplo",
    "etapa": "novo",
    "criado_em": "2026-10-01T14:02:58.000Z",
    "utm_source": "instagram", "utm_medium": "reels",
    "utm_campaign": "exemplo", "utm_content": "01-10"
  },
  "etapa_anterior": "convite"     // só no "lead.etapa"
}`}</pre>
            <p className="text-[13px] text-ad-muted">
              Com segredo, vai junto o cabeçalho <code>X-Webhook-Assinatura: sha256=…</code> (HMAC-SHA256 do corpo com o seu segredo). O README explica como conferir. Quer
              disparar mensagem no WhatsApp? Ligue um webhook na sua ferramenta de WhatsApp.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

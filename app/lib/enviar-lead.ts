/**
 * Envio do lead à prova de rede ruim.
 *
 * Ordem: tenta o Supabase direto, repete uma vez, e por último manda pelo próprio site
 * (/api/lead), que fica no mesmo domínio da página e passa onde o navegador do Instagram ou um
 * bloqueador derruba a chamada ao supabase.co. Cada tentativa tem tempo limite, pra pessoa não
 * ficar presa no "Enviando...".
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TIMEOUT_MS = 8000;

export type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  isca: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  user_agent: string | null;
};

/** "salvo" = gravou; "sem-banco" = Supabase ainda não configurado (não gravou, mas libera o material). */
export type ResultadoEnvio = "salvo" | "sem-banco" | "falhou";

/** true quando as duas variáveis públicas do Supabase estão preenchidas de verdade. */
export function supabaseConfigurado() {
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("SEU-PROJETO") &&
    !SUPABASE_ANON_KEY.startsWith("cole-aqui")
  );
}

/**
 * Cabeçalhos pra falar com o Supabase. As chaves antigas (anon/service_role) são um JWT e vão
 * também no Authorization; as novas (sb_publishable_/sb_secret_) vão só no apikey.
 */
export function cabecalhosSupabase(chave: string): Record<string, string> {
  return chave.startsWith("eyJ") ? { apikey: chave, Authorization: `Bearer ${chave}` } : { apikey: chave };
}

/** Avisa o servidor que entrou lead novo (pros webhooks). Sobrevive à troca de página. */
function avisarWebhooks(id: string) {
  try {
    const corpo = JSON.stringify({ id });
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.("/api/webhooks/lead-novo", new Blob([corpo], { type: "application/json" }))) return;
    fetch("/api/webhooks/lead-novo", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: corpo }).catch(() => {});
  } catch {
    // aviso de webhook nunca atrapalha a pessoa
  }
}

function comTimeout(url: string, init: RequestInit) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  return fetch(url, { ...init, signal: ctrl?.signal }).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function direto(lead: Lead) {
  const res = await comTimeout(`${SUPABASE_URL}/rest/v1/isca_leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...cabecalhosSupabase(SUPABASE_ANON_KEY!),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });
  return res.ok;
}

async function peloSite(lead: Lead) {
  const res = await comTimeout("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  return res.ok;
}

/** Salva o lead. Só devolve "falhou" quando todas as tentativas falharam. */
export async function enviarLead(lead: Lead): Promise<ResultadoEnvio> {
  if (!supabaseConfigurado()) {
    console.warn(
      "[iscas] O Supabase ainda não está configurado: este lead NÃO foi salvo. " +
        "Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local (e na Vercel). " +
        "Por enquanto a pessoa segue pro material normalmente.",
      { nome: lead.nome, whatsapp: lead.whatsapp, isca: lead.isca },
    );
    return "sem-banco";
  }
  for (const tentativa of [direto, direto, peloSite]) {
    try {
      if (await tentativa(lead)) {
        // pelo /api/lead o servidor já avisa os webhooks sozinho
        if (tentativa === direto) avisarWebhooks(lead.id);
        return "salvo";
      }
    } catch {
      // rede caiu ou estourou o tempo: vai pra próxima tentativa
    }
  }
  return "falhou";
}

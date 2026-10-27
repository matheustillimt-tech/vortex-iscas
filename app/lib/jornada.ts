/**
 * Jornada do lead: depois do formulário, o id do lead fica guardado no navegador e cada passo
 * (abrir o material, baixar o PDF, clicar no convite) vira um evento no Supabase.
 * O banco avança a etapa do lead no CRM sozinho (ver a migração em supabase/migrations/, parte 5).
 */

import { cabecalhosSupabase, supabaseConfigurado } from "./enviar-lead";

const KEY = "iscas_lead_id";

export type PassoJornada = "abriu_conteudo" | "baixou_pdf" | "clicou_convite";

export function gerarLeadId(): string {
  const c: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Navegador antigo (ou página sem https): monta o UUID versão 4 na mão
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // versão 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function salvarLeadId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function leadIdSalvo(): string | null {
  // Se você mandar o link do material pra alguém com ?lid={id do lead}, a jornada continua
  // contando mesmo que a pessoa abra em outro navegador.
  try {
    const daUrl = new URLSearchParams(window.location.search).get("lid");
    if (daUrl && UUID.test(daUrl)) {
      salvarLeadId(daUrl);
      return daUrl;
    }
  } catch {}
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function registrarJornada(type: PassoJornada, data: Record<string, string> = {}) {
  const leadId = leadIdSalvo();
  if (!leadId || !supabaseConfigurado()) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  fetch(`${url}/rest/v1/lead_events`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...cabecalhosSupabase(key),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ lead_id: leadId, type, data }),
  }).catch(() => {});
}

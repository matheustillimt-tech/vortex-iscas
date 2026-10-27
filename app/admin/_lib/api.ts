"use client";

import { demoApi } from "./demo";
import type { AdminApi } from "./types";

/**
 * O navegador nunca fala direto com o banco aqui: tudo passa por /api/admin/dados, que confere
 * a sua sessão e usa a chave service_role SÓ no servidor.
 */

export class SessaoExpirada extends Error {
  constructor() {
    super("Sua sessão expirou. Entre de novo.");
  }
}

async function chamar<T>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin/dados", {
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

const realApi: AdminApi = {
  overview: (from, to) => chamar("overview", { from, to }),
  leads: (q) => chamar("leads", { q }),
  pipeline: (q) => chamar("pipeline", { q }),
  events: (leadId) => chamar("events", { leadId }),
  setStage: async (leadId, stage) => {
    await chamar("setStage", { leadId, stage });
  },
  addNote: async (leadId, text) => {
    await chamar("addNote", { leadId, text });
  },
};

/** Modo demonstração (dados falsos) só existe rodando local: `npm run dev` + `/admin?demo=1`. */
export const DEMO_PERMITIDO = process.env.NODE_ENV !== "production";

export function getApi(demo: boolean): AdminApi {
  return demo && DEMO_PERMITIDO ? demoApi : realApi;
}

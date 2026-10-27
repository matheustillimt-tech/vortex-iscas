/**
 * Caminho alternativo de captura: a página manda o lead pra cá (mesmo domínio) quando a chamada
 * direta ao Supabase falha no celular da pessoa. Daqui o servidor grava no banco.
 *
 * Só os campos do formulário passam: etapa e datas da jornada ficam sempre no padrão do banco,
 * ninguém consegue "se colocar" como cliente mandando um campo a mais.
 */
import { after, NextResponse } from "next/server";
import { cabecalhosSupabase } from "../../lib/enviar-lead";
import { avisarLeadNovo } from "../../lib/webhooks";

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CAMPOS = ["id", "nome", "whatsapp", "isca", "utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer", "user_agent"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const lead: Record<string, string | null> = {};
  for (const campo of CAMPOS) {
    const v = corpo?.[campo];
    lead[campo] = typeof v === "string" ? v.slice(0, campo === "user_agent" || campo === "referrer" ? 500 : 200) : null;
  }

  if (!lead.id || !UUID.test(lead.id) || !lead.nome || !lead.whatsapp || !lead.isca) {
    return NextResponse.json({ error: "Faltam campos" }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/isca_leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...cabecalhosSupabase(SUPABASE_KEY),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Não deu pra salvar" }, { status: 502 });
  }
  // Webhooks (n8n, Make, Zapier...) em segundo plano: a resposta pra pessoa não espera por eles
  const leadId = lead.id;
  after(() => avisarLeadNovo(leadId).catch(() => {}));
  return NextResponse.json({ ok: true });
}

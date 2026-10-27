/**
 * Aviso de "lead novo" pros webhooks. A página de captura chama isto logo depois de gravar o lead
 * (navigator.sendBeacon). Responde na hora e manda os webhooks em segundo plano (after), então a
 * pessoa nunca espera por isso.
 *
 * É público de propósito (o navegador do lead chama), mas não dá pra abusar: só manda lead que
 * existe no banco, das últimas 24 h, e cada lead uma vez só (ver app/lib/webhooks.ts).
 */
import { after, NextResponse } from "next/server";
import { avisarLeadNovo } from "../../../lib/webhooks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let id: string | null = null;
  try {
    const corpo = JSON.parse(await req.text());
    if (typeof corpo?.id === "string" && UUID.test(corpo.id)) id = corpo.id;
  } catch {}
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  after(() => avisarLeadNovo(id).catch(() => {}));
  return NextResponse.json({ ok: true }, { status: 202 });
}

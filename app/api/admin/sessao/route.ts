/**
 * Sessão do CRM de leads.
 *   GET    → { logado, senhaConfigurada, bancoConfigurado }
 *   POST   → { senha } entra (grava o cookie de sessão)
 *   DELETE → sai
 */
import { NextResponse } from "next/server";
import { abrirSessao, bancoAdmin, estaLogado, fecharSessao, senhaConfere, senhaConfigurada } from "../../../lib/admin-servidor";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    logado: await estaLogado(),
    senhaConfigurada: senhaConfigurada(),
    bancoConfigurado: bancoAdmin() !== null,
  });
}

export async function POST(req: Request) {
  if (!senhaConfigurada()) {
    return NextResponse.json({ error: "Defina ADMIN_SENHA no .env.local (e na Vercel) pra liberar o painel." }, { status: 503 });
  }
  let tentativa = "";
  try {
    tentativa = String((await req.json())?.senha ?? "");
  } catch {}

  if (!senhaConfere(tentativa)) {
    // segura um pouco a resposta: atrapalha quem tenta adivinhar a senha no automático
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Senha errada." }, { status: 401 });
  }
  await abrirSessao();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await fecharSessao();
  return NextResponse.json({ ok: true });
}

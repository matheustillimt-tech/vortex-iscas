/**
 * Só roda no SERVIDOR (rotas /api/admin/*). Nunca importe isto num componente "use client".
 *
 * - Senha do painel: ADMIN_SENHA. Quem acerta ganha um cookie de sessão (httpOnly, 30 dias).
 * - Banco: a chave SUPABASE_SERVICE_ROLE_KEY lê e edita tudo, por isso ela só existe aqui.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const COOKIE_SESSAO = "crm_sessao";
const DURACAO_S = 60 * 60 * 24 * 30;

function senha() {
  return (process.env.ADMIN_SENHA || "").trim();
}

export function senhaConfigurada() {
  return senha().length > 0;
}

/** O cookie guarda uma assinatura derivada da senha: trocar a senha derruba todas as sessões. */
function tokenDaSessao() {
  return createHmac("sha256", senha()).update("crm-de-leads-sessao-v1").digest("hex");
}

function iguais(a: string, b: string) {
  const ha = createHmac("sha256", "comparar").update(a).digest();
  const hb = createHmac("sha256", "comparar").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function senhaConfere(tentativa: string) {
  return senhaConfigurada() && iguais(tentativa, senha());
}

export async function estaLogado() {
  if (!senhaConfigurada()) return false;
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value ?? "";
  return valor.length > 0 && iguais(valor, tokenDaSessao());
}

export async function abrirSessao() {
  (await cookies()).set(COOKIE_SESSAO, tokenDaSessao(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
}

export async function fecharSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

let cliente: SupabaseClient | null = null;

/** Cliente do banco com a chave service_role. null = Supabase ainda não configurado. */
export function bancoAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url.startsWith("https://") || url.includes("SEU-PROJETO") || !chave || chave.startsWith("cole-aqui")) return null;
  if (!cliente) cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

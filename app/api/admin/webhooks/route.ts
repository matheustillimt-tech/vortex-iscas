/**
 * Webhooks do CRM (/admin → Webhooks). Só com sessão aberta (senha do painel); lê e grava com a
 * chave service_role, que nunca sai do servidor.
 *
 * Corpo: { acao, ...parâmetros }
 *   listar                                   → { bancoConfigurado, webhooks, entregas }
 *   salvar   { id?, nome, url, eventos, segredo, ativo }
 *   apagar   { id }
 *   testar   { id }                          → manda um lead de teste pro webhook salvo
 *   testar   { url, segredo }                → manda um lead de teste pra uma URL ainda não salva
 *                                              (funciona mesmo sem o Supabase configurado)
 */
import { after, NextResponse } from "next/server";
import { bancoAdmin, estaLogado } from "../../../lib/admin-servidor";
import { avisarLeadNovo, entregar, EVENTOS, leadDeTeste, montarPayload, registrarEntrega, urlValida, type Webhook } from "../../../lib/webhooks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAVES_EVENTO = EVENTOS.map((e) => e.key) as string[];

function erro(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

/** O segredo nunca volta inteiro pro navegador: só os 4 últimos caracteres. */
function semSegredo(w: Webhook) {
  const { segredo, ...resto } = w;
  return { ...resto, tem_segredo: !!segredo, segredo_fim: segredo ? segredo.slice(-4) : null };
}

export async function POST(req: Request) {
  if (!(await estaLogado())) return erro("Entre com a senha do painel.", 401);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro("JSON inválido", 400);
  }

  const acao = corpo.acao;
  const db = bancoAdmin();
  const id = typeof corpo.id === "string" && UUID.test(corpo.id) ? corpo.id : null;

  try {
    if (acao === "listar") {
      if (!db) return NextResponse.json({ bancoConfigurado: false, webhooks: [], entregas: [] });
      const [hooks, entregas] = await Promise.all([
        db.from("webhooks").select("*").order("criado_em", { ascending: true }),
        db.from("webhook_entregas").select("*").order("criado_em", { ascending: false }).limit(30),
      ]);
      if (hooks.error) throw hooks.error;
      if (entregas.error) throw entregas.error;
      // aproveita pra mandar algum lead que ficou sem aviso (rede de segurança)
      after(() => avisarLeadNovo(null).catch(() => {}));
      return NextResponse.json({
        bancoConfigurado: true,
        webhooks: ((hooks.data ?? []) as Webhook[]).map(semSegredo),
        entregas: entregas.data ?? [],
      });
    }

    if (acao === "salvar") {
      if (!db) return erro("Conecte o Supabase pra salvar webhooks (o \"Enviar teste\" funciona mesmo sem ele).", 503);
      const url = typeof corpo.url === "string" ? corpo.url.trim() : "";
      if (!urlValida(url)) return erro("URL inválida. Ela tem que começar com https:// (ou http://).", 400);
      const eventos = Array.isArray(corpo.eventos) ? corpo.eventos.filter((e): e is string => typeof e === "string" && CHAVES_EVENTO.includes(e)) : [];
      if (!eventos.length) return erro("Escolha pelo menos um evento.", 400);
      const nome = typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 80) : "";
      const dados: Record<string, unknown> = { nome, url, eventos: [...new Set(eventos)], ativo: corpo.ativo !== false };
      // segredo: string = troca · "" = apaga · ausente = mantém
      if (typeof corpo.segredo === "string") dados.segredo = corpo.segredo.trim().slice(0, 200) || null;

      const r = id ? await db.from("webhooks").update(dados).eq("id", id).select().single() : await db.from("webhooks").insert(dados).select().single();
      if (r.error) throw r.error;
      return NextResponse.json({ ok: true, webhook: semSegredo(r.data as Webhook) });
    }

    if (acao === "apagar") {
      if (!db || !id) return erro("Webhook inválido", 400);
      const { error } = await db.from("webhooks").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (acao === "testar") {
      let alvo: { id: string | null; url: string; segredo: string | null };
      if (id) {
        if (!db) return erro("Supabase não configurado", 503);
        const { data, error } = await db.from("webhooks").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) return erro("Webhook não encontrado", 404);
        alvo = { id: data.id, url: data.url, segredo: data.segredo };
      } else {
        const url = typeof corpo.url === "string" ? corpo.url.trim() : "";
        if (!urlValida(url)) return erro("URL inválida. Ela tem que começar com https:// (ou http://).", 400);
        const segredo = typeof corpo.segredo === "string" && corpo.segredo.trim() ? corpo.segredo.trim().slice(0, 200) : null;
        alvo = { id: null, url, segredo };
      }
      const resultado = await entregar(alvo.url, alvo.segredo, "teste", montarPayload("teste", leadDeTeste()));
      if (db && alvo.id) await registrarEntrega(db, alvo, "teste", null, resultado);
      return NextResponse.json({ ...resultado, assinado: !!alvo.segredo });
    }

    return erro("Ação desconhecida", 400);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "erro no banco";
    // tabela ainda não existe = rodou o schema antigo
    if (/webhook/i.test(msg) && /(does not exist|schema cache|not find)/i.test(msg)) {
      return erro("As tabelas de webhooks ainda não existem no seu banco. Aplique o banco de novo com supabase db push (o Claude faz isso por você).", 500);
    }
    return erro(msg);
  }
}

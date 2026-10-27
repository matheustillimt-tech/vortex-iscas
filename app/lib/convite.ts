/**
 * Convite do fim do material (bloco verde da página e última parte do PDF).
 * É igual em TODA isca e vem das variáveis de ambiente (.env.local e Vercel).
 * Sem NEXT_PUBLIC_CONVITE_URL, o bloco não aparece em lugar nenhum.
 */

export const CONVITE = {
  url: (process.env.NEXT_PUBLIC_CONVITE_URL || "").trim(),
  selo: process.env.NEXT_PUBLIC_CONVITE_SELO || "Próximo passo",
  titulo: process.env.NEXT_PUBLIC_CONVITE_TITULO || "Quer ir além deste material?",
  texto: process.env.NEXT_PUBLIC_CONVITE_TEXTO || "",
  botao: process.env.NEXT_PUBLIC_CONVITE_BOTAO || "Quero participar",
};

export const TEM_CONVITE = CONVITE.url.length > 0;

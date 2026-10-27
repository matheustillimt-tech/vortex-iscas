import type { Metadata } from "next";
import { AUTHOR_NAME } from "../../components/ui";
import { DESCRICAO, TITULO } from "../conteudo";

// Título e descrição que aparecem quando o link é compartilhado
export const metadata: Metadata = {
  title: `${TITULO} | ${AUTHOR_NAME}`,
  description: DESCRICAO,
};

export default function LeadLayout({ children }: { children: React.ReactNode }) {
  return children;
}

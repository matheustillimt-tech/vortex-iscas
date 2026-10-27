import type { Metadata } from "next";
import { AUTHOR_NAME, Container, Label, SiteFooter, SiteHeader } from "../components/ui";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contato@exemplo.com";

export const metadata: Metadata = {
  title: `Política de privacidade | ${AUTHOR_NAME}`,
  description: "Como seus dados são coletados, usados e como pedir a exclusão.",
};

/**
 * MODELO de política de privacidade, cobrindo o básico da LGPD pra uma página de captura.
 *
 * ⚠️ ISTO NÃO É PARECER JURÍDICO. É um ponto de partida honesto que descreve exatamente o que
 * este sistema faz. Se você trata dado sensível, vende pra empresa grande ou opera em volume,
 * vale passar por um advogado.
 *
 * Antes de publicar, preencha NEXT_PUBLIC_AUTHOR_NAME e NEXT_PUBLIC_CONTACT_EMAIL.
 */

const SECOES: { titulo: string; itens?: string[]; texto?: React.ReactNode }[] = [
  {
    titulo: "Quem coleta",
    texto: (
      <>
        Os dados desta página são coletados por {AUTHOR_NAME}. Para qualquer assunto relacionado aos seus dados, o contato é{" "}
        <strong>{CONTACT_EMAIL}</strong>.
      </>
    ),
  },
  {
    titulo: "O que é coletado",
    itens: [
      "Nome e WhatsApp, informados por você no formulário",
      "Origem da visita (de qual campanha ou link você chegou)",
      "Data e hora do cadastro e quais partes do material você abriu",
    ],
  },
  {
    titulo: "Para que é usado",
    itens: [
      "Entregar o material que você pediu",
      "Enviar conteúdos, convites e ofertas relacionados ao tema",
      "Entender quais conteúdos trazem mais interessados",
    ],
    texto: "A base legal é o seu consentimento, dado no momento em que você envia o formulário.",
  },
  {
    titulo: "Com quem é compartilhado",
    texto:
      "Os dados ficam armazenados no Supabase e o site é hospedado na Vercel. Se houver remarketing, o Meta (Facebook e Instagram) recebe dados de navegação para exibir anúncios. Seus dados não são vendidos.",
  },
  {
    titulo: "Seus direitos",
    texto: (
      <>
        Pela LGPD, você pode pedir a qualquer momento a confirmação, o acesso, a correção ou a <strong>exclusão</strong> dos seus
        dados, e pode retirar o consentimento. Basta escrever para <strong>{CONTACT_EMAIL}</strong>. O pedido é atendido em até 15
        dias.
      </>
    ),
  },
  {
    titulo: "Por quanto tempo",
    texto: "Os dados ficam guardados enquanto durar o relacionamento, ou até você pedir a exclusão.",
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Container className="pt-8 sm:pt-12">
          <header className="space-y-3 border-b border-card-border pb-6">
            <Label>Última atualização: {new Date().getFullYear()}</Label>
            <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px]">Política de privacidade</h1>
          </header>

          {SECOES.map((s) => (
            <section key={s.titulo} className="space-y-2 border-b border-card-border py-6">
              <h2 className="text-[17px] font-bold">{s.titulo}</h2>
              <div className="space-y-3 text-[16px] leading-relaxed text-muted">
                {s.itens && (
                  <ul className="list-disc space-y-1 pl-5">
                    {s.itens.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
                {s.texto && <p>{s.texto}</p>}
              </div>
            </section>
          ))}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

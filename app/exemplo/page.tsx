import type { Metadata } from "next";
import { CopyBlock } from "../components/copy-block";
import { CTASection } from "../components/cta-section";
import { DownloadPdfLink } from "../components/download-pdf-link";
import { TrackView } from "../components/track-view";
import { AUTHOR_NAME, Container, Label, ProfileLine, SiteFooter, SiteHeader } from "../components/ui";
import { CHECKLIST, DESCRICAO, DICA_CRIADOR, ERROS, FONTES, INTRO, SLUG, TITULO } from "./conteudo";

export const metadata: Metadata = {
  title: `${TITULO} | ${AUTHOR_NAME}`,
  description: DESCRICAO,
};

// ============================================
// PÁGINA DO MATERIAL (isca de exemplo)
// O texto mora em ./conteudo.ts. Aqui fica só o visual.
// ============================================

export default function ExemploPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <TrackView isca={SLUG} />

      <main>
        <Container className="space-y-6 pt-8 sm:pt-12">
          {/* Abertura */}
          <div className="space-y-4">
            <Label pill>Material gratuito</Label>
            <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[46px]">{TITULO}</h1>
            <p className="text-[17px] leading-relaxed text-foreground/75">{INTRO}</p>
            <div data-no-print>
              <DownloadPdfLink href={`/api/${SLUG}-pdf`} />
            </div>
          </div>

          {/* Convite curto no topo (só aparece se NEXT_PUBLIC_CONVITE_URL estiver preenchido) */}
          <CTASection compact />

          <article className="space-y-6 pt-2">
            <ol className="space-y-4">
              {ERROS.map((erro, i) => (
                <li key={erro.titulo} className="space-y-5 rounded-2xl border border-card-border p-5 sm:p-6">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[15px] font-bold text-background">
                      {i + 1}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="text-[21px] font-bold leading-snug tracking-tight sm:text-[23px]">{erro.titulo}</h2>
                      <p className="text-[16px] leading-relaxed text-foreground/70">{erro.gancho}</p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-bold">Como perceber</h3>
                      <ul className="space-y-2 text-[16px] leading-relaxed text-foreground/80">
                        {erro.detectar.map((d) => (
                          <li key={d} className="flex gap-2.5">
                            <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-foreground" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-bold">Como resolver</h3>
                      <ol className="space-y-2 text-[16px] leading-relaxed text-foreground/80">
                        {erro.resolver.map((s, j) => (
                          <li key={s} className="flex gap-2.5">
                            <span className="font-bold text-foreground">{j + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {erro.exemplo && (
                    <div className="rounded-xl bg-card px-4 py-3.5">
                      <p className="mb-1 text-[13px] font-bold">Exemplo</p>
                      <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere]">{erro.exemplo}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {/* Item copiável: é o que faz a pessoa salvar a página */}
            <section className="space-y-3">
              <h2 className="px-1 text-[21px] font-bold tracking-tight">Checklist pra copiar</h2>
              <CopyBlock text={CHECKLIST} label="Copiar checklist" destacar={false} />
            </section>

            {/* Dica do criador, em formato de post */}
            <section className="space-y-4 rounded-2xl border border-card-border p-5 sm:p-6">
              <ProfileLine subtitle={DICA_CRIADOR.titulo} />
              <p className="text-[19px] font-semibold leading-snug sm:text-[21px]">{DICA_CRIADOR.texto}</p>
            </section>

            <section className="space-y-2 px-1">
              <h2 className="text-[15px] font-bold">Fontes</h2>
              {FONTES.length === 0 ? (
                <p className="text-[14px] leading-relaxed text-muted">
                  Esta é uma isca de exemplo que veio com o sistema. Troque pelo seu conteúdo e liste aqui as fontes que você usou.
                </p>
              ) : (
                <ol className="space-y-1.5 text-[14px] leading-relaxed text-muted">
                  {FONTES.map((f, i) => (
                    <li key={f.url} className="flex gap-2">
                      <span>{i + 1}.</span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline [overflow-wrap:anywhere]">
                        {f.titulo}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </article>

          {/* Convite final */}
          <div className="pt-4">
            <CTASection />
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}

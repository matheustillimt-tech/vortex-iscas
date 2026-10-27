"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CONVITE, TEM_CONVITE } from "../lib/convite";
import { registrarJornada } from "../lib/jornada";

/**
 * Convite pro próximo passo (aula, grupo, consultoria), igual em TODA isca.
 * Textos e link vêm do .env.local (NEXT_PUBLIC_CONVITE_*). Sem NEXT_PUBLIC_CONVITE_URL, não aparece.
 * O clique vira o passo "clicou no convite" no seu CRM de leads.
 */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

const botaoClass =
  "laser laser-go pulse-go group flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-go font-bold text-white transition-colors hover:bg-go-hover active:scale-[0.99]";

function Selo() {
  return (
    <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#86efac]">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
        <span className="live-dot relative inline-flex size-2.5 rounded-full bg-[#4ade80]" />
      </span>
      {CONVITE.selo}
    </p>
  );
}

function Bloco({ href, compact }: { href: string; compact?: boolean }) {
  const externo = /^https?:\/\//.test(href);
  const alvo = externo ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (compact) {
    return (
      <div className="laser laser-go rounded-2xl bg-[#052e16] p-4 shadow-[0_10px_34px_-12px_rgb(22_163_74/0.6)] sm:p-5">
        <div className="space-y-3">
          <Selo />
          <p className="text-[16px] font-bold leading-snug text-white sm:text-[17px]">{CONVITE.titulo}</p>
          <a href={href} {...alvo} onClick={() => registrarJornada("clicou_convite", { origem: "topo" })} className={`${botaoClass} h-12 w-full px-4 text-[16px]`}>
            {CONVITE.botao}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <section className="laser laser-go rounded-3xl bg-[#052e16] p-6 shadow-[0_16px_48px_-16px_rgb(22_163_74/0.7)] sm:p-8">
      <div className="space-y-4">
        <Selo />
        <h2 className="text-[26px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[32px]">{CONVITE.titulo}</h2>
        {CONVITE.texto && <p className="text-[17px] font-semibold leading-relaxed text-[#bbf7d0]">{CONVITE.texto}</p>}
        <a href={href} {...alvo} onClick={() => registrarJornada("clicou_convite", { origem: "final" })} className={`${botaoClass} mt-2 h-14 w-full px-4 text-[18px]`}>
          {CONVITE.botao}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </div>
    </section>
  );
}

function ComUtm({ compact }: { compact?: boolean }) {
  const searchParams = useSearchParams();
  let href = CONVITE.url;
  try {
    const url = new URL(CONVITE.url);
    UTM_KEYS.forEach((k) => {
      const v = searchParams.get(k);
      if (v) url.searchParams.set(k, v);
    });
    href = url.toString();
  } catch {
    // link sem https:// (ex: wa.me/...): usa como está
  }
  return <Bloco href={href} compact={compact} />;
}

/** Convite (bloco verde). `compact` é a versão menor, pro topo do material. */
export function CTASection({ compact }: { compact?: boolean }) {
  if (!TEM_CONVITE) return null;
  return (
    <div data-no-print>
      <Suspense fallback={<Bloco href={CONVITE.url} compact={compact} />}>
        <ComUtm compact={compact} />
      </Suspense>
    </div>
  );
}

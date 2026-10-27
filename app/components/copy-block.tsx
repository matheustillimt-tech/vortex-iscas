"use client";

import { useState } from "react";

/**
 * Bloco de texto copiável (prompt, template, checklist). É o "artefato copiável" da isca.
 * Trechos entre [COLCHETES] ficam destacados pra pessoa saber o que trocar.
 * Em comando de terminal com colchetes que não são pra trocar, passe `destacar={false}`.
 */
export function CopyBlock({
  text,
  label = "Copiar",
  size = "md",
  destacar = true,
}: {
  text: string;
  label?: string;
  size?: "md" | "lg";
  destacar?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const parts = destacar ? text.split(/(\[[^\]]+\])/g) : [text];

  return (
    <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
      <p
        className={`whitespace-pre-line p-4 [overflow-wrap:anywhere] sm:p-5 ${
          size === "lg" ? "text-[20px] font-bold leading-snug sm:text-[22px]" : "text-[16px] font-medium leading-relaxed"
        }`}
      >
        {parts.map((part, i) =>
          part.startsWith("[") ? (
            <span key={i} className="rounded bg-[#fff3bf] px-1 font-bold">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </p>
      <button
        type="button"
        onClick={copy}
        data-no-print
        aria-live="polite"
        className={`flex h-11 w-full items-center justify-center gap-2 border-t border-card-border text-[15px] font-semibold transition-colors ${
          copied ? "bg-go text-white" : "bg-background text-foreground hover:bg-soft"
        }`}
      >
        {copied ? "Copiado ✓" : label}
      </button>
    </div>
  );
}

"use client";

import { registrarJornada } from "../lib/jornada";
import { softButtonClass } from "./ui";

export function DownloadPdfLink({ href, label = "Baixar PDF" }: { href: string; label?: string }) {
  return (
    <a href={href} className={softButtonClass} onClick={() => registrarJornada("baixou_pdf", { pdf: href })}>
      <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
      </svg>
      {label}
    </a>
  );
}

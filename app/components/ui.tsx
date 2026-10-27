/**
 * Peças básicas do visual (estilo Instagram). Toda isca usa estas, em vez de estilizar na mão.
 *
 * Seu nome, @ e selo vêm do .env.local:
 *   NEXT_PUBLIC_AUTHOR_NAME, NEXT_PUBLIC_AUTHOR_HANDLE, NEXT_PUBLIC_VERIFIED
 * Sua foto vem do arquivo public/avatar.jpg (troque pela foto de perfil do seu Instagram).
 */

export const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME || "Seu Nome";
export const AUTHOR_HANDLE = (process.env.NEXT_PUBLIC_AUTHOR_HANDLE || "seuperfil").trim().replace(/^@/, "");
const VERIFIED = process.env.NEXT_PUBLIC_VERIFIED === "true";

/** Etiqueta pequena (ex: "Material gratuito"). `pill` deixa em cápsula cinza. */
export function Label({
  children,
  className = "",
  pill,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  pill?: boolean;
  as?: "p" | "span" | "h2" | "h3";
}) {
  const base = pill
    ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-[13px] font-semibold text-foreground"
    : "text-[13px] font-semibold text-muted";
  return <Tag className={`${base} ${className}`}>{children}</Tag>;
}

/** Container padrão. Coluna estreita, como o feed. */
export function Container({
  children,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const width = size === "sm" ? "max-w-lg" : size === "lg" ? "max-w-4xl" : "max-w-2xl";
  return <div className={`mx-auto w-full ${width} px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function VerifiedBadge({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 text-verified`} aria-label="Verificado" role="img">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path d="m7 12.4 3.3 3.3L17.2 8.8" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Foto de perfil com o anel colorido de story. */
export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 rounded-full bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)] p-[2px]"
      style={{ width: size, height: size }}
    >
      <span className="block size-full rounded-full bg-background p-[2px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avatar.jpg" alt={AUTHOR_NAME} className="size-full rounded-full object-cover" />
      </span>
    </span>
  );
}

/** Cabeçalho de post: foto + nome + selo + @. */
export function ProfileLine({ size = 40, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size={size} />
      <div className="min-w-0 leading-tight">
        <p className="flex items-center gap-1 text-[15px] font-semibold">
          {AUTHOR_NAME}
          {VERIFIED && <VerifiedBadge className="size-[15px]" />}
        </p>
        <p className="text-[14px] text-muted">{subtitle ?? `@${AUTHOR_HANDLE}`}</p>
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-card-border bg-background/90 backdrop-blur" data-no-print>
      <Container size="lg" className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar size={32} />
          <span className="flex items-center gap-1 text-[15px] font-semibold">
            {AUTHOR_HANDLE}
            {VERIFIED && <VerifiedBadge className="size-[14px]" />}
          </span>
        </div>
        <span className="text-[13px] font-semibold text-muted">Conteúdo gratuito</span>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 pb-10" data-no-print>
      <Container className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-muted">
        <span>
          © {new Date().getFullYear()} {AUTHOR_NAME}
        </span>
        <span aria-hidden>·</span>
        <a href="/privacidade" className="hover:underline">
          Política de privacidade
        </a>
      </Container>
    </footer>
  );
}

/** Classe do botão verde de conversão (pulso + laser). Use em <button> ou <a>. */
export const goButtonClass =
  "laser laser-go pulse-go group flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-go px-6 text-[18px] font-bold text-white transition-colors hover:bg-go-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:[animation:none]";

/** Botão cinza secundário (ex.: "Baixar PDF"). */
export const softButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-soft px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-soft-hover";

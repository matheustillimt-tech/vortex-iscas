import { AUTHOR_HANDLE, AUTHOR_NAME, Avatar, Container, SiteFooter, VerifiedBadge } from "./components/ui";

const VERIFIED = process.env.NEXT_PUBLIC_VERIFIED === "true";

// Página inicial (seusite.com). Cada isca tem o endereço próprio: /{slug}/lead
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center">
        <Container size="sm" className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <Avatar size={112} />
            <div className="space-y-1">
              <h1 className="flex items-center justify-center gap-1.5 text-[22px] font-bold">
                {AUTHOR_HANDLE}
                {VERIFIED && <VerifiedBadge className="size-5" />}
              </h1>
              <p className="text-[15px] font-semibold">{AUTHOR_NAME}</p>
            </div>
            <p className="max-w-sm text-[16px] leading-relaxed text-foreground/75">
              Materiais gratuitos. Cada um tem um link próprio, que chega no seu direct quando você comenta a palavra do post.
            </p>
            <a
              href={`https://instagram.com/${AUTHOR_HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-10 items-center rounded-lg bg-accent px-6 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Ver perfil no Instagram
            </a>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

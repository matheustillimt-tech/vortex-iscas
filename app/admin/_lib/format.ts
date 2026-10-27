const TZ = "America/Sao_Paulo";

export function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

export function pct(part: number, total: number) {
  if (!total) return "0%";
  const v = (part / total) * 100;
  return `${v < 10 && v > 0 ? v.toFixed(1).replace(".", ",") : Math.round(v)}%`;
}

export function fmtData(iso: string) {
  return new Date(iso)
    .toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .replace(".", "")
    .replace(",", "");
}

export function fmtDia(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

export function tempoRelativo(iso: string | null) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} d`;
  return fmtData(iso);
}

export function linkWhatsApp(tel: string) {
  let d = tel.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return `https://wa.me/${d}`;
}

/** Mostra o WhatsApp salvo (+5511912345678) como +55 (11) 91234-5678. */
export function fmtWhatsApp(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (!d.startsWith("55") || d.length < 12) return tel;
  const numero = d.slice(4);
  const corte = numero.length > 8 ? 5 : 4;
  return `+55 (${d.slice(2, 4)}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Nome curto da isca: "guia-de-prompts" vira "guia de prompts". */
export function nomeIsca(slug: string) {
  return slug.replace(/-/g, " ");
}

export type Periodo = "7" | "30" | "90" | "tudo";

export function intervalo(p: Periodo) {
  const to = new Date(Date.now() + 60000).toISOString();
  if (p === "tudo") return { from: "2020-01-01T00:00:00Z", to };
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (Number(p) - 1));
  return { from: d.toISOString(), to };
}

export const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "tudo", label: "Todo período" },
];

export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
}

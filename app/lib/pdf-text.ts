/**
 * O jsPDF com a fonte Helvetica padrão quebra com acento e pontuação tipográfica.
 * Passe todo texto do PDF por aqui: a página fica com acento, o PDF sai limpo.
 */
export function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, "");
}

/**
 * WhatsApp no padrão internacional (E.164): +55 DDD 9XXXX-XXXX.
 *
 * Tratativas:
 * - sem +55 → coloca; já com 55 → não duplica
 * - "0" de operadora na frente do DDD → tira
 * - celular antigo de 8 dígitos (começa em 6, 7, 8 ou 9) → coloca o nono dígito
 * - fixo de 8 dígitos (começa em 2, 3, 4 ou 5) → aceita como está
 * - número de outro país (começa com + e não é 55) → mantém como a pessoa digitou
 *
 * O banco aplica a mesma regra (função whatsapp_e164 na migração em supabase/migrations/), então o número
 * fica padronizado mesmo se algum lead entrar por fora do site.
 */

/** DDDs que existem no Brasil. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export const PLACEHOLDER_WHATSAPP = "(11) 91234-5678";

export function soDigitos(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

function estrangeiro(valor: string) {
  const d = soDigitos(valor);
  return valor.trim().startsWith("+") && !d.startsWith("55");
}

/** Tira o código do país e o 0 de operadora, devolvendo DDD + número. */
function parteLocal(valor: string): string {
  let d = soDigitos(valor);
  // "+55" digitado (ou colado/autopreenchido) é sempre código do país; "55" sem + só com número completo
  if (d.startsWith("55") && (valor.trim().startsWith("+55") || d.length >= 12)) d = d.slice(2);
  while (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 11);
}

function formatarLocal(local: string): string {
  if (!local) return "";
  const ddd = local.slice(0, 2);
  const numero = local.slice(2);
  if (local.length <= 2) return `(${ddd}`;
  // Celular (começa em 9) quebra 5-4; fixo quebra 4-4
  const corte = numero.startsWith("9") ? 5 : 4;
  if (numero.length <= corte) return `(${ddd}) ${numero}`;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Vai formatando enquanto a pessoa digita: (11) 91234-5678. */
export function mascararWhatsApp(valor: string): string {
  if (estrangeiro(valor)) return "+" + soDigitos(valor).slice(0, 15);
  return formatarLocal(parteLocal(valor));
}

/** Apagar em cima de "(", ")", " " ou "-" apaga o dígito anterior, senão o campo trava. */
export function apagarUltimoDigito(valorAnterior: string): string {
  if (estrangeiro(valorAnterior)) return "+" + soDigitos(valorAnterior).slice(0, -1);
  return formatarLocal(parteLocal(valorAnterior).slice(0, -1));
}

export type WhatsAppNormalizado = { valido: boolean; e164: string; motivo?: string };

export function normalizarWhatsApp(valor: string): WhatsAppNormalizado {
  const digitos = soDigitos(valor);

  if (estrangeiro(valor)) {
    const ok = digitos.length >= 8 && digitos.length <= 15;
    return { valido: ok, e164: `+${digitos}`, motivo: ok ? undefined : "Confere o número com o código do país." };
  }

  const local = parteLocal(valor);
  if (local.length < 10) return { valido: false, e164: "", motivo: "Faltam números. Coloca com DDD, ex: (11) 91234-5678." };

  const ddd = local.slice(0, 2);
  let numero = local.slice(2);
  if (!DDDS.has(Number(ddd))) return { valido: false, e164: "", motivo: `DDD ${ddd} não existe. Confere o começo do número.` };

  // Celular antigo, sem o nono dígito
  if (numero.length === 8 && /^[6-9]/.test(numero)) numero = "9" + numero;

  if (numero.length === 8 && /^[2-5]/.test(numero)) return { valido: true, e164: `+55${ddd}${numero}` };
  if (numero.length !== 9) return { valido: false, e164: "", motivo: "Esse número não parece completo. Confere os dígitos." };
  if (!/^9/.test(numero)) return { valido: false, e164: "", motivo: "Celular no Brasil começa com 9 depois do DDD." };

  return { valido: true, e164: `+55${ddd}${numero}` };
}

/** Mostra bonito um número já normalizado (usado no CRM). */
export function exibirWhatsApp(e164: string): string {
  const d = soDigitos(e164);
  if (!d.startsWith("55") || d.length < 12) return e164;
  const ddd = d.slice(2, 4);
  const numero = d.slice(4);
  const corte = numero.length > 8 ? 5 : 4;
  return `+55 (${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

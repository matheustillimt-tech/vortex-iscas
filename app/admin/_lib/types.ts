/** Etapas do funil no CRM. As 3 primeiras andam sozinhas; as outras você move no Pipeline. */
export const STAGES = [
  { key: "novo", label: "Novo lead", color: "#8b8b8b", hint: "Preencheu o formulário" },
  { key: "consumiu", label: "Consumiu o material", color: "#3b82f6", hint: "Abriu a página ou baixou o PDF" },
  { key: "convite", label: "Clicou no convite", color: "#22c55e", hint: "Clicou no convite do fim do material" },
  { key: "contato", label: "Em contato", color: "#eab308", hint: "Você já chamou no WhatsApp" },
  { key: "negociando", label: "Negociando", color: "#ec4899", hint: "Proposta na mesa" },
  { key: "cliente", label: "Cliente", color: "#f97316", hint: "Comprou" },
  { key: "perdido", label: "Perdido", color: "#ef4444", hint: "Não avançou" },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const STAGE_KEYS = STAGES.map((s) => s.key) as readonly string[];

export function stageInfo(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

export type Lead = {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  isca: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  stage: Stage;
  stage_changed_at: string;
  conteudo_at: string | null;
  pdf_at: string | null;
  convite_at: string | null;
  last_event_at: string | null;
};

export type LeadEvent = {
  id: number;
  lead_id: string;
  type: "captura" | "abriu_conteudo" | "baixou_pdf" | "clicou_convite" | "etapa" | "nota";
  data: Record<string, string | null>;
  created_at: string;
  created_by: string | null;
};

export type Overview = {
  leads: number;
  unicos: number;
  conteudo: number;
  pdf: number;
  convite: number;
  contato: number;
  negociando: number;
  clientes: number;
  por_dia: { dia: string; leads: number; convite: number }[];
  por_isca: { isca: string; leads: number; conteudo: number; convite: number; clientes: number }[];
  por_origem: { origem: string; leads: number; convite: number }[];
  por_etapa: Record<string, number>;
};

export type Jornada = "conteudo" | "pdf" | "convite";

export type LeadQuery = {
  from: string;
  to: string;
  search?: string;
  isca?: string;
  origem?: string;
  stage?: string;
  jornada?: Jornada;
  orderBy?: "created_at" | "nome" | "stage_changed_at";
  asc?: boolean;
  page?: number;
  pageSize?: number;
};

export type Board = Record<string, { rows: Lead[]; count: number }>;

export type AdminApi = {
  overview(from: string, to: string): Promise<Overview>;
  leads(q: LeadQuery): Promise<{ rows: Lead[]; count: number }>;
  pipeline(q: LeadQuery): Promise<Board>;
  events(leadId: string): Promise<LeadEvent[]>;
  setStage(leadId: string, stage: Stage): Promise<void>;
  addNote(leadId: string, text: string): Promise<void>;
};

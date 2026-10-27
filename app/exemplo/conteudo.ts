/**
 * Conteúdo da isca de EXEMPLO. A página (page.tsx) e o PDF (api/exemplo-pdf) leem daqui,
 * então você escreve uma vez só, com acento normal. O PDF tira os acentos sozinho.
 */

export const SLUG = "exemplo";

export const TITULO = "5 erros que fazem sua isca não converter";

export const DESCRICAO = "Os 5 erros mais comuns em página de captura, com o que fazer no lugar de cada um.";

export const INTRO =
  "Isca que não converte quase nunca é falta de tráfego, é quase sempre um destes 5 erros. Cada um custa lead em silêncio, e os cinco são fáceis de corrigir antes de publicar a próxima.";

export type Erro = {
  titulo: string;
  gancho: string;
  detectar: string[];
  resolver: string[];
  exemplo?: string;
};

export const ERROS: Erro[] = [
  {
    titulo: "Prometer uma coisa no vídeo e entregar outra na página",
    gancho: "A entrega tem que bater com a promessa, palavra por palavra.",
    detectar: [
      "O vídeo prometeu uma lista com links e a página tem só texto corrido",
      "A promessa do vídeo não aparece no começo da página",
    ],
    resolver: [
      "Reescreva o começo da página repetindo a promessa exata do vídeo",
      "Confira item por item: se prometeu 10, entregue 10",
    ],
    exemplo: "Vídeo: os 10 links. Página: os 10 links, clicáveis, na ordem.",
  },
  {
    titulo: "Pedir dado demais no formulário",
    gancho: "Cada campo a mais derruba a conversão.",
    detectar: ["O formulário tem mais de 2 ou 3 campos", "Você pede cargo, empresa ou faturamento logo na entrada"],
    resolver: ["Fique em nome e WhatsApp", "O resto você descobre depois, conversando"],
  },
  {
    titulo: "Entregar um material raso",
    gancho: "Se o conteúdo cabe na legenda do post, ele não era uma isca.",
    detectar: ["O material repete o que já foi dito no vídeo", "Não tem tabela, link funcional nem passo a passo"],
    resolver: [
      "Entregue de 3 a 5 vezes mais profundidade que o vídeo",
      "Inclua pelo menos um item copiável: um prompt, um checklist ou um modelo",
    ],
  },
  {
    titulo: "Perder a origem do lead",
    gancho: "Sem a origem marcada, você não sabe o que repetir.",
    detectar: ["Os leads chegam sem você saber de qual vídeo vieram", "O link da automação de direct não tem parâmetro nenhum"],
    resolver: [
      "Marque utm_source, utm_medium, utm_campaign e utm_content no link",
      "Confira no seu CRM de leads (/admin) se a origem aparece certinha",
    ],
    exemplo: "/exemplo/lead?utm_source=instagram&utm_medium=reels&utm_campaign=erros-isca&utm_content=reel-01",
  },
  {
    titulo: "Não ter próximo passo depois da entrega",
    gancho: "Coletar contato não é construir relacionamento.",
    detectar: ["A página termina no botão de baixar o PDF", "Não existe convite nenhum depois da entrega"],
    resolver: [
      "Feche com um convite claro: uma aula, uma call ou um grupo",
      "Deixe esse convite fixo (NEXT_PUBLIC_CONVITE_*), pra valer em todas as iscas",
    ],
  },
];

export const CHECKLIST = `Antes de publicar a sua isca:
[ ] A primeira frase da página repete a promessa do vídeo
[ ] O formulário pede só nome e WhatsApp
[ ] Tem pelo menos um item copiável (prompt, checklist ou modelo)
[ ] O link da automação tem utm_source, utm_medium, utm_campaign e utm_content
[ ] O convite do final está ligado e o link abre`;

export const DICA_CRIADOR = {
  titulo: "Dica do criador",
  texto:
    "Antes de publicar, abra a sua página no celular e cronometre: se em 10 segundos a pessoa não entendeu o que vai receber, o problema não é o tráfego, é o começo da página.",
};

export const FONTES: { titulo: string; url: string }[] = [
  // Isca de EXEMPLO: troque pelo seu conteúdo e liste aqui as fontes que você usou.
];

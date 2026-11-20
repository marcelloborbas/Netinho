import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Factory,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  Settings2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Seções do painel administrativo único (`/admin?secao=...`). */
export const ADMIN_SECTION_IDS = [
  "visao-geral",
  "pessoas",
  "clientes",
  "pedidos",
  "vendas",
  "fornecedores",
  "cadastros",
  "comunicacao",
  "representantes",
  "configuracoes",
] as const;

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number];

export interface AdminSectionMeta {
  id: AdminSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Palavras usadas pela busca de funções do painel. */
  keywords: string;
}

export const ADMIN_SECTIONS: ReadonlyArray<AdminSectionMeta> = [
  {
    id: "visao-geral",
    label: "Painel",
    description: "Acesso às funções administrativas",
    icon: LayoutDashboard,
    keywords: "resumo métricas indicadores exportar excel planilha",
  },
  {
    id: "pessoas",
    label: "Pessoas e Comissões",
    description: "Vendedores, representantes, acessos e comissões em um só lugar",
    icon: Users,
    keywords:
      "usuários representantes vendedores acesso perfil comissão whatsapp carteira região ddd excluir",
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Cadastros, responsável e exclusão de clientes",
    icon: UserRound,
    keywords: "clientes carteira cnpj cadastro novo cliente transferir",
  },
  {
    id: "pedidos",
    label: "Pedidos",
    description: "Consultar e administrar pedidos",
    icon: ClipboardList,
    keywords: "pedidos orçamentos vendas status total",
  },
  {
    id: "vendas",
    label: "Vendas e comissões",
    description: "Resultados e evolução comercial",
    icon: BarChart3,
    keywords: "evolução vendas ranking representante comissão destaque do mês",
  },
  {
    id: "fornecedores",
    label: "Distribuidoras",
    description: "Cadastro e condições das distribuidoras",
    icon: Factory,
    keywords: "distribuidoras fornecedores fco hd catálogo comissão repasse faturamento",
  },
  {
    id: "cadastros",
    label: "Cadastros recebidos",
    description: "Solicitações de cadastro e situação de análise",
    icon: ClipboardCheck,
    keywords: "cadastro digital solicitações pendentes aprovar recusar análise",
  },
  {
    id: "comunicacao",
    label: "Comunicação WhatsApp",
    description: "Mensagens individuais ou para todos os representantes",
    icon: MessageCircle,
    keywords: "whatsapp mensagem comunicado representantes",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    description: "Desconto máximo e campanhas do catálogo",
    icon: Settings2,
    keywords: "configuração desconto máximo limite campanha oferta saldão frete fob",
  },
];

export const DEFAULT_ADMIN_SECTION: AdminSectionId = "visao-geral";

export function isAdminSection(value: unknown): value is AdminSectionId {
  return typeof value === "string" && (ADMIN_SECTION_IDS as readonly string[]).includes(value);
}

export function adminSectionMeta(id: AdminSectionId): AdminSectionMeta {
  return ADMIN_SECTIONS.find((section) => section.id === id) ?? ADMIN_SECTIONS[0]!;
}

/** Filtra as seções pelo texto digitado (sem acentos e sem diferenciar maiúsculas). */
export function filterAdminSections(term: string): AdminSectionMeta[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(term.trim());
  if (!query) return [...ADMIN_SECTIONS];
  return ADMIN_SECTIONS.filter((section) =>
    normalize(`${section.label} ${section.description} ${section.keywords}`).includes(query),
  );
}

/**
 * Âncora do endereço sem o "#" inicial. O roteador entrega o hash sem "#",
 * mas links antigos podiam incluí-lo — os dois formatos são aceitos.
 */
export function normalizeHash(hash: string | undefined | null): string {
  return (hash ?? "").replace(/^#+/, "");
}

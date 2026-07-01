import {
  PawPrint,
  Wheat,
  Boxes,
  Trees,
  User,
  Building2,
  Truck,
  Users,
  FileText,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * Apresentação por artifact_type (render-by-type). O DFID é um artefato que
 * representa algo; esta é a camada de visualização que adapta ícone + rótulo +
 * cor ao tipo. Fonte única, consumida por detalhe/lista/verify público.
 *
 * Escopo v1 (seguro): ícone + label + accent. NÃO reordena metadata nem esconde
 * seções (isso seria especulativo e poderia regredir o que já funciona).
 *
 * Taxonomia: animal/commodity/lot/property/producer/legal_entity/shipment/group/
 * document (engines, artifact-model). Tipo ausente (item antigo/não classificado)
 * cai no neutro — sem inventar rótulo.
 */
export type ArtifactType =
  | "animal"
  | "commodity"
  | "lot"
  | "property"
  | "producer"
  | "legal_entity"
  | "shipment"
  | "group"
  | "document";

export interface ArtifactPresentation {
  icon: LucideIcon;
  /** Rótulo humano pt-BR. */
  label: string;
  /** Classes Tailwind bg + text (servem pro chip do ícone e pro badge). */
  accent: string;
  /** false quando o tipo é desconhecido/ausente — UI evita mostrar o rótulo. */
  known: boolean;
}

const PRESENTATIONS: Record<ArtifactType, Omit<ArtifactPresentation, "known">> = {
  animal: { icon: PawPrint, label: "Animal", accent: "bg-amber-500/10 text-amber-700" },
  commodity: { icon: Wheat, label: "Commodity", accent: "bg-lime-500/10 text-lime-700" },
  lot: { icon: Boxes, label: "Lote", accent: "bg-violet-500/10 text-violet-700" },
  property: { icon: Trees, label: "Propriedade", accent: "bg-emerald-500/10 text-emerald-700" },
  producer: { icon: User, label: "Produtor", accent: "bg-orange-500/10 text-orange-700" },
  legal_entity: { icon: Building2, label: "Pessoa jurídica", accent: "bg-indigo-500/10 text-indigo-700" },
  shipment: { icon: Truck, label: "Remessa", accent: "bg-cyan-500/10 text-cyan-700" },
  group: { icon: Users, label: "Grupo", accent: "bg-rose-500/10 text-rose-700" },
  document: { icon: FileText, label: "Documento", accent: "bg-slate-500/10 text-slate-700" },
};

const NEUTRAL: ArtifactPresentation = {
  icon: Package,
  label: "Item",
  accent: "bg-muted text-muted-foreground",
  known: false,
};

export function getArtifactPresentation(type?: string | null): ArtifactPresentation {
  if (!type) return NEUTRAL;
  const p = PRESENTATIONS[type as ArtifactType];
  return p ? { ...p, known: true } : NEUTRAL;
}

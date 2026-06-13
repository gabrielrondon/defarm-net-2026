export type DemoWorkspaceType =
  | "partner"
  | "producer"
  | "processor"
  | "certifier"
  | "government"
  | "tracker";
export type DemoActorId =
  | "producer"
  | "tracker"
  | "certifier"
  | "processor"
  | "government"
  | "partner"
  | "admin";

export type DemoActor = {
  id: DemoActorId;
  title: string;
  description: string;
  workspaceType: DemoWorkspaceType;
  isAdmin?: boolean;
  email: string;
  password: string;
  defaultRoute: string;
  /** DFID de demo já no circuito da conta, pra emitir nos Studios (quando aplicável). */
  demoDfid?: string;
};

// Contas de demonstração dedicadas (separadas das contas QA seguras). Senha
// genérica de propósito — são throwaway. Cada conta de emissão tem um circuito
// público + item, então os Studios funcionam ao vivo.
export const DEMO_ACTORS: DemoActor[] = [
  {
    id: "producer",
    title: "Produtor Rural",
    description:
      "O dono do rebanho. Vê seus animais com a identidade tokenizada e a prova que abre o mercado premium.",
    workspaceType: "producer",
    email: "qa.producer.1771760943@defarm.net",
    password: "QaProducer#2026!",
    defaultRoute: "/app",
  },
  {
    id: "tracker",
    title: "Rastreadora SISBOV",
    description:
      "Emite os brincos: cada número SISBOV vira um ativo tokenizado (DFID) com QR. A identidade na cria.",
    workspaceType: "tracker",
    email: "qa.tracker.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/studios/brinco",
    demoDfid: "DFID-BEEF-BR-2026-001118-aea0d5",
  },
  {
    id: "certifier",
    title: "Certificadora",
    description:
      "Emite atestados on-chain sobre o animal (raça, orgânico, ambiental, EUDR) — prova pública verificável.",
    workspaceType: "certifier",
    email: "qa.certifier.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/studios/certificate",
    demoDfid: "DFID-BEEF-BR-2026-001119-b8a57a",
  },
  {
    id: "processor",
    title: "Frigorífico",
    description:
      "Cria e concede o selo de bonificação ao lote — prova pública com o nome do frigorífico.",
    workspaceType: "processor",
    email: "qa.processor.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/studios/selo",
    demoDfid: "DFID-BEEF-BR-2026-001120-2305d5",
  },
  {
    id: "government",
    title: "OESA / Órgão sanitário",
    description:
      "Carimba a movimentação por GTA (prova pública) e vê o painel de integridade com alertas de fraude.",
    workspaceType: "government",
    email: "qa.government.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/studios/oesa",
    demoDfid: "DFID-BEEF-BR-2026-001121-a6c5f2",
  },
  {
    id: "partner",
    title: "Parceiro de Dados / Banco",
    description:
      "Consome a rede via API — score de crédito por DFID, verificação, ingestão de dados.",
    workspaceType: "partner",
    email: "qa.partner.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/parceiro",
  },
  {
    id: "admin",
    title: "Administrador DeFarm",
    description: "Gestão de usuários, workspaces, entitlements, jobs e governança.",
    workspaceType: "producer",
    isAdmin: true,
    email: "qa.admin.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/admin/usuarios",
  },
];

export const DEMO_NARRATIVE_ORDER: DemoActorId[] = [
  "producer",
  "tracker",
  "certifier",
  "processor",
  "government",
  "partner",
  "admin",
];

const STORAGE_KEY = "defarm_demo_narrative_v1";

export type DemoNarrativeState = {
  enabled: boolean;
  index: number;
};

export function getDemoActorById(id: DemoActorId): DemoActor | undefined {
  return DEMO_ACTORS.find((actor) => actor.id === id);
}

export function getDemoStepByIndex(index: number): DemoActor | undefined {
  const actorId = DEMO_NARRATIVE_ORDER[index];
  if (!actorId) return undefined;
  return getDemoActorById(actorId);
}

export function readDemoNarrativeState(): DemoNarrativeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoNarrativeState;
    if (typeof parsed?.index !== "number" || typeof parsed?.enabled !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDemoNarrativeState(state: DemoNarrativeState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDemoNarrativeState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

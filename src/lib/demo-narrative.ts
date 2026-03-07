export type DemoWorkspaceType = "partner" | "producer" | "processor" | "certifier" | "government";
export type DemoActorId = "producer" | "partner" | "certifier" | "processor" | "government" | "admin";

export type DemoActor = {
  id: DemoActorId;
  title: string;
  description: string;
  workspaceType: DemoWorkspaceType;
  isAdmin?: boolean;
  email: string;
  password: string;
  defaultRoute: string;
};

export const DEMO_ACTORS: DemoActor[] = [
  {
    id: "producer",
    title: "Produtor Rural",
    description: "Ve claims, propriedades, rebanho e operacao diaria.",
    workspaceType: "producer",
    email: "qa.producer.1771760943@defarm.net",
    password: "QaProducer#2026!",
    defaultRoute: "/app/claims",
  },
  {
    id: "partner",
    title: "Parceiro de Dados",
    description: "Ingestao de dados, fluxo de parceria e monitoramento.",
    workspaceType: "partner",
    email: "qa.partner.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/parceiro",
  },
  {
    id: "certifier",
    title: "OESA / Certificadora",
    description: "Submissao de claims e validacao de conformidade.",
    workspaceType: "certifier",
    email: "qa.certifier.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/claims",
  },
  {
    id: "processor",
    title: "Frigorifico / Processador",
    description: "Acompanhamento de eventos e rastreabilidade operacional.",
    workspaceType: "processor",
    email: "qa.processor.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/eventos",
  },
  {
    id: "government",
    title: "Governo / Agencia Oficial",
    description: "Leitura operacional e contribuicao oficial com contexto regulatorio.",
    workspaceType: "government",
    email: "qa.government.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/governo/docs",
  },
  {
    id: "admin",
    title: "Administrador DeFarm",
    description: "Gestao de usuarios, workspaces, jobs e governanca.",
    workspaceType: "producer",
    isAdmin: true,
    email: "qa.admin.2026@defarm.net",
    password: "DeFarmQA#2026!",
    defaultRoute: "/app/admin/usuarios",
  },
];

export const DEMO_NARRATIVE_ORDER: DemoActorId[] = [
  "producer",
  "partner",
  "certifier",
  "processor",
  "government",
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

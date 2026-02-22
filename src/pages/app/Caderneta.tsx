import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CadernetaResumo,
  CadernetaRebanho,
  CadernetaCompliance,
  CadernetaFinanceiro,
  CadernetaAgente,
} from "@/components/caderneta";
import { BookOpen, Package, Shield, Landmark, Bot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const tabs = [
  { value: "resumo", label: "Resumo", icon: BookOpen },
  { value: "rebanho", label: "Rebanho", icon: Package },
  { value: "compliance", label: "Compliance", icon: Shield },
  { value: "financeiro", label: "Financeiro", icon: Landmark },
  { value: "agente", label: "AI Agent", icon: Bot },
] as const;

export default function Caderneta() {
  const { user } = useAuth();
  const workspaceType = user?.workspace_type || "producer";
  const isAdmin = !!user?.is_admin;

  const profileLabels: Record<string, string> = {
    producer: "Produtor",
    partner: "Parceiro de dados",
    certifier: "Autoridade sanitária / Certificadora",
    processor: "Frigorifico / Processador",
  };

  const profileDescriptions: Record<string, string> = {
    producer: "Consolide rebanho, propriedades e rastreabilidade para acelerar decisao no campo.",
    partner: "Ingerir dados com qualidade e comprovar valor operacional para seus clientes.",
    certifier: "Validar claims, acompanhar movimentacoes e fortalecer governanca dos dados.",
    processor: "Acompanhar eventos e lotes com trilha rastreavel ponta a ponta.",
  };

  const quickActions = isAdmin
    ? [
        { label: "Gerenciar usuarios", href: "/app/admin/usuarios" },
        { label: "Gerenciar workspaces", href: "/app/admin/usuarios" },
        { label: "Fila de jobs", href: "/app/admin/jobs" },
      ]
    : workspaceType === "partner"
      ? [
          { label: "Portal parceiro", href: "/app/parceiro" },
          { label: "Ingerir itens", href: "/app/itens" },
          { label: "Eventos da operacao", href: "/app/eventos" },
        ]
      : workspaceType === "certifier"
        ? [
            { label: "Revisar claims", href: "/app/claims" },
            { label: "Auditoria", href: "/app/auditoria" },
            { label: "Eventos", href: "/app/eventos" },
          ]
        : workspaceType === "processor"
          ? [
              { label: "Eventos", href: "/app/eventos" },
              { label: "Itens", href: "/app/itens" },
              { label: "Circuitos", href: "/app/circuitos" },
            ]
          : [
              { label: "Minhas propriedades", href: "/app/claims" },
              { label: "Rebanho por propriedade", href: "/app/propriedades/rebanho" },
              { label: "Circuitos", href: "/app/circuitos" },
            ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Minha Caderneta
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tudo sobre sua operação em um só lugar.
        </p>
      </div>

      <Card className="mb-6 border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Visao do workspace: {isAdmin ? "Administrador" : profileLabels[workspaceType] || workspaceType}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {isAdmin
              ? "Controle central de usuarios, workspaces, jobs e qualidade da operacao."
              : profileDescriptions[workspaceType] || "Painel personalizado por perfil de operacao."}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.href + action.label} variant="outline" size="sm" asChild>
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted rounded-xl mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo"><CadernetaResumo /></TabsContent>
        <TabsContent value="rebanho"><CadernetaRebanho /></TabsContent>
        <TabsContent value="compliance"><CadernetaCompliance /></TabsContent>
        <TabsContent value="financeiro"><CadernetaFinanceiro /></TabsContent>
        <TabsContent value="agente"><CadernetaAgente /></TabsContent>
      </Tabs>
    </div>
  );
}

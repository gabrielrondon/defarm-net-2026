import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PartnerOverview,
  PartnerKit,
  PartnerRouting,
  PartnerIntake,
} from "@/components/partner";
import { BarChart3, PackageOpen, Route, Database, BookOpen, FlaskConical, ExternalLink } from "lucide-react";

const tabs = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "kit", label: "Kit Parceiro", icon: PackageOpen },
  { value: "routing", label: "Roteamento", icon: Route },
  { value: "intake", label: "Intake", icon: Database },
] as const;

export default function PartnerPortal() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("overview");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="section-label mb-1">Parceiro</p>
        <h1 className="text-foreground">Portal do Parceiro</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
          Envie dados, acompanhe processamento e mantenha o roteamento dos seus clientes.
        </p>
      </div>

      <Card className="mb-6 p-4 md:p-5 border-primary/20 bg-primary/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Integração rápida do parceiro</p>
            <p className="text-xs text-muted-foreground mt-1">
              A documentação oficial é a fonte de verdade. Use o Playground no portal para validar com sua chave real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild>
              <a href="https://docs.defarm.net/docs/getting-started" target="_blank" rel="noreferrer">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Docs oficiais
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("intake")}>
              <FlaskConical className="h-4 w-4 mr-1.5" />
              Playground (preview)
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://docs.defarm.net/docs/api#upload" target="_blank" rel="noreferrer">
                API / Upload
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as (typeof tabs)[number]["value"])} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-0.5 bg-transparent border-b border-border rounded-none mb-8 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap rounded-lg data-[state=active]:bg-muted data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground border-0"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {activeTab === "overview" ? <PartnerOverview /> : null}
          {activeTab === "kit" ? <PartnerKit /> : null}
          {activeTab === "routing" ? <PartnerRouting /> : null}
          {activeTab === "intake" ? <PartnerIntake /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

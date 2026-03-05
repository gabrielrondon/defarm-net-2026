import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  PartnerOverview,
  PartnerRouting,
  PartnerIntake,
} from "@/components/partner";
import { BarChart3, Route, Database } from "lucide-react";

const tabs = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "routing", label: "Roteamento", icon: Route },
  { value: "intake", label: "Intake", icon: Database },
] as const;

export default function PartnerPortal() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("overview");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="section-label mb-1">Parceiro</p>
        <h1 className="text-foreground">Portal do Parceiro</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
          Envie dados, acompanhe processamento e gerencie o roteamento dos seus clientes.
        </p>
      </div>

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
          {activeTab === "routing" ? <PartnerRouting /> : null}
          {activeTab === "intake" ? <PartnerIntake /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

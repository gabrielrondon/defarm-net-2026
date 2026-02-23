import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  PartnerOverview,
  PartnerKit,
  PartnerRouting,
  PartnerIntake,
} from "@/components/partner";
import { BarChart3, PackageOpen, Route, Database } from "lucide-react";

const tabs = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "kit", label: "Kit Parceiro", icon: PackageOpen },
  { value: "routing", label: "Roteamento", icon: Route },
  { value: "intake", label: "Intake", icon: Database },
] as const;

export default function PartnerPortal() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("overview");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Portal do Parceiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie dados, acompanhe processamento e mantenha o roteamento dos seus clientes.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as (typeof tabs)[number]["value"])} className="w-full">
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PartnerOverview,
  PartnerIntegration,
  PartnerDataFlow,
  PartnerAdapters,
  PartnerKit,
} from "@/components/partner";
import { BarChart3, Key, ArrowRightLeft, Plug, PackageOpen } from "lucide-react";

const tabs = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "kit", label: "Kit Parceiro", icon: PackageOpen },
  { value: "integration", label: "Integração", icon: Key },
  { value: "dataflow", label: "Fluxo de Dados", icon: ArrowRightLeft },
  { value: "adapters", label: "Adaptadores", icon: Plug },
] as const;

export default function PartnerPortal() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Portal do Parceiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua integração, monitore dados e configure adaptadores.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
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

        <TabsContent value="overview"><PartnerOverview /></TabsContent>
        <TabsContent value="kit"><PartnerKit /></TabsContent>
        <TabsContent value="integration"><PartnerIntegration /></TabsContent>
        <TabsContent value="dataflow"><PartnerDataFlow /></TabsContent>
        <TabsContent value="adapters"><PartnerAdapters /></TabsContent>
      </Tabs>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CadernetaResumo,
  CadernetaRebanho,
  CadernetaCompliance,
  CadernetaFinanceiro,
  CadernetaAgente,
} from "@/components/caderneta";
import { BookOpen, Package, Shield, Landmark, Bot } from "lucide-react";

const tabs = [
  { value: "resumo", label: "Resumo", icon: BookOpen },
  { value: "rebanho", label: "Rebanho", icon: Package },
  { value: "compliance", label: "Compliance", icon: Shield },
  { value: "financeiro", label: "Financeiro", icon: Landmark },
  { value: "agente", label: "AI Agent", icon: Bot },
] as const;

export default function Caderneta() {
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

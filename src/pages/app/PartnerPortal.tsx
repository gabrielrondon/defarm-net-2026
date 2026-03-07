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
import { BarChart3, PackageOpen, Route, Database, BookOpen, FlaskConical, ExternalLink, Languages } from "lucide-react";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

const tabs = [
  { value: "overview", label: { "pt-BR": "Visão Geral", en: "Overview" }, icon: BarChart3 },
  { value: "kit", label: { "pt-BR": "Kit Parceiro", en: "Partner Kit" }, icon: PackageOpen },
  { value: "routing", label: { "pt-BR": "Roteamento", en: "Routing" }, icon: Route },
  { value: "intake", label: { "pt-BR": "Intake", en: "Intake" }, icon: Database },
] as const;

export default function PartnerPortal() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("overview");
  const { locale, setLocale } = usePartnerPortalLocale();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="section-label mb-1">Parceiro</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-foreground">{locale === "en" ? "Partner Portal" : "Portal do Parceiro"}</h1>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
            <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <Button
              size="sm"
              variant={locale === "pt-BR" ? "default" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setLocale("pt-BR")}
            >
              PT-BR
            </Button>
            <Button
              size="sm"
              variant={locale === "en" ? "default" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
          {locale === "en"
            ? "Send data, monitor processing, and manage client routing."
            : "Envie dados, acompanhe processamento e mantenha o roteamento dos seus clientes."}
        </p>
      </div>

      <Card className="mb-6 p-4 md:p-5 border-primary/20 bg-primary/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {locale === "en" ? "Quick partner integration" : "Integração rápida do parceiro"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "en"
                ? "Official docs are the source of truth. Use the portal Playground to validate with your real key."
                : "A documentação oficial é a fonte de verdade. Use o Playground no portal para validar com sua chave real."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild>
              <a href="https://docs.defarm.net/docs/getting-started" target="_blank" rel="noreferrer">
                <BookOpen className="h-4 w-4 mr-1.5" />
                {locale === "en" ? "Official docs" : "Docs oficiais"}
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("intake")}>
              <FlaskConical className="h-4 w-4 mr-1.5" />
              {locale === "en" ? "Playground (preview)" : "Playground (preview)"}
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
              <span className="hidden sm:inline">{tab.label[locale]}</span>
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

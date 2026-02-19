import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Lightbulb, AlertTriangle, TrendingUp, Shield } from "lucide-react";

const suggestions = [
  {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    title: "Regularize EUDR",
    description: "Você tem 3 itens sem verificação EUDR — regularize para desbloquear CPR Verde.",
  },
  {
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Oportunidade de crédito",
    description: "Uma nova linha do BNDES foi aberta com taxa de 6% a.a. para pecuária sustentável.",
  },
  {
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-100",
    title: "Compliance 100%",
    description: "Complete a verificação ambiental do CAR para atingir compliance total.",
  },
];

export function CadernetaAgente() {
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground">Meu Agente AI</h3>
        <p className="text-sm text-muted-foreground">
          Seu concierge pessoal — analisa seus dados e sugere as melhores ações.
        </p>
      </div>

      {/* Sugestões inteligentes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Sugestões para você</p>
        </div>

        {suggestions.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className="border-2 border-foreground cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              style={{ boxShadow: "3px 3px 0 0 hsl(var(--foreground))" }}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chat placeholder */}
      <Card className="border-2 border-foreground" style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Pergunte ao seu agente</p>
            <Badge variant="secondary" className="text-xs ml-auto">Em breve</Badge>
          </div>

          {/* Mock chat area */}
          <div className="bg-muted rounded-lg p-4 mb-3 min-h-[120px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              O agente AI estará disponível em breve.<br />
              Ele vai analisar seus dados e responder perguntas sobre sua operação.
            </p>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pergunte algo ao agente..."
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              disabled
            />
            <Button size="sm" disabled className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

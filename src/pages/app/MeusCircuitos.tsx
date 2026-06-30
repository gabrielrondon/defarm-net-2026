import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  getPartnerDefaultCircuit,
  updatePartnerDefaultCircuit,
} from "@/lib/api/partner-routing";
import { Star, Info, Copy, Plus, ArrowRight, Circle } from "lucide-react";

// Estrutura mínima pra enviar um item — a filosofia "2 dados bastam".
const MIN_PAYLOAD = `[
  {
    "sisbov": "105705000000120",   // seu identificador canônico
    "value_chain": "BEEF"           // a cadeia de valor
  }
]`;

export default function MeusCircuitos() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const circuitsQuery = useQuery({ queryKey: ["circuits"], queryFn: () => getCircuits() });
  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });

  const setDefault = useMutation({
    mutationFn: (circuitId: string) => updatePartnerDefaultCircuit(circuitId),
    onSuccess: (data) => {
      toast({
        title: "Circuito padrão atualizado",
        description: `Seus dados sem destino agora caem em "${data.name}".`,
      });
      qc.invalidateQueries({ queryKey: ["partner-default-circuit"] });
    },
    onError: () =>
      toast({ title: "Não foi possível trocar o padrão", variant: "destructive" }),
  });

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: `${what} copiado` });
  };

  const defaultId = defaultQuery.data?.circuit_id;
  const circuits = useMemo(
    () =>
      [...(circuitsQuery.data ?? [])].sort((a, b) =>
        a.id === defaultId ? -1 : b.id === defaultId ? 1 : a.name.localeCompare(b.name),
      ),
    [circuitsQuery.data, defaultId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Circuitos</h1>
          <p className="text-sm text-muted-foreground">
            Cada circuito é um destino dos seus dados. O <strong>padrão</strong> recebe o que você
            envia sem apontar — passe o mouse no <Info className="inline h-3.5 w-3.5" /> de cada um
            pra ver como enviar.
          </p>
        </div>
        <Button asChild>
          <Link to="/app/circuitos/novo">
            <Plus className="h-4 w-4 mr-1" /> Novo circuito
          </Link>
        </Button>
      </div>

      {circuitsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : circuits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem circuitos. Crie o primeiro pra começar a receber dados.
            </p>
            <Button asChild>
              <Link to="/app/circuitos/novo">
                <Plus className="h-4 w-4 mr-1" /> Criar circuito
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {circuits.map((c) => {
            const isDefault = c.id === defaultId;
            const targetRef = c.slug || c.id;
            return (
              <Card
                key={c.id}
                className={isDefault ? "border-primary/50 ring-1 ring-primary/20" : ""}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/app/circuitos/${c.id}`}
                      className="font-semibold text-foreground hover:underline truncate"
                    >
                      {c.name}
                    </Link>
                    {isDefault ? (
                      <Badge className="shrink-0 gap-1">
                        <Star className="h-3 w-3" /> Padrão
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                        {c.visibility}
                      </Badge>
                    )}
                  </div>

                  {isDefault ? (
                    <p className="text-xs text-muted-foreground">
                      Os dados que você envia <strong>sem apontar circuito</strong> caem aqui
                      automaticamente.
                    </p>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Pra mandar pra cá, aponte este circuito:</p>
                      <button
                        type="button"
                        onClick={() => copy(targetRef, "Identificador do circuito")}
                        className="font-mono text-[11px] text-foreground inline-flex items-center gap-1 hover:text-primary"
                      >
                        {targetRef} <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isDefault ? (
                      <span className="text-[11px] text-primary inline-flex items-center gap-1">
                        <Circle className="h-2 w-2 fill-current" /> recebendo por padrão
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDefault.mutate(c.id)}
                        disabled={setDefault.isPending}
                      >
                        <Star className="h-3.5 w-3.5 mr-1" /> Tornar padrão
                      </Button>
                    )}

                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Como enviar"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground">
                            Como enviar pra "{c.name}"
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {isDefault
                              ? "Com sua chave de Recepção inteligente, basta enviar — cai aqui por padrão."
                              : "Use uma chave de API específica deste circuito (ou uma regra de roteamento)."}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            O mínimo de cada item é só identificador + cadeia:
                          </p>
                          <pre className="bg-muted/50 rounded-md p-2 text-[10px] font-mono overflow-x-auto text-foreground">
                            {MIN_PAYLOAD}
                          </pre>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => copy(MIN_PAYLOAD, "Exemplo")}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copiar exemplo
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="text-xs h-7">
                              <Link to="/app/parceiro/ingestao">
                                Enviar dados <ArrowRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  getPartnerDefaultCircuit,
  updatePartnerDefaultCircuit,
} from "@/lib/api/partner-routing";
import { Inbox } from "lucide-react";

// Traduz a origem técnica do default p/ linguagem do usuário (sem jargão).
const SOURCE_LABEL: Record<string, string> = {
  ApiKeyMetadata: "definido na sua chave de API",
  WorkspaceSetting: "definido por você",
  PartnerStagingFlag: "padrão automático do workspace",
  Fallback: "automático (circuito mais antigo)",
};

/**
 * Circuito padrão — "onde meus dados caem quando não especifico um circuito".
 * Antes só era resolvido por trás (mágica escondida); aqui o parceiro VÊ e ESCOLHE.
 */
export function DefaultCircuitCard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });
  const circuitsQuery = useQuery({
    queryKey: ["circuits-for-default"],
    queryFn: () => getCircuits(),
  });

  const mutation = useMutation({
    mutationFn: (circuitId: string) => updatePartnerDefaultCircuit(circuitId),
    onSuccess: (data) => {
      toast({
        title: "Circuito padrão atualizado",
        description: `Seus dados vão para "${data.name}" quando você não especificar um circuito.`,
      });
      qc.invalidateQueries({ queryKey: ["partner-default-circuit"] });
    },
    onError: () =>
      toast({
        title: "Não foi possível atualizar o circuito padrão",
        variant: "destructive",
      }),
  });

  const current = defaultQuery.data;
  const circuits = circuitsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          Circuito padrão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          É para onde seus dados vão quando você <strong>não</strong> especifica um
          circuito no envio. Apontar um circuito é sempre opcional — no mínimo, basta o
          identificador e a cadeia de valor.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Destino padrão
          </label>
          <Select
            value={current?.circuit_id ?? ""}
            onValueChange={(v) => mutation.mutate(v)}
            disabled={mutation.isPending || defaultQuery.isLoading}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue
                placeholder={defaultQuery.isLoading ? "Carregando…" : "Escolha um circuito"}
              />
            </SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {current && (
          <p className="text-[11px] text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{current.name}</span>
            {current.source ? ` · ${SOURCE_LABEL[current.source] ?? current.source}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

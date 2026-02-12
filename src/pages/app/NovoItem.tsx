import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Package,
  Wheat,
  MapPin,
  Calendar,
  Network,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createItem, getCircuits, CreateItemRequest } from "@/lib/defarm-api";

const valueChainOptions = [
  { value: "bovino", label: "Bovino" },
  { value: "cafe", label: "Café" },
  { value: "soja", label: "Soja" },
  { value: "milho", label: "Milho" },
  { value: "algodao", label: "Algodão" },
  { value: "frango", label: "Frango" },
  { value: "suino", label: "Suíno" },
  { value: "outro", label: "Outro" },
];

const countryOptions = [
  { value: "BR", label: "Brasil" },
  { value: "AR", label: "Argentina" },
  { value: "PY", label: "Paraguai" },
  { value: "UY", label: "Uruguai" },
  { value: "US", label: "Estados Unidos" },
  { value: "other", label: "Outro" },
];

export default function NovoItem() {
  const [valueChain, setValueChain] = useState("bovino");
  const [country, setCountry] = useState("BR");
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [circuitId, setCircuitId] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: circuits = [], isLoading: isLoadingCircuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateItemRequest) => createItem(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: response.was_deduplicated ? "Item enriquecido!" : "Item criado!",
        description: response.was_deduplicated
          ? "Um item existente foi enriquecido com os novos dados."
          : "O item foi cadastrado com sucesso.",
      });
      navigate(`/app/itens/${response.item.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar item",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      value_chain: valueChain,
      country,
      year,
      circuit_id: circuitId || null,
      user_id: user?.id || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-foreground">Novo Item</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre um novo item para rastreamento
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item details */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Dados do Item</h2>
              <p className="text-sm text-muted-foreground">
                Informe a cadeia de valor, país e ano/safra
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value_chain" className="flex items-center gap-2">
                <Wheat className="h-4 w-4 text-muted-foreground" />
                Cadeia de Valor *
              </Label>
              <Select value={valueChain} onValueChange={setValueChain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {valueChainOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                País *
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Ano / Safra *
              </Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="circuit_id" className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                Circuito
              </Label>
              <Select value={circuitId} onValueChange={setCircuitId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCircuits ? "Carregando..." : "Selecione um circuito"} />
                </SelectTrigger>
                <SelectContent>
                  {circuits.map((circuit) => (
                    <SelectItem key={circuit.id} value={circuit.id}>
                      {circuit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Opcional. Associe o item a um circuito existente.
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Como funciona?
              </p>
              <p className="text-xs text-muted-foreground">
                O item será criado e receberá um DFID único. Ele poderá ser enviado para circuitos 
                de compartilhamento para rastreabilidade completa na cadeia de valor.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Criar Item
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

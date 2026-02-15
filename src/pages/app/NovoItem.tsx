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
  Tag,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createItem, getCircuits, listCanonicalIdentifiers, CreateItemRequest, IdentifierInput } from "@/lib/defarm-api";

const valueChainOptions = [
  { value: "BEEF", label: "Bovino" },
  { value: "COFFEE", label: "Café" },
  { value: "SOY", label: "Soja" },
  { value: "CORN", label: "Milho" },
  { value: "COTTON", label: "Algodão" },
  { value: "POULTRY", label: "Frango" },
  { value: "PORK", label: "Suíno" },
  { value: "OTHER", label: "Outro" },
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
  const [valueChain, setValueChain] = useState("BEEF");
  const [country, setCountry] = useState("BR");
  const [year, setYear] = useState(new Date().getFullYear());
  const [circuitId, setCircuitId] = useState("");
  const [identifiers, setIdentifiers] = useState<IdentifierInput[]>([
    { identifier_type: "", value: "", is_canonical: true },
  ]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: circuits = [], isLoading: isLoadingCircuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const { data: canonicalTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ["canonical-identifiers", valueChain],
    queryFn: () => listCanonicalIdentifiers(valueChain),
    enabled: !!valueChain,
  });

  const activeTypes = canonicalTypes.filter((t) => t.is_active);

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

  const handleValueChainChange = (vc: string) => {
    setValueChain(vc);
    // Reset identifiers when value chain changes
    setIdentifiers([{ identifier_type: "", value: "", is_canonical: true }]);
  };

  const updateIdentifier = (index: number, field: keyof IdentifierInput, val: string | boolean) => {
    setIdentifiers((prev) =>
      prev.map((id, i) => (i === index ? { ...id, [field]: val } : id))
    );
  };

  const addIdentifier = () => {
    setIdentifiers((prev) => [...prev, { identifier_type: "", value: "", is_canonical: false }]);
  };

  const removeIdentifier = (index: number) => {
    if (identifiers.length <= 1) return;
    setIdentifiers((prev) => prev.filter((_, i) => i !== index));
  };

  const hasValidIdentifier = identifiers.some(
    (id) => id.identifier_type.trim() && id.value.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validIdentifiers = identifiers.filter(
      (id) => id.identifier_type.trim() && id.value.trim()
    );

    if (validIdentifiers.length === 0) {
      toast({
        title: "Identificador obrigatório",
        description: "Informe ao menos um identificador canônico para criar o item.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      value_chain: valueChain,
      country,
      year,
      circuit_id: circuitId || null,
      identifiers: validIdentifiers,
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
              <Select value={valueChain} onValueChange={handleValueChainChange}>
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

        {/* Identifiers section */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Identificadores *</h2>
              <p className="text-sm text-muted-foreground">
                Informe ao menos um identificador canônico (ex: SISBOV, Brinco, GTA)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {identifiers.map((identifier, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Tipo {index === 0 && "(canônico)"}
                  </Label>
                  {activeTypes.length > 0 ? (
                    <Select
                      value={identifier.identifier_type}
                      onValueChange={(v) => updateIdentifier(index, "identifier_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTypes ? "Carregando..." : "Selecione o tipo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTypes.map((t) => (
                          <SelectItem key={t.id} value={t.identifier_type}>
                            {t.identifier_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={isLoadingTypes ? "Carregando..." : "Ex: SISBOV, GTA, Brinco"}
                      value={identifier.identifier_type}
                      onChange={(e) =>
                        updateIdentifier(index, "identifier_type", e.target.value)
                      }
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <Input
                    placeholder="Ex: BR000123456789012"
                    value={identifier.value}
                    onChange={(e) => updateIdentifier(index, "value", e.target.value)}
                  />
                </div>
                {identifiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIdentifier(index)}
                    className="mt-7 p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addIdentifier}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar outro identificador
            </button>
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
                O item será criado e receberá um DFID único. Se já existir um item com o mesmo 
                identificador canônico, ele será enriquecido automaticamente (deduplicação).
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
            disabled={createMutation.isPending || !hasValidIdentifier}
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

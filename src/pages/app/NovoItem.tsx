import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus, 
  Trash2,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createItem, CreateItemRequest, Identifier } from "@/lib/defarm-api";

interface IdentifierInput {
  id: string;
  namespace: string;
  key: string;
  value: string;
  idType: "Canonical" | "Contextual";
}

const namespaceOptions = [
  { value: "bovino", label: "Bovino" },
  { value: "cafe", label: "Café" },
  { value: "soja", label: "Soja" },
  { value: "milho", label: "Milho" },
  { value: "outro", label: "Outro" },
];

const keyOptions = [
  { value: "sisbov", label: "SISBOV", type: "Canonical" },
  { value: "brinco", label: "Brinco/Ear Tag", type: "Contextual" },
  { value: "lote", label: "Lote", type: "Contextual" },
  { value: "gta", label: "GTA", type: "Canonical" },
  { value: "cpf", label: "CPF Produtor", type: "Canonical" },
  { value: "cnpj", label: "CNPJ", type: "Canonical" },
  { value: "car", label: "CAR", type: "Canonical" },
  { value: "custom", label: "Personalizado", type: "Contextual" },
];

export default function NovoItem() {
  const [identifiers, setIdentifiers] = useState<IdentifierInput[]>([
    { id: "1", namespace: "bovino", key: "sisbov", value: "", idType: "Canonical" },
  ]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateItemRequest) => createItem(data),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Item criado!",
        description: `O item foi cadastrado com sucesso.`,
      });
      navigate(`/app/itens/${item.dfid}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar item",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const addIdentifier = () => {
    setIdentifiers([
      ...identifiers,
      { 
        id: Date.now().toString(), 
        namespace: "bovino", 
        key: "brinco", 
        value: "", 
        idType: "Contextual" 
      },
    ]);
  };

  const removeIdentifier = (id: string) => {
    if (identifiers.length > 1) {
      setIdentifiers(identifiers.filter((i) => i.id !== id));
    }
  };

  const updateIdentifier = (id: string, field: keyof IdentifierInput, value: string) => {
    setIdentifiers(identifiers.map((i) => {
      if (i.id === id) {
        const updated = { ...i, [field]: value };
        // Auto-set idType based on key
        if (field === "key") {
          const keyOption = keyOptions.find(k => k.value === value);
          if (keyOption) {
            updated.idType = keyOption.type as "Canonical" | "Contextual";
          }
        }
        return updated;
      }
      return i;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasEmptyValues = identifiers.some(i => !i.value.trim());
    if (hasEmptyValues) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os valores dos identificadores",
        variant: "destructive",
      });
      return;
    }
    
    const apiIdentifiers: Identifier[] = identifiers.map(i => ({
      namespace: i.namespace,
      key: i.key,
      value: i.value.trim(),
      id_type: i.idType,
    }));

    createMutation.mutate({
      identifiers: apiIdentifiers,
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
        {/* Identifiers */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Identificadores</h2>
              <p className="text-sm text-muted-foreground">
                Adicione um ou mais identificadores para o item
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {identifiers.map((identifier, index) => (
              <div
                key={identifier.id}
                className={cn(
                  "p-4 rounded-xl border border-border",
                  index % 2 === 0 ? "bg-muted/30" : "bg-background"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">
                    Identificador {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      identifier.idType === "Canonical" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {identifier.idType === "Canonical" ? "Canônico" : "Contextual"}
                    </span>
                    {identifiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeIdentifier(identifier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Namespace</Label>
                    <Select
                      value={identifier.namespace}
                      onValueChange={(v) => updateIdentifier(identifier.id, "namespace", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaceOptions.map((ns) => (
                          <SelectItem key={ns.value} value={ns.value}>
                            {ns.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={identifier.key}
                      onValueChange={(v) => updateIdentifier(identifier.id, "key", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keyOptions.map((key) => (
                          <SelectItem key={key.value} value={key.value}>
                            {key.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Valor *</Label>
                    <Input
                      value={identifier.value}
                      onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                      placeholder="Ex: BR12345678901234"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addIdentifier}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar identificador
            </Button>
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
                O item será criado localmente (LID) e poderá ser tokenizado ao ser enviado para um circuito com adapter blockchain configurado, gerando um DFID único e imutável.
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

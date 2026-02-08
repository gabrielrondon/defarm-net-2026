import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, GitBranch, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createCircuit, CreateCircuitRequest } from "@/lib/defarm-api";

export default function NovoCircuito() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [circuitType, setCircuitType] = useState("standard");
  const [visibility, setVisibility] = useState("private");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCircuitRequest) => createCircuit(data),
    onSuccess: (circuit) => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast({
        title: "Circuito criado!",
        description: `O circuito "${circuit.name}" foi criado com sucesso.`,
      });
      navigate(`/app/circuitos/${circuit.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar circuito",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      name,
      description,
      circuit_type: circuitType,
      visibility,
      owner_id: user?.id || "anonymous",
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
        <h1 className="text-3xl font-bold text-foreground">Novo Circuito</h1>
        <p className="text-muted-foreground mt-1">
          Crie um novo circuito para compartilhar dados rastreáveis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic info */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Informações básicas</h2>
              <p className="text-sm text-muted-foreground">Nome e descrição do circuito</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do circuito *</Label>
              <Input
                id="name"
                placeholder="Ex: Cadeia Bovina Orgânica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito deste circuito..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="circuit_type">Tipo do circuito</Label>
              <Select value={circuitType} onValueChange={setCircuitType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="supply_chain">Supply Chain</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="audit">Auditoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Visibilidade</h2>
              <p className="text-sm text-muted-foreground">Quem pode ver os dados do circuito</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilidade</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privado</SelectItem>
                <SelectItem value="restricted">Restrito (apenas membros)</SelectItem>
                <SelectItem value="public">Público</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Circuitos públicos podem ser vistos por qualquer pessoa com o link
            </p>
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
            disabled={createMutation.isPending || !name}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Criar Circuito
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

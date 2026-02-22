import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, GitBranch, Shield, Globe, Eye, Search as SearchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCircuit, updateCircuit } from "@/lib/defarm-api";
import type { UpdateCircuitRequest } from "@/lib/api/types";
import { isCircuitPublic } from "@/lib/circuit-ui";

export default function EditarCircuito() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<string>("private");
  const [status, setStatus] = useState<string>("Active");
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);
  const [searchable, setSearchable] = useState(false);
  const [allowJoinRequests, setAllowJoinRequests] = useState(true);
  const [publicSlug, setPublicSlug] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicWebsite, setPublicWebsite] = useState("");

  // Fetch circuit data
  const { data: circuit, isLoading: isLoadingCircuit } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id!),
    enabled: !!id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (circuit) {
      setName(circuit.name);
      setDescription(circuit.description || "");
      setVisibility(circuit.visibility || "private");
      setStatus(circuit.status || "Active");
      setDiscoveryEnabled(circuit.discovery_enabled || false);
      setSearchable(circuit.searchable || false);
      setAllowJoinRequests(circuit.allow_join_requests ?? true);
      setPublicSlug(circuit.public_slug || "");
      setPublicDescription(circuit.public_description || "");
      setPublicContactEmail(circuit.public_contact_email || "");
      setPublicWebsite(circuit.public_website || "");
    }
  }, [circuit]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCircuitRequest) =>
      updateCircuit(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      toast({
        title: "Circuito atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      navigate(`/app/circuitos/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description,
      status,
      visibility,
      discovery_enabled: visibility === "public" ? discoveryEnabled : false,
      searchable: visibility === "public" ? searchable : false,
      allow_join_requests: visibility === "public" ? allowJoinRequests : false,
      public_slug: visibility === "public" ? publicSlug || null : null,
      public_description: visibility === "public" ? publicDescription : null,
      public_contact_email: visibility === "public" ? publicContactEmail : null,
      public_website: visibility === "public" ? publicWebsite : null,
    });
  };

  if (isLoadingCircuit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Circuito não encontrado
        </h1>
        <Button onClick={() => navigate("/app/circuitos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Circuitos
        </Button>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-foreground">Editar Circuito</h1>
        <p className="text-muted-foreground mt-1">
          Atualize as informações do circuito "{circuit.name}"
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

          <div className="space-y-2">
            <Label htmlFor="status">Status operacional</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Ativo</SelectItem>
                <SelectItem value="Inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {status === "Active"
                ? "Ativo: o circuito aparece como operacional e entra nos fluxos padrão."
                : "Inativo: mantém histórico, mas sai dos fluxos operacionais principais."}
            </p>
          </div>
        </div>

        {/* Discovery & Public Profile */}
        {isCircuitPublic(visibility) && (
          <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Discovery & Perfil Público</h2>
                <p className="text-sm text-muted-foreground">Configure como seu circuito aparece para o público</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar discovery</Label>
                  <p className="text-xs text-muted-foreground">Permite que outros encontrem seu circuito</p>
                </div>
                <Switch checked={discoveryEnabled} onCheckedChange={setDiscoveryEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pesquisável</Label>
                  <p className="text-xs text-muted-foreground">Aparece em buscas de circuitos públicos</p>
                </div>
                <Switch checked={searchable} onCheckedChange={setSearchable} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Aceitar solicitações de entrada</Label>
                  <p className="text-xs text-muted-foreground">Permite que visitantes solicitem participação</p>
                </div>
                <Switch checked={allowJoinRequests} onCheckedChange={setAllowJoinRequests} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicSlug">URL pública (slug)</Label>
                <Input
                  id="publicSlug"
                  placeholder="meu-circuito"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Link público: {window.location.origin}/c/{publicSlug || circuit.id}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicDescription">Descrição pública</Label>
                <Textarea
                  id="publicDescription"
                  placeholder="Descrição visível na página pública..."
                  value={publicDescription}
                  onChange={(e) => setPublicDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicContactEmail">Email de contato público</Label>
                <Input
                  id="publicContactEmail"
                  type="email"
                  placeholder="contato@fazenda.com"
                  value={publicContactEmail}
                  onChange={(e) => setPublicContactEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicWebsite">Website</Label>
                <Input
                  id="publicWebsite"
                  type="url"
                  placeholder="https://suafazenda.com.br"
                  value={publicWebsite}
                  onChange={(e) => setPublicWebsite(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

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
            disabled={updateMutation.isPending || !name}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

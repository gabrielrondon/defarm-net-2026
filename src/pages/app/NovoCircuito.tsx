import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, ArrowRight, Loader2, GitBranch, Shield, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NovoCircuito() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adapterType, setAdapterType] = useState("none");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real app, this would call createCircuit from the API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      
      toast({
        title: "Circuito criado!",
        description: `O circuito "${name}" foi criado com sucesso.`,
      });
      
      navigate("/app/circuitos");
    } catch (error) {
      toast({
        title: "Erro ao criar circuito",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito deste circuito..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Storage adapter */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Armazenamento</h2>
              <p className="text-sm text-muted-foreground">Configure o adapter de blockchain</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adapter">Adapter de armazenamento</Label>
              <Select value={adapterType} onValueChange={setAdapterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem blockchain (apenas local)</SelectItem>
                  <SelectItem value="StellarTestnetIpfs">Stellar Testnet + IPFS</SelectItem>
                  <SelectItem value="StellarMainnetIpfs">Stellar Mainnet + IPFS (Enterprise)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O adapter determina onde os dados serão armazenados de forma imutável
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Requer aprovação para push</p>
                <p className="text-xs text-muted-foreground">
                  Novos itens precisam de aprovação antes de entrar no circuito
                </p>
              </div>
              <Switch
                checked={requiresApproval}
                onCheckedChange={setRequiresApproval}
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

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Circuito público</p>
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa com o link pode ver os dados publicados
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
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
            disabled={isLoading || !name || !description}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {isLoading ? (
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

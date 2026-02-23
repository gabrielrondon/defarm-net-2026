import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Key,
  Plus,
  Loader2,
  Bell,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listPartnerApiKeys,
} from "@/lib/api/admin";
import { getWebhooks } from "@/lib/api/webhooks";
import { getCircuits } from "@/lib/api/circuits";
import type {
  PartnerApiKeyResponse,
  Webhook,
  Circuit,
} from "@/lib/api/types";
import { useNavigate } from "react-router-dom";

export function PartnerIntegration() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<PartnerApiKeyResponse[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysData, webhooksData, circuitsData] = await Promise.all([
        listPartnerApiKeys(),
        getWebhooks(),
        getCircuits(),
      ]);
      setKeys(keysData);
      setWebhooks(webhooksData);
      setCircuits(circuitsData);
    } catch (err) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível buscar informações de integração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCircuitName = (circuitId: string) =>
    circuits.find((c) => c.id === circuitId)?.name || circuitId.slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <Button size="sm" onClick={() => navigate("/app/api-keys")}>
            <Plus className="h-4 w-4 mr-1" />
            Gerenciar
          </Button>
        </div>

        <Card className="overflow-hidden">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma API Key criada
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {key.circuit_id ? getCircuitName(key.circuit_id) : "workspace"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.is_active ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="opacity-60">
                          Revogada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Webhooks</h2>
        </div>

        <Card className="overflow-hidden">
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum webhook configurado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {wh.url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {getCircuitName(wh.circuit_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {wh.is_active ? (
                        <div className="flex items-center gap-1 text-primary text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Ativo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <XCircle className="h-4 w-4" />
                          Inativo
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Inline docs */}
      <Card className="p-6 bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          📖 Documentação Rápida
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use suas API Keys para enviar dados via REST API. Webhooks notificam
          seu sistema quando eventos ocorrem nos circuitos.
        </p>
        <div className="bg-background rounded-lg p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
          <pre>{`POST /api/items/bulk
x-api-key: <sua-api-key>
Content-Type: multipart/form-data

file=@dados.csv
circuit_id=<uuid-do-circuito>
template_id=<uuid-do-template>
idempotency_key=<chave-unica-do-lote>

# Mesmo endpoint usado no upload CSV/JSON do frontend.
# Resultado retorna ingestion_receipt com score de qualidade e replay idempotente.`}</pre>
        </div>
      </Card>
    </div>
  );
}

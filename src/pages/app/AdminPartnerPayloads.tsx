import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listRawPayloads, downloadRawPayload, type RawPayloadSummary } from "@/lib/api/partner-routing";
import { listWorkspaces, type AdminWorkspace } from "@/lib/api/admin-users";

export default function AdminPartnerPayloads() {
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState<string>("all");
  const [limit, setLimit] = useState<number>(100);
  const [search, setSearch] = useState<string>("");

  const workspacesQuery = useQuery({
    queryKey: ["admin-workspaces-all"],
    queryFn: listWorkspaces,
  });

  const payloadsQuery = useQuery({
    queryKey: ["admin-partner-payloads", workspaceId, limit],
    queryFn: () => listRawPayloads(limit, workspaceId === "all" ? undefined : workspaceId),
  });

  const partnerWorkspaces = useMemo(
    () => (workspacesQuery.data || []).filter((w: AdminWorkspace) => w.workspace_type === "partner"),
    [workspacesQuery.data]
  );

  const rows = payloadsQuery.data?.rows || [];
  const filteredRows = rows.filter((row: RawPayloadSummary) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (row.file_name || "").toLowerCase().includes(q) ||
      row.payload_sha256.toLowerCase().includes(q) ||
      row.workspace_id.toLowerCase().includes(q) ||
      (row.error_message || "").toLowerCase().includes(q)
    );
  });

  const workspaceLabel = (id: string) => {
    const ws = partnerWorkspaces.find((w) => w.id === id);
    return ws ? `${ws.name} (${ws.slug})` : id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payloads Brutos de Parceiros</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta global (admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar workspace parceiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os workspaces parceiros</SelectItem>
                {partnerWorkspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name} ({ws.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 registros</SelectItem>
                <SelectItem value="100">100 registros</SelectItem>
                <SelectItem value="200">200 registros</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por arquivo/hash/workspace/erro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => payloadsQuery.refetch()}
              disabled={payloadsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${payloadsQuery.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <span className="text-xs text-muted-foreground">
              {payloadsQuery.isLoading ? "Carregando..." : `${filteredRows.length} registro(s)`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Criado em</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arquivo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tamanho</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SHA256</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {workspaceLabel(row.workspace_id)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.file_name || "payload.json"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.status}
                      {row.error_message ? (
                        <div className="text-destructive mt-1">{row.error_message}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.payload_size_bytes.toLocaleString("pt-BR")} bytes
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {row.payload_sha256.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { blob, fileName } = await downloadRawPayload(row.id, {
                              suggestedFileName: row.file_name,
                              contentType: row.content_type,
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (e: any) {
                            toast({
                              title: "Falha ao baixar payload",
                              description: e?.message || "Não foi possível baixar o payload bruto.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    </td>
                  </tr>
                ))}
                {!payloadsQuery.isLoading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum payload encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


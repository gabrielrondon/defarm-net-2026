import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw, Save, PlusCircle, PlayCircle, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  listPartners,
  listHolds,
  upsertEntitlement,
  addBalance,
  releaseHolds,
  type PartnerSummary,
  type UpsertEntitlementRequest,
} from "@/lib/api/partner-entitlements";
import { listWorkspaces, type AdminWorkspace } from "@/lib/api/admin-users";

/** Status de entitlement derivado (workspace partner ⨝ entitlement). */
type EntStatus = "provisioned" | "legacy_unlimited" | "inactive";

/** Uma linha da lista unificada de parceiros: todo workspace_type=partner, tenha ou não entitlement. */
interface PartnerRow {
  workspace_id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  status: EntStatus;
  /** entitlement+usage se provisionado; null se legacy (sem linha). */
  summary: PartnerSummary | null;
}

const STATUS_META: Record<EntStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  provisioned: { label: "Provisionado", variant: "default" },
  legacy_unlimited: { label: "Legacy ∞", variant: "secondary" },
  inactive: { label: "Inativo", variant: "destructive" },
};

type StatusFilter = "all" | EntStatus;

interface FormState {
  workspace_id: string;
  allowed_value_chains: string; // comma-separated in the form
  quota_daily: string;
  quota_monthly: string;
  quota_total: string;
  balance_remaining: string;
  cost_creation: string;
  cost_enrichment: string;
  auto_release: boolean;
  is_active: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  workspace_id: "",
  allowed_value_chains: "DEFARM, BEEF, DAIRY, LAND",
  quota_daily: "50",
  quota_monthly: "",
  quota_total: "500",
  balance_remaining: "10000",
  cost_creation: "100",
  cost_enrichment: "1",
  auto_release: false,
  is_active: true,
  notes: "",
};

function fromSummary(s: PartnerSummary): FormState {
  return {
    workspace_id: s.workspace_id,
    allowed_value_chains: (s.allowed_value_chains || []).join(", "),
    quota_daily: s.quota_daily?.toString() ?? "",
    quota_monthly: s.quota_monthly?.toString() ?? "",
    quota_total: s.quota_total?.toString() ?? "",
    balance_remaining: s.balance_remaining?.toString() ?? "0",
    cost_creation: (s.credit_costs?.creation ?? 100).toString(),
    cost_enrichment: (s.credit_costs?.enrichment ?? 1).toString(),
    auto_release: s.auto_release,
    is_active: s.is_active,
    notes: s.notes ?? "",
  };
}

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function AdminPartnerEntitlements() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [topUp, setTopUp] = useState("");

  const partnersQuery = useQuery({
    queryKey: ["admin-partners"],
    queryFn: listPartners,
  });

  // Busca de workspace pra o admin achar o ID (parceiro novo não está em
  // "provisionados"; ninguém decora UUID). Busca por nome/slug/email/tipo.
  const [wsSearch, setWsSearch] = useState("");
  const workspacesQuery = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: listWorkspaces,
  });
  const workspaceMatches = useMemo(() => {
    const all = workspacesQuery.data ?? [];
    const q = wsSearch.trim().toLowerCase();
    if (!q) return [] as AdminWorkspace[];
    return all
      .filter((w) =>
        [w.name, w.slug, w.owner_email ?? "", w.workspace_type, w.id]
          .some((f) => String(f).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [workspacesQuery.data, wsSearch]);

  const holdsQuery = useQuery({
    queryKey: ["admin-partner-holds", selected],
    queryFn: () => listHolds(selected as string),
    enabled: !!selected,
  });

  const partners = useMemo(() => partnersQuery.data ?? [], [partnersQuery.data]);
  const selectedSummary = useMemo(
    () => partners.find((p) => p.workspace_id === selected) ?? null,
    [partners, selected]
  );

  // Lista unificada de parceiros: TODO workspace_type=partner (do auth-service) mesclado
  // com quem tem entitlement (item-registry). Sem backend novo — junta os dois endpoints
  // que a tela já carrega. Legacy (sem linha) = liberado ilimitado, precisa ficar visível.
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const partnerRows = useMemo<PartnerRow[]>(() => {
    const byId = new Map(partners.map((s) => [s.workspace_id, s]));
    const partnerWorkspaces = (workspacesQuery.data ?? []).filter((w) => w.workspace_type === "partner");
    const rows: PartnerRow[] = partnerWorkspaces.map((w) => {
      const s = byId.get(w.id) ?? null;
      const status: EntStatus = !s ? "legacy_unlimited" : s.is_active ? "provisioned" : "inactive";
      return { workspace_id: w.id, name: w.name, slug: w.slug, owner_email: w.owner_email ?? null, status, summary: s };
    });
    // Defensivo: entitlement cujo workspace não veio na lista de partners (tipo mudou/ausente).
    const covered = new Set(partnerWorkspaces.map((w) => w.id));
    for (const s of partners) {
      if (!covered.has(s.workspace_id)) {
        rows.push({
          workspace_id: s.workspace_id,
          name: `${s.workspace_id.slice(0, 8)}…`,
          slug: "",
          owner_email: null,
          status: s.is_active ? "provisioned" : "inactive",
          summary: s,
        });
      }
    }
    return rows;
  }, [partners, workspacesQuery.data]);

  const statusCounts = useMemo(
    () => ({
      all: partnerRows.length,
      provisioned: partnerRows.filter((r) => r.status === "provisioned").length,
      legacy_unlimited: partnerRows.filter((r) => r.status === "legacy_unlimited").length,
      inactive: partnerRows.filter((r) => r.status === "inactive").length,
    }),
    [partnerRows]
  );

  const visibleRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return partnerRows
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter(
        (r) =>
          !q ||
          [r.name, r.slug, r.owner_email ?? "", r.workspace_id, STATUS_META[r.status].label]
            .some((f) => String(f).toLowerCase().includes(q))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [partnerRows, listSearch, statusFilter]);

  // Workspace legacy atualmente carregado no form de provisionar (pra avisar do landmine).
  const provisioningLegacy = useMemo(
    () => (!selected ? partnerRows.find((r) => r.workspace_id === form.workspace_id.trim() && r.status === "legacy_unlimited") ?? null : null),
    [selected, partnerRows, form.workspace_id]
  );

  const selectRow = (r: PartnerRow) => {
    if (r.summary) {
      setSelected(r.workspace_id); // provisionado/inativo → modo edição
    } else {
      setSelected(null); // legacy → modo provisionar, pré-preenchido
      setForm({ ...EMPTY_FORM, workspace_id: r.workspace_id });
    }
  };

  useEffect(() => {
    if (selectedSummary) setForm(fromSummary(selectedSummary));
  }, [selectedSummary]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.workspace_id.trim()) throw new Error("workspace_id é obrigatório");
      const body: UpsertEntitlementRequest = {
        allowed_value_chains: form.allowed_value_chains
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        quota_daily: numOrNull(form.quota_daily),
        quota_monthly: numOrNull(form.quota_monthly),
        quota_total: numOrNull(form.quota_total),
        balance_remaining: numOrNull(form.balance_remaining),
        credit_costs: {
          creation: Number(form.cost_creation) || 0,
          enrichment: Number(form.cost_enrichment) || 0,
        },
        auto_release: form.auto_release,
        is_active: form.is_active,
        notes: form.notes || null,
      };
      return upsertEntitlement(form.workspace_id.trim(), body);
    },
    onSuccess: (saved) => {
      toast({ title: "Entitlement salvo", description: saved.workspace_id });
      setSelected(saved.workspace_id);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: unknown) =>
      toast({ title: "Falha ao salvar", description: String((e as Error).message), variant: "destructive" }),
  });

  const balanceMutation = useMutation({
    mutationFn: async () => {
      const credits = Number(topUp);
      if (!Number.isFinite(credits) || credits === 0) throw new Error("Informe um valor de créditos");
      return addBalance(form.workspace_id.trim(), credits);
    },
    onSuccess: (saved) => {
      toast({ title: "Saldo recarregado", description: `Novo saldo: ${saved.balance_remaining}` });
      setTopUp("");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: unknown) =>
      toast({ title: "Falha ao recarregar", description: String((e as Error).message), variant: "destructive" }),
  });

  const releaseMutation = useMutation({
    mutationFn: async (req: { hold_ids?: string[]; all?: boolean }) =>
      releaseHolds(selected as string, req),
    onSuccess: (res) => {
      toast({ title: "Holds liberados", description: res.message });
      qc.invalidateQueries({ queryKey: ["admin-partner-holds", selected] });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: unknown) =>
      toast({ title: "Falha ao liberar", description: String((e as Error).message), variant: "destructive" }),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Entitlements de Parceiro</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => partnersQuery.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Partners list — unificada: provisionados + legacy + inativos */}
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3">
            <CardTitle className="text-sm">Parceiros ({statusCounts.all})</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={listSearch}
                placeholder="Buscar por nome, slug, e-mail ou ID…"
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {([
                ["all", `Todos (${statusCounts.all})`],
                ["legacy_unlimited", `Legacy (${statusCounts.legacy_unlimited})`],
                ["provisioned", `Provisionados (${statusCounts.provisioned})`],
                ["inactive", `Inativos (${statusCounts.inactive})`],
              ] as [StatusFilter, string][]).map(([key, label]) => (
                <Button
                  key={key}
                  variant={statusFilter === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                setSelected(null);
                setForm(EMPTY_FORM);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Provisionar novo
            </Button>
            {(partnersQuery.isLoading || workspacesQuery.isLoading) && (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
            {visibleRows.length === 0 && !partnersQuery.isLoading && !workspacesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                {partnerRows.length === 0 ? "Nenhum parceiro encontrado." : "Nenhum parceiro para este filtro/busca."}
              </p>
            )}
            <ul className="divide-y">
              {visibleRows.map((r) => {
                const isSel = selected === r.workspace_id || (!selected && form.workspace_id.trim() === r.workspace_id);
                return (
                  <li key={r.workspace_id}>
                    <button
                      className={`w-full rounded p-2 text-left text-sm hover:bg-muted ${isSel ? "bg-muted" : ""}`}
                      onClick={() => selectRow(r)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{r.name || `${r.workspace_id.slice(0, 8)}…`}</span>
                        <Badge variant={STATUS_META[r.status].variant} className="shrink-0 text-[10px]">
                          {STATUS_META[r.status].label}
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.owner_email ? `${r.owner_email} · ` : ""}
                        {r.slug ? `${r.slug} · ` : ""}
                        {r.workspace_id.slice(0, 8)}…
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.status === "legacy_unlimited"
                          ? "sem cobrança · tokeniza ilimitado"
                          : `saldo ${r.summary?.balance_remaining ?? 0}` +
                            (r.summary?.usage?.holds_pending ? ` · ${r.summary.usage.holds_pending} na fila` : "")}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Edit form + usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {selected ? "Editar entitlement" : "Provisionar entitlement"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {provisioningLegacy && (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{provisioningLegacy.name} está em modo legacy (ilimitado).</p>
                  <p className="mt-1 text-xs">
                    Provisionar cria controle de saldo/quota — o parceiro deixa de tokenizar ilimitado.
                    Só faça com <strong>saldo suficiente</strong>, senão os itens vão para a fila (hold).
                    Deletar o entitlement depois volta ao legacy.
                  </p>
                </div>
              </div>
            )}

            {selectedSummary && (
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-4">
                <Usage label="Hoje" value={selectedSummary.usage.tokenizations_today} />
                <Usage label="Mês" value={selectedSummary.usage.tokenizations_month} />
                <Usage label="Total" value={selectedSummary.usage.tokenizations_total} />
                <Usage
                  label="Saldo"
                  value={selectedSummary.usage.balance_remaining}
                  hint={
                    selectedSummary.usage.entitlement_provisioned
                      ? `${selectedSummary.usage.balance_in_animals} animais`
                      : "ilimitado"
                  }
                />
              </div>
            )}

            {!selected && (
              <Field label="Buscar workspace (nome, slug, e-mail do dono ou tipo)">
                <Input
                  value={wsSearch}
                  placeholder="ex.: nome do parceiro, e-mail, slug…"
                  onChange={(e) => setWsSearch(e.target.value)}
                />
                {workspacesQuery.isLoading && (
                  <p className="mt-1 text-xs text-muted-foreground">Carregando workspaces…</p>
                )}
                {wsSearch.trim() && workspaceMatches.length === 0 && !workspacesQuery.isLoading && (
                  <p className="mt-1 text-xs text-muted-foreground">Nenhum workspace encontrado.</p>
                )}
                {workspaceMatches.length > 0 && (
                  <ul className="mt-1 divide-y rounded-md border">
                    {workspaceMatches.map((w) => (
                      <li key={w.id}>
                        <button
                          type="button"
                          className="w-full p-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setField("workspace_id", w.id);
                            setWsSearch("");
                          }}
                        >
                          <div className="font-medium">
                            {w.name}{" "}
                            <span className="text-xs text-muted-foreground">· {w.workspace_type}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {w.owner_email ? `${w.owner_email} · ` : ""}
                            {w.slug} · {w.id.slice(0, 8)}…
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            )}

            <Field label="Workspace ID">
              <Input
                value={form.workspace_id}
                placeholder="UUID do workspace (use a busca acima pra preencher)"
                disabled={!!selected}
                onChange={(e) => setField("workspace_id", e.target.value)}
              />
              {!selected && form.workspace_id.trim() && (() => {
                const w = (workspacesQuery.data ?? []).find((x) => x.id === form.workspace_id.trim());
                return w ? (
                  <p className="mt-1 text-xs text-green-700">
                    ✓ {w.name} · {w.workspace_type}{w.owner_email ? ` · ${w.owner_email}` : ""}
                  </p>
                ) : null;
              })()}
            </Field>

            <Field label="Value chains permitidos (separados por vírgula)">
              <Input
                value={form.allowed_value_chains}
                placeholder="DEFARM"
                onChange={(e) => setField("allowed_value_chains", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Cota diária">
                <Input value={form.quota_daily} onChange={(e) => setField("quota_daily", e.target.value)} placeholder="∞" />
              </Field>
              <Field label="Cota mensal">
                <Input value={form.quota_monthly} onChange={(e) => setField("quota_monthly", e.target.value)} placeholder="∞" />
              </Field>
              <Field label="Cota total">
                <Input value={form.quota_total} onChange={(e) => setField("quota_total", e.target.value)} placeholder="∞" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Saldo (set absoluto)">
                <Input value={form.balance_remaining} onChange={(e) => setField("balance_remaining", e.target.value)} />
              </Field>
              <Field label="Custo criação">
                <Input value={form.cost_creation} onChange={(e) => setField("cost_creation", e.target.value)} />
              </Field>
              <Field label="Custo enriquecimento">
                <Input value={form.cost_enrichment} onChange={(e) => setField("cost_enrichment", e.target.value)} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.auto_release}
                  onChange={(e) => setField("auto_release", e.target.checked)}
                />
                Auto-liberar (senão tudo vai pra fila)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField("is_active", e.target.checked)}
                />
                Ativo
              </label>
            </div>

            <Field label="Notas">
              <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </Field>

            <div className="flex items-center gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
              {selected && (
                <div className="ml-auto flex items-center gap-2">
                  <Input
                    className="w-32"
                    placeholder="+ créditos"
                    value={topUp}
                    onChange={(e) => setTopUp(e.target.value)}
                  />
                  <Button variant="outline" onClick={() => balanceMutation.mutate()} disabled={balanceMutation.isPending}>
                    Recarregar saldo
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holds queue */}
      {selected && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Fila de tokenizações ({holdsQuery.data?.length ?? 0})</CardTitle>
            <Button
              size="sm"
              onClick={() => releaseMutation.mutate({ all: true })}
              disabled={releaseMutation.isPending || (holdsQuery.data?.length ?? 0) === 0}
            >
              <PlayCircle className="mr-2 h-4 w-4" /> Liberar todos
            </Button>
          </CardHeader>
          <CardContent>
            {holdsQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {(holdsQuery.data?.length ?? 0) === 0 && !holdsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Nenhum item na fila.</p>
            )}
            {(holdsQuery.data?.length ?? 0) > 0 && (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1">Item</th>
                    <th>Value chain</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {holdsQuery.data!.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="py-1 font-mono text-xs">{h.item_id.slice(0, 8)}…</td>
                      <td>{h.value_chain}</td>
                      <td>{h.anchor_type}</td>
                      <td>{h.reason}</td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => releaseMutation.mutate({ hold_ids: [h.id] })}
                          disabled={releaseMutation.isPending}
                        >
                          Liberar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Usage({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

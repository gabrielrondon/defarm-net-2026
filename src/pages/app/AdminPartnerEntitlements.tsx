import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw, Save, PlusCircle, PlayCircle, Search, AlertTriangle, Star } from "lucide-react";
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
import { listValueChainPolicies } from "@/lib/api/value-chains";
import {
  listWorkspaceLabels,
  upsertWorkspaceLabels,
  LABEL_TAGS,
  type UpsertLabelsRequest,
} from "@/lib/api/partner-labels";

/** Status de entitlement derivado (workspace partner ⨝ entitlement). */
type EntStatus = "provisioned" | "legacy_unlimited" | "inactive";

/** Uma linha da lista unificada de parceiros: todo workspace_type=partner, tenha ou não entitlement. */
interface PartnerRow {
  workspace_id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  /** tipo do workspace; pode não ser 'partner' (ex.: producer com entitlement). */
  workspace_type?: AdminWorkspace["workspace_type"];
  status: EntStatus;
  /** entitlement+usage se provisionado; null se legacy (sem linha). */
  summary: PartnerSummary | null;
  /** labels admin (mescladas por workspace_id de /admin/partners/labels). */
  is_favorite: boolean;
  tags: string[];
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

// Defaults SEGUROS pra provisionar sem quebrar o parceiro (o gate segura itens quando
// auto_release=false, is_active=false, ou value-chain fora da lista — ver banner do legacy):
// auto_release=true + quotas ∞ (soft-gate que segura) + saldo generoso. O gate real é o SALDO.
const EMPTY_FORM: FormState = {
  workspace_id: "",
  // Fallback se o catálogo (value_chain_policies) não carregar. O default REAL vem do
  // catálogo em runtime (defaultChains). LAND não existe no catálogo — era código fantasma,
  // e omitir uma cadeia ativa (ex.: COFFEE/SOY) faz o gate segurar (value_chain_blocked).
  allowed_value_chains: "DEFARM, BEEF, DAIRY, COFFEE, SOY",
  quota_daily: "",
  quota_monthly: "",
  quota_total: "",
  balance_remaining: "10000",
  cost_creation: "100",
  cost_enrichment: "1",
  auto_release: true,
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

  // Catálogo de value chains ativas → default de allowed_value_chains ao provisionar
  // (drift-proof: cadeia nova ativa entra sozinha; fantasma não aparece). Ver achado do
  // Hetzner no #184: LAND não existe e COFFEE ativa faltava → value_chain_blocked.
  const valueChainsQuery = useQuery({
    queryKey: ["admin-value-chains"],
    queryFn: () => listValueChainPolicies(true),
  });
  const defaultChains = useMemo(() => {
    const codes = (valueChainsQuery.data ?? []).map((v) => v.code).filter(Boolean);
    return codes.length ? codes.join(", ") : EMPTY_FORM.allowed_value_chains;
  }, [valueChainsQuery.data]);
  const provisionForm = useMemo<FormState>(
    () => ({ ...EMPTY_FORM, allowed_value_chains: defaultChains }),
    [defaultChains]
  );
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

  // Labels admin (favorito/tags/notas) por workspace — mescladas na lista por workspace_id.
  const labelsQuery = useQuery({
    queryKey: ["admin-partner-labels"],
    queryFn: listWorkspaceLabels,
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
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const partnerRows = useMemo<PartnerRow[]>(() => {
    const allWorkspaces = workspacesQuery.data ?? [];
    const wsById = new Map(allWorkspaces.map((w) => [w.id, w]));
    const byId = new Map(partners.map((s) => [s.workspace_id, s]));
    const labelById = new Map((labelsQuery.data ?? []).map((l) => [l.workspace_id, l]));
    const lbl = (id: string) => labelById.get(id);
    const partnerWorkspaces = allWorkspaces.filter((w) => w.workspace_type === "partner");
    const rows: PartnerRow[] = partnerWorkspaces.map((w) => {
      const s = byId.get(w.id) ?? null;
      const status: EntStatus = !s ? "legacy_unlimited" : s.is_active ? "provisioned" : "inactive";
      return {
        workspace_id: w.id, name: w.name, slug: w.slug, owner_email: w.owner_email ?? null,
        workspace_type: w.workspace_type, status, summary: s,
        is_favorite: lbl(w.id)?.is_favorite ?? false, tags: lbl(w.id)?.tags ?? [],
      };
    });
    // Entitlements em workspaces que NÃO são type=partner (ex.: producer com entitlement):
    // ainda pertencem ao painel. Puxa nome/slug/email/tipo REAIS da lista completa de
    // workspaces (não anonimiza) — só cai pro UUID se o workspace realmente não veio.
    const covered = new Set(partnerWorkspaces.map((w) => w.id));
    for (const s of partners) {
      if (covered.has(s.workspace_id)) continue;
      const w = wsById.get(s.workspace_id) ?? null;
      rows.push({
        workspace_id: s.workspace_id,
        name: w?.name ?? `${s.workspace_id.slice(0, 8)}…`,
        slug: w?.slug ?? "",
        owner_email: w?.owner_email ?? null,
        workspace_type: w?.workspace_type,
        status: s.is_active ? "provisioned" : "inactive",
        summary: s,
        is_favorite: lbl(s.workspace_id)?.is_favorite ?? false,
        tags: lbl(s.workspace_id)?.tags ?? [],
      });
    }
    return rows;
  }, [partners, workspacesQuery.data, labelsQuery.data]);

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
      .filter((r) => !tagFilter || r.tags.includes(tagFilter))
      .filter(
        (r) =>
          !q ||
          [r.name, r.slug, r.owner_email ?? "", r.workspace_id, r.workspace_type ?? "", STATUS_META[r.status].label, ...r.tags]
            .some((f) => String(f).toLowerCase().includes(q))
      )
      // favoritos no topo, depois alfabético
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name));
  }, [partnerRows, listSearch, statusFilter, tagFilter]);

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
      setForm({ ...provisionForm, workspace_id: r.workspace_id });
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

  // Labels (favorito/tags) — persistem no backend; invalida a lista ao salvar.
  const labelsMutation = useMutation({
    mutationFn: ({ workspace_id, body }: { workspace_id: string; body: UpsertLabelsRequest }) =>
      upsertWorkspaceLabels(workspace_id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-partner-labels"] }),
    onError: (e: unknown) =>
      toast({ title: "Falha ao salvar label", description: String((e as Error).message), variant: "destructive" }),
  });
  const toggleFavorite = (r: PartnerRow) =>
    labelsMutation.mutate({ workspace_id: r.workspace_id, body: { is_favorite: !r.is_favorite } });
  const toggleTag = (workspaceId: string, current: string[], tag: string) => {
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    labelsMutation.mutate({ workspace_id: workspaceId, body: { tags: next } });
  };

  // Workspace em foco (provisionado selecionado OU o carregado no form de provisionar):
  // é quem recebe a edição de labels no painel de detalhe.
  const focusedWorkspaceId = selected ?? (form.workspace_id.trim() || null);
  const focusedRow = useMemo(
    () => (focusedWorkspaceId ? partnerRows.find((r) => r.workspace_id === focusedWorkspaceId) ?? null : null),
    [partnerRows, focusedWorkspaceId]
  );

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
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">tags:</span>
              {LABEL_TAGS.map((t) => (
                <Button
                  key={t}
                  variant={tagFilter === t ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                >
                  {t}
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
                setForm(provisionForm);
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
                  <li key={r.workspace_id} className="flex items-start gap-1">
                    <button
                      type="button"
                      className="mt-2 shrink-0 rounded p-0.5 hover:bg-muted"
                      title={r.is_favorite ? "Desfavoritar" : "Favoritar"}
                      aria-label={r.is_favorite ? "Desfavoritar" : "Favoritar"}
                      onClick={() => toggleFavorite(r)}
                      disabled={labelsMutation.isPending}
                    >
                      <Star
                        className={`h-4 w-4 ${r.is_favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
                      />
                    </button>
                    <button
                      className={`min-w-0 flex-1 rounded p-2 text-left text-sm hover:bg-muted ${isSel ? "bg-muted" : ""}`}
                      onClick={() => selectRow(r)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{r.name || `${r.workspace_id.slice(0, 8)}…`}</span>
                        <Badge variant={STATUS_META[r.status].variant} className="shrink-0 text-[10px]">
                          {STATUS_META[r.status].label}
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.workspace_type && r.workspace_type !== "partner" ? `${r.workspace_type} · ` : ""}
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
                      {r.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
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
                    Os campos abaixo já vêm com <strong>defaults seguros</strong> (auto-liberar ligado,
                    quotas ∞, saldo generoso) pra não segurar itens; confira o <strong>saldo</strong> —
                    com saldo 0 os itens vão para a fila. Reverter ao ilimitado hoje exige remover o
                    entitlement no backend (não há botão).
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
                  hint={`${selectedSummary.usage.balance_in_animals} animais`}
                />
              </div>
            )}

            {focusedRow && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Labels operacionais</span>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs hover:underline"
                    onClick={() => toggleFavorite(focusedRow)}
                    disabled={labelsMutation.isPending}
                  >
                    <Star
                      className={`h-4 w-4 ${focusedRow.is_favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
                    />
                    {focusedRow.is_favorite ? "Favorito" : "Favoritar"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {LABEL_TAGS.map((t) => {
                    const on = focusedRow.tags.includes(t);
                    return (
                      <Button
                        key={t}
                        variant={on ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => toggleTag(focusedRow.workspace_id, focusedRow.tags, t)}
                        disabled={labelsMutation.isPending}
                      >
                        {t}
                      </Button>
                    );
                  })}
                </div>
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
              <Button
                onClick={() => {
                  // Saldo vazio: em EDIÇÃO o backend faz COALESCE (mantém o saldo atual) → não é 0,
                  // não guardar (achado #184: bloqueava editar só as Notas de um parceiro c/ 5000).
                  // Em PROVISÃO (novo/legacy) vazio vira 0 no INSERT → tratar como 0.
                  const balanceInput = numOrNull(form.balance_remaining);
                  const balance = balanceInput ?? (selected ? null : 0);
                  // Guard: is_active + auto_release + saldo 0 = os itens vão pra fila (no_balance)
                  // silenciosamente. É o landmine que quebra o parceiro. Bloqueia antes de salvar.
                  if (form.is_active && form.auto_release && balance !== null && balance <= 0) {
                    toast({
                      title: "Saldo 0 vai segurar os itens",
                      description:
                        "Com auto-liberar ligado e saldo 0, cada item vai para a fila (no_balance) e o parceiro para de tokenizar. Defina um saldo > 0.",
                      variant: "destructive",
                    });
                    return;
                  }
                  // Confirmar a saída do legacy (transição ilimitado → cobrança por saldo).
                  if (
                    provisioningLegacy &&
                    !window.confirm(
                      `Provisionar "${provisioningLegacy.name}"?\n\n` +
                        "Isto tira o parceiro do modo legacy (tokeniza ilimitado, sem cobrança) e passa a " +
                        "cobrar por saldo. Reverter ao ilimitado hoje exige remover o entitlement no backend " +
                        "(não há botão). Continuar?"
                    )
                  ) {
                    return;
                  }
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" /> {provisioningLegacy ? "Provisionar controle de saldo" : "Salvar"}
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

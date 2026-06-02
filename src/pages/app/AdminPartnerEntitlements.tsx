import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw, Save, PlusCircle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  allowed_value_chains: "DEFARM",
  quota_daily: "50",
  quota_monthly: "",
  quota_total: "500",
  balance_remaining: "200",
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

  const holdsQuery = useQuery({
    queryKey: ["admin-partner-holds", selected],
    queryFn: () => listHolds(selected as string),
    enabled: !!selected,
  });

  const partners = partnersQuery.data ?? [];
  const selectedSummary = useMemo(
    () => partners.find((p) => p.workspace_id === selected) ?? null,
    [partners, selected]
  );

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
        {/* Partners list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Parceiros provisionados</CardTitle>
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
            {partnersQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {partners.length === 0 && !partnersQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Nenhum parceiro provisionado ainda.</p>
            )}
            <ul className="divide-y">
              {partners.map((p) => (
                <li key={p.workspace_id}>
                  <button
                    className={`w-full rounded p-2 text-left text-sm hover:bg-muted ${
                      selected === p.workspace_id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelected(p.workspace_id)}
                  >
                    <div className="font-mono text-xs">{p.workspace_id.slice(0, 8)}…</div>
                    <div className="text-muted-foreground">
                      {(p.allowed_value_chains || []).join(", ") || "—"} · saldo {p.balance_remaining}
                      {p.usage?.holds_pending ? ` · ${p.usage.holds_pending} na fila` : ""}
                      {!p.is_active ? " · inativo" : ""}
                    </div>
                  </button>
                </li>
              ))}
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
            {selectedSummary && (
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-4">
                <Usage label="Hoje" value={selectedSummary.usage.tokenizations_today} />
                <Usage label="Mês" value={selectedSummary.usage.tokenizations_month} />
                <Usage label="Total" value={selectedSummary.usage.tokenizations_total} />
                <Usage label="Saldo" value={selectedSummary.usage.balance_remaining} />
              </div>
            )}

            <Field label="Workspace ID">
              <Input
                value={form.workspace_id}
                placeholder="UUID do workspace do parceiro"
                disabled={!!selected}
                onChange={(e) => setField("workspace_id", e.target.value)}
              />
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

function Usage({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

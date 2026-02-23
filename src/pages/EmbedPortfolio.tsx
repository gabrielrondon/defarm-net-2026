import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getEmbedPortfolio } from "@/lib/api/partner-routing";
import type { EmbedEventProof } from "@/lib/api/partner-routing";
import {
  Loader2,
  ShieldCheck,
  ExternalLink,
  Beef,
  MapPin,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Fingerprint,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

/* ── helpers ────────────────────────────────────────────── */

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function statusLabel(s: string) {
  const map: Record<string, { text: string; className: string }> = {
    active: {
      text: "Ativo",
      className: "bg-primary/10 text-primary",
    },
    inactive: {
      text: "Inativo",
      className: "bg-muted text-muted-foreground",
    },
    deprecated: {
      text: "Depreciado",
      className: "bg-destructive/10 text-destructive",
    },
  };
  const lower = (s || "").toLowerCase();
  return map[lower] || { text: s, className: "bg-muted text-muted-foreground" };
}

/* ── main component ─────────────────────────────────────── */

export default function EmbedPortfolio() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["embed-portfolio", token],
    queryFn: () => getEmbedPortfolio(token),
    enabled: Boolean(token),
    staleTime: 15_000,
  });

  const circuit = useMemo(
    () => (data?.portfolio?.circuit as Record<string, unknown>) || {},
    [data]
  );
  const stats = useMemo(
    () => (data?.portfolio?.stats as Record<string, unknown>) || {},
    [data]
  );
  const items = useMemo(
    () => (data?.portfolio?.recent_items || []) as Record<string, unknown>[],
    [data]
  );
  const proofs = useMemo(() => data?.recent_event_proofs || [], [data]);

  /* ── edge states ── */

  if (!token) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">
            Link inválido
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Este link não contém um token de acesso. Solicite um novo link ao
            seu parceiro de dados.
          </p>
        </div>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            Carregando seus dados…
          </p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">
            Não foi possível carregar
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Verifique se o link ainda é válido ou peça um novo ao seu parceiro.
          </p>
        </div>
      </Shell>
    );
  }

  /* ── derived data ── */

  const circuitName = String(circuit?.name || "Meu Rebanho");
  const circuitDesc = String(
    circuit?.description || "Portfólio de rastreabilidade"
  );

  const totalItems = Number(stats?.total_items || 0);
  const activeItems = Number(stats?.active_items || 0);
  const valueChains = Array.isArray(stats?.value_chains)
    ? (stats.value_chains as string[])
    : [];
  const recentCount = Number(stats?.recent_activity_count || 0);

  const chainLabels: Record<string, string> = {
    BEEF: "Bovinos",
    DAIRY: "Leite",
    PORK: "Suínos",
    POULTRY: "Aves",
  };

  return (
    <Shell>
      <div className="space-y-8">
        {/* ── hero header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-background to-primary/4 border border-primary/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Beef className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {circuitName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{circuitDesc}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium self-start sm:self-center">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verificado
            </div>
          </div>
        </div>

        {/* ── stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Beef className="h-4 w-4" />}
            value={totalItems}
            label="Animais registrados"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            value={activeItems}
            label="Ativos"
            accent
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            value={recentCount}
            label="Movimentações (7d)"
          />
          <StatCard
            icon={<MapPin className="h-4 w-4" />}
            value={valueChains.length}
            label={valueChains.length === 1 ? "Cadeia" : "Cadeias"}
          />
        </div>

        {/* ── value chains ── */}
        {valueChains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {valueChains.map((vc) => (
              <span
                key={vc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-foreground"
              >
                <Beef className="h-3.5 w-3.5 text-primary" />
                {chainLabels[vc] || vc}
              </span>
            ))}
          </div>
        )}

        {/* ── recent items ── */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">
            Últimos registros
          </h2>

          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum animal registrado ainda.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {items.map((item) => {
                const dfid = String(item.dfid || item.id || "");
                const st = statusLabel(String(item.status || ""));
                return (
                  <div
                    key={String(item.id)}
                    className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground font-mono truncate">
                        {dfid.length > 28 ? `${dfid.slice(0, 28)}…` : dfid}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[
                          String(item.value_chain || ""),
                          String(item.country || ""),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        {item.registered_at && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-0.5">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(String(item.registered_at))}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.className}`}
                    >
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── proofs ── */}
        {proofs.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Comprovações recentes
            </h2>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {proofs.map((proof: EmbedEventProof) => (
                <div
                  key={proof.id}
                  className="flex items-center gap-3 px-4 py-3 bg-background"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {proof.event_type}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {proof.stellar_tx_hash && (
                        <a
                          href={`https://stellar.expert/explorer/public/tx/${proof.stellar_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Stellar
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {proof.ipfs_cid && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                          IPFS: {proof.ipfs_cid.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(proof.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}

/* ── sub-components ─────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-bold text-foreground text-sm">DeFarm</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Rastreabilidade verificada
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Dados verificados pela plataforma DeFarm
          </p>
          <a
            href="https://defarm.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            defarm.net
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

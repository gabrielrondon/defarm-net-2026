import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicItem, getPublicItemEvents } from "@/lib/defarm-api";
import logoIcon from "@/assets/logo-icon.png";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#8b5cf6", "#ec4899"];

export default function CompareItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const dfids = idsParam.split(",").filter(Boolean);
  const [newDfid, setNewDfid] = useState("");

  const addDfid = () => {
    const trimmed = newDfid.trim();
    if (trimmed && !dfids.includes(trimmed) && dfids.length < 6) {
      const next = [...dfids, trimmed];
      setSearchParams({ ids: next.join(",") });
      setNewDfid("");
    }
  };

  const removeDfid = (d: string) => {
    const next = dfids.filter((x) => x !== d);
    setSearchParams(next.length ? { ids: next.join(",") } : {});
  };

  return (
    <div className="min-h-screen bg-stone-50/80">
      <header className="border-b border-stone-200/60 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-semibold text-foreground text-sm tracking-tight">Comparador</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {dfids.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono">
              <Link to={`/i/${d}`} className="text-primary hover:underline">{d.length > 30 ? d.slice(0, 15) + "..." + d.slice(-10) : d}</Link>
              <button onClick={() => removeDfid(d)} className="text-stone-400 hover:text-stone-600"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); addDfid(); }} className="inline-flex items-center gap-1.5">
            <input
              value={newDfid}
              onChange={(e) => setNewDfid(e.target.value)}
              placeholder="DFID-DEFARM-BR-..."
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono w-64 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" type="submit" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
          </form>
        </div>

        {dfids.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">Adicione DFIDs para comparar animais lado a lado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <CompareTable dfids={dfids} />
            <CompareWeightChart dfids={dfids} />
          </div>
        )}
      </main>
    </div>
  );
}

function CompareTable({ dfids }: { dfids: string[] }) {
  const queries = dfids.map((dfid) => ({
    item: useQuery({ queryKey: ["compare-item", dfid], queryFn: () => getPublicItem(dfid), retry: 1 }),
    events: useQuery({ queryKey: ["compare-events", dfid], queryFn: () => getPublicItemEvents(dfid, { limit: 50 }), retry: 1 }),
  }));

  const isLoading = queries.some((q) => q.item.isLoading || q.events.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const rows: { label: string; values: string[] }[] = [];

  const items = queries.map((q) => q.item.data);
  const eventSets = queries.map((q) => q.events.data || []);

  rows.push({ label: "DFID", values: items.map((i) => i?.dfid || "—") });
  rows.push({ label: "Raça", values: items.map((i) => String((i?.metadata as any)?.breed || "—")) });
  rows.push({ label: "Sexo", values: items.map((i) => { const s = String((i?.metadata as any)?.sex || ""); return s === "male" ? "Macho" : s === "female" ? "Fêmea" : s || "—"; }) });
  rows.push({ label: "Nascimento", values: items.map((i) => String((i?.metadata as any)?.birth_date || "—")) });
  rows.push({ label: "Status", values: items.map((i) => i?.status || "—") });

  // Weight from metadata
  rows.push({ label: "Peso atual", values: items.map((i) => { const w = (i?.metadata as any)?.weight_kg; return w ? `${w} kg` : "—"; }) });

  // Event counts
  rows.push({ label: "Vacinações", values: eventSets.map((evs) => String(evs.filter((e) => e.event_type === "item_vaccinated").length)) });
  rows.push({ label: "Tratamentos", values: eventSets.map((evs) => String(evs.filter((e) => e.event_type === "item_treated").length)) });
  rows.push({ label: "Pesagens", values: eventSets.map((evs) => String(evs.filter((e) => e.event_type === "item_weighed").length)) });
  rows.push({ label: "Movimentações", values: eventSets.map((evs) => String(evs.filter((e) => e.event_type === "item_movement").length)) });
  rows.push({ label: "Total eventos", values: eventSets.map((evs) => String(evs.length)) });

  // GMD
  rows.push({
    label: "GMD (kg/dia)",
    values: eventSets.map((evs) => {
      const weighings = evs
        .filter((e) => e.event_type === "item_weighed")
        .map((e) => ({ w: (e.payload as any)?.weight_kg as number, d: (e.payload as any)?.occurred_at as string }))
        .filter((x) => x.w && x.d)
        .sort((a, b) => a.d.localeCompare(b.d));
      if (weighings.length < 2) return "—";
      const first = weighings[0];
      const last = weighings[weighings.length - 1];
      const days = (new Date(last.d).getTime() - new Date(first.d).getTime()) / (1000 * 60 * 60 * 24);
      return days > 0 ? ((last.w - first.w) / days).toFixed(2) : "—";
    }),
  });

  return (
    <div className="rounded-xl bg-white border border-stone-200/70 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium p-3 w-36"></th>
            {dfids.map((d, i) => (
              <th key={d} className="text-left p-3">
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[11px] font-medium text-foreground">{d.split("-").slice(-2).join("-")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-stone-50 last:border-0">
              <td className="p-3 text-xs text-muted-foreground font-medium">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="p-3 text-xs font-mono text-foreground">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareWeightChart({ dfids }: { dfids: string[] }) {
  const eventQueries = dfids.map((dfid) =>
    useQuery({ queryKey: ["compare-events", dfid], queryFn: () => getPublicItemEvents(dfid, { limit: 50 }), retry: 1 })
  );

  const isLoading = eventQueries.some((q) => q.isLoading);

  const chartData = useMemo(() => {
    if (isLoading) return [];
    const allDates = new Set<string>();
    const seriesMap = new Map<string, Map<string, number>>();

    dfids.forEach((dfid, idx) => {
      const evts = eventQueries[idx].data || [];
      const weights = evts
        .filter((e) => e.event_type === "item_weighed")
        .map((e) => ({ w: (e.payload as any)?.weight_kg as number, d: (e.payload as any)?.occurred_at as string }))
        .filter((x) => x.w && x.d)
        .sort((a, b) => a.d.localeCompare(b.d));

      const map = new Map<string, number>();
      for (const { w, d } of weights) {
        allDates.add(d);
        map.set(d, w);
      }
      seriesMap.set(dfid, map);
    });

    return Array.from(allDates)
      .sort()
      .map((date) => {
        const entry: Record<string, string | number | null> = { date };
        dfids.forEach((dfid) => {
          entry[dfid] = seriesMap.get(dfid)?.get(date) ?? null;
        });
        return entry;
      });
  }, [dfids, eventQueries, isLoading]);

  if (isLoading || chartData.length === 0) return null;

  return (
    <div className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Evolução de peso comparada</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {dfids.map((dfid, i) => (
            <Line
              key={dfid}
              type="monotone"
              dataKey={dfid}
              name={dfid.split("-").slice(-2).join("-")}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { listPropertyItems } from "@/lib/api/property-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatAssociationPeriod(linkedAt: string, unlinkedAt?: string | null): string {
  const start = new Date(linkedAt).toLocaleString("pt-BR");
  const end = unlinkedAt ? new Date(unlinkedAt).toLocaleString("pt-BR") : "em aberto";
  return `${start} -> ${end}`;
}

export default function PropertyHerd() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [propertyDfid, setPropertyDfid] = useState(searchParams.get("property_dfid") || "");
  const [submittedDfid, setSubmittedDfid] = useState(searchParams.get("property_dfid") || "");
  const [activeOnly, setActiveOnly] = useState(searchParams.get("active_only") !== "false");

  const query = useQuery({
    queryKey: ["propertyHerd", submittedDfid, activeOnly],
    queryFn: () => listPropertyItems(submittedDfid, { active_only: activeOnly, limit: 200 }),
    enabled: submittedDfid.length > 0,
    retry: 1,
  });

  const links = query.data?.links || [];
  const totals = useMemo(() => {
    const uniqueItems = new Set(links.map((l) => l.item_id)).size;
    const transferEvents = links.filter((l) => l.is_transfer).length;
    const activeLinks = links.filter((l) => !l.unlinked_at).length;
    return { uniqueItems, transferEvents, activeLinks };
  }, [links]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = propertyDfid.trim();
    setSubmittedDfid(value);
    const params = new URLSearchParams();
    if (value) params.set("property_dfid", value);
    params.set("active_only", String(activeOnly));
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Rebanho por Propriedade</h1>
        <p className="text-muted-foreground mt-1">
          Consulte itens vinculados a um DFID de terra (LAND) e veja o histórico de permanência.
        </p>
      </div>

      <section className="bg-background border border-border rounded-xl p-4">
        <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input
            className="md:col-span-4"
            placeholder="DFID-LAND-BR-2026-000001-abc123"
            value={propertyDfid}
            onChange={(e) => setPropertyDfid(e.target.value)}
          />
          <label className="h-10 px-3 border border-input rounded-md flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Somente ativos
          </label>
          <Button type="submit" disabled={!propertyDfid.trim()}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </form>
      </section>

      {!submittedDfid ? (
        <section className="bg-background border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Informe um DFID de propriedade para carregar o rebanho.
        </section>
      ) : query.isLoading ? (
        <section className="bg-background border border-border rounded-xl p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando vínculos...
        </section>
      ) : query.error ? (
        <section className="bg-background border border-border rounded-xl p-6 text-sm text-destructive">
          Falha ao carregar propriedade: {query.error instanceof Error ? query.error.message : "erro desconhecido"}.
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Itens únicos</p>
              <p className="text-2xl font-semibold mt-1">{totals.uniqueItems}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Vínculos ativos</p>
              <p className="text-2xl font-semibold mt-1">{totals.activeLinks}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Transferências (GTA)</p>
              <p className="text-2xl font-semibold mt-1">{totals.transferEvents}</p>
            </div>
          </section>

          <section className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">{submittedDfid}</p>
              <p className="text-xs text-muted-foreground">{links.length} vínculo(s) retornado(s)</p>
            </div>
            {links.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nenhum vínculo encontrado para esta propriedade.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">GTA</th>
                      <th className="px-4 py-2">Período de associação</th>
                      <th className="px-4 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id} className="border-t border-border">
                        <td className="px-4 py-2">
                          <Link className="text-primary hover:underline" to={`/app/itens/${link.item_id}`}>
                            {link.item_id}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{link.unlinked_at ? "Encerrado" : "Ativo"}</td>
                        <td className="px-4 py-2">{link.is_transfer ? "Transferência" : "Associação"}</td>
                        <td className="px-4 py-2">{link.gta_number || "-"}</td>
                        <td className="px-4 py-2">{formatAssociationPeriod(link.linked_at, link.unlinked_at)}</td>
                        <td className="px-4 py-2">{link.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

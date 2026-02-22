import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, Loader2, Package, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItem, getItemEvents, getItemAnchors, getItemVersions } from "@/lib/defarm-api";
import { ItemHeader, ItemIdentifiers, ItemTimeline } from "@/components/item-detail";
import { addItemPropertyLink, listItemPropertyLinks, unlinkItemProperty } from "@/lib/api/property-links";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function formatAssociationPeriod(linkedAt: string, unlinkedAt?: string | null): string {
  const start = new Date(linkedAt).toLocaleString("pt-BR");
  const end = unlinkedAt ? new Date(unlinkedAt).toLocaleString("pt-BR") : "em aberto";
  return `${start} -> ${end}`;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [propertyDfid, setPropertyDfid] = useState("");
  const [gtaNumber, setGtaNumber] = useState("");
  const [isTransfer, setIsTransfer] = useState(true);

  // Fetch item details (includes identifiers and events)
  const { data: itemDetails, isLoading: isLoadingItem, error: itemError } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id!),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });

  const item = itemDetails?.item;
  const identifiers = itemDetails?.identifiers || [];
  const canonicalIdentifier = itemDetails?.canonical_identifier || null;

  // Fetch item events (fallback if not in itemDetails)
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["itemEvents", id],
    queryFn: () => getItemEvents(id!),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch blockchain anchors (Stellar + IPFS)
  const { data: anchorsData } = useQuery({
    queryKey: ["itemAnchors", id],
    queryFn: () => getItemAnchors(id!),
    enabled: !!id,
    retry: 0,
  });

  const { data: versionsData } = useQuery({
    queryKey: ["itemVersions", item?.dfid],
    queryFn: () => getItemVersions(item!.dfid),
    enabled: !!item?.dfid,
    retry: 0,
  });

  const { data: propertyLinksData, isLoading: isLoadingLinks } = useQuery({
    queryKey: ["itemPropertyLinks", id],
    queryFn: () => listItemPropertyLinks(id!, { limit: 50 }),
    enabled: !!id,
    retry: 1,
  });

  const addLinkMutation = useMutation({
    mutationFn: () =>
      addItemPropertyLink(id!, {
        property_dfid: propertyDfid.trim(),
        is_transfer: isTransfer,
        gta_number: isTransfer ? gtaNumber.trim() : undefined,
      }),
    onSuccess: () => {
      setPropertyDfid("");
      setGtaNumber("");
      queryClient.invalidateQueries({ queryKey: ["itemPropertyLinks", id] });
      queryClient.invalidateQueries({ queryKey: ["itemEvents", id] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      toast({ title: "Vínculo criado", description: "Item associado à propriedade." });
    },
    onError: (err) => {
      toast({
        title: "Falha ao vincular propriedade",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => unlinkItemProperty(id!, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemPropertyLinks", id] });
      queryClient.invalidateQueries({ queryKey: ["itemEvents", id] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      toast({ title: "Vínculo removido", description: "O vínculo foi encerrado (soft unlink)." });
    },
    onError: (err) => {
      toast({
        title: "Falha ao remover vínculo",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingItem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Item não encontrado
        </h1>
        <p className="text-muted-foreground mb-6">
          O item que você está procurando não existe ou você não tem permissão para acessá-lo.
        </p>
        <Link to="/app/itens">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Itens
          </Button>
        </Link>
      </div>
    );
  }

  // Merge events from detail response + separate query
  const allEvents = itemDetails?.events?.length ? itemDetails.events : events;
  const propertyLinks = propertyLinksData?.links || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ItemHeader item={item} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ItemIdentifiers
          item={item}
          identifiers={identifiers}
          canonicalIdentifier={canonicalIdentifier}
          blockchainAnchors={anchorsData?.blockchain_anchors}
          storageRefs={anchorsData?.storage_refs}
          versions={versionsData?.versions}
        />
        <ItemTimeline events={allEvents} isLoading={isLoadingEvents} />
      </div>

      <section className="bg-background border border-border rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rastro por propriedade (LAND)</h2>
          <p className="text-sm text-muted-foreground">Associações de custódia/proveniência do item por DFID de terra.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input
            className="md:col-span-2"
            placeholder="DFID-LAND-..."
            value={propertyDfid}
            onChange={(e) => setPropertyDfid(e.target.value)}
          />
          <select
            className="h-10 px-3 rounded-md border border-input bg-background"
            value={isTransfer ? "transfer" : "annotation"}
            onChange={(e) => setIsTransfer(e.target.value === "transfer")}
          >
            <option value="transfer">Transferência (GTA)</option>
            <option value="annotation">Anotação estática</option>
          </select>
          <Input
            placeholder="GTA (obrigatório em transferência)"
            value={gtaNumber}
            onChange={(e) => setGtaNumber(e.target.value)}
            disabled={!isTransfer}
          />
          <Button
            onClick={() => addLinkMutation.mutate()}
            disabled={!propertyDfid.trim() || addLinkMutation.isPending || (isTransfer && !gtaNumber.trim())}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Vincular
          </Button>
        </div>

        {isLoadingLinks ? (
          <div className="py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando vínculos...
          </div>
        ) : propertyLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum vínculo de propriedade registrado para este item.</p>
        ) : (
          <div className="space-y-2">
            {propertyLinks.map((link) => (
              <div key={link.id} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-mono text-sm">{link.property_dfid}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.is_transfer ? `Transferência${link.gta_number ? ` · GTA ${link.gta_number}` : ""}` : "Anotação"}
                    {" · "}
                    {link.unlinked_at ? "Encerrado" : "Ativo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Período: {formatAssociationPeriod(link.linked_at, link.unlinked_at)}
                  </p>
                </div>
                {!link.unlinked_at && (
                  <Button size="sm" variant="outline" onClick={() => unlinkMutation.mutate(link.id)} disabled={unlinkMutation.isPending}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Encerrar vínculo
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

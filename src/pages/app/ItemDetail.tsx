import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getItem, getItemEvents, getItemAnchors, getItemVersions } from "@/lib/defarm-api";
import { ItemHeader, ItemIdentifiers, ItemTimeline } from "@/components/item-detail";

export default function ItemDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  // Detalhes do item (inclui identificadores e eventos quando disponíveis)
  const { data: itemDetails, isLoading: isLoadingItem, error: itemError } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id!, { includeProvenance: true }),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });

  const item = itemDetails?.item;
  const identifiers = itemDetails?.identifiers || [];
  const canonicalIdentifier = itemDetails?.canonical_identifier || null;

  // Eventos (fallback se não vierem no detalhe)
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["itemEvents", id],
    queryFn: () => getItemEvents(id!),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });

  // Âncoras on-chain (Stellar + IPFS)
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

  const allEvents = itemDetails?.events?.length ? itemDetails.events : events;

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
          {t("portal.items.detail.notFound")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("portal.items.detail.notFoundDesc")}
        </p>
        <Link to="/app/itens">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("portal.items.detail.backToItems")}
          </Button>
        </Link>
      </div>
    );
  }

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
          provenance={itemDetails?.provenance}
        />
        <ItemTimeline events={allEvents} isLoading={isLoadingEvents} />
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Link2, Loader2, Package, RefreshCcw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItem, getItemEvents, getItemAnchors, getItemVersions } from "@/lib/defarm-api";
import { ItemHeader, ItemIdentifiers, ItemTimeline } from "@/components/item-detail";
import { addItemPropertyLink, listItemPropertyLinks, unlinkItemProperty } from "@/lib/api/property-links";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getPropertyCompliance, refreshPropertyCompliance, type PropertyCompliance } from "@/lib/api";

function formatAssociationPeriod(linkedAt: string, unlinkedAt: string | null | undefined, openLabel: string): string {
  const start = new Date(linkedAt).toLocaleString("pt-BR");
  const end = unlinkedAt ? new Date(unlinkedAt).toLocaleString("pt-BR") : openLabel;
  return `${start} -> ${end}`;
}

export default function ItemDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [propertyDfid, setPropertyDfid] = useState("");
  const [gtaNumber, setGtaNumber] = useState("");
  const [isTransfer, setIsTransfer] = useState(true);
  const [refreshingProperty, setRefreshingProperty] = useState<string | null>(null);

  // Fetch item details (includes identifiers and events)
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
      toast({ title: t("portal.items.detail.toasts.linkCreated"), description: t("portal.items.detail.toasts.linkCreatedDesc") });
    },
    onError: (err) => {
      toast({
        title: t("portal.items.detail.toasts.linkError"),
        description: err instanceof Error ? err.message : t("portal.common.tryAgain"),
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
      toast({ title: t("portal.items.detail.toasts.linkRemoved"), description: t("portal.items.detail.toasts.linkRemovedDesc") });
    },
    onError: (err) => {
      toast({
        title: t("portal.items.detail.toasts.unlinkError"),
        description: err instanceof Error ? err.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  // Merge events from detail response + separate query
  const allEvents = itemDetails?.events?.length ? itemDetails.events : events;
  const propertyLinks = propertyLinksData?.links || [];
  const activePropertyDfids = Array.from(
    new Set(
      propertyLinks
        .filter((link) => !link.unlinked_at)
        .map((link) => link.property_dfid)
        .filter(Boolean)
    )
  );

  const { data: propertyComplianceMap = {}, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ["itemPropertyComplianceMap", id, activePropertyDfids.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        activePropertyDfids.map(async (dfid) => {
          try {
            const compliance = await getPropertyCompliance(dfid);
            return [dfid, compliance] as const;
          } catch {
            return [
              dfid,
              {
                property_dfid: dfid,
                status: "unknown",
                source: "defarm_compliance_api",
                summary: t("portal.items.detail.compliance.noData"),
              } satisfies PropertyCompliance,
            ] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, PropertyCompliance>;
    },
    enabled: activePropertyDfids.length > 0,
  });

  const complianceBadge = (status?: string) => {
    const s = (status || "unknown").toLowerCase();
    if (s === "ok") return "bg-emerald-500/10 text-emerald-700";
    if (s === "warning") return "bg-amber-500/10 text-amber-700";
    if (s === "blocked") return "bg-rose-500/10 text-rose-700";
    return "bg-muted text-muted-foreground";
  };

  const handleRefreshCompliance = async (dfid: string) => {
    try {
      setRefreshingProperty(dfid);
      await refreshPropertyCompliance(dfid, true);
      await queryClient.invalidateQueries({ queryKey: ["itemPropertyComplianceMap", id] });
      toast({ title: t("portal.items.detail.toasts.complianceRefreshed"), description: dfid });
    } catch (error) {
      toast({
        title: t("portal.items.detail.toasts.complianceRefreshError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setRefreshingProperty(null);
    }
  };

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

      <section className="bg-background border border-border rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("portal.items.detail.property.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("portal.items.detail.property.desc")}</p>
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
            <option value="transfer">{t("portal.items.detail.property.transferOption")}</option>
            <option value="annotation">{t("portal.items.detail.property.annotationOption")}</option>
          </select>
          <Input
            placeholder={t("portal.items.detail.property.gtaPlaceholder")}
            value={gtaNumber}
            onChange={(e) => setGtaNumber(e.target.value)}
            disabled={!isTransfer}
          />
          <Button
            onClick={() => addLinkMutation.mutate()}
            disabled={!propertyDfid.trim() || addLinkMutation.isPending || (isTransfer && !gtaNumber.trim())}
          >
            <Link2 className="h-4 w-4 mr-2" />
            {t("portal.items.detail.property.link")}
          </Button>
        </div>

        {isLoadingLinks ? (
          <div className="py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("portal.items.detail.property.loading")}
          </div>
        ) : propertyLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portal.items.detail.property.empty")}</p>
        ) : (
          <div className="space-y-2">
            {propertyLinks.map((link) => (
              <div key={link.id} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-mono text-sm">{link.property_dfid}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.is_transfer
                      ? (link.gta_number ? t("portal.items.detail.property.transferWithGta", { gta: link.gta_number }) : t("portal.items.detail.property.transfer"))
                      : t("portal.items.detail.property.annotation")}
                    {" · "}
                    {link.unlinked_at ? t("portal.items.detail.property.ended") : t("portal.items.detail.property.active")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("portal.items.detail.property.period", { period: formatAssociationPeriod(link.linked_at, link.unlinked_at, t("portal.items.detail.property.periodOpen")) })}
                  </p>
                </div>
                {!link.unlinked_at && (
                  <Button size="sm" variant="outline" onClick={() => unlinkMutation.mutate(link.id)} disabled={unlinkMutation.isPending}>
                    <Unlink className="h-4 w-4 mr-2" />
                    {t("portal.items.detail.property.endLink")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-background border border-border rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            {t("portal.items.detail.compliance.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("portal.items.detail.compliance.desc")}</p>
        </div>

        {isLoadingCompliance ? (
          <div className="py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("portal.items.detail.compliance.loading")}
          </div>
        ) : activePropertyDfids.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portal.items.detail.compliance.empty")}</p>
        ) : (
          <div className="space-y-2">
            {activePropertyDfids.map((dfid) => {
              const compliance = propertyComplianceMap[dfid];
              return (
                <div key={dfid} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm">{dfid}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("portal.items.detail.compliance.carLine", {
                        car: compliance?.car || t("portal.items.detail.compliance.carNotInformed"),
                        date: compliance?.checked_at ? new Date(compliance.checked_at).toLocaleString("pt-BR") : t("portal.items.detail.compliance.checkNA"),
                      })}
                    </p>
                    {compliance?.summary ? (
                      <p className="text-xs text-muted-foreground mt-1">{compliance.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", complianceBadge(compliance?.status))}>
                      {t(`portal.enums.complianceStatus.${(compliance?.status || "unknown").toLowerCase()}`, { defaultValue: compliance?.status })}
                      {typeof compliance?.score === "number" ? ` · ${compliance.score}` : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefreshCompliance(dfid)}
                      disabled={refreshingProperty === dfid}
                    >
                      {refreshingProperty === dfid ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                      )}
                      {t("portal.items.detail.compliance.refresh")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

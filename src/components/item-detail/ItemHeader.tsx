import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Package,
  QrCode,
  Copy,
  CheckCircle2,
  XCircle,
  GitBranch,
  Tag,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Item } from "@/lib/defarm-api";
import { getArtifactPresentation } from "@/lib/artifact-presentation";
import { PushToCircuitDialog } from "./PushToCircuitDialog";
import { EditMetadataDialog } from "./EditMetadataDialog";
import { DeprecateItemDialog } from "./DeprecateItemDialog";

interface ItemHeaderProps {
  item: Item;
}

export function ItemHeader({ item }: ItemHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false);
  const [isDeprecateOpen, setIsDeprecateOpen] = useState(false);
  const dfid = item?.dfid ?? "";
  const isTokenized = dfid.startsWith("DFID-");
  const isAlive = item.status === "Active" || item.status === "active";
  const pres = getArtifactPresentation(item.artifact_type);
  const ArtifactIcon = pres.icon;

  const handleCopyDfid = () => {
    if (dfid) {
      navigator.clipboard.writeText(dfid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate("/app/itens")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("portal.items.detail.backToItems")}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                pres.known ? pres.accent : isTokenized ? "bg-primary/10" : "bg-muted"
              )}
            >
              {pres.known ? (
                <ArtifactIcon className="h-5 w-5" />
              ) : isTokenized ? (
                <QrCode className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              {/* DFID inteiro (era truncado em 30 chars) + copiar como ícone: o identificador
                  é o título, não um botão à parte com rótulo. */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground font-mono break-all">{dfid}</h1>
                <button
                  onClick={handleCopyDfid}
                  aria-label={t("portal.items.detail.header.copyDfid")}
                  title={t("portal.items.detail.header.copyDfid")}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Uma linha de estado, texto — não três pílulas. "Tokenizado" saiu: todo item
                  com DFID- é tokenizado, então a pílula estava sempre acesa (zero informação);
                  só o caso informativo (item local, sem DFID) continua sendo dito. */}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    isAlive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isAlive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {isAlive
                    ? t("portal.items.detail.header.statusAlive")
                    : item.status
                    ? t(`portal.enums.itemStatus.${String(item.status).toLowerCase()}`, {
                        defaultValue: item.status,
                      })
                    : "—"}
                </span>
                {pres.known && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{pres.label}</span>
                  </>
                )}
                {!isTokenized && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{t("portal.items.detail.header.local")}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPushDialogOpen(true)}>
              <GitBranch className="h-4 w-4 mr-2" />
              {t("portal.items.detail.header.pushToCircuit")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditMetadataOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  {t("portal.items.detail.header.editMetadata")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setIsDeprecateOpen(true)}
                >
                  {t("portal.items.detail.header.deprecateItem")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <PushToCircuitDialog
        item={item}
        open={isPushDialogOpen}
        onOpenChange={setIsPushDialogOpen}
      />
      <EditMetadataDialog
        item={item}
        open={isEditMetadataOpen}
        onOpenChange={setIsEditMetadataOpen}
      />
      <DeprecateItemDialog
        item={item}
        open={isDeprecateOpen}
        onOpenChange={setIsDeprecateOpen}
      />
    </>
  );
}

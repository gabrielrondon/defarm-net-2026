import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Plus,
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
import { PushToCircuitDialog } from "./PushToCircuitDialog";

interface ItemHeaderProps {
  item: Item;
}

export function ItemHeader({ item }: ItemHeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);

  const dfid = item?.dfid ?? "";
  const isTokenized = dfid.startsWith("DFID-");

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
          Voltar para Itens
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                isTokenized ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isTokenized ? (
                <QrCode className="h-7 w-7 text-primary" />
              ) : (
                <Package className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-foreground font-mono">
                  {dfid.length > 30 ? `${dfid.slice(0, 30)}...` : dfid}
                </h1>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    item.status === "Active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.status === "Active" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {item.status === "Active" ? "Ativo" : item.status}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    isTokenized
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isTokenized ? (
                    <>
                      <QrCode className="h-3 w-3" />
                      Tokenizado
                    </>
                  ) : (
                    <>
                      <Package className="h-3 w-3" />
                      Local
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={handleCopyDfid}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono bg-muted px-2 py-1 rounded"
              >
                {copied ? (
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copiar DFID
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPushDialogOpen(true)}>
              <GitBranch className="h-4 w-4 mr-2" />
              Push para Circuito
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar evento
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Tag className="h-4 w-4 mr-2" />
                  Editar identificadores
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Depreciar item
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
    </>
  );
}

import { Tag, MapPin, Wheat, Calendar } from "lucide-react";
import { Item } from "@/lib/defarm-api";
import { formatTime } from "./constants";

interface ItemIdentifiersProps {
  item: Item;
}

export function ItemIdentifiers({ item }: ItemIdentifiersProps) {
  const metadata = item?.metadata || {};
  const metadataEntries = Object.entries(metadata);
  const itemId = item?.id ?? "";

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Item Info */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Informações</h2>
            <p className="text-sm text-muted-foreground">Dados do item</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wheat className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Cadeia de Valor
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.value_chain || "-"}
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                País
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.country || "-"}
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Ano / Safra
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.year || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Metadados</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-foreground">
              {formatTime(item?.registered_at || item?.created_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última atualização</span>
            <span className="text-foreground">
              {formatTime(item?.last_updated_at || item?.updated_at)}
            </span>
          </div>
          {item?.circuit_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Circuito</span>
              <span className="text-foreground font-mono text-xs">
                {item.circuit_id.length > 15
                  ? `${item.circuit_id.slice(0, 15)}...`
                  : item.circuit_id}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="text-foreground font-mono text-xs">
              {itemId.length > 15
                ? `${itemId.slice(0, 15)}...`
                : itemId || "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Metadata */}
      {metadataEntries.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Dados Adicionais
          </h3>
          <div className="space-y-2">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="text-foreground">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

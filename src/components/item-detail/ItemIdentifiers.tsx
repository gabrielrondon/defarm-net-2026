import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Item } from "@/lib/defarm-api";
import { formatTime } from "./constants";

interface ItemIdentifiersProps {
  item: Item;
}

export function ItemIdentifiers({ item }: ItemIdentifiersProps) {
  const identifiers = item.identifiers || [];

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Identifiers */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Identificadores</h2>
            <p className="text-sm text-muted-foreground">
              {identifiers.length} identificador(es)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {identifiers.map((identifier, idx) => (
            <div
              key={idx}
              className="p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {identifier.namespace || "default"} / {identifier.key}
                </span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    identifier.id_type === "Canonical"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {identifier.id_type === "Canonical" ? "Canônico" : "Contextual"}
                </span>
              </div>
              <p className="text-sm font-mono text-foreground break-all">
                {identifier.value || ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Metadados</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-foreground">
              {formatTime(item.creation_timestamp)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última atualização</span>
            <span className="text-foreground">
              {formatTime(item.last_modified)}
            </span>
          </div>
          {item.confidence_score && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confiança</span>
              <span className="text-foreground">
                {Math.round(item.confidence_score * 100)}%
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Local ID</span>
            <span className="text-foreground font-mono text-xs">
              {item.local_id.length > 15
                ? `${item.local_id.slice(0, 15)}...`
                : item.local_id}
            </span>
          </div>
        </div>
      </div>

      {/* Enriched Data */}
      {item.enriched_data && Object.keys(item.enriched_data).length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Dados Enriquecidos
          </h3>
          <div className="space-y-2">
            {Object.entries(item.enriched_data).map(([key, value]) => (
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

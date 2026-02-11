import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Download, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getCircuits, bulkIngestItems } from "@/lib/defarm-api";
import type { IngestionReceipt } from "@/lib/api/types";

const CSV_TEMPLATE = `value_chain,country,metadata.breed,metadata.weight_kg
BEEF,BR,Nelore,450
BEEF,BR,Angus,520
SOYBEAN,BR,,`;

const JSON_TEMPLATE = JSON.stringify(
  [
    { value_chain: "BEEF", country: "BR", metadata: { breed: "Nelore", weight_kg: 450 } },
    { value_chain: "SOYBEAN", country: "BR", metadata: {} },
  ],
  null,
  2
);

function downloadTemplate(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [circuitId, setCircuitId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<IngestionReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: circuits = [] } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
    enabled: open,
  });

  const reset = useCallback(() => {
    setFile(null);
    setCircuitId("");
    setUploading(false);
    setReceipt(null);
    setError(null);
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".json"))) {
      setFile(f);
      setError(null);
    } else {
      setError("Formato inválido. Use .csv ou .json");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !circuitId) return;
    setUploading(true);
    setError(null);
    try {
      const result = await bulkIngestItems(file, circuitId);
      setReceipt(result);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Erro ao importar arquivo. Verifique o formato e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Itens em Massa
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou JSON para criar múltiplos itens de uma vez.
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          /* ===== Receipt View ===== */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Importação concluída</p>
                <p className="text-sm text-muted-foreground">
                  Receipt ID: <span className="font-mono text-xs">{receipt.receipt_id}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.rows_total}</p>
                <p className="text-xs text-muted-foreground">Linhas processadas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-primary">{receipt.summary.items_created}</p>
                <p className="text-xs text-muted-foreground">Itens criados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.items_updated}</p>
                <p className="text-xs text-muted-foreground">Itens atualizados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.events_created}</p>
                <p className="text-xs text-muted-foreground">Eventos gerados</p>
              </div>
            </div>

            {receipt.summary.unclassified_fields.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Campos não classificados
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {receipt.summary.unclassified_fields.join(", ")}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { reset(); }}>
                Importar outro
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          /* ===== Upload View ===== */
          <div className="space-y-4">
            {/* Templates */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Templates:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(CSV_TEMPLATE, "template-itens.csv")}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(JSON_TEMPLATE, "template-itens.json")}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                JSON
              </Button>
            </div>

            {/* Circuit Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Circuito destino</label>
              <Select value={circuitId} onValueChange={setCircuitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um circuito" />
                </SelectTrigger>
                <SelectContent>
                  {circuits.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop Zone */}
            <div
              className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Arraste um arquivo CSV ou JSON aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou clique para selecionar
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || !circuitId || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

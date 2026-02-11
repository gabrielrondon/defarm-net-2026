import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateItem, Item } from "@/lib/defarm-api";

interface EditMetadataDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MetadataEntry {
  key: string;
  value: string;
}

export function EditMetadataDialog({ item, open, onOpenChange }: EditMetadataDialogProps) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<MetadataEntry[]>([]);

  useEffect(() => {
    if (open) {
      const metadata = item?.metadata || {};
      const initial = Object.entries(metadata).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
      }));
      setEntries(initial.length > 0 ? initial : [{ key: "", value: "" }]);
    }
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: () => {
      const metadata: Record<string, unknown> = {};
      for (const entry of entries) {
        const k = entry.key.trim();
        if (!k) continue;
        // Try to parse JSON values
        try {
          metadata[k] = JSON.parse(entry.value);
        } catch {
          metadata[k] = entry.value;
        }
      }
      return updateItem(item.id, { metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", item.id] });
      toast.success("Metadados atualizados com sucesso");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const addEntry = () => setEntries([...entries, { key: "", value: "" }]);

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: "key" | "value", val: string) => {
    setEntries(entries.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Metadados</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground mb-3">
            Campos imutáveis (DFID, cadeia de valor, país, ano) não podem ser alterados. 
            Apenas metadados customizados são editáveis.
          </p>

          {entries.map((entry, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                {index === 0 && <Label className="text-xs">Chave</Label>}
                <Input
                  placeholder="ex: weight_kg"
                  value={entry.key}
                  onChange={(e) => updateEntry(index, "key", e.target.value)}
                />
              </div>
              <div className="flex-1">
                {index === 0 && <Label className="text-xs">Valor</Label>}
                <Input
                  placeholder="ex: 475"
                  value={entry.value}
                  onChange={(e) => updateEntry(index, "value", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeEntry(index)}
                disabled={entries.length === 1}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addEntry} className="mt-2">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar campo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Plus, Package, Tag, Shield, X } from "lucide-react";
import { generateFakeId, generateDFID } from "@/lib/fake-id-generator";

interface PortfolioItem {
  id: string;
  identifier: string;
  dfid: string;
}

interface StepPortfolioProps {
  items: PortfolioItem[];
  onAddItem: (item: PortfolioItem) => void;
  onRemoveItem: (id: string) => void;
  onNext: () => void;
}

export function StepPortfolio({ items, onAddItem, onRemoveItem, onNext }: StepPortfolioProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState("");

  const handleAddAnother = () => {
    if (newIdentifier.trim()) {
      onAddItem({
        id: crypto.randomUUID(),
        identifier: newIdentifier.trim(),
        dfid: generateDFID(),
      });
      setNewIdentifier("");
      setIsAdding(false);
    }
  };

  const handleGenerateAndAdd = () => {
    const generated = generateFakeId();
    onAddItem({
      id: crypto.randomUUID(),
      identifier: generated.value,
      dfid: generateDFID(),
    });
    setIsAdding(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Package className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Seu portfolio de ativos
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Adicione mais animais ou lotes para criar um portfolio completo
        </p>
      </div>

      {/* Portfolio Items */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <Card 
              key={item.id} 
              className="p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-mono font-medium text-foreground truncate">
                  {item.identifier}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span className="truncate">{item.dfid}</span>
                </div>
              </div>

              {items.length > 1 && (
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>

        {/* Add more section */}
        {isAdding ? (
          <Card className="p-4 border-dashed animate-in fade-in duration-200">
            <input
              type="text"
              value={newIdentifier}
              onChange={(e) => setNewIdentifier(e.target.value)}
              placeholder="Digite o identificador..."
              autoFocus
              className="w-full text-lg font-mono bg-transparent border-b border-border/50 pb-2 mb-4
                         focus:outline-none focus:border-primary placeholder:text-muted-foreground/30"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAnother} disabled={!newIdentifier.trim()}>
                Adicionar
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerateAndAdd}>
                Gerar exemplo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full p-4 border-2 border-dashed border-border/50 rounded-xl
                       flex items-center justify-center gap-2 text-muted-foreground
                       hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar mais um animal ou lote
          </button>
        )}

        {/* Summary */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
          <div className="text-3xl font-bold text-foreground mb-1">
            {items.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {items.length === 1 ? "ativo registrado" : "ativos registrados"}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Button
          size="lg"
          onClick={onNext}
          className="px-8 py-6 text-lg font-semibold gap-2"
        >
          Verificar compliance
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

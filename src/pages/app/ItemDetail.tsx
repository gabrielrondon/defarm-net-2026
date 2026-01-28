import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getItem, getItemEvents } from "@/lib/defarm-api";
import { ItemHeader, ItemIdentifiers, ItemTimeline } from "@/components/item-detail";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();

  // Fetch item details
  const { data: item, isLoading: isLoadingItem, error: itemError } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id!),
    enabled: !!id,
  });

  // Fetch item events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["itemEvents", id],
    queryFn: () => getItemEvents(id!),
    enabled: !!id,
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ItemHeader item={item} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ItemIdentifiers item={item} />
        <ItemTimeline events={events} isLoading={isLoadingEvents} />
      </div>
    </div>
  );
}

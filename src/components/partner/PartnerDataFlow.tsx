import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package, Activity, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { getItems } from "@/lib/api/items";
import { getEvents } from "@/lib/api/events";
import type { Circuit, Item, Event } from "@/lib/api/types";

export function PartnerDataFlow() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [circuitsData, itemsData, eventsData] = await Promise.all([
          getCircuits(),
          getItems().then((r) => (r as any).items || r).catch(() => []),
          getEvents().then((r) => (r as any).events || r).catch(() => []),
        ]);
        setCircuits(circuitsData);
        setItems(Array.isArray(itemsData) ? itemsData.slice(0, 20) : []);
        setEvents(Array.isArray(eventsData) ? eventsData.slice(0, 20) : []);
      } catch (err) {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível buscar o fluxo de dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const statusColor = (status: string) => {
    switch (status) {
      case "processed":
        return "bg-primary/10 text-primary border-primary/20";
      case "pending":
        return "bg-accent/50 text-accent-foreground";
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Circuits */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Circuitos ({circuits.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {circuits.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.circuit_type} · {c.visibility}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    c.status === "active"
                      ? "border-primary/30 text-primary"
                      : ""
                  }
                >
                  {c.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Itens Recentes
          </h2>
        </div>
        <Card className="overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum item enviado ainda
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DFID</TableHead>
                  <TableHead>Cadeia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.dfid}
                    </TableCell>
                    <TableCell>{item.value_chain}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.registered_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Eventos Recentes
          </h2>
        </div>
        <Card className="overflow-hidden">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento registrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.event_type}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {event.source_type}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

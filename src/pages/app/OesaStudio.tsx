import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Truck, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getPublicItem } from "@/lib/api/join-requests";
import { createEvent } from "@/lib/api/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// OESA Studio — fase 1 (emissão) do épico OESA Dashboard (#111). A OESA (ou um
// produtor) registra uma movimentação baseada em GTA, emitindo `item_movement`.
// É o "carimbo público auditável" por GTA — a DeFarm não substitui a GTA, lê e
// devolve prova. O backend exige `payload.gta_number`. OESA = government (trust 85).
export default function OesaStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dfid, setDfid] = useState("");
  const [gta, setGta] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDfid, setLastDfid] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanDfid = dfid.trim();
      const item = await getPublicItem(cleanDfid);
      return createEvent({
        event_type: "item_movement",
        source_type: user?.workspace_type || "government",
        item_id: item.id,
        visibility: "public",
        payload: {
          gta_number: gta.trim(),
          ...(origin.trim() ? { origin: origin.trim() } : {}),
          ...(destination.trim() ? { destination: destination.trim() } : {}),
          ...(moveDate.trim() ? { movement_date: moveDate.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          occurred_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      setLastDfid(dfid.trim());
      toast({
        title: "Movimentação registrada",
        description: "GTA carimbada e pública no verificador do ativo.",
      });
      setGta("");
      setOrigin("");
      setDestination("");
      setMoveDate("");
      setNotes("");
    },
    onError: (err) => {
      toast({
        title: "Falha ao registrar",
        description:
          err instanceof Error
            ? err.message
            : "Confira o DFID, a GTA e se o ativo está num circuito do seu workspace.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    dfid.trim().length > 0 && gta.trim().length > 0 && !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">OESA Studio · Movimentação</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Registre uma movimentação baseada em GTA. É um carimbo público auditável
        por GTA — a DeFarm não substitui a GTA, lê e devolve prova. Aparece no
        verificador como prova do seu órgão.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar movimentação (GTA)</CardTitle>
          <CardDescription>
            O ativo precisa estar num circuito do seu workspace. A GTA é obrigatória.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dfid">DFID do ativo</Label>
            <Input
              id="dfid"
              placeholder="DFID-BEEF-BR-2026-000000-xxxxxx"
              value={dfid}
              onChange={(e) => setDfid(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gta">Número da GTA</Label>
            <Input
              id="gta"
              placeholder="ex: GTA-MS-2026-0001234"
              value={gta}
              onChange={(e) => setGta(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origem (opcional)</Label>
              <Input
                id="origin"
                placeholder="ex: Fazenda A / município"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destino (opcional)</Label>
              <Input
                id="destination"
                placeholder="ex: Frigorífico B / município"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="movedate">Data da movimentação (opcional)</Label>
            <Input
              id="movedate"
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando...
              </>
            ) : (
              "Registrar movimentação"
            )}
          </Button>

          {lastDfid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
              <p className="text-emerald-800 font-medium mb-1">
                Movimentação registrada para {lastDfid}.
              </p>
              <Link
                to={`/i/${lastDfid}`}
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                Ver no verificador público <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

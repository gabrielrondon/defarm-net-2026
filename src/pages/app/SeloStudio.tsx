import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Award, ExternalLink, Loader2 } from "lucide-react";
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

// Selo Studio (#111): a frigorífico (processor) grants a seal/program to an
// asset (DFID), emitting a `seal_granted` event. Once public, it shows up on the
// verifier as provenance ("· por {Frigorífico} (Frigorífico)"). Same emit-event
// pattern as the Certificate Studio.
export default function SeloStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dfid, setDfid] = useState("");
  const [sealName, setSealName] = useState("");
  const [level, setLevel] = useState("");
  const [validity, setValidity] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDfid, setLastDfid] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanDfid = dfid.trim();
      const item = await getPublicItem(cleanDfid);
      return createEvent({
        event_type: "seal_granted",
        source_type: user?.workspace_type || "processor",
        item_id: item.id,
        visibility: "public",
        payload: {
          seal_name: sealName.trim(),
          ...(level.trim() ? { level: level.trim() } : {}),
          ...(validity.trim() ? { validity: validity.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          occurred_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      setLastDfid(dfid.trim());
      toast({
        title: "Selo concedido",
        description: "Registrado e público no verificador do ativo.",
      });
      setSealName("");
      setLevel("");
      setValidity("");
      setNotes("");
    },
    onError: (err) => {
      toast({
        title: "Falha ao conceder selo",
        description:
          err instanceof Error
            ? err.message
            : "Confira se o DFID existe e está num circuito público do seu workspace.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    dfid.trim().length > 0 && sealName.trim().length > 0 && !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <Award className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Selo Studio</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Conceda um selo ou programa de bonificação a um ativo (DFID). Uma vez
        público, ele aparece no verificador como prova do seu frigorífico.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conceder selo</CardTitle>
          <CardDescription>
            O ativo precisa estar num circuito do seu workspace.
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
            <Label htmlFor="seal">Nome do selo / programa</Label>
            <Input
              id="seal"
              placeholder="ex: Carne Premium Angus, Programa Boi Verde"
              value={sealName}
              onChange={(e) => setSealName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="level">Nível (opcional)</Label>
              <Input
                id="level"
                placeholder="ex: Premium, Ouro"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validity">Validade (opcional)</Label>
              <Input
                id="validity"
                type="date"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
              />
            </div>
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Concedendo...
              </>
            ) : (
              "Conceder selo"
            )}
          </Button>

          {lastDfid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
              <p className="text-emerald-800 font-medium mb-1">
                Selo concedido a {lastDfid}.
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

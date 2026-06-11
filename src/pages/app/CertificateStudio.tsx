import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink, Loader2 } from "lucide-react";
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

// Certificate Studio (#111): a certifier emits an `attestation_issued` event
// against a DFID. Once public, the attestation shows up on the verifier
// (/i/:dfid) as provenance ("· por {Nome} (Certificadora)") — closing the loop
// with the moat. The thematic type (Angus / Orgânico / Halal / EUDR...) lives in
// the payload, not in a separate event type (decision D9).
export default function CertificateStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dfid, setDfid] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [validity, setValidity] = useState("");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDfid, setLastDfid] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanDfid = dfid.trim();
      // Resolve DFID -> item_id (public view). The backend then checks the item
      // is in a circuit of the caller's workspace + CreateEvents permission.
      const item = await getPublicItem(cleanDfid);
      return createEvent({
        event_type: "attestation_issued",
        source_type: user?.workspace_type || "certifier",
        item_id: item.id,
        visibility: "public",
        payload: {
          certificate_type: certificateType.trim(),
          ...(validity.trim() ? { validity: validity.trim() } : {}),
          ...(scope.trim() ? { scope: scope.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          occurred_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      setLastDfid(dfid.trim());
      toast({
        title: "Atestado emitido",
        description: "Registrado e público no verificador do ativo.",
      });
      setCertificateType("");
      setValidity("");
      setScope("");
      setNotes("");
    },
    onError: (err) => {
      toast({
        title: "Falha ao emitir",
        description:
          err instanceof Error
            ? err.message
            : "Confira se o DFID existe e está num circuito público do seu workspace.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    dfid.trim().length > 0 &&
    certificateType.trim().length > 0 &&
    !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <BadgeCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Certificate Studio</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Emita um atestado sobre um ativo (DFID). Uma vez público, ele aparece no
        verificador como prova da sua certificadora, com o seu nome e nível de
        confiança.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emitir atestado</CardTitle>
          <CardDescription>
            O ativo precisa estar num circuito do seu workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dfid">DFID do ativo</Label>
            <Input
              id="dfid"
              placeholder="DFID-DEFARM-BR-2026-000000-xxxxxx"
              value={dfid}
              onChange={(e) => setDfid(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctype">Tipo de certificação</Label>
            <Input
              id="ctype"
              placeholder="ex: Angus, Orgânico IBD, Livre de desmate, Halal"
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="validity">Validade (opcional)</Label>
              <Input
                id="validity"
                type="date"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scope">Escopo (opcional)</Label>
              <Input
                id="scope"
                placeholder="ex: lote, propriedade"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo...
              </>
            ) : (
              "Emitir atestado"
            )}
          </Button>

          {lastDfid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
              <p className="text-emerald-800 font-medium mb-1">
                Atestado emitido para {lastDfid}.
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

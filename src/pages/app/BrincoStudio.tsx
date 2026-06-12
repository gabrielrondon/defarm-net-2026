import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createItem } from "@/lib/api/items";
import { getCircuits } from "@/lib/api/circuits";
import { AssetQRCode } from "@/components/AssetQRCode";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrincoResult {
  sisbov: string;
  dfid?: string;
  error?: string;
}

// Brinco Token Studio (#111): a rastreador SISBOV emits ear-tags in batch — each
// SISBOV number becomes a tokenized item (a DFID), and we render a QR for
// printing/applying. This is identity emission (POST /items), not an event
// against an existing item — the keystone of the paper's model.
export default function BrincoStudio() {
  const { toast } = useToast();
  const [circuitId, setCircuitId] = useState("");
  const [valueChain, setValueChain] = useState("BEEF");
  const [country, setCountry] = useState("BR");
  const [year, setYear] = useState(2026);
  const [sisbovText, setSisbovText] = useState("");
  const [results, setResults] = useState<BrincoResult[]>([]);

  const { data: circuits = [] } = useQuery({
    queryKey: ["my-circuits"],
    queryFn: () => getCircuits(),
    staleTime: 60_000,
  });

  const numbers = sisbovText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const mutation = useMutation({
    mutationFn: async () => {
      const out: BrincoResult[] = [];
      for (const sisbov of numbers) {
        try {
          const resp = await createItem({
            value_chain: valueChain.trim().toUpperCase(),
            country: country.trim().toUpperCase(),
            year,
            circuit_id: circuitId || null,
            identifiers: [
              { identifier_type: "sisbov", value: sisbov, is_canonical: true },
            ],
          });
          out.push({ sisbov, dfid: resp.item.dfid });
        } catch (e) {
          out.push({
            sisbov,
            error: e instanceof Error ? e.message : "falha ao emitir",
          });
        }
      }
      return out;
    },
    onSuccess: (out) => {
      setResults(out);
      const ok = out.filter((r) => r.dfid).length;
      toast({
        title: "Brincos emitidos",
        description: `${ok}/${out.length} tokenizados com DFID + QR.`,
      });
    },
    onError: (err) => {
      toast({
        title: "Falha ao emitir brincos",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    !!circuitId && numbers.length > 0 && !mutation.isPending;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <Tag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Brinco Token Studio</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Emita brincos SISBOV em lote. Cada número vira um ativo tokenizado (DFID)
        com um QR pronto pra imprimir e aplicar no animal.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emitir lote de brincos</CardTitle>
          <CardDescription>
            Um número SISBOV por linha. Cada um gera um DFID + QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="circuit">Circuito</Label>
            <Select value={circuitId} onValueChange={setCircuitId}>
              <SelectTrigger id="circuit">
                <SelectValue
                  placeholder={
                    circuits.length
                      ? "Selecione um circuito"
                      : "Nenhum circuito — crie um primeiro"
                  }
                />
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vc">Value chain</Label>
              <Input
                id="vc"
                value={valueChain}
                onChange={(e) => setValueChain(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || year)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sisbov">Números SISBOV (um por linha)</Label>
            <Textarea
              id="sisbov"
              rows={6}
              placeholder={"076000000000010\n076000000000011\n076000000000012"}
              value={sisbovText}
              onChange={(e) => setSisbovText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {numbers.length} número(s) na fila.
            </p>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="w-full"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo{" "}
                {numbers.length} brinco(s)...
              </>
            ) : (
              `Emitir ${numbers.length || ""} brinco(s)`
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3">
            Brincos emitidos ({results.filter((r) => r.dfid).length}/
            {results.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((r) => (
              <Card key={r.sisbov}>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    SISBOV <span className="font-mono">{r.sisbov}</span>
                  </p>
                  {r.dfid ? (
                    <>
                      <p className="font-mono text-sm break-all">{r.dfid}</p>
                      <AssetQRCode
                        dfid={r.dfid}
                        canonicalIdLabel="SISBOV"
                        canonicalIdValue={r.sisbov}
                      />
                      <Link
                        to={`/i/${r.dfid}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ver no verificador <ExternalLink className="h-3 w-3" />
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-destructive">{r.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

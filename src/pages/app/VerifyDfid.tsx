import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// "Verificar DFID" (capability read.verify): em vez de cair no stub, leva ao
// verificador público que já existe (/i/:dfid). Disponível pra todas as personas.
export default function VerifyDfid() {
  const navigate = useNavigate();
  const [dfid, setDfid] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = dfid.trim();
    if (v) navigate(`/i/${encodeURIComponent(v)}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Verificar DFID</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Consulte a prova pública de um ativo pelo DFID — identidade, histórico
        assinado por cada elo e âncora on-chain. É a mesma página que o comprador
        vê ao escanear o QR.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultar ativo</CardTitle>
          <CardDescription>
            Cole o DFID do ativo. Você vai pro verificador público.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dfid">DFID do ativo</Label>
              <Input
                id="dfid"
                placeholder="DFID-BEEF-BR-2026-000000-xxxxxx"
                value={dfid}
                onChange={(e) => setDfid(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!dfid.trim()}>
              Verificar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

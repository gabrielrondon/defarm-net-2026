import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
import { PartnerPage } from "@/components/partner/PartnerPage";

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
    <PartnerPage
      width="focused"
      section="Verificação"
      title="Verificar DFID"
      subtitle="Consulte a prova pública de um ativo pelo DFID — identidade, histórico assinado por cada elo e âncora on-chain. É a mesma página que o comprador vê ao escanear o QR."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultar ativo</CardTitle>
          <CardDescription>
            Cole o DFID do ativo. A prova abre no verificador público, fora do
            painel — use o botão Voltar do navegador pra retornar.
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
    </PartnerPage>
  );
}

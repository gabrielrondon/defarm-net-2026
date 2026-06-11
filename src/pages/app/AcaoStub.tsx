import { useParams, Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder for a persona action (Studio) surfaced by /me/capabilities but not
// yet built. The Studios (Brinco / Certificate / Selo / OESA) are epic #111.
export default function AcaoStub() {
  const { key } = useParams<{ key: string }>();
  const pretty = (key || "").replace(/[._]/g, " ");

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <Construction className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Ação em construção</h1>
      <p className="text-sm text-muted-foreground mb-1">
        <span className="font-mono">{pretty}</span>
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Esta ação faz parte dos Studios da superfície DeFarm e estará disponível em
        breve. O menu já reflete o que o seu perfil pode fazer (contrato de
        capabilities do backend).
      </p>
      <Button asChild variant="outline">
        <Link to="/app">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Link>
      </Button>
    </div>
  );
}

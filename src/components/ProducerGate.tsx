import { useState } from "react";
import { Loader2, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { submitOwnershipClaim } from "@/lib/api/ownership-claims";
import { GATEWAY_BASE } from "@/lib/api/client";
import logo from "@/assets/logo.png";

interface ProducerGateProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

// Gate bloqueante do produtor (decisão de produto). NÃO dá pra fechar nem
// alcançar o dashboard: o AppLayout faz early-return disto para produtores, então
// o painel nem é montado. Captura só o CAR e dispara (1) um ownership claim
// (POST /claims -> fila do admin, fonte de verdade) e (2) um e-mail de aviso
// (POST /auth/contact, best-effort). Quando liberarmos o dashboard, é só remover
// o early-return no AppLayout.
export function ProducerGate({ userName, userEmail, onLogout }: ProducerGateProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [car, setCar] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const value = car.trim();
    if (!value) {
      toast({ title: t("pgate.car_required"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // (1) claim no banco -> fila do admin (fonte de verdade)
      await submitOwnershipClaim({
        identifier_type: "car",
        identifier_value: value,
        notes: "Solicitacao de acesso via gate do produtor (defarm.net).",
      });
      // (2) e-mail de aviso (best-effort: o claim ja registrou)
      try {
        await fetch(`${GATEWAY_BASE}/auth/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userName || userEmail || "Produtor",
            email: userEmail || null,
            company: null,
            role: "producer",
            website: null,
            message: `Solicitacao de acesso (produtor). CAR: ${value}`,
          }),
        });
      } catch {
        /* e-mail e best-effort */
      }
      setDone(true);
    } catch (err) {
      toast({
        title: t("pgate.err"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-16 items-center px-6">
        <img src={logo} alt="DeFarm" className="h-8" />
      </div>
      <Dialog open>
        <DialogContent
          className="sm:max-w-lg [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {done ? <Check className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
              {done ? t("pgate.ok_title") : t("pgate.title")}
            </DialogTitle>
            <DialogDescription className="pt-1 text-[14px] leading-relaxed">
              {done ? t("pgate.ok_desc") : t("pgate.desc")}
            </DialogDescription>
          </DialogHeader>

          {!done ? (
            <div className="mt-1 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pgate-car">{t("pgate.car_label")}</Label>
                <Input
                  id="pgate-car"
                  value={car}
                  onChange={(e) => setCar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && submit()}
                  placeholder={t("pgate.car_ph")}
                  className="font-mono text-[13px]"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={onLogout} disabled={loading}>
                  {t("pgate.logout")}
                </Button>
                <Button onClick={submit} disabled={loading || !car.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("pgate.submit")}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex justify-end">
              <Button variant="outline" onClick={onLogout}>{t("pgate.logout")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

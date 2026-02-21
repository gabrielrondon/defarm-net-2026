import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmEmailChange, verifyEmail } from "@/lib/defarm-api";
import logoIcon from "@/assets/logo-icon.png";

export default function VerificarEmail() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const emailChangeToken = useMemo(() => params.get("email_change_token") || "", [params]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando sua verificação...");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!token && !emailChangeToken) {
        if (mounted) {
          setStatus("error");
          setMessage("Token de verificação ausente.");
        }
        return;
      }
      try {
        const res = emailChangeToken
          ? await confirmEmailChange(emailChangeToken)
          : await verifyEmail(token);
        if (mounted) {
          setStatus("success");
          setMessage(res.message);
        }
      } catch (error) {
        if (mounted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Falha ao verificar email.");
        }
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token, emailChangeToken]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg border rounded-2xl p-8 bg-background">
        <div className="flex items-center gap-3 mb-8">
          <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
          <span className="text-2xl font-bold text-foreground">DeFarm</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
          {status === "error" && <XCircle className="h-6 w-6 text-red-600" />}
          <h1 className="text-2xl font-bold">
            {emailChangeToken ? "Confirmação de novo email" : "Verificação de email"}
          </h1>
        </div>

        <p className="text-muted-foreground mb-6">{message}</p>

        <Button asChild className="btn-offset">
          <Link to="/login">Ir para login</Link>
        </Button>
      </div>
    </div>
  );
}

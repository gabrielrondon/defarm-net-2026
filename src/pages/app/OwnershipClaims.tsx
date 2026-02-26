import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import {
  adminListOwnershipClaims,
  adminRejectOwnershipClaim,
  adminVerifyOwnershipClaim,
  listMyOwnershipClaims,
  submitOwnershipClaim,
} from "@/lib/defarm-api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { ClaimDetails } from "@/lib/api/types";

const IDENTIFIER_TYPES = [
  { value: "land_dfid", label: "LAND DFID (propriedade)" },
  { value: "car", label: "CAR" },
  { value: "ccir", label: "CCIR" },
  { value: "incra", label: "INCRA" },
  { value: "nirf", label: "NIRF" },
  { value: "cib", label: "CIB" },
  { value: "matricula", label: "Matrícula (cartório)" },
  { value: "georef", label: "Georreferência (município/UF)" },
  { value: "cpf", label: "CPF (legado)" },
  { value: "cnpj", label: "CNPJ (legado)" },
] as const;

const ROLE_OPTIONS: NonNullable<ClaimDetails["role_no_imovel"]>[] = ["proprietario", "arrendatario", "gestor"];
const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export default function OwnershipClaims() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [identifierType, setIdentifierType] = useState<(typeof IDENTIFIER_TYPES)[number]["value"]>("car");
  const [identifierValue, setIdentifierValue] = useState("");
  const [notes, setNotes] = useState("");
  const [farmName, setFarmName] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [areaHectares, setAreaHectares] = useState("");
  const [roleNoImovel, setRoleNoImovel] = useState<NonNullable<ClaimDetails["role_no_imovel"] | "">("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [documentoComprovanteUrl, setDocumentoComprovanteUrl] = useState("");

  const isAdmin = !!user?.is_admin;
  const workspaceType = user?.workspace_type || "producer";
  const canSubmit = workspaceType === "producer" || workspaceType === "certifier" || isAdmin;

  const myClaimsQuery = useQuery({
    queryKey: ["my-claims"],
    queryFn: () => listMyOwnershipClaims({ limit: 100 }),
  });

  const adminClaimsQuery = useQuery({
    queryKey: ["admin-claims"],
    queryFn: () => adminListOwnershipClaims({ status: "pending", limit: 200 }),
    enabled: isAdmin,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitOwnershipClaim({
        identifier_type: identifierType,
        identifier_value: identifierValue.trim(),
        notes: notes.trim() || undefined,
        claim_details: {
          farm_name: farmName.trim() || null,
          municipio: municipio.trim() || null,
          uf: uf || null,
          area_hectares: areaHectares.trim() ? Number(areaHectares) : null,
          role_no_imovel: roleNoImovel || null,
          telefone_contato: telefoneContato.trim() || null,
          documento_comprovante_url: documentoComprovanteUrl.trim() || null,
        },
      }),
    onSuccess: () => {
      setIdentifierValue("");
      setNotes("");
      setFarmName("");
      setMunicipio("");
      setUf("");
      setAreaHectares("");
      setRoleNoImovel("");
      setTelefoneContato("");
      setDocumentoComprovanteUrl("");
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast({ title: "Claim enviado", description: "Seu claim foi registrado e aguarda validação do admin." });
    },
    onError: (err) => {
      toast({
        title: "Falha ao enviar claim",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => adminVerifyOwnershipClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-claims"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast({ title: "Claim verificado", description: "Circuito foi criado/sincronizado com os itens encontrados." });
    },
    onError: (err) => {
      toast({
        title: "Falha ao verificar claim",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminRejectOwnershipClaim(id, "Rejeitado pelo admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-claims"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast({ title: "Claim rejeitado" });
    },
    onError: (err) => {
      toast({
        title: "Falha ao rejeitar claim",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const myClaims = myClaimsQuery.data?.claims || [];
  const pendingAdmin = adminClaimsQuery.data?.claims || [];
  const hasPendingMutation = submitMutation.isPending || verifyMutation.isPending || rejectMutation.isPending;

  const sortedMyClaims = useMemo(
    () => [...myClaims].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [myClaims]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Propriedades & Claims</h1>
        <p className="text-muted-foreground mt-1">
          Registre o identificador da propriedade (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF). CPF/CNPJ permanece como modo legado.
        </p>
      </div>

      {canSubmit && (
        <section className="bg-background border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Novo claim</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="h-10 px-3 rounded-md border border-input bg-background"
              value={identifierType}
              onChange={(e) => setIdentifierType(e.target.value as any)}
            >
              {IDENTIFIER_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Informe o identificador"
              value={identifierValue}
              onChange={(e) => setIdentifierValue(e.target.value)}
              className="md:col-span-2"
            />
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!identifierValue.trim() || hasPendingMutation}
            >
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar claim"}
            </Button>
          </div>
          <Input placeholder="Nome da fazenda (opcional)" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Município (opcional)" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            <select
              className="h-10 px-3 rounded-md border border-input bg-background"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              <option value="">UF (opcional)</option>
              {UF_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Input
              placeholder="Área em hectares (opcional)"
              value={areaHectares}
              onChange={(e) => setAreaHectares(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="h-10 px-3 rounded-md border border-input bg-background"
              value={roleNoImovel}
              onChange={(e) => setRoleNoImovel(e.target.value as NonNullable<ClaimDetails["role_no_imovel"]>)}
            >
              <option value="">Papel no imóvel (opcional)</option>
              {ROLE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Input placeholder="Telefone de contato (opcional)" value={telefoneContato} onChange={(e) => setTelefoneContato(e.target.value)} />
            <Input placeholder="URL do comprovante (opcional)" value={documentoComprovanteUrl} onChange={(e) => setDocumentoComprovanteUrl(e.target.value)} />
          </div>
          <Input placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>
      )}

      <section className="bg-background border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Meus claims</h2>
        {myClaimsQuery.isLoading ? (
          <div className="py-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : sortedMyClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum claim enviado.</p>
        ) : (
          <div className="space-y-2">
            {sortedMyClaims.map((claim) => (
              <div key={claim.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{claim.identifier_type.toUpperCase()}: {claim.identifier_value}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(claim.created_at).toLocaleString("pt-BR")} · {claim.items_surfaced || 0} itens
                  </p>
                  {(claim.claim_details?.farm_name || claim.claim_details?.municipio || claim.claim_details?.uf) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {claim.claim_details?.farm_name ? `${claim.claim_details.farm_name} · ` : ""}
                      {claim.claim_details?.municipio || "-"}{claim.claim_details?.uf ? `/${claim.claim_details.uf}` : ""}
                    </p>
                  )}
                </div>
                <Badge variant={claim.status === "verified" ? "default" : claim.status === "rejected" ? "destructive" : "secondary"}>
                  {claim.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="bg-background border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Admin: fila pendente
          </h2>
          {adminClaimsQuery.isLoading ? (
            <div className="py-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : pendingAdmin.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum claim pendente.</p>
          ) : (
            <div className="space-y-2">
              {pendingAdmin.map((claim) => (
                <div key={claim.id} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium">{claim.identifier_type.toUpperCase()}: {claim.identifier_value}</p>
                    <p className="text-xs text-muted-foreground">User: {claim.user_id} · Workspace: {claim.workspace_id}</p>
                    {claim.claim_details && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground/90">Contexto do claim</p>
                        {(claim.claim_details.farm_name || claim.claim_details.municipio || claim.claim_details.uf) && (
                          <p>
                            {claim.claim_details.farm_name ? `${claim.claim_details.farm_name} · ` : ""}
                            {claim.claim_details.municipio || "-"}
                            {claim.claim_details.uf ? `/${claim.claim_details.uf}` : ""}
                          </p>
                        )}
                        {(claim.claim_details.role_no_imovel || claim.claim_details.area_hectares != null) && (
                          <p>
                            {claim.claim_details.role_no_imovel ? `Papel: ${claim.claim_details.role_no_imovel}` : ""}
                            {claim.claim_details.role_no_imovel && claim.claim_details.area_hectares != null ? " · " : ""}
                            {claim.claim_details.area_hectares != null ? `Área: ${claim.claim_details.area_hectares} ha` : ""}
                          </p>
                        )}
                        {claim.claim_details.telefone_contato && (
                          <p>Contato: {claim.claim_details.telefone_contato}</p>
                        )}
                        {claim.claim_details.documento_comprovante_url && (
                          <p>
                            Comprovante:{" "}
                            <a
                              href={claim.claim_details.documento_comprovante_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              abrir documento
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => verifyMutation.mutate(claim.id)} disabled={hasPendingMutation}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Verificar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(claim.id)} disabled={hasPendingMutation}>
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

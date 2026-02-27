import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, Loader2, Plus, ShieldCheck, XCircle } from "lucide-react";
import {
  adminListOwnershipClaims,
  adminRejectOwnershipClaim,
  adminVerifyOwnershipClaim,
  adminListPropertyPartyRoles,
  adminRejectPropertyPartyRole,
  adminVerifyPropertyPartyRole,
  createPropertyPartyRole,
  listMyPropertyPartyRoles,
  listMyOwnershipClaims,
  submitOwnershipClaim,
} from "@/lib/defarm-api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

type RoleNoImovel = "proprietario" | "arrendatario" | "gestor";
const ROLE_OPTIONS: RoleNoImovel[] = ["proprietario", "arrendatario", "gestor"];
const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const PARTY_TYPE_OPTIONS = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
] as const;

const PROPERTY_PARTY_ROLE_OPTIONS = [
  { value: "owner", label: "Proprietário legal" },
  { value: "operator", label: "Operador / Produtor" },
  { value: "manager", label: "Gestor" },
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
  const [roleNoImovel, setRoleNoImovel] = useState<RoleNoImovel | "">("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [documentoComprovanteUrl, setDocumentoComprovanteUrl] = useState("");
  const [propertyDfid, setPropertyDfid] = useState("");
  const [partyType, setPartyType] = useState<(typeof PARTY_TYPE_OPTIONS)[number]["value"]>("cpf");
  const [partyValue, setPartyValue] = useState("");
  const [propertyPartyRole, setPropertyPartyRole] = useState<(typeof PROPERTY_PARTY_ROLE_OPTIONS)[number]["value"]>("owner");
  const [propertyPartyNotes, setPropertyPartyNotes] = useState("");
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [propertyPartyDialogOpen, setPropertyPartyDialogOpen] = useState(false);

  const isAdmin = !!user?.is_admin;
  const workspaceType = user?.workspace_type || "producer";
  const canSubmit = workspaceType === "producer" || workspaceType === "certifier";

  const myClaimsQuery = useQuery({
    queryKey: ["my-claims"],
    queryFn: () => listMyOwnershipClaims({ limit: 100 }),
  });

  const adminClaimsQuery = useQuery({
    queryKey: ["admin-claims"],
    queryFn: () => adminListOwnershipClaims({ status: "pending", limit: 200 }),
    enabled: isAdmin,
  });

  const myPropertyPartyQuery = useQuery({
    queryKey: ["my-property-party-roles"],
    queryFn: () => listMyPropertyPartyRoles({ limit: 100, active_only: false }),
  });

  const adminPropertyPartyQuery = useQuery({
    queryKey: ["admin-property-party-roles"],
    queryFn: () => adminListPropertyPartyRoles({ status: "pending", limit: 200, active_only: false }),
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
      setClaimDialogOpen(false);
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

  const submitPropertyPartyMutation = useMutation({
    mutationFn: () =>
      createPropertyPartyRole(propertyDfid.trim(), {
        party_identifier_type: partyType,
        party_identifier_value: partyValue.trim(),
        role: propertyPartyRole,
        notes: propertyPartyNotes.trim() || undefined,
      }),
    onSuccess: () => {
      setPropertyDfid("");
      setPartyValue("");
      setPropertyPartyNotes("");
      setPropertyPartyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-property-party-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-property-party-roles"] });
      toast({
        title: "Vínculo enviado",
        description: "Relação propriedade↔parte registrada como pendente para validação.",
      });
    },
    onError: (err) => {
      toast({
        title: "Falha ao criar vínculo",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const verifyPropertyPartyMutation = useMutation({
    mutationFn: (id: string) => adminVerifyPropertyPartyRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-property-party-roles"] });
      queryClient.invalidateQueries({ queryKey: ["my-property-party-roles"] });
      toast({ title: "Vínculo verificado" });
    },
    onError: (err) => {
      toast({
        title: "Falha ao verificar vínculo",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const rejectPropertyPartyMutation = useMutation({
    mutationFn: (id: string) => adminRejectPropertyPartyRole(id, { rejection_reason: "Rejeitado pelo admin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-property-party-roles"] });
      queryClient.invalidateQueries({ queryKey: ["my-property-party-roles"] });
      toast({ title: "Vínculo rejeitado" });
    },
    onError: (err) => {
      toast({
        title: "Falha ao rejeitar vínculo",
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
  const myPropertyParty = myPropertyPartyQuery.data?.rows || [];
  const pendingPropertyPartyAdmin = adminPropertyPartyQuery.data?.rows || [];
  const hasPendingMutation =
    submitMutation.isPending ||
    verifyMutation.isPending ||
    rejectMutation.isPending ||
    submitPropertyPartyMutation.isPending ||
    verifyPropertyPartyMutation.isPending ||
    rejectPropertyPartyMutation.isPending;

  const sortedMyClaims = useMemo(
    () => [...myClaims].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [myClaims]
  );
  const pendingClaimsCount = sortedMyClaims.filter((c) => c.status === "pending").length;
  const verifiedClaimsCount = sortedMyClaims.filter((c) => c.status === "verified").length;

  const renderClaimStatus = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "verified") return { label: "Verificado", variant: "default" as const };
    if (normalized === "rejected") return { label: "Rejeitado", variant: "destructive" as const };
    return { label: "Pendente", variant: "secondary" as const };
  };

  const renderPropertyPartyStatus = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "verified") return { label: "Verificado", variant: "default" as const };
    if (normalized === "rejected") return { label: "Rejeitado", variant: "destructive" as const };
    if (normalized === "ended") return { label: "Encerrado", variant: "outline" as const };
    return { label: "Pendente", variant: "secondary" as const };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Propriedades & Claims</h1>
        <p className="text-muted-foreground mt-1">
          Registre o identificador da propriedade (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF). CPF/CNPJ permanece como modo legado.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Claims enviados</p>
          <p className="text-xl font-semibold">{sortedMyClaims.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-xl font-semibold">{pendingClaimsCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Verificados</p>
          <p className="text-xl font-semibold">{verifiedClaimsCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Vínculos</p>
          <p className="text-xl font-semibold">{myPropertyParty.length}</p>
        </div>
      </section>

      {canSubmit && (
        <section className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ações de propriedade</h2>
            <p className="text-sm text-muted-foreground">
              Envie claim da propriedade ou vínculo propriedade↔parte sem poluir a tela principal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
            <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo claim
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo claim de propriedade</DialogTitle>
                  <DialogDescription>
                    Use identificador da propriedade (preferencial) e, se quiser, detalhe o contexto para acelerar validação.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      onChange={(e) => setRoleNoImovel(e.target.value as RoleNoImovel)}
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
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => submitMutation.mutate()}
                    disabled={!identifierValue.trim() || hasPendingMutation}
                  >
                    {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar claim"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={propertyPartyDialogOpen} onOpenChange={setPropertyPartyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Link2 className="h-4 w-4 mr-2" />
                  Novo vínculo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Vínculo Propriedade ↔ Parte</DialogTitle>
                  <DialogDescription>
                    Registre quem é titular/operador da LAND para reduzir ambiguidade entre CAR/CPF/CNPJ.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input
                      placeholder="DFID-LAND-..."
                      value={propertyDfid}
                      onChange={(e) => setPropertyDfid(e.target.value)}
                      className="md:col-span-2"
                    />
                    <select
                      className="h-10 px-3 rounded-md border border-input bg-background"
                      value={partyType}
                      onChange={(e) => setPartyType(e.target.value as (typeof PARTY_TYPE_OPTIONS)[number]["value"])}
                    >
                      {PARTY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Input placeholder="CPF/CNPJ" value={partyValue} onChange={(e) => setPartyValue(e.target.value)} />
                    <select
                      className="h-10 px-3 rounded-md border border-input bg-background"
                      value={propertyPartyRole}
                      onChange={(e) => setPropertyPartyRole(e.target.value as (typeof PROPERTY_PARTY_ROLE_OPTIONS)[number]["value"])}
                    >
                      {PROPERTY_PARTY_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    placeholder="Observações (opcional)"
                    value={propertyPartyNotes}
                    onChange={(e) => setPropertyPartyNotes(e.target.value)}
                  />
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => submitPropertyPartyMutation.mutate()}
                    disabled={!propertyDfid.trim() || !partyValue.trim() || hasPendingMutation}
                  >
                    {submitPropertyPartyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar vínculo"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      )}

      {!canSubmit && (
        <section className="bg-background border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            Seu perfil atual não pode criar claims. Esta área permite visualização; envio é habilitado para workspaces
            do tipo produtor ou certificadora.
          </p>
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
              <div key={claim.id} className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                <Badge variant={renderClaimStatus(claim.status).variant}>
                  {renderClaimStatus(claim.status).label}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-background border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Meus vínculos Propriedade ↔ Parte</h2>
        {myPropertyPartyQuery.isLoading ? (
          <div className="py-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : myPropertyParty.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum vínculo enviado.</p>
        ) : (
          <div className="space-y-2">
            {myPropertyParty.map((row) => (
              <div key={row.id} className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium">{row.property_dfid}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.party_identifier_type.toUpperCase()}: {row.party_identifier_value} · papel: {row.role}
                  </p>
                </div>
                <Badge variant={renderPropertyPartyStatus(row.status).variant}>
                  {renderPropertyPartyStatus(row.status).label}
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

      {isAdmin && (
        <section className="bg-background border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Admin: vínculos pendentes Propriedade ↔ Parte
          </h2>
          {adminPropertyPartyQuery.isLoading ? (
            <div className="py-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : pendingPropertyPartyAdmin.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo pendente.</p>
          ) : (
            <div className="space-y-2">
              {pendingPropertyPartyAdmin.map((row) => (
                <div key={row.id} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.property_dfid}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.party_identifier_type.toUpperCase()}: {row.party_identifier_value} · papel: {row.role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Workspace: {row.workspace_id} · Submetido em {new Date(row.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => verifyPropertyPartyMutation.mutate(row.id)} disabled={hasPendingMutation}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Verificar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectPropertyPartyMutation.mutate(row.id)} disabled={hasPendingMutation}>
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

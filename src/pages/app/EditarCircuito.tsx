import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, GitBranch, Globe, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCircuit, updateCircuit } from "@/lib/defarm-api";
import type { UpdateCircuitRequest } from "@/lib/api/types";
import { isCircuitPublic } from "@/lib/circuit-ui";
import { useAuth } from "@/contexts/AuthContext";
import { circuitsListPath } from "@/lib/circuitNav";

export default function EditarCircuito() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<string>("private");
  const [status, setStatus] = useState<string>("Active");
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);
  const [searchable, setSearchable] = useState(false);
  const [allowJoinRequests, setAllowJoinRequests] = useState(true);
  const [publicSlug, setPublicSlug] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicWebsite, setPublicWebsite] = useState("");
  const [publicBannerUrl, setPublicBannerUrl] = useState("");
  const [publicLogoUrl, setPublicLogoUrl] = useState("");
  const [publicShowCompliance, setPublicShowCompliance] = useState(false);

  // Fetch circuit data
  const { data: circuit, isLoading: isLoadingCircuit } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id!),
    enabled: !!id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (circuit) {
      setName(circuit.name);
      setDescription(circuit.description || "");
      setVisibility(circuit.visibility || "private");
      setStatus(circuit.status || "Active");
      setDiscoveryEnabled(circuit.discovery_enabled || false);
      setSearchable(circuit.searchable || false);
      setAllowJoinRequests(circuit.allow_join_requests ?? true);
      setPublicSlug(circuit.public_slug || "");
      setPublicDescription(circuit.public_description || "");
      setPublicContactEmail(circuit.public_contact_email || "");
      setPublicWebsite(circuit.public_website || "");
      setPublicBannerUrl(circuit.public_banner_url || "");
      setPublicLogoUrl(circuit.public_logo_url || "");
      const showCompliance = (circuit.settings as Record<string, unknown> | null | undefined)?.public_show_compliance;
      setPublicShowCompliance(showCompliance === true);
    }
  }, [circuit]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCircuitRequest) =>
      updateCircuit(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      toast({
        title: t("portal.circuits.edit.toasts.updatedTitle"),
        description: t("portal.circuits.edit.toasts.updatedDesc"),
      });
      navigate(`/app/circuitos/${id}`);
    },
    onError: (error) => {
      toast({
        title: t("portal.circuits.edit.toasts.updateError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      settings: {
        ...((circuit?.settings as Record<string, unknown> | null) || {}),
        public_show_compliance: publicShowCompliance,
      },
      name,
      description,
      status,
      visibility,
      discovery_enabled: visibility === "public" ? discoveryEnabled : false,
      searchable: visibility === "public" ? searchable : false,
      allow_join_requests: visibility === "public" ? allowJoinRequests : false,
      public_slug: visibility === "public" ? publicSlug || null : null,
      public_description: visibility === "public" ? publicDescription : null,
      public_contact_email: visibility === "public" ? publicContactEmail : null,
      public_website: visibility === "public" ? publicWebsite : null,
      public_banner_url: publicBannerUrl.trim() || null,
      public_logo_url: publicLogoUrl.trim() || null,
    });
  };

  if (isLoadingCircuit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("portal.circuits.edit.notFound")}
        </h1>
        <Button onClick={() => navigate(circuitsListPath(user?.workspace_type))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("portal.circuits.edit.backToCircuits")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("portal.common.back")}
        </button>
        <h1 className="text-3xl font-bold text-foreground">{t("portal.circuits.edit.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("portal.circuits.edit.subtitle", { name: circuit.name })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic info */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("portal.circuits.form.basicInfo")}</h2>
              <p className="text-sm text-muted-foreground">{t("portal.circuits.form.basicInfoDesc")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("portal.circuits.form.nameLabel")}</Label>
              <Input
                id="name"
                placeholder={t("portal.circuits.form.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("portal.circuits.form.descLabel")}</Label>
              <Textarea
                id="description"
                placeholder={t("portal.circuits.form.descPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("portal.circuits.form.visibilitySection")}</h2>
              <p className="text-sm text-muted-foreground">{t("portal.circuits.form.visibilitySectionDesc")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">{t("portal.circuits.form.visibilityLabel")}</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{t("portal.circuits.edit.visibilityOptions.private")}</SelectItem>
                <SelectItem value="restricted">{t("portal.circuits.edit.visibilityOptions.restricted")}</SelectItem>
                <SelectItem value="public">{t("portal.circuits.edit.visibilityOptions.public")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("portal.circuits.form.visibilityHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("portal.circuits.edit.statusLabel")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">{t("portal.circuits.edit.statusOptions.active")}</SelectItem>
                <SelectItem value="Inactive">{t("portal.circuits.edit.statusOptions.inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {status === "Active"
                ? t("portal.circuits.edit.statusHint.active")
                : t("portal.circuits.edit.statusHint.inactive")}
            </p>
          </div>
        </div>

        {/* Discovery & Public Profile */}
        {isCircuitPublic(visibility) && (
          <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("portal.circuits.edit.discoveryTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("portal.circuits.edit.discoveryDesc")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("portal.circuits.edit.enableDiscovery")}</Label>
                  <p className="text-xs text-muted-foreground">{t("portal.circuits.edit.enableDiscoveryHint")}</p>
                </div>
                <Switch checked={discoveryEnabled} onCheckedChange={setDiscoveryEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("portal.circuits.edit.searchable")}</Label>
                  <p className="text-xs text-muted-foreground">{t("portal.circuits.edit.searchableHint")}</p>
                </div>
                <Switch checked={searchable} onCheckedChange={setSearchable} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("portal.circuits.edit.allowJoin")}</Label>
                  <p className="text-xs text-muted-foreground">{t("portal.circuits.edit.allowJoinHint")}</p>
                </div>
                <Switch checked={allowJoinRequests} onCheckedChange={setAllowJoinRequests} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("portal.circuits.edit.showCompliance")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("portal.circuits.edit.showComplianceHint")}
                  </p>
                </div>
                <Switch checked={publicShowCompliance} onCheckedChange={setPublicShowCompliance} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicSlug">{t("portal.circuits.edit.slugLabel")}</Label>
                <Input
                  id="publicSlug"
                  placeholder={t("portal.circuits.edit.slugPlaceholder")}
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                />
                <p className="text-xs text-muted-foreground">
                  {t("portal.circuits.edit.publicLink", { url: `${window.location.origin}/c/${publicSlug || circuit.id}` })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicDescription">{t("portal.circuits.edit.publicDescLabel")}</Label>
                <Textarea
                  id="publicDescription"
                  placeholder={t("portal.circuits.edit.publicDescPlaceholder")}
                  value={publicDescription}
                  onChange={(e) => setPublicDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicContactEmail">{t("portal.circuits.edit.contactEmailLabel")}</Label>
                <Input
                  id="publicContactEmail"
                  type="email"
                  placeholder={t("portal.circuits.edit.contactEmailPlaceholder")}
                  value={publicContactEmail}
                  onChange={(e) => setPublicContactEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicWebsite">{t("portal.circuits.edit.websiteLabel")}</Label>
                <Input
                  id="publicWebsite"
                  type="url"
                  placeholder={t("portal.circuits.edit.websitePlaceholder")}
                  value={publicWebsite}
                  onChange={(e) => setPublicWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicBannerUrl">{t("portal.circuits.edit.bannerLabel")}</Label>
                <Input
                  id="publicBannerUrl"
                  type="url"
                  placeholder={t("portal.circuits.edit.bannerPlaceholder")}
                  value={publicBannerUrl}
                  onChange={(e) => setPublicBannerUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("portal.circuits.edit.bannerHint")}
                </p>
                {publicBannerUrl ? (
                  <img src={publicBannerUrl} alt="" className="h-20 w-full object-cover rounded-md border border-border" />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicLogoUrl">{t("portal.circuits.edit.logoLabel")}</Label>
                <Input
                  id="publicLogoUrl"
                  type="url"
                  placeholder={t("portal.circuits.edit.logoPlaceholder")}
                  value={publicLogoUrl}
                  onChange={(e) => setPublicLogoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("portal.circuits.edit.logoHint")}</p>
                {publicLogoUrl ? (
                  <img src={publicLogoUrl} alt="" className="h-12 w-12 object-contain rounded-md border border-border" />
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            {t("portal.common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending || !name}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {t("portal.circuits.edit.submit")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

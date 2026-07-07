import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, GitBranch, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createCircuit, CreateCircuitRequest } from "@/lib/defarm-api";

export default function NovoCircuito() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [circuitType, setCircuitType] = useState("shared");
  const [visibility, setVisibility] = useState("private");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCircuitRequest) => createCircuit(data),
    onSuccess: (circuit) => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast({
        title: t("portal.circuits.new.toasts.createdTitle"),
        description: t("portal.circuits.new.toasts.createdDesc", { name: circuit.name }),
      });
      navigate(`/app/circuitos/${circuit.id}`);
    },
    onError: (error) => {
      toast({
        title: t("portal.circuits.new.toasts.createError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: t("portal.circuits.new.toasts.sessionInvalidTitle"),
        description: t("portal.circuits.new.toasts.sessionInvalidDesc"),
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name,
      description,
      circuit_type: circuitType,
      visibility,
      owner_id: user.id,
    });
  };

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
        <h1 className="text-3xl font-bold text-foreground">{t("portal.circuits.new.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("portal.circuits.new.subtitle")}
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

            <div className="space-y-2">
              <Label htmlFor="circuit_type">{t("portal.circuits.new.typeLabel")}</Label>
              <Select value={circuitType} onValueChange={setCircuitType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t("portal.circuits.new.typeOptions.private")}</SelectItem>
                  <SelectItem value="shared">{t("portal.circuits.new.typeOptions.shared")}</SelectItem>
                  <SelectItem value="public">{t("portal.circuits.new.typeOptions.public")}</SelectItem>
                </SelectContent>
              </Select>
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
                <SelectItem value="private">{t("portal.circuits.new.visibilityOptions.private")}</SelectItem>
                <SelectItem value="public">{t("portal.circuits.new.visibilityOptions.public")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("portal.circuits.form.visibilityHint")}
            </p>
          </div>
        </div>

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
            disabled={createMutation.isPending || !name}
            className="flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {t("portal.circuits.new.submit")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

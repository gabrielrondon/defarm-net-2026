import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { executeCheck } from "@/lib/check-api";
import type { CheckInputType, CheckResponse, CheckSource } from "@/lib/check-api/types";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileText,
  MapPin,
  Leaf,
  Users,
  Scale,
  ExternalLink,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INPUT_TYPES: { value: CheckInputType; label: string; placeholder: string; description: string }[] = [
  { value: "CNPJ", label: "CNPJ", placeholder: "12.345.678/0001-90", description: "Pessoa Jurídica" },
  { value: "CPF", label: "CPF", placeholder: "123.456.789-00", description: "Pessoa Física" },
  { value: "CAR", label: "CAR", placeholder: "MT-5102504-0123456789ABCDEF", description: "Cadastro Ambiental Rural" },
  { value: "COORDINATES", label: "Coordenadas", placeholder: "-7.0945, -61.089", description: "Latitude, Longitude" },
  { value: "ADDRESS", label: "Endereço", placeholder: "Altamira, Pará", description: "Endereço brasileiro" },
];

const verdictConfig = {
  COMPLIANT: { icon: ShieldCheck, label: "Conforme", color: "text-green-500", bg: "bg-green-500/10 border-green-500/30" },
  NON_COMPLIANT: { icon: ShieldX, label: "Não Conforme", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
  PARTIAL: { icon: ShieldAlert, label: "Parcialmente Conforme", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  INCONCLUSIVE: { icon: AlertTriangle, label: "Inconclusivo", color: "text-muted-foreground", bg: "bg-muted border-border" },
};

const categoryIcons: Record<string, typeof Leaf> = {
  social: Users,
  environmental: Leaf,
  legal: Scale,
  certification: FileText,
};

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-red-500/20 text-red-400 border border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  LOW: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const strokeColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="50" cy="50" r="45" fill="none" stroke={strokeColor} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", color)}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: CheckSource }) {
  const CategoryIcon = categoryIcons[source.category] || FileText;
  const isPassed = source.status === "PASS";
  const isNA = source.status === "NOT_APPLICABLE";

  return (
    <Card className={cn(
      "transition-all",
      isPassed ? "border-green-500/20" : isNA ? "border-border" : "border-red-500/30 bg-red-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            isPassed ? "bg-green-500/10" : isNA ? "bg-muted" : "bg-red-500/10"
          )}>
            {isPassed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
             isNA ? <Info className="h-4 w-4 text-muted-foreground" /> :
             <XCircle className="h-4 w-4 text-red-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{source.name}</span>
              <Badge variant="outline" className="text-xs gap-1">
                <CategoryIcon className="h-3 w-3" />
                {source.category}
              </Badge>
              {source.severity && (
                <Badge className={cn("text-xs", severityColors[source.severity])}>
                  {source.severity}
                </Badge>
              )}
              {source.cached && (
                <Badge variant="secondary" className="text-xs">cache</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{source.message}</p>

            {source.details && Object.keys(source.details).length > 0 && (
              <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-1">
                {Object.entries(source.details).map(([key, val]) => {
                  if (key === "recommendation" || key === "coordinates") return null;
                  return (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="text-muted-foreground font-mono min-w-[120px]">{key}:</span>
                      <span className="text-foreground break-all">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  );
                })}
                {source.details.recommendation && (
                  <p className="text-xs font-medium text-yellow-500 mt-2 pt-2 border-t border-border">
                    ⚠️ {source.details.recommendation}
                  </p>
                )}
              </div>
            )}

            {source.evidence && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{source.evidence.dataSource}</span>
                {source.evidence.url && (
                  <a href={source.evidence.url} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {source.executionTimeMs !== undefined && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {source.executionTimeMs}ms
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComplianceCheck() {
  const { toast } = useToast();
  const [inputType, setInputType] = useState<CheckInputType>("CNPJ");
  const [inputValue, setInputValue] = useState("");
  const [latValue, setLatValue] = useState("");
  const [lonValue, setLonValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResponse | null>(null);

  const selectedType = INPUT_TYPES.find(t => t.value === inputType)!;

  const handleCheck = async () => {
    if (inputType === "COORDINATES") {
      if (!latValue || !lonValue) {
        toast({ title: "Preencha latitude e longitude", variant: "destructive" });
        return;
      }
    } else if (!inputValue.trim()) {
      toast({ title: "Preencha o campo de busca", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const value = inputType === "COORDINATES"
        ? { lat: parseFloat(latValue), lon: parseFloat(lonValue) }
        : inputValue.trim();

      const response = await executeCheck({
        input: { type: inputType, value },
        options: { useCache: true, includeEvidence: true },
      });
      setResult(response);
    } catch (err: any) {
      toast({
        title: "Erro na verificação",
        description: err?.message || "Falha ao consultar API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verdictInfo = result ? verdictConfig[result.verdict] : null;
  const VerdictIcon = verdictInfo?.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">DeFarm Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Verificação de compliance socioambiental — 13 fontes governamentais em tempo real
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Verificar Compliance
          </CardTitle>
          <CardDescription>
            Insira um CNPJ, CPF, coordenada, número do CAR ou endereço para verificar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={inputType} onValueChange={(v) => { setInputType(v as CheckInputType); setInputValue(""); setLatValue(""); setLonValue(""); setResult(null); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INPUT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {inputType === "COORDINATES" ? (
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Latitude (ex: -7.0945)"
                  value={latValue}
                  onChange={(e) => setLatValue(e.target.value)}
                  type="number"
                  step="any"
                />
                <Input
                  placeholder="Longitude (ex: -61.089)"
                  value={lonValue}
                  onChange={(e) => setLonValue(e.target.value)}
                  type="number"
                  step="any"
                />
              </div>
            ) : (
              <Input
                className="flex-1"
                placeholder={selectedType.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              />
            )}

            <Button onClick={handleCheck} disabled={loading} className="sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Verificar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { type: "CNPJ" as CheckInputType, val: "12345678000190", label: "CNPJ teste" },
              { type: "COORDINATES" as CheckInputType, val: "-7.0945,-61.089", label: "Coord. desmatamento" },
              { type: "ADDRESS" as CheckInputType, val: "Altamira, Pará", label: "Endereço" },
            ].map(example => (
              <Button
                key={example.label}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setInputType(example.type);
                  if (example.type === "COORDINATES") {
                    const [lat, lon] = example.val.split(",");
                    setLatValue(lat);
                    setLonValue(lon);
                  } else {
                    setInputValue(example.val);
                  }
                }}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && verdictInfo && VerdictIcon && (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          {/* Verdict + Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={cn("border-2", verdictInfo.bg)}>
              <CardContent className="p-6 text-center">
                <VerdictIcon className={cn("h-12 w-12 mx-auto mb-2", verdictInfo.color)} />
                <h2 className={cn("text-xl font-bold", verdictInfo.color)}>{verdictInfo.label}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.input.type}: {typeof result.input.value === "object"
                    ? `${result.input.value.lat}, ${result.input.value.lon}`
                    : result.input.value}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <ScoreGauge score={result.score} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-sm">Resumo</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{result.summary.passed} aprovados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{result.summary.failed} reprovados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{result.summary.warnings} alertas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>{result.summary.notApplicable} N/A</span>
                  </div>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {result.metadata.processingTimeMs}ms processamento
                  </div>
                  <div>Cache hit: {Math.round(result.metadata.cacheHitRate * 100)}%</div>
                  <div className="font-mono text-[10px] truncate">ID: {result.checkId}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source details */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Detalhes das Verificações ({result.sources.length})
            </h3>
            <div className="space-y-3">
              {/* Failed first, then warnings, then passed */}
              {[...result.sources]
                .sort((a, b) => {
                  const order = { FAIL: 0, WARNING: 1, ERROR: 2, PASS: 3, NOT_APPLICABLE: 4 };
                  return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                })
                .map((source, i) => (
                  <SourceCard key={i} source={source} />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

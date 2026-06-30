import { PartnerEmbed } from "@/components/partner";

export default function PartnerEmbedPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">Integração</p>
        <h1 className="text-foreground">Embed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere um token de curta duração para embutir a visão de portfólio (itens + provas on-chain) no app do seu cliente.
        </p>
      </div>
      <PartnerEmbed />
    </div>
  );
}

import { PartnerEmbed } from "@/components/partner";

export default function PartnerEmbedPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">Integração</p>
        <h1 className="text-foreground">Link de Visualização</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Um link temporário e só-leitura pra alguém ver o portfólio verificado de um circuito
          (itens + provas on-chain), sem precisar de conta. Expira no tempo que você definir.
        </p>
      </div>
      <PartnerEmbed />
    </div>
  );
}

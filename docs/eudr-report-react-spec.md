# Spec — Report EUDR em React nativo (C5 / defarm.net)

Contrato de exibição pro report de desmatamento (EUDR Check) renderizado em React
no defarm.net (logado, sem API key no browser; o engines/gateway faz proxy +
cobra créditos). Modelado a partir do JSON real do `/check`. Não é código final —
é o contrato de design + tipos.

> Tokens reaproveitados do sample: `--green #1e6b46`, âmbar `#b45309`, vermelho `#b42318`,
> linha `#e7e5e4`, ink `#1c1917`, muted `#6b7280`, bg `#faf9f7`.

---

## 1) Árvore de componentes

```
<EudrReport>                      ← orquestra fetch (via hook) + estados loading/erro/vazio
├── <ReportHeader>                ← marca, DFID/Polygon id, área total, data, botão PDF
├── <VerdictBanner>               ← HERÓI: ✓/⚠/✗ + frase humana + total ha + score
├── <ReportBody>                  ← grid 2col desktop / 1col mobile
│   ├── <MapPanel>                ← satélite + polígono + legenda + escala + área + atribuição
│   └── <SourceList>
│        └── <SourceCard> ×N      ← 1 por fonte (Hansen, GFW Integrated, CAR×PRODES…)
│             ├── <SourceBadge>   ← PASS/WARNING/FAIL/NOT_APPLICABLE
│             ├── <SourceMessage> ← frase humana (inclui regra de minimis)
│             └── <SourceDetails> ← KV humanizados + <YearBars>/<ConfidenceTable>
├── <MethodologyBlock>           ← o que é cada fonte + o que PASS/WARNING/FAIL significam
└── <AuditLog>                    ← tabela: fonte · status · dataset · última atualização
```

**Responsabilidades**
| Componente | Responsabilidade | Não faz |
|---|---|---|
| `EudrReport` | Recebe `data` (ou `emissionId`), gerencia loading/erro/vazio, layout | Não formata números nem decide cor |
| `ReportHeader` | Identidade do doc (id, área, data) + ação PDF | Veredito |
| `VerdictBanner` | Traduz `verdict`+`score`+`summary` em banner com cor/ícone/copy | Detalhe por fonte |
| `MapPanel` | Geo: polígono, satélite, legenda, escala, área, atribuição, overlay | Lógica de compliance |
| `SourceCard` | 1 fonte: badge + mensagem + detalhes humanizados | Saber das outras fontes |
| `MethodologyBlock` | Texto fixo explicativo por fonte + glossário de status | Dados dinâmicos |
| `AuditLog` | Rastreabilidade tabular (datasets, timestamps, links) | Veredito |

---

## 2) Props (TypeScript) — modelado do `/check`

```ts
type Verdict = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
type SourceStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_APPLICABLE' | 'ERROR';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
type Locale = 'pt-BR' | 'en';

interface EudrEvidence {
  dataSource: string;          // "Hansen/UMD/Google/USGS/NASA via Global Forest Watch"
  url: string;                 // "https://www.globalforestwatch.org/"
  lastUpdate: string;          // ISO "2026-06-21"
  dataset?: string;            // "GFW Integrated (GLAD-L + GLAD-S2 + RADD)"
}

interface SourceDetails {
  // ambientais por CAR / Hansen
  tree_cover_loss_ha?: number;
  loss_post_2020_ha?: number;
  total_loss_ha?: number;
  by_year?: Record<string, number>;          // { "2021": 12.3, "2022": 4.1, ... }
  // GFW Integrated
  alerts_high?: number;
  alerts_nominal?: number;
  alerts_high_area_ha?: number;
  total_area_ha?: number;
  by_confidence?: Record<'highest'|'high'|'nominal', { area_ha: number; count?: number }>;
  by_quarter?: Record<string, number>;        // { "2025-Q1": 0.2, ... }
  de_minimis_ha?: number;                     // 1 (limiar)
  // BR
  prodes_intersection_ha?: number;
  cars_matched?: number;
  [k: string]: unknown;                       // tolerância a campos novos
}

interface EudrSource {
  key: string;                 // 'hansen' | 'gfw_integrated' | 'car_prodes' | 'polygon_car_match'
  name: string;                // "GFW Integrated Deforestation Alerts"
  status: SourceStatus;
  severity?: Severity;         // "LOW"
  category?: string;           // "environmental"
  message: string;             // já humanizado pelo backend OU cru → ver §4
  details: SourceDetails;
  evidence: EudrEvidence;
}

interface EudrSummary {
  headline_ha?: number;        // total de perda/alerta relevante p/ a frase do banner
  drivers?: string[];          // ["palma", "desmate pós-2020"] (opcional)
  text?: { 'pt-BR': string; en: string };  // se o backend já mandar a frase
}

interface EudrMetadata {
  checkId: string;
  dfid?: string;               // quando vem de uma emissão DeFarm
  country: string;             // "ID" | "BR" | "*"
  areaHa: number;              // área do polígono analisado
  generatedAt: string;         // ISO
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  alertOverlay?: GeoJSON.FeatureCollection;  // opcional: footprint do desmate
}

interface EudrReportData {
  verdict: Verdict;
  score: number;               // 0..100
  sources: EudrSource[];
  summary: EudrSummary;
  metadata: EudrMetadata;
}

// ---- props dos componentes ----
interface EudrReportProps {
  data?: EudrReportData;
  state?: 'loading' | 'error' | 'empty' | 'ready';   // default derivado de data
  error?: { code: string; message: string };
  locale?: Locale;                                   // default 'pt-BR'
  onDownloadPdf?: () => void;                         // engines gera o PDF (mascarado/cru por papel)
}
interface VerdictBannerProps { verdict: Verdict; score: number; summary: EudrSummary; areaHa: number; locale: Locale; onDownloadPdf?: () => void; }
interface SourceCardProps    { source: EudrSource; locale: Locale; defaultOpen?: boolean; }
interface MapPanelProps      { geometry: GeoJSON.Polygon|GeoJSON.MultiPolygon; areaHa: number; alertOverlay?: GeoJSON.FeatureCollection; locale: Locale; }
interface MethodologyBlockProps { sourceKeys: string[]; locale: Locale; }
interface AuditLogProps      { sources: EudrSource[]; generatedAt: string; locale: Locale; }
```

> **Normalização recomendada:** o proxy no engines deve devolver o array `sources`
> já normalizado (`key`, `status`, `details`, `evidence`) — não jogue o HTML/strings
> crus do `/report.html` no React. O front formata; o backend entrega dado limpo.

---

## 3) Estados de verdict (cor / ícone / copy)

```ts
const VERDICT = {
  COMPLIANT:     { color:'#1e6b46', bg:'#eef7f1', icon:'CheckCircle',  // ✓
    label:{ 'pt-BR':'Conforme (EUDR)',     en:'Compliant (EUDR)' } },
  PARTIAL:       { color:'#b45309', bg:'#fdf6e7', icon:'AlertTriangle',// ⚠
    label:{ 'pt-BR':'Atenção — revisar',   en:'Attention — review' } },
  NON_COMPLIANT: { color:'#b42318', bg:'#fdf0ee', icon:'XCircle',      // ✗
    label:{ 'pt-BR':'Não conforme (EUDR)', en:'Non-compliant (EUDR)' } },
} as const;
```

**Frase humana do banner** (1 linha, gerada a partir de `summary`/`sources`):
| Verdict | pt-BR | en |
|---|---|---|
| COMPLIANT | "Sem desmate relevante após 2020 nas fontes consultadas. Área: {area} ha." | "No relevant deforestation after 2020 in the checked sources. Area: {area} ha." |
| PARTIAL | "Alertas abaixo do limiar de {deminimis} ha ({ha} ha) — possível ruído; revisar. Área: {area} ha." | "Alerts below the {deminimis} ha threshold ({ha} ha) — possible noise; review. Area: {area} ha." |
| NON_COMPLIANT | "Desmate pós-2020 detectado: {ha} ha em {n} de {total} fontes. Área: {area} ha." | "Post-2020 deforestation detected: {ha} ha in {n} of {total} sources. Area: {area} ha." |

**Wireframe do banner herói**
```
┌────────────────────────────────────────────────────────────────┐
│  ✗  NÃO CONFORME (EUDR)                       score 0/100        │  ← cor de fundo = bg do verdict
│  Desmate pós-2020 detectado: 1.425 ha em 2 de 2 fontes.          │
│  Polígono ID · 1.425 ha · Check 5a5f… · 21/06/2026   [Baixar PDF]│
└────────────────────────────────────────────────────────────────┘
```

```jsx
<VerdictBanner verdict="NON_COMPLIANT" score={0} areaHa={1425.5}
  summary={summary} locale="pt-BR" onDownloadPdf={handlePdf} />
```

---

## 4) Humanização dos cards

**4.1 Mapa label técnico → legível** (`labelOf(key, locale)`):
| chave técnica | pt-BR | en |
|---|---|---|
| `tree_cover_loss_ha` | Perda de cobertura florestal (total) | Tree cover loss (total) |
| `loss_post_2020_ha` | Perda de cobertura florestal pós-2020 | Forest loss after 2020 |
| `total_loss_ha` | Perda total acumulada | Total accumulated loss |
| `alerts_high` | Alertas de alta confiança | High-confidence alerts |
| `alerts_high_area_ha` | Área dos alertas de alta confiança | High-confidence alert area |
| `total_area_ha` | Área total alertada | Total alerted area |
| `by_year` | Por ano | By year |
| `by_confidence` | Por confiança | By confidence |
| `de_minimis_ha` | Limiar de minimis | De minimis threshold |
| `prodes_intersection_ha` | Interseção com PRODES | PRODES intersection |
| `cars_matched` | CARs sobrepostos | Matching CARs |

**4.2 Formatação de número** — `formatHa(n, locale)`:
- pt-BR: separador de milhar `.`, decimal `,`, sufixo ` ha` → `1.425,54 ha`. (en: `1,425.54 ha`)
- `< 1 ha` → 2 casas (`0,36 ha`); `≥ 1.000` → 0 casas (`1.426 ha`); senão 1 casa.
- Contagens (alerts_high) sem sufixo: `607`.

**4.3 `by_year` / `by_confidence` → mini-viz (nada de JSON cru)**
- `<YearBars data={by_year} />`: barras horizontais sparkline, label do ano + valor formatado. Acessível (`role="img"` + `aria-label="2021: 12,3 ha; 2022: 4,1 ha…"` + `<table>` visualmente oculto como fallback).
- `<ConfidenceTable data={by_confidence} />`: tabela 2-col (confiança → área ha) com legenda highest/high/nominal.

```jsx
<SourceDetails>
  <KV label={labelOf('loss_post_2020_ha')} value={formatHa(144.85)} />   {/* "144,85 ha" */}
  <KV label={labelOf('total_loss_ha')}     value={formatHa(1425.54)} />  {/* "1.425,54 ha" */}
  <YearBars data={details.by_year} locale={locale} />
</SourceDetails>
```

**4.4 Regra do de minimis na copy (o WARNING sub-limiar)**
Quando `status === 'WARNING'` e `alerts_high_area_ha < de_minimis_ha`:
> pt-BR: **"Alertas abaixo do limiar de minimis ({deminimis} ha): {ha} ha confirmados — provável ruído/perturbação; revisar manualmente."**
> en: **"Alerts below the de minimis threshold ({deminimis} ha): {ha} ha confirmed — likely noise/disturbance; manual review."**

Ex. real (PN do Jaú): `de_minimis_ha=1`, `alerts_high_area_ha=0.36`, `alerts_high=29` →
"Alertas abaixo do limiar de minimis (1 ha): 0,36 ha confirmados — provável ruído; revisar." Badge âmbar **WARNING**, severidade `LOW`.

**Badge por status:**
```ts
const STATUS = {
  PASS:           { color:'#1e6b46', bg:'#eef7f1', label:{'pt-BR':'OK', en:'PASS'} },
  WARNING:        { color:'#b45309', bg:'#fdf6e7', label:{'pt-BR':'Atenção', en:'WARNING'} },
  FAIL:           { color:'#b42318', bg:'#fdf0ee', label:{'pt-BR':'Reprovado', en:'FAIL'} },
  NOT_APPLICABLE: { color:'#6b7280', bg:'#f3f4f6', label:{'pt-BR':'N/A', en:'N/A'} },
  ERROR:          { color:'#6b7280', bg:'#f3f4f6', label:{'pt-BR':'Indisponível', en:'Unavailable'} },
};
```
> **ERROR ≠ FAIL**: fonte indisponível no momento da checagem é cinza "Indisponível", nunca vermelho — não pode contar como não-conformidade (anti cry-wolf, igual ao de minimis).

---

## 5) MapPanel

**Lib:** `react-leaflet` (v4) + `leaflet`. Basemap satélite **ESRI World Imagery**
(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
`fitBounds` na geometria. (Se já houver `<PropertyMap>` no net usado no /i/:dfid e /eudr, reusar.)

**Elementos obrigatórios:**
- Polígono analisado: stroke `#ffd400`, fill `rgba(255,212,0,.12)`.
- **Legenda** (canto): `▭ Área analisada` / `▦ Alerta de desmate` (se `alertOverlay`).
- **Escala** (`L.control.scale`, métrica).
- **Área em ha** sobreposta/abaixo: `formatHa(areaHa)`.
- **Atribuição**: "Imagery © Esri · Alertas © Global Forest Watch (GFW)".
- **Overlay do desmate** (se `metadata.alertOverlay` vier): `<GeoJSON>` vermelho translúcido por cima.

```jsx
<MapContainer bounds={bounds} scrollWheelZoom={false} aria-label="Mapa do polígono analisado">
  <TileLayer url={ESRI} attribution="Imagery © Esri" />
  <GeoJSON data={geometry} style={{ color:'#ffd400', weight:2, fillOpacity:0.12 }} />
  {alertOverlay && <GeoJSON data={alertOverlay} style={{ color:'#b42318', fillOpacity:0.25 }} />}
  <ScaleControl metric imperial={false} />
  <MapLegend area={formatHa(areaHa)} hasOverlay={!!alertOverlay} locale={locale} />
</MapContainer>
```

---

## 6) Estados de UX + acessibilidade

**Loading (skeleton)** — não spinner solto: skeleton do banner + bloco de mapa cinza pulsante + 2 cards "fantasma".
```jsx
if (state==='loading') return <EudrReportSkeleton />;   // aria-busy="true", "Analisando o polígono…"
```
**Erro** — card com ícone, mensagem acionável e retry. Distinguir:
- `402 sem créditos` → "Você precisa de créditos para rodar esta análise" + CTA.
- `400 geometria inválida` → "Não foi possível ler o polígono. Confira a geometria."
- `5xx/timeout` → "Falha temporária ao consultar as fontes. Tente de novo." (não mascarar como 'sem dados').

**Vazio** — antes de rodar: placeholder "Informe um polígono e rode a análise."

**Acessibilidade:**
- Verdict NÃO só por cor: ícone (✓/⚠/✗) + texto sempre juntos (daltônicos).
- `:focus-visible` anel verde `2px #1e6b46`, offset 2px (reusar do sample).
- Cada `SourceCard` é `<section aria-labelledby>`; o `<details>`/toggle é `<button aria-expanded>`.
- Mini-barras com `role="img"` + `aria-label` textual; tabela visualmente-oculta como fallback.
- Contraste: badges e texto ≥ AA (4.5:1). Evitar muted < 4.5:1 em texto pequeno.
- Mapa com `aria-label`; controles de zoom alcançáveis por teclado (leaflet já dá).
- **Mobile:** sem iframe (resolve o scroll-trapping do sample); 1 coluna; mapa altura fixa razoável (240–280px), cards full-width.

---

## 7) Bloco Metodologia / Confiança (texto fixo por fonte)

Curto, pra um auditor citar. Renderizar só as fontes presentes em `sources`.

| Fonte | pt-BR (resumo) | Dataset / link |
|---|---|---|
| **Hansen Global Forest Change** | Perda anual de cobertura arbórea (30 m) desde 2000, derivada de Landsat. Usada pra detectar desmate **acumulado e pós-2020**. | Hansen/UMD/Google/USGS/NASA · globalforestwatch.org |
| **GFW Integrated Deforestation Alerts** | Alertas **quase em tempo real** combinando GLAD-L (Landsat), GLAD-S2 (Sentinel-2) e RADD (radar Sentinel-1). Confirma desmate recente; aplica **limiar de minimis** pra filtrar ruído. | GFW Integrated (GLAD-L+GLAD-S2+RADD) · globalforestwatch.org |
| **CAR × PRODES** (BR) | Interseção do polígono com alertas PRODES/INPE dentro do CAR. Específico do Brasil. | INPE PRODES · SICAR |
| **Polygon → CAR Match** (BR) | Quantos CARs registrados sobrepõem o polígono (rastreabilidade fundiária). | SICAR |

**Glossário de status (sempre visível no bloco):**
- **PASS / OK** — sem indício relevante de desmate pós-2020 naquela fonte.
- **WARNING / Atenção** — indício **abaixo do limiar de minimis** (ex.: < 1 ha) — provável ruído; **revisão manual** recomendada (não reprova sozinho).
- **FAIL / Reprovado** — desmate pós-2020 acima do limiar → não-conformidade EUDR.
- **N/A** — fonte não se aplica à região (ex.: PRODES fora do BR).
- **Indisponível** — fonte fora do ar na hora da checagem (≠ reprovado; re-rodar).

> **Veredito agregado:** `NON_COMPLIANT` se ≥1 fonte FAIL; `PARTIAL` se ≥1 WARNING e nenhum FAIL;
> `COMPLIANT` se tudo PASS/N/A. `ERROR` não rebaixa o veredito (mostra aviso de cobertura parcial).

---

## Apêndice — layout responsivo

```
DESKTOP (≥820px)                          MOBILE (<820px)
┌───────── VerdictBanner ─────────┐       ┌── VerdictBanner ──┐
├──────────────┬──────────────────┤       ├───────────────────┤
│   MapPanel    │   SourceList     │       │     MapPanel       │
│  (legenda,    │  ┌ SourceCard ┐  │       ├───────────────────┤
│   escala, ha) │  └────────────┘  │       │    SourceList      │
│               │  ┌ SourceCard ┐  │       │  (cards 1-col)     │
├──────────────┴──────────────────┤       ├───────────────────┤
│        MethodologyBlock          │       │  MethodologyBlock  │
│            AuditLog              │       │     AuditLog       │
└──────────────────────────────────┘       └───────────────────┘
```

**Ordem de implementação sugerida:** (1) tipos + normalização no proxy → (2) `VerdictBanner` +
`SourceCard` (o salto de credibilidade) → (3) `MapPanel` → (4) `MethodologyBlock`/`AuditLog` →
(5) skeleton/erro/vazio + a11y → (6) PDF (reusa o gerador do #65/#68, agora com dado normalizado).

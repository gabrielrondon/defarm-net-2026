# PublicItem — Melhorias de Rastreabilidade

Status: **Completo** (15/15)
Beta flag: `?beta=1` na URL ativa funcionalidades experimentais

## Alto impacto, rápido

- [x] **Cartão de Sanidade inline** — checklist visual de vacinas/tratamentos, status geral, sem clique
- [x] **Gráfico de peso inline** — curva de crescimento visível na página + GMD (kg/dia)
- [x] **Idade calculada** — "2 anos e 11 meses" ao lado da data de nascimento
- [x] **Mini-mapa da propriedade atual inline** — satellite com polígono CAR direto na página

## Médio impacto, diferenciador

- [x] **Compliance ambiental** — badge "CAR ativo" / "CAR cancelado" / "CAR pendente" inline
- [x] **Próximos eventos esperados** — inferidos da idade e histórico (reforço vacina, pesagem)
- [x] **Modo impressão / PDF limpo** — @media print + botão de impressora no header
- [x] **Widget embed** — `/embed/item/DFID-...` versão compacta com QR pra iframe

## Longo prazo

- [x] **Comparador** — `/compare?ids=DFID1,DFID2,DFID3` com tabela + gráfico de peso sobreposto
- [x] **Timeline visual** — vertical com ícones coloridos, agrupamento por ano, expandível com detalhes
- [x] **Selo de origem pra consumidor** — `?selo=1` versão ultra-minimal pra QR em embalagem

## Extras implementados

- [x] **Tour guiado** — spotlight overlay com navegação passo a passo (beta)
- [x] **CID viewer** — visualizador formatado do conteúdo IPFS com seções
- [x] **Mapa da Jornada** — Leaflet com timeline, polígonos CAR, markers, rota
- [x] **Event detector expandido** — auto-detecta vacinas, tratamentos, classificação, abate
- [x] **Design polish** — warm surfaces, shadows, humanized labels, responsive

## URLs

| Modo | URL |
|------|-----|
| Normal | `defarm.net/i/DFID-...` |
| Beta | `defarm.net/i/DFID-...?beta=1` |
| Selo | `defarm.net/i/DFID-...?selo=1` |
| Embed | `defarm.net/embed/item/DFID-...` |
| Comparador | `defarm.net/compare?ids=DFID1,DFID2` |
| Print | Cmd+P ou botão de impressora |

# PublicItem — Melhorias de Rastreabilidade

Status: Em andamento
Beta flag: `?beta=1` na URL ativa funcionalidades experimentais

## Alto impacto, rápido

- [x] **Cartão de Sanidade inline** — checklist visual de vacinas/tratamentos, status geral, sem clique
- [x] **Gráfico de peso inline** — curva de crescimento visível na página + GMD (kg/dia)
- [x] **Idade calculada** — "2 anos e 11 meses" ao lado da data de nascimento
- [x] **Mini-mapa da propriedade atual inline** — satellite com polígono CAR direto na página

## Médio impacto, diferenciador

- [x] **Compliance ambiental** — badge "CAR ativo" / "CAR cancelado" / "CAR pendente" inline
- [x] **Próximos eventos esperados** — inferidos da idade e histórico (reforço vacina, pesagem)
- [x] **Modo impressão / PDF limpo** — @media print com ficha institucional
- [x] **Widget embed** — `/embed/item/DFID-...` versão compacta pra iframe em sites de parceiros

## Longo prazo

- [ ] **Comparador** — selecionar 2-3 animais e comparar lado a lado
- [x] **Timeline visual** — vertical com ícones coloridos, agrupamento por ano, expandível
- [ ] **Selo de origem pra consumidor** — versão ultra-simplificada pra QR em embalagem

## Extras implementados

- [x] **Tour guiado** — spotlight overlay com navegação passo a passo (beta)
- [x] **CID viewer** — visualizador formatado do conteúdo IPFS com seções
- [x] **Mapa da Jornada** — Leaflet com timeline, polígonos CAR, markers, rota
- [x] **Event detector expandido** — auto-detecta vacinas, tratamentos, classificação, abate
- [x] **Design polish** — warm surfaces, shadows, humanized labels, responsive

## Notas técnicas

- Beta flag: `?beta=1` query param, sem login necessário
- Embed flag: detectado por URL path `/embed/`
- Quando aprovado, remove o guard e vira default
- Não depende de feature flags, edge config, nem banco
- Print: Ctrl+P / Cmd+P na página gera ficha limpa
- Embed: `<iframe src="https://defarm.net/embed/item/DFID-..." height="120" />`

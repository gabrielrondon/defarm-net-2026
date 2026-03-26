# PublicItem — Melhorias de Rastreabilidade

Status: Em andamento
Beta flag: `?beta=1` na URL ativa funcionalidades experimentais

## Alto impacto, rápido

- [x] **Cartão de Sanidade inline** — checklist visual de vacinas/tratamentos, status geral, sem clique
- [x] **Gráfico de peso inline** — curva de crescimento visível na página + GMD (kg/dia)
- [x] **Idade calculada** — "2 anos e 11 meses" ao lado da data de nascimento
- [x] **Mini-mapa da propriedade atual inline** — satellite com polígono CAR direto na página

## Médio impacto, diferenciador

- [ ] **Compliance ambiental** — badge "Sem alertas ambientais" quando CAR ativo
- [x] **Próximos eventos esperados** — inferidos da idade e histórico (reforço vacina, pesagem)
- [ ] **Modo impressão / PDF limpo** — @media print com ficha institucional
- [ ] **Widget embed** — `/embed/DFID-...` versão compacta pra iframe em sites de parceiros

## Longo prazo

- [ ] **Comparador** — selecionar 2-3 animais e comparar lado a lado
- [x] **Timeline visual** — vertical com ícones coloridos e agrupamento por ano
- [ ] **Selo de origem pra consumidor** — versão ultra-simplificada pra QR em embalagem

## Notas técnicas

- Beta flag: `?beta=1` query param, sem login necessário
- Quando aprovado, remove o guard e vira default
- Não depende de feature flags, edge config, nem banco

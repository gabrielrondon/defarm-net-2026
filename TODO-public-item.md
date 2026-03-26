# PublicItem — Melhorias de Rastreabilidade

Status: Em andamento
Beta flag: `?beta=1` na URL ativa funcionalidades experimentais

## Alto impacto, rápido

- [ ] **Cartão de Sanidade inline** — checklist visual de vacinas/tratamentos, status geral "Em dia" ou "Pendência", sem clique
- [ ] **Gráfico de peso inline** — curva de crescimento visível na página + GMD (Ganho Médio Diário) calculado
- [ ] **Idade calculada** — "2 anos e 11 meses" ao lado da data de nascimento
- [ ] **Mini-mapa da propriedade atual inline** — satellite com polígono CAR direto na página, sem popup

## Médio impacto, diferenciador

- [ ] **Compliance ambiental** — badge "Sem alertas ambientais" quando CAR ativo + sem desmatamento
- [ ] **Próximos eventos esperados** — inferidos da idade e histórico (reforço vacina, pesagem prevista)
- [ ] **Modo impressão / PDF limpo** — @media print com ficha institucional
- [ ] **Widget embed** — `/embed/DFID-...` versão compacta pra iframe em sites de parceiros

## Longo prazo

- [ ] **Comparador** — selecionar 2-3 animais e comparar lado a lado
- [ ] **Timeline visual** — vertical estilo Git log com agrupamento por período
- [ ] **Selo de origem pra consumidor** — versão ultra-simplificada pra QR em embalagem

## Notas técnicas

- Beta flag: `?beta=1` query param, sem login necessário
- Quando aprovado, remove o guard e vira default
- Não depende de feature flags, edge config, nem banco

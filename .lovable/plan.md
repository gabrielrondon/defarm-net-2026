

# Caderneta Digital -- Hub pessoal do produtor

## Conceito

A "Caderneta Digital" substitui o dashboard tecnico como ponto de entrada do usuario logado. Assim como uma caderneta de vacinacao ou de poupanca, e algo familiar onde o produtor **registra, acompanha e consulta** tudo sobre sua operacao. Sem carga burocratica de "passaporte", sem implicar validacao governamental -- e simplesmente o lugar onde estao todas as informacoes importantes.

A caderneta tem **abas** (como paginas de uma caderneta) que organizam os dados do produtor de forma visual e intuitiva.

## Estrutura das Abas

### Aba 1: Resumo (capa da caderneta)
- Nome do produtor, propriedade, localizacao
- DFID do workspace
- Resumo rapido: quantos ativos, status geral de compliance, oportunidades abertas
- Estilo visual: card 3D-offset verde com selo DeFarm

### Aba 2: Meu Rebanho / Producao
- Cards visuais dos itens rastreados, agrupados por circuito
- Badge mostrando em qual circuito cada item esta
- Botao rapido para adicionar novo item
- Reusa dados de `getItems()` + `getCircuits()` que ja existem

### Aba 3: Compliance
- Checagens ambientais, EUDR, documentacao
- Indicadores visuais verde/amarelo/vermelho
- Historico de verificacoes
- Reusa a Check API ja integrada

### Aba 4: Financeiro
- Cards de oportunidades de credito disponiveis
- Barra de progresso de requisitos preenchidos vs pendentes
- Links para simulador e linhas de credito
- Reusa a Finance API existente

### Aba 5: Meu Agente AI
- Interface de chat placeholder (UI pronta, sem backend por enquanto)
- Area de "sugestoes inteligentes" com cards estaticos
- Ex: "Voce tem 3 itens sem verificacao EUDR -- regularize para desbloquear CPR Verde"

## Mudancas Tecnicas

### Arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/app/Caderneta.tsx` | Container principal com Tabs (Radix Tabs) |
| `src/components/caderneta/CadernetaResumo.tsx` | Aba resumo: identidade + metricas rapidas |
| `src/components/caderneta/CadernetaRebanho.tsx` | Aba ativos: lista visual por circuito |
| `src/components/caderneta/CadernetaCompliance.tsx` | Aba compliance: status das checagens |
| `src/components/caderneta/CadernetaFinanceiro.tsx` | Aba financeiro: oportunidades |
| `src/components/caderneta/CadernetaAgente.tsx` | Aba AI agent: chat placeholder |
| `src/components/caderneta/index.ts` | Re-exports |

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adiciona rota `/app/caderneta`; muda `/app` para renderizar `Caderneta` em vez de `Dashboard` |
| `src/components/AppLayout.tsx` | Adiciona "Minha Caderneta" como primeiro item da sidebar (icone BookOpen); Dashboard desce para item secundario |

### Fontes de dados (APIs ja existentes, sem backend novo)

- **Resumo**: `AuthContext` (user/workspace) + `getCircuits()` + `getItems()` para contagens
- **Rebanho**: `getItems()` + `getCircuits()` + `getItemDetails()` para identificadores
- **Compliance**: `runChecks()` da Check API
- **Financeiro**: `getCreditLines()` + `getInstruments()` da Finance API
- **AI Agent**: dados estaticos/placeholder por enquanto

### Navegacao entre abas

Usa Radix Tabs (ja instalado no projeto) -- simples, acessivel, funciona bem no mobile. Cada aba renderiza seu componente dedicado.

### Estilo visual

- Cards com borda preta 4px e sombra offset (3D style ja usado no projeto)
- Cor primaria verde (#28c268)
- Abas com icones + label curto
- Mobile-first: abas viram scroll horizontal no celular

### O que acontece com o Dashboard atual

- A rota `/app` passa a renderizar a Caderneta
- O Dashboard de metricas tecnicas fica acessivel em `/app/dashboard` como item secundario na sidebar (para quem precisa das metricas brutas)


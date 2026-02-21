

# Portal do Parceiro de Dados

## Contexto

Parceiros de dados sao empresas (ex: apps de gestao de fazendas) que compartilham dados com a DeFarm via API. Eles precisam de uma interface propria para gerenciar sua integracao, monitorar o fluxo de dados e configurar como os dados chegam na plataforma.

## O que ja existe no projeto

A base tecnica para parceiros ja esta construida:
- **API Keys** (`/app/api-keys`): criacao, revogacao e metricas de chaves
- **Webhooks** (`src/lib/api/webhooks.ts`): notificacoes de eventos
- **Circuit Adapters** (`src/lib/api/circuit-adapters.ts`): integracao com Stellar/IPFS
- **Circuitos**: cada parceiro ja opera dentro de circuitos com membros e permissoes (RBAC)

O que falta e **uma interface dedicada** que agrupe tudo isso de forma coerente para o parceiro.

## Proposta: Hub do Parceiro (`/app/parceiro`)

Uma area dedicada na sidebar (visivel apenas para usuarios com role `partner` ou `admin`) que centraliza a experiencia B2B.

### Estrutura com abas (mesmo padrao da Caderneta)

**Aba 1: Visao Geral**
- Nome da organizacao parceira, status da integracao
- Metricas rapidas: itens sincronizados, eventos processados, erros recentes
- Status da conexao (ultima sincronizacao, uptime)
- Dados vem de: `getCircuits()` + `getPartnerApiKeyMetrics()`

**Aba 2: Integracao (API Keys + Webhooks)**
- Lista de API Keys ativas (reusa logica de `ApiKeys.tsx`)
- Configuracao de webhooks para receber notificacoes
- Documentacao inline com exemplos de payload
- Dados vem de: `listPartnerApiKeys()` + `getWebhooks()`

**Aba 3: Fluxo de Dados**
- Visualizacao dos circuitos em que o parceiro participa
- Itens enviados pelo parceiro (filtrados por source)
- Eventos recentes do parceiro
- Status de processamento (pendente, processado, erro)
- Dados vem de: `getCircuits()` + `getItems()` + `getEvents()`

**Aba 4: Adaptadores**
- Configuracao de adapters (Stellar, IPFS, NFT) nos circuitos do parceiro
- Status de cada adapter (ativo, pausado, erro)
- Dados vem de: `listCircuitAdapters()`

## Diferenca entre Caderneta e Portal do Parceiro

```text
Caderneta (B2C - Produtor)         Portal do Parceiro (B2B)
+----------------------------+     +----------------------------+
| Minha identidade           |     | Minha organizacao          |
| Meu rebanho                |     | Minhas API Keys            |
| Meu compliance             |     | Fluxo de dados             |
| Minhas oportunidades       |     | Adaptadores                |
| Meu agente AI              |     | Metricas de integracao     |
+----------------------------+     +----------------------------+
```

O produtor ve seus ativos e oportunidades. O parceiro ve suas integracoes e o fluxo de dados que ele alimenta.

## Arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/app/PartnerPortal.tsx` | Container principal com Tabs |
| `src/components/partner/PartnerOverview.tsx` | Aba visao geral: metricas e status |
| `src/components/partner/PartnerIntegration.tsx` | Aba integracao: API Keys + Webhooks |
| `src/components/partner/PartnerDataFlow.tsx` | Aba fluxo: itens, eventos, circuitos |
| `src/components/partner/PartnerAdapters.tsx` | Aba adapters: Stellar/IPFS config |
| `src/components/partner/index.ts` | Re-exports |

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adiciona rota `/app/parceiro` |
| `src/components/AppLayout.tsx` | Adiciona "Portal Parceiro" na sidebar (icone `Handshake`), visivel para roles partner/admin |

## Visibilidade na sidebar

O Portal do Parceiro aparece na sidebar apenas para usuarios que sao parceiros. A logica de visibilidade usa o campo `user.is_admin` existente por enquanto, com a possibilidade futura de checar um role `partner` especifico quando o RBAC estiver mais granular.

```text
Sidebar (usuario produtor):        Sidebar (usuario parceiro):
- Minha Caderneta                  - Minha Caderneta
- Circuitos                        - Portal Parceiro  <-- novo
- Descobrir                        - Circuitos
- Itens                            - Itens
- ...                              - ...
```

## Escopo v1

1. Container com 4 abas
2. Visao Geral com metricas basicas (reusa APIs existentes)
3. Integracao: reusa componentes de API Keys inline + lista de webhooks
4. Fluxo de Dados: tabela de itens/eventos filtrados pelo parceiro
5. Adaptadores: lista de adapters por circuito
6. Rota e sidebar atualizados

Nao inclui nesta versao: onboarding de parceiro, convite de parceiros, painel de associacao de produtores (fica para v2).


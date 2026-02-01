
# Plano: Novo Fluxo de Onboarding para Produtores Rurais

## Visao Geral

Criar uma experiencia de onboarding completamente nova, focada em produtores rurais, com fluxo guiado passo a passo que começa simples (inserir identificador do animal) e vai construindo valor ate o momento de criar conta.

## Filosofia do Design

- **Visual, nao textual**: Cada passo mostra visualmente o que esta acontecendo
- **Linguagem do produtor**: "Guardar" ao inves de "Tokenizar", "Registro seguro" ao inves de "Blockchain"
- **Progressao natural**: Comeca com algo familiar (numero do animal) e vai adicionando valor
- **Baixa friccao**: So pede conta no final, depois que o usuario ja viu o valor

## Arquitetura de Telas

```text
+--------------------------------------------------+
|  [Logo DeFarm]              [Ja tem conta? Entrar] |
+--------------------------------------------------+
|                                                    |
|     ===== BARRA DE PROGRESSO (5 passos) =====     |
|                                                    |
|  +--------------------------------------------+   |
|  |                                            |   |
|  |          CONTEUDO DO PASSO                |   |
|  |                                            |   |
|  +--------------------------------------------+   |
|                                                    |
|              [Botao Principal]                    |
+--------------------------------------------------+
```

## Fluxo dos 5 Passos

### Passo 1: Identificar Animal/Lote
- Input grande e limpo para digitar o identificador
- Placeholder: "SISBOV, brinco, lote..."
- Botao "Nao tenho um numero? Gerar exemplo"
- Gera IDs fake realistas (ex: BR123456789012345)

### Passo 2: Registro Seguro (DFID)
- Animacao visual mostrando o ID recebendo um "selo digital"
- Mostra o DFID gerado (registro descentralizado)
- Explica visualmente: "Seu animal agora tem um registro unico"

### Passo 3: Seu Portfolio
- Mostra card do animal/lote como primeiro item
- Sugere adicionar mais itens (+)
- Preview visual da "caixinha" de ativos

### Passo 4: Checagens Automaticas
- Indicadores visuais de compliance em tempo real
- Check ambiental, EUDR, documentacao
- Mostra como sair de commodity e provar valor

### Passo 5: Oportunidades Financeiras
- Cards visuais de diferentes produtos (CPR, financiamento)
- Cada um mostra requisitos de dados (alguns ja preenchidos)
- CTA: "Salvar meu portfolio" que leva para criar conta

## Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Onboarding.tsx` | Container principal do fluxo com estado e navegacao |
| `src/components/onboarding/OnboardingLayout.tsx` | Layout comum (header com login, progress bar) |
| `src/components/onboarding/StepIdentifier.tsx` | Passo 1: Input do identificador |
| `src/components/onboarding/StepDFID.tsx` | Passo 2: Registro seguro |
| `src/components/onboarding/StepPortfolio.tsx` | Passo 3: Portfolio de ativos |
| `src/components/onboarding/StepCompliance.tsx` | Passo 4: Checagens automaticas |
| `src/components/onboarding/StepFinance.tsx` | Passo 5: Oportunidades |
| `src/components/onboarding/index.ts` | Re-exports |
| `src/lib/fake-id-generator.ts` | Gera IDs fake realistas |

## Modificacoes em Arquivos Existentes

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adiciona rota `/onboarding` |
| `src/components/PlatformSwitcher.tsx` | Muda CTA "Acessar Plataforma" para ir para `/onboarding` |

---

## Detalhes Tecnicos

### Estado Global do Onboarding

```typescript
interface OnboardingState {
  currentStep: number;
  identifier: {
    type: string;      // "sisbov" | "brinco" | "lote" | etc
    value: string;
    isFake: boolean;
  };
  dfid: string | null;
  portfolio: Array<{
    id: string;
    identifier: string;
    dfid: string;
  }>;
  complianceChecks: {
    environmental: boolean;
    eudr: boolean;
    documentation: boolean;
  };
}
```

### Gerador de IDs Fake

- SISBOV: BR + 15 digitos (ex: BR123456789012345)
- Brinco: 3-6 digitos (ex: 4521)
- Lote: "L" + ano + sequencial (ex: L2024-0042)
- GTA: formato realista que nao colide com reais

### Componente de Input Grande

```typescript
// StepIdentifier.tsx
<input
  className="w-full text-4xl font-bold text-center 
             border-b-4 border-primary bg-transparent
             focus:outline-none placeholder:text-muted-foreground/30"
  placeholder="Digite o numero do animal..."
  autoFocus
/>
```

### Animacoes Visuais

- Transicoes suaves entre passos (fade + slide)
- Animacao de "selo" no passo do DFID
- Checks aparecendo progressivamente no compliance

### Persistencia Temporaria

- Dados guardados em localStorage durante o fluxo
- Limpos apos criar conta ou apos 24h
- Permite retomar de onde parou

### Responsividade

- Mobile-first: funciona bem em celular no campo
- Touch-friendly: botoes grandes, areas clicaveis amplas

---

## Proximos Passos Apos Implementacao

1. Testes com usuarios reais (produtores)
2. Analytics em cada passo (drop-off rate)
3. A/B testing de copy e visuais
4. Integracao real com API DeFarm

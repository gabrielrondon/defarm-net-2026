/* Strings da superfície nova. Espelha `guidelines/copy-deck.md` do design system (chaves
   `dominio.contexto.item`). Regra 8 do HANDOFF: se não está no copy-deck, não é copy.
   As chaves em `kit.*` vieram das telas do kit (ui_kits/prova/Verify.jsx) e ainda não estão no
   copy-deck; foram apontadas em HANDOFF.md → Perguntas do frontend.
   Só pt-BR por decisão do design; migra para react-i18next quando EN for exigido. */
export const copy = {
  verify: {
    kicker: "Prova verificável · DeFarm",
    by: (fazenda: string, nivel: string) => `Emitida por ${fazenda} · ${nivel}`,
    check: "Verificar agora",
    checking: "Verificando na rede",
    ok: (data: string) => `Confere. Registrada na rede em ${data}, sem alteração desde então.`,
    sealed: (n: number) => `${n} campos selados pelo emissor. Não estão nesta prova nem podem ser pedidos à DeFarm.`,
    trust: (n: number) => `Conta de confiança · ${n} meses sem cortes`,
    notfound: { title: "Não encontramos", body: "O link pode ter expirado ou o acesso foi cortado por quem emitiu." },
    print: "Salvar em PDF",
    auditor: "Detalhes técnicos para auditor",
  },
  proof: {
    technical: "Detalhes técnicos para o seu auditor",
    status: { valid: "Válida", revoked: "Cortada", expired: "Expirada" },
  },
  legal: {
    basis: "Base legal",
    bases: {
      credit: "LGPD art. 7º, X — proteção do crédito",
      contract: "LGPD art. 7º, V — execução de contrato",
      consent: "LGPD art. 7º, I — consentimento específico",
    },
    record: (fim: string, quem: string, campos: string, data: string) =>
      `Finalidade: ${fim}. Destinatário: ${quem}. Campos: ${campos}. Autorizado pelo titular em ${data}. Acesso futuro revogável a qualquer momento (art. 8º §5º).`,
  },
  state: {
    ref: (codigo: string) => `ref ${codigo}`,
  },
  kit: {
    verify: {
      to: (quem: string) => `Para ${quem}`,
      headline: (fazenda: string) => `${fazenda} comprova`,
      headlineTail: { 3: "em seu nome, com titularidade verificada.", 2: "em seu nome, com identidade verificada.", 1: "em seu nome." },
      scopeTitle: "Escopo declarado pelo emissor",
      scopeNote: "Animais fora deste escopo não constam nesta prova e não são afirmados por ela.",
      validUntil: (data: string) => `Válida até ${data}`,
      frozen: (data: string) => `Foto de ${data}`,
      frozenTip: (data: string) => `Esta prova foi congelada em ${data}. Nascimentos e baixas depois dessa data não entram. É o que o processo de crédito exige.`,
      live: (ha: string) => `Ao vivo · ${ha}`,
      liveTip: "Esta prova acompanha o rebanho. O que você vê reflete a última entrada registrada.",
      selfTitle: "Verifique você mesmo",
      selfBody: "Feito no seu navegador, contra a rede pública. Não depende da DeFarm.",
      authentic: "Prova autêntica",
      checks: {
        hash: "Ninguém alterou o conteúdo",
        anchor: "Registrada em rede pública",
        sig: "Assinada por quem diz ser",
        revoke: "Continua válida",
      },
      checkDetail: {
        hash: "idêntico ao que foi emitido",
        anchor: (data: string) => `${data} · não pode ser retroagida`,
        sig: (quem: string) => `${quem} · identidade verificada por certificado digital`,
        revoke: "não foi revogada · conferido agora",
      },
      checking: "verificando…",
      techHide: "Ocultar detalhes técnicos",
      techId: (id: string) => `Identificador desta prova: ${id}.`,
      affirms: "O que esta prova afirma",
      signer: {
        owner: (quem: string) => `Assinada por ${quem}`,
        ownerSub: "chave própria · Ed25519 no sistema do produtor",
        defarm: (quem: string) => `Assinada pela DeFarm em nome de ${quem}`,
        defarmSub: "chave operada pela plataforma · irretratabilidade limitada",
      },
      hidden: "O que você não vê",
      hiddenBody: (campos: string) => `${campos} existem no registro original, mas foram selados antes da emissão. Nem você, nem a DeFarm.`,
      download: "Baixar prova assinada (.json)",
      footer: "A DeFarm registra dados agropecuários em rede pública para que qualquer pessoa confira sem depender de ninguém. Nem da DeFarm.",
      privacy: "Privacidade",
      skip: "Ir para o conteúdo",
    },
  },
} as const;

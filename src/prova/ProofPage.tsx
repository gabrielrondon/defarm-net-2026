import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, DfidChip, ErrorState, Icon, IdentityLevel, InlineReveal, Skeleton, Tag, Tooltip } from "@/ds";
import { PublicShell } from "./PublicShell";
import { copy } from "./copy";
import { fmtAgo, fmtDate, fmtDateTime, fmtNum } from "./format";
import { getProof, ProofNotFound, ProofNetworkError, ProofServerError } from "./api/proofs";
import { CHECKS, CHECK_ORDER, type CheckKey, type CheckResult } from "./api/checks";
import type { Proof } from "./api/types";

/* /p/:id · o que o banco abre ao receber uma prova. Porte de ui_kits/prova/Verify.jsx.
   Primeiro corte (decisoes.md, 17 set): prova real, emitida por produtor real, aberta por
   destinatário real, com origem, permissões e verificação contra a rede. */

type Load =
  | { status: "loading" }
  | { status: "ok"; proof: Proof }
  | { status: "error"; kind: "notfound" | "network" | "server"; ref?: string };

export default function ProofPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  const fetchProof = () => {
    setLoad({ status: "loading" });
    getProof(id)
      .then((proof) => setLoad({ status: "ok", proof }))
      .catch((e) => {
        if (e instanceof ProofNotFound) setLoad({ status: "error", kind: "notfound" });
        else if (e instanceof ProofNetworkError) setLoad({ status: "error", kind: "network" });
        else setLoad({ status: "error", kind: "server", ref: e instanceof ProofServerError ? e.ref : undefined });
      });
  };
  useEffect(fetchProof, [id]);

  useEffect(() => { document.title = `${copy.verify.kicker}`; }, []);

  if (load.status === "loading") {
    return (
      <PublicShell route={`/p/${id}`} kicker={copy.verify.kicker}>
        <div style={{ display: "grid", gap: "var(--s-3)" }}>
          <Skeleton variant="text" lines={1} width={180} height={10} />
          <Skeleton variant="text" lines={2} height={28} width="70%" />
        </div>
        <div className="df-split">
          <Skeleton variant="card" height={320} />
          <Skeleton variant="card" height={240} />
        </div>
      </PublicShell>
    );
  }

  if (load.status === "error") {
    /* 404 uniforme: revogada e inexistente têm a mesma tela. Nunca revela se a prova existiu. */
    return (
      <PublicShell route={`/p/${id}`} kicker={copy.verify.kicker}>
        <ErrorState
          kind={load.kind}
          title={load.kind === "notfound" ? copy.verify.notfound.title : undefined}
          body={load.kind === "notfound" ? copy.verify.notfound.body : undefined}
          onAction={load.kind === "notfound" ? () => navigate("/") : fetchProof}
          code={load.ref ? copy.state.ref(load.ref) : undefined}
        />
      </PublicShell>
    );
  }

  return <ProofView id={id} proof={load.proof} />;
}

function ProofView({ id, proof }: { id: string; proof: Proof }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<Partial<Record<CheckKey, CheckResult>>>({});
  const [tech, setTech] = useState(false);

  const run = async () => {
    if (state === "running") return;
    setState("running"); setResults({});
    for (const key of CHECK_ORDER) {
      const r = await CHECKS[key]({ id, proof });
      setResults((prev) => ({ ...prev, [key]: r }));
    }
    setState("done");
  };

  const done = CHECK_ORDER.filter((k) => results[k]);
  const all = state === "done" && CHECK_ORDER.every((k) => results[k]?.ok);
  /* Selados são commitments N2, nunca o valor; o rótulo vem em `label`/`field` quando o emissor o deu. */
  const sealedLabels = proof.sealed.map((e) => e.label ?? e.field).filter((x): x is string => !!x);
  const lb = proof.legalBasis;
  const signerOk = proof.issuer.signer === "own";
  const tail = copy.kit.verify.headlineTail[proof.issuer.level] ?? copy.kit.verify.headlineTail[1];

  const legalReveal = lb && (
    <InlineReveal term={copy.legal.basis} width={340}>
      <span style={{ display: "grid", gap: 6, font: "var(--fw-medium) var(--fs-sm)/1.45 var(--font-ui)", color: "var(--text-body)" }}>
        <strong style={{ color: "var(--text-strong)" }}>{copy.legal.bases[lb.key] ?? lb.key}</strong>
        <span>{copy.legal.record(lb.purpose, proof.recipient ?? "qualquer pessoa com o link", lb.fields.join(", "), fmtDateTime(proof.issuedAt))}</span>
      </span>
    </InlineReveal>
  );

  const json = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(proof, null, 2))}`;

  return (
    <PublicShell
      route={`/p/${id}`}
      kicker={copy.verify.kicker}
      cta={<>
        {legalReveal}
        <Button size="sm" variant="secondary" onClick={() => window.print()} iconLeft={<Icon name="file-down" size={15} />}>{copy.verify.print}</Button>
      </>}
    >
      {/* ---- o que é isto, para quem ---- */}
      <div style={{ display: "grid", gap: "var(--s-3)" }}>
        {proof.recipient && <span style={{ font: "var(--text-label)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-muted)" }}>{copy.kit.verify.to(proof.recipient)}</span>}
        <h1 style={{ font: "var(--fw-bold) var(--fs-h1)/1.1 var(--font-display)", letterSpacing: "var(--ls-tight)", maxWidth: 640 }}>
          {copy.kit.verify.headline(proof.issuer.name)}{" "}
          {proof.scope ? (
            <InlineReveal term={proof.scope.label} width={320}>
              <span style={{ display: "grid", gap: 6, font: "var(--fw-medium) var(--fs-sm)/1.45 var(--font-ui)", color: "var(--text-body)" }}>
                <strong style={{ font: "var(--fw-bold) var(--fs-body)/1.2 var(--font-display)", color: "var(--text-strong)" }}>{copy.kit.verify.scopeTitle}</strong>
                {proof.scope.breakdown.map((b) => <span key={b.label}>{b.label} · {fmtNum(b.count)}</span>)}
                <span style={{ color: "var(--text-muted)" }}>{copy.kit.verify.scopeNote}</span>
              </span>
            </InlineReveal>
          ) : (proof.title ?? "")}{" "}
          {tail}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <IdentityLevel level={proof.issuer.level} />
          {proof.expiresAt && <Tag>{copy.kit.verify.validUntil(fmtDate(proof.expiresAt))}</Tag>}
          {proof.mode === "frozen" ? (
            <Tooltip content={copy.kit.verify.frozenTip(fmtDate(proof.asOf))}>
              <Tag icon={<Icon name="camera" size={13} />}>{copy.kit.verify.frozen(fmtDate(proof.asOf))}</Tag>
            </Tooltip>
          ) : (
            <Tooltip content={copy.kit.verify.liveTip}>
              <Tag icon={<Icon name="info" size={13} />} style={{ background: "var(--anchor-soft)", color: "var(--blue-700)", borderColor: "var(--blue-100)" }}>{copy.kit.verify.live(fmtAgo(proof.asOf))}</Tag>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="df-split">
        {/* ---- verificação ao vivo ---- */}
        <Card padding="var(--s-7)">
          <div style={{ display: "grid", gap: "var(--s-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s-4)", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 3, flex: "1 1 240px" }}>
                <h2 style={{ font: "var(--fw-bold) var(--fs-h3)/1.2 var(--font-display)" }}>{copy.kit.verify.selfTitle}</h2>
                <span style={{ font: "var(--fw-medium) var(--fs-sm)/1.4 var(--font-ui)", color: "var(--text-muted)" }}>{copy.kit.verify.selfBody}</span>
              </div>
              {state === "idle" && <Button size="lg" onClick={run} iconLeft={<Icon name="shield-check" size={19} />}>{copy.verify.check}</Button>}
              {state === "done" && all && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: "var(--r-pill)", background: "var(--green-100)", color: "var(--green-700)", border: "2px solid var(--green-200)", borderBottom: "4px solid var(--green-300)", font: "var(--fw-bold) var(--fs-sm)/1 var(--font-ui)", animation: "df-pop var(--dur-base) var(--ease-spring-big) both" }}>
                  <Icon name="check" size={16} />{copy.kit.verify.authentic}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gap: "var(--s-2)" }}>
              {CHECK_ORDER.map((key, i) => {
                const r = results[key];
                const ok = r?.ok === true;
                const failed = r?.ok === false;
                const active = state === "running" && !r && done.length === i;
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: "var(--s-4)", padding: "12px 16px", borderRadius: "var(--r-md)",
                    background: ok ? "var(--green-50)" : failed ? "var(--danger-soft)" : "var(--surface-inset)",
                    borderStyle: "solid", borderWidth: 2, borderBottomWidth: 3,
                    borderColor: ok ? "var(--green-200)" : failed ? "var(--red-100)" : "var(--border-tactile)",
                    borderBottomColor: ok ? "var(--green-300)" : failed ? "var(--red-400)" : "var(--border-tactile-deep)",
                    transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
                    animation: r ? "df-pop var(--dur-base) var(--ease-spring) both" : "none",
                  }}>
                    <span style={{
                      width: 30, height: 30, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "var(--r-pill)",
                      background: ok ? "var(--green-400)" : failed ? "var(--danger)" : "var(--surface-card)",
                      color: ok ? "var(--text-on-brand)" : failed ? "#fff" : "var(--text-faint)",
                      border: r ? "none" : "2px solid var(--border-tactile)",
                      animation: active ? "df-pulse var(--dur-pulse) var(--ease-out) infinite" : "none",
                    }}>{ok ? <Icon name="check" size={16} /> : failed ? <Icon name="x" size={16} /> : <span style={{ font: "var(--fw-bold) var(--fs-xs)/1 var(--font-display)" }}>{i + 1}</span>}</span>
                    <span style={{ display: "grid", gap: 2, flex: "1 1 auto", minWidth: 0 }}>
                      <strong style={{ font: "var(--fw-bold) var(--fs-body)/1.25 var(--font-ui)", color: r ? "var(--text-strong)" : "var(--text-body)" }}>{copy.kit.verify.checks[key]}</strong>
                      <span style={{ font: "var(--fw-medium) var(--fs-xs)/1.3 var(--font-ui)", color: failed ? "var(--text-danger)" : "var(--text-muted)", opacity: r || active ? 1 : .55 }}>{r ? r.detail : active ? copy.kit.verify.checking : " "}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setTech(!tech)} className="df-no-print" style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, width: "fit-content", font: "var(--fw-semibold) var(--fs-sm)/1 var(--font-ui)", color: "var(--text-muted)" }}>
              <Icon name={tech ? "eye-off" : "code"} size={15} />{tech ? copy.kit.verify.techHide : copy.proof.technical}
            </button>

            {tech && (
              <div style={{ display: "grid", gap: "var(--s-3)", animation: "df-slide-up var(--dur-base) var(--ease-spring) both" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <DfidChip label={proof.commitmentAlg} tone="anchor" value={proof.commitment} head={10} tail={8} />
                  {proof.dfids.map((d) => <DfidChip key={d} value={d} />)}
                  {proof.sealed.map((e, i) => e.commitment ? <DfidChip key={i} label={e.label ?? e.field ?? "selado"} tone="sealed" value={e.commitment} head={12} tail={6} /> : null)}
                </div>
                <span style={{ font: "var(--fw-medium) var(--fs-xs)/1.5 var(--font-ui)", color: "var(--text-muted)" }}>
                  {copy.kit.verify.techId(id)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* ---- coluna direita: o que afirma, quem assina, o que não vê ---- */}
        <div style={{ display: "grid", gap: "var(--s-5)" }}>
          <Card padding="var(--s-6)">
            <div style={{ display: "grid", gap: "var(--s-4)" }}>
              <span style={{ font: "var(--text-label)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: "var(--text-muted)" }}>{copy.kit.verify.affirms}</span>
              <div style={{ display: "grid", gap: 10 }}>
                {proof.fields.map((f) => (
                  <div key={f.label} style={{ display: "flex", alignItems: "baseline", gap: "var(--s-3)" }}>
                    <span style={{ font: "var(--fw-medium) var(--fs-sm)/1.3 var(--font-ui)", color: "var(--text-muted)", flex: "1 1 auto" }}>{f.label}</span>
                    <span className="df-num" style={{ font: "var(--fw-bold) var(--fs-body)/1.2 var(--font-display)", color: "var(--text-strong)", flex: "0 0 auto", textAlign: "right" }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: "var(--s-3)", padding: "var(--s-4) var(--s-5)", borderRadius: "var(--r-md)",
            background: signerOk ? "var(--green-50)" : "var(--staging-soft)",
            borderStyle: "solid", borderWidth: 2, borderBottomWidth: 4,
            borderColor: signerOk ? "var(--green-200)" : "var(--amber-300)",
            borderBottomColor: signerOk ? "var(--green-300)" : "var(--staging-deep)",
          }}>
            <span style={{ display: "inline-flex", color: signerOk ? "var(--green-700)" : "var(--amber-700)", marginTop: 2 }}><Icon name={signerOk ? "badge-check" : "shield-alert"} size={18} /></span>
            <span style={{ display: "grid", gap: 3 }}>
              <strong style={{ font: "var(--fw-bold) var(--fs-sm)/1.3 var(--font-ui)", color: "var(--text-strong)" }}>{signerOk ? copy.kit.verify.signer.owner(proof.issuer.name) : copy.kit.verify.signer.defarm(proof.issuer.name)}</strong>
              <span style={{ font: "var(--fw-medium) var(--fs-xs)/1.4 var(--font-ui)", color: "var(--text-body)" }}>{signerOk ? copy.kit.verify.signer.ownerSub : copy.kit.verify.signer.defarmSub}</span>
            </span>
          </div>

          {proof.sealed.length > 0 && (
            <div style={{ display: "grid", gap: "var(--s-2)", padding: "var(--s-4) var(--s-5)", borderRadius: "var(--r-md)", background: "var(--sealed-soft)", border: "2px solid var(--purple-100)", borderBottom: "4px solid var(--purple-300)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--sealed-deep)" }}>
                <Icon name="lock" size={15} />
                <span style={{ font: "var(--fw-bold) var(--fs-micro)/1 var(--font-ui)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{copy.kit.verify.hidden}</span>
              </span>
              <span style={{ font: "var(--fw-medium) var(--fs-sm)/1.45 var(--font-ui)", color: "var(--purple-700)" }}>{sealedLabels.length === proof.sealed.length ? copy.kit.verify.hiddenBody(sealedLabels.join(" e ")) : copy.kit.verify.hiddenBodyCount(proof.sealed.length)}</span>
            </div>
          )}

          <Button className="df-no-print" variant="secondary" fullWidth iconLeft={<Icon name="download" size={17} />} as="a" href={json} download={`prova-${id}.json`}>{copy.kit.verify.download}</Button>
        </div>
      </div>
    </PublicShell>
  );
}

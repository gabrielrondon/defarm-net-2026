import { useState, type CSSProperties } from "react";
import { Icon } from "../core/Icon";

type Tone = "neutral" | "anchor" | "sealed" | "ok";
const TONES: Record<Tone, [string, string, string]> = {
  neutral: ["var(--surface-inset)", "var(--text-body)", "var(--border-hair)"],
  anchor: ["var(--anchor-soft)", "var(--blue-700)", "var(--blue-100)"],
  sealed: ["var(--sealed-soft)", "var(--purple-700)", "var(--purple-100)"],
  ok: ["var(--ok-soft)", "var(--green-700)", "var(--green-100)"],
};

export interface DfidChipProps { value?: string; label?: string; tone?: Tone; head?: number; tail?: number; style?: CSSProperties }

/** Compact monospace identifier with a quiet copy affordance. Real DFIDs keep chain, country, year and checksum visible. */
export function DfidChip({ value = "", label, tone = "neutral", head = 7, tail = 4, style }: DfidChipProps) {
  const [copied, setCopied] = useState(false);
  const isDfid = /^DFID-[A-Z]+-[A-Z]{2}-\d{4}-/.test(value);
  const short = isDfid
    ? value.replace(/^(DFID-[A-Z]+-[A-Z]{2}-\d{4})-(\d+)-([a-z0-9]+)$/, (_m, a, _seq, cs) => `${a}-…-${cs}`)
    : value.length > head + tail + 3 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
  const [bg, fg, bd] = TONES[tone] || TONES.neutral;
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button" title={value} aria-label={`Copiar ${value}`} onClick={copy}
      style={{
        all: "unset", display: "inline-flex", alignItems: "center", gap: 7, height: 26, padding: "0 9px",
        borderRadius: "var(--r-xs)", background: bg, color: fg, border: `1px solid ${bd}`,
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 500,
        letterSpacing: "var(--ls-mono)", cursor: "pointer", flex: "0 0 auto",
        transition: "background var(--dur-fast) var(--ease-out)", ...style,
      }}
    >
      {label && <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--fs-micro)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", opacity: .75 }}>{label}</span>}
      <span>{short}</span>
      <span style={{ display: "inline-flex", opacity: copied ? 1 : 0.5, transform: copied ? "scale(1.12)" : "scale(1)", transition: "transform var(--dur-base) var(--ease-spring-big), opacity var(--dur-fast) linear" }}>
        <Icon name={copied ? "check" : "copy"} size={13} />
      </span>
    </button>
  );
}

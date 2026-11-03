import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const MARGIN = 12;

export interface InlineRevealProps { term: ReactNode; width?: number; children?: ReactNode; style?: CSSProperties }

/** A term inside running text that opens a small anchored panel on click. */
export function InlineReveal({ term, width = 340, children, style }: InlineRevealProps) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const host = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (host.current && !host.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", key); };
  }, [open]);

  /* Keep the panel inside the viewport regardless of where the term falls in the line. */
  useLayoutEffect(() => {
    if (!open || !panel.current) { setShift(0); return; }
    const r = panel.current.getBoundingClientRect();
    const over = r.right - (window.innerWidth - MARGIN);
    const under = MARGIN - r.left;
    setShift(over > 0 ? -over : under > 0 ? under : 0);
  }, [open]);

  return (
    <span ref={host} style={{ position: "relative", display: "inline-block", ...style }}>
      <button
        type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{
          all: "unset", cursor: "pointer", font: "inherit", color: "var(--green-700)",
          fontWeight: 700, borderRadius: 4, padding: "0 3px", margin: "0 -3px",
          background: open ? "var(--green-100)" : "transparent",
          boxShadow: `inset 0 -2px 0 ${open ? "var(--green-400)" : "var(--green-200)"}`,
          transition: "background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        }}
      >{term}</button>
      {open && (
        <span ref={panel} role="dialog" style={{
          position: "absolute", zIndex: 40, top: "calc(100% + 10px)", left: 0,
          width, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, display: "block", textAlign: "left",
          transform: `translateX(${shift}px)`,
          padding: "var(--s-4) var(--s-5)", borderRadius: "var(--r-md)",
          background: "var(--surface-card)", borderStyle: "solid", borderWidth: 2,
          borderColor: "var(--border-tactile)", borderBottomColor: "var(--border-tactile-deep)",
          borderBottomWidth: 4, boxShadow: "0 18px 40px -20px rgba(17,24,39,.4)",
          animation: "df-pop var(--dur-fast) var(--ease-spring-big) both",
        }}>{children}</span>
      )}
    </span>
  );
}
